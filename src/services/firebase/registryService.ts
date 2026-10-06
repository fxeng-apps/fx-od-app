import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ImportedUserRecord, UserRole, Department } from '../../types/user';
import { logAudit } from './auditService';
import { sanitizeFirestoreData } from '../../utils/sanitize';

export interface ImportReport {
  success: boolean;
  totalRows: number;
  addedCount: number;
  skippedCount: number;
  errors: string[];
  invalidEmails: string[];
  duplicateEmails: string[];
  missingRequiredColumns?: string[];
}

export const fetchImportedRegistry = async (): Promise<ImportedUserRecord[]> => {
  try {
    const snap = await getDocs(collection(db, 'imported_users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ImportedUserRecord[];
  } catch (error) {
    console.error('Error fetching imported registry:', error);
    return [];
  }
};

export const findRegistryByEmail = async (
  email: string
): Promise<ImportedUserRecord | null> => {
  try {
    const q = query(
      collection(db, 'imported_users'),
      where('email', '==', email.toLowerCase())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as ImportedUserRecord;
    }
    return null;
  } catch (error) {
    console.error('Error finding registry record by email:', error);
    return null;
  }
};

export const addRegistryRecord = async (
  record: Omit<ImportedUserRecord, 'id' | 'isLinked'>
): Promise<string> => {
  const email = record.email.toLowerCase().trim();
  const existing = await findRegistryByEmail(email);
  if (existing) {
    throw new Error(`Email ${email} is already registered in the roster.`);
  }

  const rawData = {
    email,
    displayName: record.displayName.trim(),
    role: record.role,
    department: record.department,
    registerNumber: record.registerNumber?.trim() || null,
    year: record.year || null,
    section: record.section?.trim() || null,
    mentorEmail: record.mentorEmail?.toLowerCase().trim() || null,
    isLinked: false,
    createdAt: serverTimestamp(),
  };

  const cleanData = sanitizeFirestoreData(rawData);
  const docRef = await addDoc(collection(db, 'imported_users'), cleanData);
  return docRef.id;
};

export const updateRegistryRecord = async (
  docId: string,
  updates: Partial<ImportedUserRecord>,
  performedBy: { uid: string; name: string; email: string; role: string }
): Promise<void> => {
  const registryRef = doc(db, 'imported_users', docId);
  const cleanData = sanitizeFirestoreData({
    ...updates,
    email: updates.email ? updates.email.toLowerCase().trim() : undefined,
    displayName: updates.displayName ? updates.displayName.trim() : undefined,
    mentorEmail: updates.mentorEmail !== undefined ? (updates.mentorEmail ? updates.mentorEmail.toLowerCase().trim() : null) : undefined,
    registerNumber: updates.registerNumber !== undefined ? (updates.registerNumber ? updates.registerNumber.trim() : null) : undefined,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(registryRef, cleanData);

  await logAudit(
    'USER_UPDATED',
    performedBy,
    { docId, updates: cleanData },
    { collection: 'imported_users', id: docId }
  );
};

export const deleteRegistryRecord = async (
  docId: string,
  performedBy: { uid: string; name: string; email: string; role: string }
): Promise<void> => {
  const registryRef = doc(db, 'imported_users', docId);
  await deleteDoc(registryRef);

  await logAudit(
    'USER_DISABLED',
    performedBy,
    { docId, action: 'REGISTRY_RECORD_DELETED' },
    { collection: 'imported_users', id: docId }
  );
};

export const bulkImportRegistryFromExcel = async (
  file: File,
  performedBy: { uid: string; name: string; email: string; role: string }
): Promise<ImportReport> => {
  const report: ImportReport = {
    success: false,
    totalRows: 0,
    addedCount: 0,
    skippedCount: 0,
    errors: [],
    invalidEmails: [],
    duplicateEmails: [],
    missingRequiredColumns: [],
  };

  try {
    const data = await file.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(data);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });

    report.totalRows = rows.length;

    if (rows.length === 0) {
      report.errors.push('Excel file is empty or contains no valid rows.');
      return report;
    }

    // 1. Column Validation
    const firstRowKeys = Object.keys(rows[0]).map((k) => k.trim().toLowerCase());
    const missingCols: string[] = [];

    const hasEmail = firstRowKeys.some((k) => k === 'email');
    const hasName = firstRowKeys.some((k) => k === 'name' || k === 'displayname');
    const hasRole = firstRowKeys.some((k) => k === 'role');
    const hasDept = firstRowKeys.some((k) => k === 'department' || k === 'dept');

    if (!hasEmail) missingCols.push('email');
    if (!hasName) missingCols.push('name');
    if (!hasRole) missingCols.push('role');
    if (!hasDept) missingCols.push('department');

    if (missingCols.length > 0) {
      report.missingRequiredColumns = missingCols;
      report.errors.push(`Missing required header columns: ${missingCols.join(', ')}`);
      return report;
    }

    // 2. Fetch Existing Emails from Firestore
    const existingSnap = await getDocs(collection(db, 'imported_users'));
    const existingEmails = new Set(
      existingSnap.docs.map((d) => (d.data().email as string || '').toLowerCase())
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const currentBatchEmails = new Set<string>();
    const batch = writeBatch(db);

    // 3. Process Each Row with Strict Sanitization
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2;

      const rawEmail = (
        row.email ||
        row.Email ||
        row.EMAIL ||
        ''
      ).toLowerCase().trim();

      const rawName = (
        row.name ||
        row.Name ||
        row.displayName ||
        row.DisplayName ||
        ''
      ).trim();

      const rawRole = (
        row.role ||
        row.Role ||
        'STUDENT'
      ).toUpperCase().trim() as UserRole;

      const rawDept = (
        row.department ||
        row.Department ||
        row.dept ||
        'CSE'
      ).toUpperCase().trim() as Department;

      const rawRegNo = (
        row.registerNumber ||
        row.registerNo ||
        row.RegisterNo ||
        ''
      ).trim();

      const rawYear = (
        row.year ||
        row.Year ||
        ''
      ).trim() as 'I' | 'II' | 'III' | 'IV' | '';

      const rawSection = (
        row.section ||
        row.Section ||
        ''
      ).trim();

      const rawMentorEmail = (
        row.mentorEmail ||
        row.MentorEmail ||
        ''
      ).toLowerCase().trim();

      // Email Format Check
      if (!rawEmail || !emailRegex.test(rawEmail)) {
        report.invalidEmails.push(`Row ${rowNum}: "${rawEmail || 'EMPTY'}"`);
        report.skippedCount++;
        continue;
      }

      // Duplicate Check
      if (existingEmails.has(rawEmail) || currentBatchEmails.has(rawEmail)) {
        report.duplicateEmails.push(`Row ${rowNum}: ${rawEmail}`);
        report.skippedCount++;
        continue;
      }

      const newDocRef = doc(collection(db, 'imported_users'));

      const rawRecord: Record<string, unknown> = {
        email: rawEmail,
        displayName: rawName || rawEmail.split('@')[0],
        role: rawRole,
        department: rawDept,
        registerNumber: rawRegNo || null,
        year: rawYear || null,
        section: rawSection || null,
        mentorEmail: rawMentorEmail || null,
        isLinked: false,
        createdAt: serverTimestamp(),
      };

      const cleanRecord = sanitizeFirestoreData(rawRecord);

      batch.set(newDocRef, cleanRecord);
      currentBatchEmails.add(rawEmail);
      report.addedCount++;
    }

    if (report.addedCount > 0) {
      await batch.commit();
      await logAudit(
        'USER_CREATED',
        performedBy,
        {
          addedCount: report.addedCount,
          skippedCount: report.skippedCount,
          filename: file.name,
        },
        { collection: 'imported_users', id: 'bulk_excel_import' }
      );
    }

    report.success = true;
    return report;
  } catch (err) {
    console.error('Error during bulk Excel import:', err);
    report.errors.push(err instanceof Error ? err.message : 'Unknown Excel import error');
    return report;
  }
};

// Seed default institutional allowlist registry if empty
export const seedDefaultRegistryIfEmpty = async (): Promise<void> => {
  try {
    const snap = await getDocs(collection(db, 'imported_users'));
    if (!snap.empty) return;

    const defaultRoster: Omit<ImportedUserRecord, 'id'>[] = [
      {
        email: 'student@fx.edu.in',
        displayName: 'Arun Kumar K',
        role: 'STUDENT',
        department: 'CSE',
        registerNumber: '951221104001',
        year: 'III',
        section: 'A',
        mentorEmail: 'mentor@fx.edu.in',
        isLinked: false,
      },
      {
        email: 'mentor@fx.edu.in',
        displayName: 'Dr. S. Premkumar',
        role: 'MENTOR',
        department: 'CSE',
        isLinked: false,
      },
      {
        email: 'hod@fx.edu.in',
        displayName: 'Dr. G. Rajkumar (HOD)',
        role: 'HOD',
        department: 'CSE',
        isLinked: false,
      },
      {
        email: 'admin@fx.edu.in',
        displayName: 'Super Administrator',
        role: 'SUPER_ADMIN',
        department: 'CSE',
        isLinked: false,
      },
    ];

    const batch = writeBatch(db);
    defaultRoster.forEach((item) => {
      const ref = doc(collection(db, 'imported_users'));
      const clean = sanitizeFirestoreData({ ...item, createdAt: serverTimestamp() });
      batch.set(ref, clean);
    });
    await batch.commit();
  } catch (error) {
    console.error('Failed to seed default registry:', error);
  }
};
