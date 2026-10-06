import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  MovementPass as ODRequest,
  CreateMovementPassDTO as CreateODDTO,
  TimelineEntry,
  ApprovalSnapshot,
  MovementPassOverallStatus as ODStatus,
} from '../../types/od';
import type { UserProfile, Department } from '../../types/user';
import { logAudit } from './auditService';
import { sendNotification } from './notificationService';
import { fetchHODsByDepartment } from './userService';
import { sanitizeFirestoreData } from '../../utils/sanitize';
import { debugLogger } from '../../utils/debugLogger';
import { parseNotificationDate } from '../../utils/dateUtils';

// Helper to generate unique sequential style request number
const generateRequestNumber = (): string => {
  const random = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `MP-${year}-${random}`;
};

export const createODRequest = async (
  dto: CreateODDTO,
  student: UserProfile
): Promise<string> => {
  debugLogger.groupStart('createODRequest: Submitting New Movement Pass', {
    currentUser: { uid: student.uid, name: student.displayName, role: student.role, email: student.email },
    action: 'PASS_SUBMIT',
    details: { dto },
  });

  try {
    // 1. Sort schedule by date for consistency
    dto.schedule.sort((a, b) => a.date.localeCompare(b.date));

    if (dto.schedule.length === 0) {
      throw new Error('At least one schedule date is required.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const max60Days = new Date();
    max60Days.setDate(max60Days.getDate() + 60);
    max60Days.setHours(23, 59, 59, 999);

    // 2. Validate dates & weekend rules
    for (const entry of dto.schedule) {
      const [y, m, d] = entry.date.split('-').map(Number);
      const entryDate = new Date(y, m - 1, d);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate < today) {
        throw new Error(`Date ${entry.date} cannot be in the past.`);
      }
      if (entryDate > max60Days) {
        throw new Error(`Date ${entry.date} cannot be more than 60 calendar days in advance.`);
      }

      const dayOfWeek = entryDate.getDay();
      if (dayOfWeek === 0) {
        throw new Error(`Sundays (${entry.date}) are closed. No pass can be created.`);
      }

      if (entry.passType === 'PARTIAL') {
        if (entry.periods.length === 0) {
          throw new Error(`Please select at least one period for ${entry.date}.`);
        }
        if (dayOfWeek === 6) { // Saturday
          if (entry.periods.some((p) => p < 1 || p > 6)) {
            throw new Error(`Saturday timetable only has periods 1-6. Invalid periods on ${entry.date}.`);
          }
        } else { // Weekdays
          if (entry.periods.some((p) => p < 1 || p > 7)) {
            throw new Error(`Weekday timetable only has periods 1-7. Invalid periods on ${entry.date}.`);
          }
        }
      }
    }

    // 3. Clash Detection
    debugLogger.step('Performing Clash Detection');
    const activePassesQuery = query(
      collection(db, 'movement_passes'),
      where('studentId', '==', student.uid),
      where('isDeleted', '==', false)
    );
    const activePassesSnap = await getDocs(activePassesQuery);
    const activePasses = activePassesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ODRequest))
      .filter((p) => ['PENDING', 'MENTOR_APPROVED', 'HOD_APPROVED'].includes(p.status.overall));

    for (const candidateEntry of dto.schedule) {
      const [cy, cm, cd] = candidateEntry.date.split('-').map(Number);
      const cDate = new Date(cy, cm - 1, cd);
      const isSat = cDate.getDay() === 6;
      const candidatePeriods = candidateEntry.passType === 'FULL_DAY'
        ? (isSat ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7])
        : candidateEntry.periods;

      for (const existPass of activePasses) {
        for (const existEntry of existPass.schedule) {
          if (existEntry.date === candidateEntry.date) {
            const isExistSat = isSat;
            const existPeriods = existEntry.passType === 'FULL_DAY'
              ? (isExistSat ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7])
              : existEntry.periods;

            const intersecting = candidatePeriods.filter((p) => existPeriods.includes(p));
            if (intersecting.length > 0) {
              throw new Error(
                `Schedule clash detected on ${candidateEntry.date} for period(s): ${intersecting.map((p) => `P${p}`).join(', ')}. Pass already exists in status: ${existPass.status.overall}.`
              );
            }
          }
        }
      }
    }

    let mentorUid = student.mentorUid;
    let mentorName = student.mentorName || 'Faculty Mentor';
    let mentorEmail = student.mentorEmail;

    debugLogger.step('Checking Mentor Assignment', { mentorUid, mentorEmail });

    if (!mentorUid && mentorEmail) {
      const mentorQ = query(
        collection(db, 'users'),
        where('email', '==', mentorEmail.toLowerCase()),
        where('isDeleted', '==', false)
      );
      const mentorSnap = await getDocs(mentorQ);
      if (!mentorSnap.empty) {
        const mProfile = mentorSnap.docs[0].data() as UserProfile;
        mentorUid = mProfile.uid;
        mentorName = mProfile.displayName;
        debugLogger.step('Resolved Mentor from Email Lookup', { mentorUid, mentorName });
      }
    }

    // Prepare compatibility fields
    const startDate = dto.schedule[0].date;
    const endDate = dto.schedule[dto.schedule.length - 1].date;
    const totalDays = dto.schedule.length;
    const requestNumber = generateRequestNumber();
    const now = new Date().toISOString();

    const initialTimeline: TimelineEntry = {
      id: `tl-${Date.now()}`,
      action: 'Movement Pass Request Submitted',
      performedBy: {
        uid: student.uid,
        name: student.displayName,
        role: student.role,
      },
      timestamp: now,
      details: `Applied for ${totalDays} day(s) (${startDate}${endDate !== startDate ? ' to ' + endDate : ''})`,
    };

    const rawODData: Record<string, unknown> = {
      requestNumber,
      studentId: student.uid,
      studentUid: student.uid, // Keep as helper if needed
      studentSnapshot: {
        uid: student.uid,
        name: student.displayName,
        email: student.email,
        department: student.department,
        registerNumber: student.registerNumber || 'N/A',
        year: student.year || 'N/A',
        section: student.section || 'N/A',
      },
      mentorId: mentorUid || null,
      assignedMentorUid: mentorUid || null, // Keep as helper
      assignedMentorSnapshot: {
        uid: mentorUid || null,
        name: mentorName,
        email: mentorEmail || 'mentor@institution.edu',
      },
      department: student.department,
      facultyInCharge: dto.facultyInCharge,
      purpose: dto.purpose,
      proofDocumentUrl: dto.proofDocumentUrl || null,
      status: {
        overall: 'PENDING',
        mentor: 'PENDING',
        hod: 'PENDING',
      },
      schedule: dto.schedule,

      // Compatibility fields
      startDate,
      endDate: endDate !== startDate ? endDate : null,
      totalDays,
      description: dto.purpose,
      odType: dto.schedule[0].passType === 'FULL_DAY' ? 'Full Day' : 'Partial',

      timeline: [initialTimeline],
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: student.uid,
      updatedBy: student.uid,
    };

    const cleanData = sanitizeFirestoreData(rawODData);
    debugLogger.step('Writing to Firestore movement_passes', cleanData);

    const docRef = await addDoc(collection(db, 'movement_passes'), cleanData);
    debugLogger.step('Firestore Write Succeeded', { docId: docRef.id });

    // 1. Audit Log
    await logAudit(
      'OD_CREATED',
      {
        uid: student.uid,
        name: student.displayName,
        email: student.email,
        role: student.role,
      },
      { requestNumber, purpose: dto.purpose, totalDays },
      { collection: 'movement_passes', id: docRef.id }
    );
    debugLogger.step('Audit Log Created');

    // 2. Notification to Mentor
    if (mentorUid) {
      await sendNotification(
        mentorUid,
        { uid: student.uid, name: student.displayName, role: student.role },
        'New Movement Pass Approval Required',
        `${student.displayName} submitted Movement Pass ${requestNumber} for ${startDate}.`,
        `/mentor/pending?highlight=${docRef.id}`,
        'OD_SUBMITTED',
        docRef.id
      );
      debugLogger.step('Mentor Notification Sent', { recipientUid: mentorUid });
    }

    debugLogger.success(`Movement Pass ${requestNumber} created successfully`, { docId: docRef.id });
    return docRef.id;
  } catch (error) {
    debugLogger.error('createODRequest', error);
    throw error;
  }
};

