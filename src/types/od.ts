import type { Timestamp } from 'firebase/firestore';
import type { UserSnapshot, Department } from './user';

export type MovementPassOverallStatus =
  | 'PENDING'
  | 'MENTOR_APPROVED'
  | 'MENTOR_REJECTED'
  | 'HOD_APPROVED'
  | 'HOD_REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type PassType = 'FULL_DAY' | 'PARTIAL';

export interface ScheduleEntry {
  date: string; // YYYY-MM-DD
  passType: PassType;
  periods: number[]; // e.g. [1, 2, 3, 4, 5, 6, 7] or specific periods
}

export interface ApprovalSnapshot {
  status: 'APPROVED' | 'REJECTED';
  approverUid: string;
  approverName: string;
  approverEmail: string;
  timestamp: string | Timestamp;
  rejectionReason?: string;
}

export interface TimelineEntry {
  id: string;
  action: string;
  performedBy: {
    uid: string;
    name: string;
    role: string;
  };
  timestamp: string | Timestamp;
  details?: string;
}

export interface MovementPass {
  id: string;
  requestNumber: string;
  studentId: string; // studentId replaces studentUid
  studentSnapshot: UserSnapshot;
  mentorId: string; // mentorId replaces assignedMentorUid
  assignedMentorSnapshot: UserSnapshot;
  department: Department;
  facultyInCharge: string;
  purpose: string; // purpose replaces description
  proofDocumentUrl?: string;
  status: {
    overall: MovementPassOverallStatus;
    mentor: 'PENDING' | 'APPROVED' | 'REJECTED';
    hod: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
  schedule: ScheduleEntry[];

  // Helper properties for backward compatibility with existing table columns and sorting
  startDate: string;
  endDate?: string;
  totalDays: number;
  studentUid?: string;
  assignedMentorUid?: string | null;
  description?: string;
  odType?: string;

  // Specific Mentor Approval Fields
  mentorStatus?: 'APPROVED' | 'REJECTED';
  mentorApprovedBy?: { uid: string; name: string; email: string };
  mentorApprovedAt?: string;
  mentorRejectedBy?: { uid: string; name: string; email: string };
  mentorRejectedAt?: string;
  mentorRemarks?: string;
  mentorReview?: ApprovalSnapshot;

  // Specific HOD Approval Fields
  hodStatus?: 'APPROVED' | 'REJECTED';
  hodApprovedBy?: { uid: string; name: string; email: string };
  hodApprovedAt?: string;
  hodRejectedBy?: { uid: string; name: string; email: string };
  hodRejectedAt?: string;
  hodRemarks?: string;
  hodReview?: ApprovalSnapshot;

  timeline: TimelineEntry[];
  isDeleted: boolean;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  createdBy?: string;
  updatedBy?: string;
}

export type ODRequest = MovementPass;

export interface CreateMovementPassDTO {
  facultyInCharge: string;
  purpose: string;
  proofDocumentUrl?: string;
  schedule: ScheduleEntry[];
}

export type CreateODDTO = CreateMovementPassDTO;
