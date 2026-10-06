import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudentODRequests,
  fetchMentorPendingRequests,
  fetchMentorHistoryRequests,
  fetchHODPendingRequests,
  fetchHODHistoryRequests,
  fetchAllODRequests,
  createODRequest,
  mentorReviewODRequest,
  hodReviewODRequest,
  bulkHODApproveODRequests,
  bulkHODRejectODRequests,
  withdrawODRequest,
} from '../services/firebase/odService';
import type { CreateODDTO } from '../types/od';
import type { UserProfile, Department } from '../types/user';

export const QUERY_KEYS = {
  studentODs: (studentUid: string) => ['movement_passes', 'student', studentUid],
  mentorPending: (mentorUid: string, email?: string) => ['movement_passes', 'mentor', 'pending', mentorUid, email || ''],
  mentorHistory: (mentorUid: string, email?: string) => ['movement_passes', 'mentor', 'history', mentorUid, email || ''],
  hodPending: (dept: Department) => ['movement_passes', 'hod', 'pending', dept],
  hodHistory: (dept: Department) => ['movement_passes', 'hod', 'history', dept],
  allODs: () => ['movement_passes', 'all'],
};

export const useStudentODRequests = (studentUid?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.studentODs(studentUid || ''),
    queryFn: () => fetchStudentODRequests(studentUid || ''),
    enabled: !!studentUid,
  });
};

export const useMentorPendingRequests = (mentorUid?: string, mentorEmail?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.mentorPending(mentorUid || '', mentorEmail),
    queryFn: () => fetchMentorPendingRequests(mentorUid || '', mentorEmail),
    enabled: !!mentorUid || !!mentorEmail,
  });
};

export const useMentorHistoryRequests = (mentorUid?: string, mentorEmail?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.mentorHistory(mentorUid || '', mentorEmail),
    queryFn: () => fetchMentorHistoryRequests(mentorUid || '', mentorEmail),
    enabled: !!mentorUid || !!mentorEmail,
  });
};

export const useHODPendingRequests = (department?: Department) => {
  return useQuery({
    queryKey: QUERY_KEYS.hodPending(department || 'CSE'),
    queryFn: () => fetchHODPendingRequests(department || 'CSE'),
    enabled: !!department,
  });
};

export const useHODHistoryRequests = (department?: Department) => {
  return useQuery({
    queryKey: QUERY_KEYS.hodHistory(department || 'CSE'),
    queryFn: () => fetchHODHistoryRequests(department || 'CSE'),
    enabled: !!department,
  });
};

export const useAllODRequests = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.allODs(),
    queryFn: fetchAllODRequests,
    enabled: options?.enabled ?? true,
  });
};

// Global cache invalidation helper
const invalidateAllWorkflowQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['movement_passes'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
  queryClient.invalidateQueries({ queryKey: ['users'] });
};

// Mutations
export const useCreateODMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dto, student }: { dto: CreateODDTO; student: UserProfile }) =>
      createODRequest(dto, student),
    onSuccess: () => {
      invalidateAllWorkflowQueries(queryClient);
    },
  });
};

export const useWithdrawODMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, student }: { requestId: string; student: UserProfile }) =>
      withdrawODRequest(requestId, student),
    onSuccess: () => {
      invalidateAllWorkflowQueries(queryClient);
    },
  });
};

export const useMentorReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      odId,
      decision,
      mentor,
      rejectionReason,
    }: {
      odId: string;
      decision: 'APPROVED' | 'REJECTED';
      mentor: UserProfile;
      rejectionReason?: string;
    }) => mentorReviewODRequest(odId, decision, mentor, rejectionReason),
    onSuccess: () => {
      invalidateAllWorkflowQueries(queryClient);
    },
  });
};

export const useHODReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      odId,
      decision,
      hod,
      rejectionReason,
    }: {
      odId: string;
      decision: 'APPROVED' | 'REJECTED';
      hod: UserProfile;
      rejectionReason?: string;
    }) => hodReviewODRequest(odId, decision, hod, rejectionReason),
    onSuccess: () => {
      invalidateAllWorkflowQueries(queryClient);
    },
  });
};

export const useBulkHODApproveMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ odIds, hod }: { odIds: string[]; hod: UserProfile }) =>
      bulkHODApproveODRequests(odIds, hod),
    onSuccess: () => {
      invalidateAllWorkflowQueries(queryClient);
    },
  });
};

export const useBulkHODRejectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      odIds,
      rejectionReason,
      hod,
    }: {
      odIds: string[];
      rejectionReason: string;
      hod: UserProfile;
    }) => bulkHODRejectODRequests(odIds, rejectionReason, hod),
    onSuccess: () => {
      invalidateAllWorkflowQueries(queryClient);
    },
  });
};