export const mentorReviewODRequest = async (
  odId: string,
  decision: 'APPROVED' | 'REJECTED',
  mentor: UserProfile,
  rejectionReason?: string
): Promise<void> => {
  debugLogger.groupStart('mentorReviewODRequest: Reviewing Movement Pass', {
    currentUser: { uid: mentor.uid, name: mentor.displayName, role: mentor.role, email: mentor.email },
    odId,
    action: decision,
    details: { rejectionReason },
  });

  try {
    debugLogger.step('Fetching Pass Document from Firestore');
    const odRef = doc(db, 'movement_passes', odId);
    const snap = await getDoc(odRef);

    if (!snap.exists()) {
      const err = new Error(`Movement Pass ${odId} not found in Firestore`);
      debugLogger.error('mentorReviewODRequest', err, odId);
      throw err;
    }

    const od = snap.data() as ODRequest;
    debugLogger.step('Pass Document Loaded', { requestNumber: od.requestNumber, currentStatus: od.status.overall });

    const now = new Date().toISOString();

    const reviewSnapshot: ApprovalSnapshot = {
      status: decision,
      approverUid: mentor.uid,
      approverName: mentor.displayName,
      approverEmail: mentor.email,
      timestamp: now,
      ...(decision === 'REJECTED' && rejectionReason ? { rejectionReason } : {}),
    };

    const newStatusOverall = decision === 'APPROVED' ? 'MENTOR_APPROVED' : 'MENTOR_REJECTED';

    const timelineEntry: TimelineEntry = {
      id: `tl-${Date.now()}`,
      action: decision === 'APPROVED' ? 'Mentor Approved Pass' : 'Mentor Rejected Pass',
      performedBy: {
        uid: mentor.uid,
        name: mentor.displayName,
        role: mentor.role,
      },
      timestamp: now,
      details: decision === 'REJECTED' ? `Reason: ${rejectionReason}` : 'Approved by Faculty Mentor',
    };

    const rawUpdateData: Record<string, unknown> = {
      'status.overall': newStatusOverall,
      'status.mentor': decision,
      mentorStatus: decision,
      mentorApprovedBy: decision === 'APPROVED' ? { uid: mentor.uid, name: mentor.displayName, email: mentor.email } : null,
      mentorApprovedAt: decision === 'APPROVED' ? now : null,
      mentorRejectedBy: decision === 'REJECTED' ? { uid: mentor.uid, name: mentor.displayName, email: mentor.email } : null,
      mentorRejectedAt: decision === 'REJECTED' ? now : null,
      ...(decision === 'REJECTED' && rejectionReason ? { mentorRemarks: rejectionReason } : {}),
      mentorReview: reviewSnapshot,
      timeline: arrayUnion(timelineEntry),
      updatedAt: serverTimestamp(),
      updatedBy: mentor.uid,
    };

    const updateData = sanitizeFirestoreData(rawUpdateData);

    debugLogger.step('Updating Firestore Pass Document', updateData);
    await updateDoc(odRef, updateData);
    debugLogger.step('Firestore Document Updated Successfully');

    // Audit log
    await logAudit(
      decision === 'APPROVED' ? 'MENTOR_APPROVED' : 'MENTOR_REJECTED',
      { uid: mentor.uid, name: mentor.displayName, email: mentor.email, role: mentor.role },
      { odId, requestNumber: od.requestNumber, rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined },
      { collection: 'movement_passes', id: odId }
    );
    debugLogger.step('Audit Log Written');

    if (decision === 'APPROVED') {
      // Notify Student
      await sendNotification(
        od.studentId,
        { uid: mentor.uid, name: mentor.displayName, role: mentor.role },
        'Movement Pass Approved by Mentor',
        `Your Movement Pass ${od.requestNumber} was approved by your mentor and is now pending HOD sanction.`,
        `/student/requests?highlight=${odId}`,
        'OD_MENTOR_APPROVED',
        odId
      );

      // Notify HOD(s)
      const hods = await fetchHODsByDepartment(od.department);
      for (const hod of hods) {
        await sendNotification(
          hod.uid,
          { uid: mentor.uid, name: mentor.displayName, role: mentor.role },
          'Pending HOD Approval Required',
          `Movement Pass ${od.requestNumber} (${od.studentSnapshot.name}) was approved by mentor and requires HOD sanction.`,
          `/hod/pending?highlight=${odId}`,
          'OD_SUBMITTED',
          odId
        );
      }
    } else {
      // Notify Student of rejection
      await sendNotification(
        od.studentId,
        { uid: mentor.uid, name: mentor.displayName, role: mentor.role },
        'Movement Pass Rejected by Mentor',
        `Your Movement Pass ${od.requestNumber} was rejected by your mentor. Reason: ${rejectionReason || 'No reason specified'}`,
        `/student/requests?highlight=${odId}`,
        'OD_MENTOR_REJECTED',
        odId
      );
    }

    debugLogger.success(`Mentor review completed successfully as ${decision}`);
  } catch (error) {
    debugLogger.error('mentorReviewODRequest', error, odId);
    throw error;
  }
};

