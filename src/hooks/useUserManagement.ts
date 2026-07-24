import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllUsers,
  fetchMentorsByDepartment,
  fetchAllMentors,
  fetchStudentsForMentor,
  fetchStudentsForDepartment,
  fetchHODsByDepartment,
  assignMentorToStudent,
  softDeleteUser,
  updateUserProfile,
} from '../services/firebase/userService';
import {
  fetchImportedRegistry,
  addRegistryRecord,
  updateRegistryRecord,
  deleteRegistryRecord,
  bulkImportRegistryFromExcel,
} from '../services/firebase/registryService';
import type { UserProfile, Department, ImportedUserRecord } from '../types/user';

export const useAllUsers = () => {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: fetchAllUsers,
  });
};

export const useAllMentors = () => {
  return useQuery({
    queryKey: ['users', 'mentors', 'all'],
    queryFn: fetchAllMentors,
  });
};

export const useMentorsByDepartment = (department?: Department) => {
  return useQuery({
    queryKey: ['users', 'mentors', department],
    queryFn: () => fetchMentorsByDepartment(department || 'CSE'),
    enabled: !!department,
  });
};

export const useStudentsForMentor = (mentorUid?: string, mentorEmail?: string) => {
  return useQuery({
    queryKey: ['users', 'students', 'mentor', mentorUid, mentorEmail],
    queryFn: () => fetchStudentsForMentor(mentorUid || '', mentorEmail || ''),
    enabled: !!mentorUid || !!mentorEmail,
  });
};

export const useStudentsForDepartment = (department?: Department) => {
  return useQuery({
    queryKey: ['users', 'students', 'department', department],
    queryFn: () => fetchStudentsForDepartment(department || 'CSE'),
    enabled: !!department,
  });
};

export const useHODsForDepartment = (department?: Department) => {
  return useQuery({
    queryKey: ['users', 'hods', department],
    queryFn: () => fetchHODsByDepartment(department || 'CSE'),
    enabled: !!department,
  });
};

export const useImportedRegistry = () => {
  return useQuery({
    queryKey: ['imported_registry'],
    queryFn: fetchImportedRegistry,
  });
};

export const useAssignMentorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentUid,
      mentor,
      performedBy,
    }: {
      studentUid: string;
      mentor: UserProfile;
      performedBy: { uid: string; name: string; email: string; role: string };
    }) => assignMentorToStudent(studentUid, mentor, performedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      uid,
      updates,
      performedBy,
    }: {
      uid: string;
      updates: Partial<UserProfile>;
      performedBy: { uid: string; name: string; email: string; role: string };
    }) => updateUserProfile(uid, updates, performedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useSoftDeleteUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetUid,
      performedBy,
    }: {
      targetUid: string;
      performedBy: { uid: string; name: string; email: string; role: string };
    }) => softDeleteUser(targetUid, performedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useAddRegistryRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<ImportedUserRecord, 'id' | 'isLinked'>) =>
      addRegistryRecord(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported_registry'] });
    },
  });
};

export const useUpdateRegistryRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      updates,
      performedBy,
    }: {
      docId: string;
      updates: Partial<ImportedUserRecord>;
      performedBy: { uid: string; name: string; email: string; role: string };
    }) => updateRegistryRecord(docId, updates, performedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported_registry'] });
    },
  });
};

export const useDeleteRegistryRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      performedBy,
    }: {
      docId: string;
      performedBy: { uid: string; name: string; email: string; role: string };
    }) => deleteRegistryRecord(docId, performedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported_registry'] });
    },
  });
};

export const useBulkImportRegistryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      performedBy,
    }: {
      file: File;
      performedBy: { uid: string; name: string; email: string; role: string };
    }) => bulkImportRegistryFromExcel(file, performedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported_registry'] });
    },
  });
};
