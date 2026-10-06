import React, { useState } from 'react';
import {
  CheckCircle,
  Download,
  AlertTriangle,
  Upload,
  Plus,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  useAllUsers,
  useAllMentors,
  useImportedRegistry,
  useAssignMentorMutation,
  useSoftDeleteUserMutation,
  useAddRegistryRecordMutation,
  useUpdateUserProfileMutation,
  useUpdateRegistryRecordMutation,
  useDeleteRegistryRecordMutation,
  useBulkImportRegistryMutation,
} from '../../hooks/useUserManagement';
import type { ImportReport } from '../../services/firebase/registryService';
import { UserManagementTable } from '../../components/tables/UserManagementTable';
import { Loader } from '../../components/common/Loader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import type { UserRole, UserProfile, Department, ImportedUserRecord } from '../../types/user';

export const UserManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [manualFormError, setManualFormError] = useState<string | null>(null);

  // Form State for manual user creation
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');
  const [newDepartment, setNewDepartment] = useState<Department>('CSE');
  const [newRegNo, setNewRegNo] = useState('');
  const [newYear, setNewYear] = useState<'I' | 'II' | 'III' | 'IV' | ''>('III');
  const [newSection, setNewSection] = useState('A');
  const [newMentorEmail, setNewMentorEmail] = useState('');

  const { data: users = [], isLoading: isLoadingUsers } = useAllUsers();
  const { data: mentors = [] } = useAllMentors();
  const { data: registry = [], isLoading: isLoadingRegistry } = useImportedRegistry();

  const assignMentorMutation = useAssignMentorMutation();
  const updateUserMutation = useUpdateUserProfileMutation();
  const updateRegistryMutation = useUpdateRegistryRecordMutation();
  const softDeleteUserMutation = useSoftDeleteUserMutation();
  const deleteRegistryMutation = useDeleteRegistryRecordMutation();
  const addRegistryMutation = useAddRegistryRecordMutation();
  const bulkImportMutation = useBulkImportRegistryMutation();

  const handleUpdateUser = (uid: string, updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    updateUserMutation.mutate({
      uid,
      updates,
      performedBy: {
        uid: userProfile.uid,
        name: userProfile.displayName,
        email: userProfile.email,
        role: userProfile.role,
      },
    });
  };

  const handleUpdateRegistry = (docId: string, updates: Partial<ImportedUserRecord>) => {
    if (!userProfile) return;
    updateRegistryMutation.mutate({
      docId,
      updates,
      performedBy: {
        uid: userProfile.uid,
        name: userProfile.displayName,
        email: userProfile.email,
        role: userProfile.role,
      },
    });
  };

  const handleSoftDeleteUser = (uid: string) => {
    if (!userProfile) return;
    softDeleteUserMutation.mutate({
      targetUid: uid,
      performedBy: {
        uid: userProfile.uid,
        name: userProfile.displayName,
        email: userProfile.email,
        role: userProfile.role,
      },
    });
  };

  const handleDeleteRegistry = (docId: string) => {
    if (!userProfile) return;
    deleteRegistryMutation.mutate({
      docId,
      performedBy: {
        uid: userProfile.uid,
        name: userProfile.displayName,
        email: userProfile.email,
        role: userProfile.role,
      },
    });
  };

  const handleAssignMentor = (studentUid: string, mentor: UserProfile) => {
    if (!userProfile) return;
    assignMentorMutation.mutate({
      studentUid,
      mentor,
      performedBy: {
        uid: userProfile.uid,
        name: userProfile.displayName,
        email: userProfile.email,
        role: userProfile.role,
      },
    });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError(null);

    const emailClean = newEmail.trim().toLowerCase();
    const nameClean = newName.trim();

    if (!emailClean || !nameClean) {
      setManualFormError('Full Name and College Email are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      setManualFormError('Please enter a valid email address format.');
      return;
    }

    // Duplicate Check
    const existsInUsers = users.some((u) => u.email.toLowerCase() === emailClean);
    const existsInRegistry = registry.some((r) => r.email.toLowerCase() === emailClean);

    if (existsInUsers || existsInRegistry) {
      setManualFormError(`The email ${emailClean} is already registered in the system.`);
      return;
    }

    try {
      await addRegistryMutation.mutateAsync({
        email: emailClean,
        displayName: nameClean,
        role: newRole,
        department: newDepartment,
        registerNumber: newRole === 'STUDENT' ? newRegNo.trim() || undefined : undefined,
        year: newRole === 'STUDENT' && newYear ? newYear : undefined,
        section: newRole === 'STUDENT' ? newSection.trim() || undefined : undefined,
        mentorEmail: newRole === 'STUDENT' ? newMentorEmail.trim().toLowerCase() || undefined : undefined,
      });

      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewRegNo('');
      setNewMentorEmail('');
    } catch (err) {
      setManualFormError(err instanceof Error ? err.message : 'Failed to register user');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;
    try {
      const resultReport = await bulkImportMutation.mutateAsync({
        file,
        performedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName,
          email: userProfile.email,
          role: userProfile.role,
        },
      });
      setImportReport(resultReport);
      e.target.value = '';
    } catch (err) {
      console.error('Excel upload error:', err);
    }
  };

  const isLoading = isLoadingUsers || isLoadingRegistry;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white tracking-tight">Institutional User Management</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage active user accounts and pre-registered institutional roster records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/sample_roster_template.csv"
            download="sample_roster_template.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <Download className="w-3.5 h-3.5 text-[#2f5da8]" />
            <span>CSV Template</span>
          </a>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#2f5da8] hover:bg-[#234a87] text-white">
            <Upload className="w-3.5 h-3.5" />
            <span>{bulkImportMutation.isPending ? 'Validating...' : 'Import Excel'}</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={bulkImportMutation.isPending}
            />
          </label>

          <Button variant="secondary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-1 w-3.5 h-3.5 text-[#2f5da8]" /> Add User
          </Button>
        </div>
      </div>

      {/* Excel Validation Report Drawer Banner */}
      {importReport && (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs text-gray-800 dark:text-white">
              {importReport.success ? (
                <CheckCircle className="text-green-600 w-4 h-4" />
              ) : (
                <AlertTriangle className="text-red-600 w-4 h-4" />
              )}
              <span>Excel Import Validation Summary</span>
            </div>
            <button
              onClick={() => setImportReport(null)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-md border border-gray-200 dark:border-gray-600">
              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Total Rows</span>
              <span className="font-semibold text-gray-800 dark:text-white text-xs">{importReport.totalRows}</span>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-md border border-gray-200 dark:border-gray-600">
              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Added</span>
              <span className="font-semibold text-green-600 text-xs">{importReport.addedCount}</span>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-md border border-gray-200 dark:border-gray-600">
              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Skipped</span>
              <span className="font-semibold text-amber-600 text-xs">{importReport.skippedCount}</span>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-md border border-gray-200 dark:border-gray-600">
              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Errors</span>
              <span className="font-semibold text-red-600 text-xs">
                {importReport.errors.length + importReport.invalidEmails.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Sortable & Searchable Unified User Management Table */}
      {isLoading ? (
        <Loader label="Loading institutional user directory..." />
      ) : (
        <UserManagementTable
          users={users}
          registry={registry}
          mentors={mentors}
          onUpdateUser={handleUpdateUser}
          onUpdateRegistry={handleUpdateRegistry}
          onSoftDeleteUser={handleSoftDeleteUser}
          onDeleteRegistry={handleDeleteRegistry}
          onAssignMentor={handleAssignMentor}
        />
      )}

      {/* Manual + Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setManualFormError(null);
        }}
        title="Create Institutional User Record"
      >
        <form onSubmit={handleAddUserSubmit} className="space-y-3 text-xs">
          {manualFormError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 font-medium">
              {manualFormError}
            </div>
          )}

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="Arun Kumar K"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8]"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">College Email *</label>
            <input
              type="email"
              required
              placeholder="student@fx.edu.in"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Role *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8] cursor-pointer"
              >
                <option value="STUDENT">Student</option>
                <option value="MENTOR">Faculty Mentor</option>
                <option value="HOD">HOD</option>
                <option value="PRINCIPAL">Principal</option>
                <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Department *</label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value as Department)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8] cursor-pointer"
              >
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="IT">IT</option>
                <option value="AI_DS">AI_DS</option>
              </select>
            </div>
          </div>

          {newRole === 'STUDENT' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Register Number</label>
                  <input
                    type="text"
                    placeholder="951221104001"
                    value={newRegNo}
                    onChange={(e) => setNewRegNo(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8] cursor-pointer"
                  >
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Section</label>
                  <input
                    type="text"
                    placeholder="A"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Mentor Email (Optional)</label>
                <input
                  type="email"
                  placeholder="mentor@fx.edu.in"
                  value={newMentorEmail}
                  onChange={(e) => setNewMentorEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#2f5da8]"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setManualFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={addRegistryMutation.isPending}>
              <UserPlus className="w-3.5 h-3.5 mr-1 inline" /> Create Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