export const hodReviewODRequest = async (
  odId: string,
  decision: 'APPROVED' | 'REJECTED',
  hod: UserProfile,
  rejectionReason?: string
): Promise<void> => {
  debugLogger.groupStart('hodReviewODRequest: Reviewing Movement Pass', {
    currentUser: { uid: hod.uid, name: hod.displayName, role: hod.role, email: hod.email },
    odId,
    action: decision,
    details: { rejectionReason },
  });

  try {
    const odRef = doc(db, 'movement_passes', odId);
    const snap = await getDoc(odRef);

    if (!snap.exists()) {
      const err = new Error(`Movement Pass ${odId} not found in Firestore`);
      debugLogger.error('hodReviewODRequest', err, odId);
      throw err;
    }

    const od = snap.data() as ODRequest;
    debugLogger.step('Pass Document Loaded', { requestNumber: od.requestNumber, currentStatus: od.status.overall });

    if (decision === 'APPROVED' && od.status.overall !== 'MENTOR_APPROVED') {
      const err = new Error('HOD Approval is strictly disabled until Faculty Mentor approval is completed.');
      debugLogger.error('hodReviewODRequest - Gating Violation', err, odId);
      throw err;
    }

    const now = new Date().toISOString();

    const reviewSnapshot: ApprovalSnapshot = {
      status: decision,
      approverUid: hod.uid,
      approverName: hod.displayName,
      approverEmail: hod.email,
      timestamp: now,
      ...(decision === 'REJECTED' && rejectionReason ? { rejectionReason } : {}),
    };

    const newStatusOverall = decision === 'APPROVED' ? 'HOD_APPROVED' : 'HOD_REJECTED';

    const timelineEntry: TimelineEntry = {
      id: `tl-${Date.now()}`,
      action: decision === 'APPROVED' ? 'HOD Sanctioned Pass (Final Approval)' : 'HOD Rejected Pass',
      performedBy: {
        uid: hod.uid,
        name: hod.displayName,
        role: hod.role,
      },
      timestamp: now,
      details: decision === 'REJECTED' ? `Reason: ${rejectionReason}` : 'Final Approval granted by Head of Department',
    };

    const rawUpdateData: Record<string, unknown> = {
      'status.overall': newStatusOverall,
      'status.hod': decision,
      hodStatus: decision,
      hodApprovedBy: decision === 'APPROVED' ? { uid: hod.uid, name: hod.displayName, email: hod.email } : null,
      hodApprovedAt: decision === 'APPROVED' ? now : null,
      hodRejectedBy: decision === 'REJECTED' ? { uid: hod.uid, name: hod.displayName, email: hod.email } : null,
      hodRejectedAt: decision === 'REJECTED' ? now : null,
      ...(decision === 'REJECTED' && rejectionReason ? { hodRemarks: rejectionReason } : {}),
      hodReview: reviewSnapshot,
      timeline: arrayUnion(timelineEntry),
      updatedAt: serverTimestamp(),
      updatedBy: hod.uid,
    };

    const updateData = sanitizeFirestoreData(rawUpdateData);

    debugLogger.step('Updating Firestore Pass Document', updateData);
    await updateDoc(odRef, updateData);
    debugLogger.step('Firestore Document Updated Successfully');

    await logAudit(
      decision === 'APPROVED' ? 'HOD_APPROVED' : 'HOD_REJECTED',
      { uid: hod.uid, name: hod.displayName, email: hod.email, role: hod.role },
      { odId, requestNumber: od.requestNumber, rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined },
      { collection: 'movement_passes', id: odId }
    );
    debugLogger.step('Audit Log Written');

    await sendNotification(
      od.studentId,
      { uid: hod.uid, name: hod.displayName, role: hod.role },
      decision === 'APPROVED' ? 'Movement Pass Approved by HOD' : 'Movement Pass Rejected by HOD',
      decision === 'APPROVED'
        ? `Your Movement Pass ${od.requestNumber} has been officially approved.`
        : `Your Movement Pass ${od.requestNumber} was rejected by HOD. Reason: ${rejectionReason}`,
      `/student/requests?highlight=${odId}`,
      decision === 'APPROVED' ? 'OD_HOD_APPROVED' : 'OD_HOD_REJECTED',
      odId
    );

    debugLogger.success(`HOD review completed successfully as ${decision}`);
  } catch (error) {
    debugLogger.error('hodReviewODRequest', error, odId);
    throw error;
  }
};

