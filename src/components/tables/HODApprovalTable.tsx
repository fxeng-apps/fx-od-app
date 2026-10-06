import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, CheckCheck, Eye, Lock, X, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ODRequest } from '../../types/od';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { RejectionReasonModal } from '../modals/RejectionReasonModal';
import { ODDetailsModal } from '../od/ODDetailsModal';
import { Pagination } from '../common/Pagination';

interface HODApprovalTableProps {
  requests: ODRequest[];
  onSingleApprove: (id: string) => void;
  onSingleReject: (id: string, reason: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[], reason: string) => void;
  isLoading?: boolean;
}

type SortColumn = 'studentName' | 'passType' | 'status';

export const HODApprovalTable: React.FC<HODApprovalTableProps> = ({
  requests,
  onSingleApprove,
  onSingleReject,
  onBulkApprove,
  onBulkReject,
  isLoading = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [singleRejectId, setSingleRejectId] = useState<string | null>(null);
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false);
  const [selectedViewRequest, setSelectedViewRequest] = useState<ODRequest | null>(null);

  const [sortColumn, setSortColumn] = useState<SortColumn>('studentName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('highlight') || searchParams.get('odId');

  const getStatusStr = (req: ODRequest): string => {
    return typeof req.status === 'object' ? req.status.overall : req.status;
  };

  const getPassTypeLabel = (req: ODRequest): string => {
    if (!req.schedule || req.schedule.length === 0) {
      return 'Full Day';
    }
    const hasPartial = req.schedule.some((entry) => entry.passType === 'PARTIAL');
    if (!hasPartial) return 'Full Day';

    const firstPartial = req.schedule.find((entry) => entry.passType === 'PARTIAL');
    if (firstPartial) {
      return `Partial (Periods: ${firstPartial.periods.map((p) => `P${p}`).join(', ')})`;
    }
    return 'Partial';
  };

  // Filter only mentor-approved items for bulk selection
  const selectableRequests = requests.filter((r) => getStatusStr(r) === 'MENTOR_APPROVED');

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      if (sortColumn === 'studentName') {
        valA = a.studentSnapshot?.name || '';
        valB = b.studentSnapshot?.name || '';
      } else if (sortColumn === 'passType') {
        valA = getPassTypeLabel(a);
        valB = getPassTypeLabel(b);
      } else if (sortColumn === 'status') {
        valA = getStatusStr(a);
        valB = getStatusStr(b);
      }

      valA = valA.toLowerCase();
      valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [requests, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRequests.slice(start, start + pageSize);
  }, [sortedRequests, currentPage, pageSize]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 opacity-40 ml-1 inline" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#2f5da8] ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2f5da8] ml-1 inline" />
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === selectableRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableRequests.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirmSingleReject = (reason: string) => {
    if (singleRejectId) {
      onSingleReject(singleRejectId, reason);
      setSingleRejectId(null);
    }
  };

  const handleConfirmBulkReject = (reason: string) => {
    if (selectedIds.length > 0) {
      onBulkReject(selectedIds, reason);
      setSelectedIds([]);
      setIsBulkRejectModalOpen(false);
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length > 0) {
      onBulkApprove(selectedIds);
      setSelectedIds([]);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">No pending movement passes for department HOD sanction.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      {/* Bulk Action Header Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-blue-50/80 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-md gap-2 text-left">
          <span className="text-xs font-semibold text-[#2f5da8] dark:text-blue-300">
            {selectedIds.length} Mentor-Approved Request(s) Selected
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkRejectModalOpen(true)}
              disabled={isLoading}
              className="flex-1 sm:flex-initial"
            >
              <X className="mr-1 w-3.5 h-3.5" /> Bulk Reject
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleBulkApprove}
              disabled={isLoading}
              className="flex-1 sm:flex-initial"
            >
              <CheckCheck className="mr-1 w-3.5 h-3.5" /> Bulk Sanction
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Stacked 1-Hand Approval Cards (< md) */}
      <div className="space-y-3 md:hidden">
        {paginatedRequests.map((req) => {
          const statusVal = getStatusStr(req);
          const isMentorApproved = statusVal === 'MENTOR_APPROVED';
          const isSelected = selectedIds.includes(req.id);
          const isHighlighted = req.id === highlightedId;

          return (
            <div
              key={req.id}
              className={`p-4 bg-white dark:bg-gray-800 rounded-md border space-y-3 transition-colors ${
                isHighlighted
                  ? 'border-[#2f5da8] ring-2 ring-[#2f5da8] bg-amber-50/50 dark:bg-amber-950/20 shadow-md'
                  : isSelected
                  ? 'border-[#2f5da8] ring-1 ring-[#2f5da8]'
                  : 'border-gray-300 dark:border-gray-700 shadow-xs'
              } ${!isMentorApproved ? 'opacity-80 bg-gray-50/50 dark:bg-gray-900/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-2.5">
                <div className="flex items-center gap-2.5 min-w-0 text-left">
                  {isMentorApproved && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(req.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#2f5da8] focus:ring-[#2f5da8] cursor-pointer shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isHighlighted && (
                        <span className="text-[10px] font-bold bg-[#2f5da8] text-white px-1.5 py-0.5 rounded-full shrink-0">
                          Targeted
                        </span>
                      )}
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {req.studentSnapshot?.name}
                      </h3>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                      Reg: {req.studentSnapshot?.registerNumber} • {req.department}
                    </p>
                  </div>
                </div>

                <div>
                  {isMentorApproved ? (
                    <Badge variant="info">Mentor Approved</Badge>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 text-[11px] font-medium shrink-0">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Pending Mentor</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-left">
                <div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Pass Type</span>
                  <span className="font-semibold text-[#2f5da8] dark:text-blue-300">{getPassTypeLabel(req)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Schedule</span>
                  <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {req.startDate} ({req.totalDays}d)
                  </span>
                </div>
              </div>

              {/* 1-Hand Mobile Action Controls */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setSelectedViewRequest(req)}
                  className="w-full text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setSingleRejectId(req.id)}
                  disabled={isLoading}
                  className="w-full text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
                <Button
                  variant="success"
                  size="md"
                  onClick={() => onSingleApprove(req.id)}
                  disabled={!isMentorApproved || isLoading}
                  className="w-full text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Sanction
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Desktop Approval Table (>= md) */}
      <div className="hidden md:block overflow-x-auto w-full max-w-full bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs custom-scrollbar">
        <table className="min-w-[800px] w-full text-left text-xs border-collapse">
          <thead>
            <tr className="sticky top-0 bg-[#E2E8F0] dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700 uppercase font-bold text-[11px] tracking-wider select-none">
              <th className="p-3 w-10 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={
                    selectableRequests.length > 0 &&
                    selectedIds.length === selectableRequests.length
                  }
                  onChange={toggleSelectAll}
                  disabled={selectableRequests.length === 0}
                  className="rounded border-gray-300 dark:border-gray-600 text-[#2f5da8] focus:ring-[#2f5da8] cursor-pointer disabled:opacity-30"
                />
              </th>
              <th className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap" onClick={() => handleSort('studentName')}>
                Student & Reg No {renderSortIcon('studentName')}
              </th>
              <th className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap" onClick={() => handleSort('passType')}>
                Pass Type & Days {renderSortIcon('passType')}
              </th>
              <th className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap" onClick={() => handleSort('status')}>
                Mentor Review Status {renderSortIcon('status')}
              </th>
              <th className="p-3 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200">
            {paginatedRequests.map((req) => {
              const statusVal = getStatusStr(req);
              const isMentorApproved = statusVal === 'MENTOR_APPROVED';
              const isHighlighted = req.id === highlightedId;

              return (
                <tr
                  key={req.id}
                  className={`transition-colors ${
                    isHighlighted
                      ? 'bg-amber-50 dark:bg-amber-950/30 font-semibold border-l-4 border-l-[#2f5da8]'
                      : 'hover:bg-blue-50/50 dark:hover:bg-gray-700/40'
                  } ${!isMentorApproved ? 'opacity-75 bg-gray-50/50 dark:bg-gray-900/20' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req.id)}
                      onChange={() => toggleSelectOne(req.id)}
                      disabled={!isMentorApproved}
                      className="rounded border-gray-300 dark:border-gray-600 text-[#2f5da8] focus:ring-[#2f5da8] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="p-3 text-left">
                    <div className="font-semibold text-gray-900 dark:text-white">{req.studentSnapshot?.name}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Reg: {req.studentSnapshot?.registerNumber} • {req.department} ({req.studentSnapshot?.year}-{req.studentSnapshot?.section})
                    </div>
                  </td>
                  <td className="p-3 text-left">
                    <div className="font-semibold text-[#2f5da8] dark:text-blue-300">{getPassTypeLabel(req)}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {req.startDate} {req.endDate ? ` to ${req.endDate}` : ''} ({req.totalDays} day)
                    </div>
                  </td>
                  <td className="p-3">
                    {isMentorApproved ? (
                      <Badge variant="info">Mentor Approved</Badge>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 w-fit text-[11px] font-medium">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Pending Mentor</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedViewRequest(req)}
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setSingleRejectId(req.id)}
                        disabled={isLoading}
                      >
                        <X className="mr-1 w-3.5 h-3.5" /> Reject
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => onSingleApprove(req.id)}
                        disabled={!isMentorApproved || isLoading}
                        title={
                          !isMentorApproved
                            ? 'HOD Approval disabled until Mentor approval is complete'
                            : 'Sanction OD Request'
                        }
                      >
                        <Check className="mr-1 w-3.5 h-3.5" /> Sanction
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedRequests.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 25, 50]}
      />

      <RejectionReasonModal
        isOpen={!!singleRejectId}
        onClose={() => setSingleRejectId(null)}
        onSubmit={handleConfirmSingleReject}
        title="HOD Rejection - Specify Reason"
      />

      <RejectionReasonModal
        isOpen={isBulkRejectModalOpen}
        onClose={() => setIsBulkRejectModalOpen(false)}
        onSubmit={handleConfirmBulkReject}
        title={`Bulk HOD Rejection (${selectedIds.length} Requests)`}
      />

      <ODDetailsModal
        isOpen={!!selectedViewRequest}
        onClose={() => setSelectedViewRequest(null)}
        request={selectedViewRequest}
      />
    </div>
  );
};
