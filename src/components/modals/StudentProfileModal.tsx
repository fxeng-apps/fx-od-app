import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useStudentODRequests } from '../../hooks/useODRequests';
import type { UserProfile } from '../../types/user';
import type { ODRequest } from '../../types/od';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Loader } from '../common/Loader';
import { ODTimeline } from '../od/ODTimeline';

interface StudentProfileModalProps {
  student: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: (student: UserProfile) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  canEdit = false,
  onEdit,
}) => {
  const { data: odRequests = [], isLoading } = useStudentODRequests(student?.uid);

  if (!student) return null;

  const getStatus = (r: ODRequest) => typeof r.status === 'object' ? r.status.overall : r.status;
  const totalApproved = odRequests.filter((r) => getStatus(r) === 'HOD_APPROVED').length;
  const totalRejected = odRequests.filter((r) => getStatus(r) === 'MENTOR_REJECTED' || getStatus(r) === 'HOD_REJECTED').length;
  const totalPending = odRequests.filter((r) => getStatus(r) === 'PENDING' || getStatus(r) === 'MENTOR_APPROVED').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Student Profile: ${student.displayName}`}>
      <div className="space-y-4 text-xs text-gray-700 dark:text-gray-200">
        {/* Top Student Banner */}
        <div className="p-3.5 bg-gray-50 dark:bg-gray-700/80 rounded-md border border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#2f5da8] flex items-center justify-center text-white font-bold text-sm">
              {student.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{student.displayName}</h3>
                <span className="text-[11px] font-medium text-[#2f5da8] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                  Reg: {student.registerNumber || 'N/A'}
                </span>
              </div>
              <p className="text-gray-500 font-mono text-[11px]">{student.email}</p>
            </div>
          </div>

          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(student)}
              className="px-3 py-1.5 rounded-md bg-[#2f5da8] hover:bg-[#234a87] text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Edit Details
            </button>
          )}
        </div>

        {/* Academic Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-semibold">Department</span>
            <span className="font-semibold text-gray-900 dark:text-white text-xs">{student.department}</span>
          </div>
          <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-semibold">Year & Section</span>
            <span className="font-semibold text-gray-900 dark:text-white text-xs">Year {student.year || 'III'} • Sec {student.section || 'A'}</span>
          </div>
          <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600 col-span-2">
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-semibold">Assigned Mentor</span>
            <span className="font-semibold text-[#2f5da8] dark:text-blue-300 text-xs">
              {student.mentorName || 'Faculty Mentor'} ({student.mentorEmail || 'N/A'})
            </span>
          </div>
        </div>

        {/* OD Statistics Bar */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-md border border-gray-200 dark:border-gray-600">
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-semibold">Total</span>
            <span className="font-bold text-gray-900 dark:text-white text-sm">{odRequests.length}</span>
          </div>
          <div className="p-2.5 bg-green-50 dark:bg-green-950/40 rounded-md border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="text-[10px] uppercase font-semibold">Approved</span>
            </div>
            <span className="font-bold text-sm">{totalApproved}</span>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-amber-600" />
              <span className="text-[10px] uppercase font-semibold">Pending</span>
            </div>
            <span className="font-bold text-sm">{totalPending}</span>
          </div>
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-md border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <XCircle className="w-3 h-3 text-red-600" />
              <span className="text-[10px] uppercase font-semibold">Rejected</span>
            </div>
            <span className="font-bold text-sm">{totalRejected}</span>
          </div>
        </div>

        {/* Movement Pass History Timeline */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Complete Movement Pass History</h4>

          {isLoading ? (
            <Loader label="Loading student pass history..." />
          ) : odRequests.length === 0 ? (
            <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500">
              No movement passes submitted by this student yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-left">
              {odRequests.map((req) => {
                const statusVal = getStatus(req);
                return (
                  <div key={req.id} className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#2f5da8] dark:text-blue-300">{req.requestNumber}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-[11px] ml-2">
                          ({req.schedule && req.schedule[0]?.passType === 'FULL_DAY' ? 'Full Day' : 'Partial'})
                        </span>
                      </div>
                      <Badge
                        variant={
                          statusVal === 'HOD_APPROVED'
                            ? 'success'
                            : statusVal === 'PENDING' || statusVal === 'MENTOR_APPROVED'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {statusVal}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                      <div><strong>Duration:</strong> {req.startDate} {req.endDate ? `to ${req.endDate}` : ''} ({req.totalDays} day)</div>
                      <div><strong>Faculty In Charge:</strong> {req.facultyInCharge}</div>
                      <div><strong>Purpose:</strong> {req.purpose || req.description}</div>
                    </div>

                  {req.timeline && req.timeline.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-[10px] text-gray-500 font-medium uppercase block mb-1">Approval Timeline</span>
                      <ODTimeline timeline={req.timeline} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