export const bulkHODApproveODRequests = async (
  odIds: string[],
  hod: UserProfile
): Promise<{ successCount: number; skippedCount: number }> => {
  debugLogger.groupStart('bulkHODApproveODRequests: Bulk Approving passes', {
    currentUser: { uid: hod.uid, name: hod.displayName, role: hod.role, email: hod.email },
    details: { totalCount: odIds.length, odIds },
  });

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    let successCount = 0;
    let skippedCount = 0;

    for (const id of odIds) {
      const odRef = doc(db, 'movement_passes', id);
      const snap = await getDoc(odRef);
      if (snap.exists()) {
        const od = snap.data() as ODRequest;
        if (od.status.overall === 'MENTOR_APPROVED') {
          const reviewSnapshot: ApprovalSnapshot = {
            status: 'APPROVED',
            approverUid: hod.uid,
            approverName: hod.displayName,
            approverEmail: hod.email,
            timestamp: now,
          };
          const timelineEntry: TimelineEntry = {
            id: `tl-${Date.now()}-${Math.random()}`,
            action: 'HOD Sanctioned Pass (Bulk Action)',
            performedBy: { uid: hod.uid, name: hod.displayName, role: hod.role },
            timestamp: now,
            details: 'Bulk approved by Head of Department',
          };

          const rawUpdateData: Record<string, unknown> = {
            'status.overall': 'HOD_APPROVED',
            'status.hod': 'APPROVED',
            hodStatus: 'APPROVED',
            hodApprovedBy: { uid: hod.uid, name: hod.displayName, email: hod.email },
            hodApprovedAt: now,
            hodReview: reviewSnapshot,
            timeline: arrayUnion(timelineEntry),
            updatedAt: serverTimestamp(),
            updatedBy: hod.uid,
          };

          const updateData = sanitizeFirestoreData(rawUpdateData);

          batch.update(odRef, updateData);
          successCount++;

          sendNotification(
            od.studentId,
            { uid: hod.uid, name: hod.displayName, role: hod.role },
            'Movement Pass Approved by HOD',
            `Your Movement Pass ${od.requestNumber} has been officially approved.`,
            `/student/requests?highlight=${id}`,
            'OD_HOD_APPROVED',
            id
          ).catch(() => {});
        } else {
          skippedCount++;
        }
      }
    }

    if (successCount > 0) {
      await batch.commit();
      await logAudit(
        'BULK_HOD_APPROVED',
        { uid: hod.uid, name: hod.displayName, email: hod.email, role: hod.role },
        { processedCount: successCount, skippedCount }
      );
    }

    debugLogger.success(`Bulk HOD Approval completed`, { successCount, skippedCount });
    return { successCount, skippedCount };
  } catch (error) {
    debugLogger.error('bulkHODApproveODRequests', error);
    throw error;
  }
};

