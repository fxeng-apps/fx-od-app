import { z } from 'zod';

export const odRequestSchema = z.object({
  facultyInCharge: z
    .string()
    .min(3, 'Faculty in charge name is required (min 3 characters)'),
  purpose: z
    .string()
    .min(10, 'Please provide a detailed purpose (min 10 characters)')
    .max(500, 'Purpose cannot exceed 500 characters'),
  proofDocumentUrl: z
    .string()
    .url('Must be a valid URL link (e.g. Google Drive link)')
    .optional()
    .or(z.literal('')),
  schedule: z
    .array(
      z.object({
        date: z.string().min(1, 'Date is required'),
        passType: z.enum(['FULL_DAY', 'PARTIAL']),
        periods: z.array(z.number()),
      })
    )
    .min(1, 'At least one date is required'),
});

export type ODRequestFormData = z.infer<typeof odRequestSchema>;

export const rejectionReasonSchema = z.object({
  reason: z
    .string()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(300, 'Reason cannot exceed 300 characters'),
});

export type RejectionReasonFormData = z.infer<typeof rejectionReasonSchema>;

export const userManagementSchema = z.object({
  role: z.enum([
    'STUDENT',
    'MENTOR',
    'HOD',
    'PRINCIPAL',
    'ACADEMIC_COORDINATOR',
    'SUPER_ADMIN',
  ]),
  department: z.enum(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI_DS']),
  mentorUid: z.string().optional(),
});

export type UserManagementFormData = z.infer<typeof userManagementSchema>;