export const bulkHODRejectODRequests = async (
  odIds: string[],
  rejectionReason: string,
  hod: UserProfile
): Promise<void> => {
  debugLogger.groupStart('bulkHODRejectODRequests: Bulk Rejecting Passes', {
    currentUser: { uid: hod.uid, name: hod.displayName, role: hod.role, email: hod.email },
    details: { totalCount: odIds.length, rejectionReason },
  });

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    for (const id of odIds) {
      const odRef = doc(db, 'movement_passes', id);
      const snap = await getDoc(odRef);
      if (snap.exists()) {
        const od = snap.data() as ODRequest;
        const reviewSnapshot: ApprovalSnapshot = {
          status: 'REJECTED',
          approverUid: hod.uid,
          approverName: hod.displayName,
          approverEmail: hod.email,
          timestamp: now,
          rejectionReason,
        };
        const timelineEntry: TimelineEntry = {
          id: `tl-${Date.now()}-${Math.random()}`,
          action: 'HOD Rejected Pass (Bulk Action)',
          performedBy: { uid: hod.uid, name: hod.displayName, role: hod.role },
          timestamp: now,
          details: `Bulk rejected. Reason: ${rejectionReason}`,
        };

        const rawUpdateData: Record<string, unknown> = {
          'status.overall': 'HOD_REJECTED',
          'status.hod': 'REJECTED',
          hodStatus: 'REJECTED',
          hodRejectedBy: { uid: hod.uid, name: hod.displayName, email: hod.email },
          hodRejectedAt: now,
          hodRemarks: rejectionReason,
          hodReview: reviewSnapshot,
          timeline: arrayUnion(timelineEntry),
          updatedAt: serverTimestamp(),
          updatedBy: hod.uid,
        };

        const updateData = sanitizeFirestoreData(rawUpdateData);

        batch.update(odRef, updateData);

        sendNotification(
          od.studentId,
          { uid: hod.uid, name: hod.displayName, role: hod.role },
          'Movement Pass Rejected by HOD',
          `Your Movement Pass ${od.requestNumber} was rejected by HOD. Reason: ${rejectionReason}`,
          `/student/requests?highlight=${id}`,
          'OD_HOD_REJECTED',
          id
        ).catch(() => {});
      }
    }

    await batch.commit();
    await logAudit(
      'BULK_HOD_REJECTED',
      { uid: hod.uid, name: hod.displayName, email: hod.email, role: hod.role },
      { processedCount: odIds.length, rejectionReason }
    );

    debugLogger.success('Bulk HOD Rejection completed');
  } catch (error) {
    debugLogger.error('bulkHODRejectODRequests', error);
    throw error;
  }
};

// Fetch Methods
export const fetchStudentODRequests = async (studentUid: string): Promise<ODRequest[]> => {
  try {
    const q = query(
      collection(db, 'movement_passes'),
      where('studentId', '==', studentUid),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ODRequest[];

    return list.sort((a, b) => {
      const tA = parseNotificationDate(a.createdAt).getTime();
      const tB = parseNotificationDate(b.createdAt).getTime();
      return tB - tA;
    });
  } catch (error) {
    console.error('Error fetching student passes:', error);
    return [];
  }
};

export const fetchMentorPendingRequests = async (
  mentorUid: string,
  mentorEmail?: string
): Promise<ODRequest[]> => {
  try {
    const itemsMap = new Map<string, ODRequest>();

    if (mentorUid) {
      const q1 = query(
        collection(db, 'movement_passes'),
        where('mentorId', '==', mentorUid),
        where('status.overall', '==', 'PENDING'),
        where('isDeleted', '==', false)
      );
      const snap1 = await getDocs(q1);
      snap1.docs.forEach((d) => itemsMap.set(d.id, { id: d.id, ...d.data() } as ODRequest));
    }

    if (mentorEmail) {
      const q2 = query(
        collection(db, 'movement_passes'),
        where('assignedMentorSnapshot.email', '==', mentorEmail.toLowerCase()),
        where('status.overall', '==', 'PENDING'),
        where('isDeleted', '==', false)
      );
      const snap2 = await getDocs(q2);
      snap2.docs.forEach((d) => itemsMap.set(d.id, { id: d.id, ...d.data() } as ODRequest));
    }

    return Array.from(itemsMap.values()).sort((a, b) => {
      const tA = parseNotificationDate(a.createdAt).getTime();
      const tB = parseNotificationDate(b.createdAt).getTime();
      return tB - tA;
    });
  } catch (error) {
    console.error('Error fetching mentor pending passes:', error);
    return [];
  }
};

export const fetchMentorHistoryRequests = async (
  mentorUid: string,
  mentorEmail?: string
): Promise<ODRequest[]> => {
  try {
    const itemsMap = new Map<string, ODRequest>();

    const processDocs = (snapDocs: any[]) => {
      snapDocs.forEach((d) => {
        const item = { id: d.id, ...d.data() } as ODRequest;
        if (item.status.overall !== 'PENDING') {
          itemsMap.set(d.id, item);
        }
      });
    };

    if (mentorUid) {
      const q1 = query(
        collection(db, 'movement_passes'),
        where('mentorId', '==', mentorUid),
        where('isDeleted', '==', false)
      );
      const snap1 = await getDocs(q1);
      processDocs(snap1.docs);
    }

    if (mentorEmail) {
      const q2 = query(
        collection(db, 'movement_passes'),
        where('assignedMentorSnapshot.email', '==', mentorEmail.toLowerCase()),
        where('isDeleted', '==', false)
      );
      const snap2 = await getDocs(q2);
      processDocs(snap2.docs);
    }

    return Array.from(itemsMap.values()).sort((a, b) => {
      const tA = parseNotificationDate(a.createdAt).getTime();
      const tB = parseNotificationDate(b.createdAt).getTime();
      return tB - tA;
    });
  } catch (error) {
    console.error('Error fetching mentor history passes:', error);
    return [];
  }
};

export const fetchHODPendingRequests = async (department: Department): Promise<ODRequest[]> => {
  try {
    const q = query(
      collection(db, 'movement_passes'),
      where('department', '==', department),
      where('status.overall', 'in', ['PENDING', 'MENTOR_APPROVED']),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ODRequest[];
    return list.sort((a, b) => {
      const tA = parseNotificationDate(a.createdAt).getTime();
      const tB = parseNotificationDate(b.createdAt).getTime();
      return tB - tA;
    });
  } catch (error) {
    console.error('Error fetching HOD pending passes:', error);
    return [];
  }
};

export const fetchHODHistoryRequests = async (department: Department): Promise<ODRequest[]> => {
  try {
    const q = query(
      collection(db, 'movement_passes'),
      where('department', '==', department),
      where('status.overall', 'in', ['HOD_APPROVED', 'HOD_REJECTED', 'MENTOR_REJECTED']),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ODRequest[];
    return list.sort((a, b) => {
      const tA = parseNotificationDate(a.createdAt).getTime();
      const tB = parseNotificationDate(b.createdAt).getTime();
      return tB - tA;
    });
  } catch (error) {
    console.error('Error fetching HOD history passes:', error);
    return [];
  }
};

export const fetchAllODRequests = async (): Promise<ODRequest[]> => {
  try {
    const q = query(
      collection(db, 'movement_passes'),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ODRequest[];
    const sorted = list.sort((a, b) => {
      const tA = parseNotificationDate(a.createdAt).getTime();
      const tB = parseNotificationDate(b.createdAt).getTime();
      return tB - tA;
    });
    return checkAndExpireODRequests(sorted);
  } catch (error) {
    console.error('Error fetching all passes:', error);
    return [];
  }
};

export const checkAndExpireODRequests = async (requests: ODRequest[]): Promise<ODRequest[]> => {
  const todayStr = new Date().toISOString().split('T')[0];
  const expiredPromises: Promise<void>[] = [];

  const updatedRequests = requests.map((req) => {
    if (req.status.overall === 'PENDING' || req.status.overall === 'MENTOR_APPROVED') {
      const targetDate = req.endDate || req.startDate;
      if (targetDate && targetDate < todayStr) {
        expiredPromises.push(
          (async () => {
            try {
              const reqRef = doc(db, 'movement_passes', req.id);
              const now = new Date().toISOString();
              const expiredTimeline: TimelineEntry = {
                id: `tl-${Date.now()}`,
                action: 'Movement Pass Expired (Date Passed)',
                performedBy: { uid: 'system', name: 'System Auto-Expiry', role: 'SYSTEM' },
                timestamp: now,
                details: `Pass date (${targetDate}) passed prior to final sanction.`,
              };

              const cleanData = sanitizeFirestoreData({
                'status.overall': 'EXPIRED',
                timeline: arrayUnion(expiredTimeline),
                updatedAt: serverTimestamp(),
              });

              await updateDoc(reqRef, cleanData);

              sendNotification(
                req.studentId,
                { uid: 'system', name: 'System Auto-Expiry', role: 'SYSTEM' },
                'Movement Pass Expired',
                `Your Movement Pass application (${req.requestNumber}) expired because its date passed prior to final sanction.`,
                '/student/requests',
                'SYSTEM',
                req.id
              ).catch(console.error);

              if (req.mentorId) {
                sendNotification(
                  req.mentorId,
                  { uid: 'system', name: 'System Auto-Expiry', role: 'SYSTEM' },
                  'Assigned Movement Pass Expired',
                  `Movement Pass (${req.requestNumber}) for ${req.studentSnapshot?.name} expired.`,
                  '/mentor/history',
                  'SYSTEM',
                  req.id
                ).catch(console.error);
              }
            } catch (err) {
              console.error('Error auto-expiring pass:', req.id, err);
            }
          })()
        );

        return {
          ...req,
          status: {
            ...req.status,
            overall: 'EXPIRED' as ODStatus,
          },
        };
      }
    }
    return req;
  });

  if (expiredPromises.length > 0) {
    Promise.all(expiredPromises).catch(console.error);
  }

  return updatedRequests;
};

export const withdrawODRequest = async (
  requestId: string,
  studentUser: UserProfile
): Promise<void> => {
  const reqRef = doc(db, 'movement_passes', requestId);
  const snap = await getDoc(reqRef);

  if (!snap.exists()) {
    throw new Error('Movement Pass not found.');
  }

  const reqData = snap.data() as ODRequest;
  if (reqData.studentId !== studentUser.uid) {
    throw new Error('Only the student who created this application may withdraw it.');
  }

  if (reqData.status.overall === 'WITHDRAWN' || reqData.status.overall === 'EXPIRED') {
    throw new Error(`This application is already ${reqData.status.overall.toLowerCase()}.`);
  }

  const now = new Date().toISOString();
  const withdrawTimeline: TimelineEntry = {
    id: `tl-${Date.now()}`,
    action: 'Movement Pass Withdrawn by Student',
    performedBy: {
      uid: studentUser.uid,
      name: studentUser.displayName,
      role: studentUser.role,
    },
    timestamp: now,
  };

  const cleanData = sanitizeFirestoreData({
    'status.overall': 'WITHDRAWN',
    timeline: arrayUnion(withdrawTimeline),
    updatedAt: serverTimestamp(),
    updatedBy: studentUser.uid,
  });

  await updateDoc(reqRef, cleanData);

  if (reqData.mentorId) {
    sendNotification(
      reqData.mentorId,
      { uid: studentUser.uid, name: studentUser.displayName, role: studentUser.role },
      'Movement Pass Withdrawn',
      `${studentUser.displayName} has withdrawn Movement Pass (${reqData.requestNumber}).`,
      '/mentor/history',
      'STATUS_UPDATE',
      requestId
    ).catch(console.error);
  }

  fetchHODsByDepartment(reqData.department)
    .then((hods) => {
      hods.forEach((hod) => {
        sendNotification(
          hod.uid,
          { uid: studentUser.uid, name: studentUser.displayName, role: studentUser.role },
          'Movement Pass Withdrawn',
          `${studentUser.displayName} (${reqData.department}) has withdrawn Movement Pass (${reqData.requestNumber}).`,
          '/hod/history',
          'STATUS_UPDATE',
          requestId
        ).catch(console.error);
      });
    })
    .catch(console.error);

  await logAudit(
    'USER_UPDATED',
    { uid: studentUser.uid, name: studentUser.displayName, email: studentUser.email, role: studentUser.role },
    { action: 'PASS_WITHDRAWN', requestId, requestNumber: reqData.requestNumber },
    { collection: 'movement_passes', id: requestId }
  );
};

export const fetchAuditLogs = async () => {
  try {
    const q = query(collection(db, 'audit_logs'));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Record<string, any>[];
    return list.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};
