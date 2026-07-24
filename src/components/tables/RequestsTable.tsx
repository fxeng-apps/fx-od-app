import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Calendar, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ODRequest } from '../../types/od';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ODDetailsModal } from '../od/ODDetailsModal';
import { Pagination } from '../common/Pagination';

interface RequestsTableProps {
  requests: ODRequest[];
  showStudentDetails?: boolean;
}

type SortColumn = 'requestNumber' | 'studentName' | 'passType' | 'startDate' | 'facultyInCharge' | 'status';

export const RequestsTable: React.FC<RequestsTableProps> = ({
  requests,
  showStudentDetails = false,
}) => {
  const [selectedViewRequest, setSelectedViewRequest] = useState<ODRequest | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('startDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HOD_APPROVED':
        return <Badge variant="success">HOD Approved</Badge>;
      case 'MENTOR_APPROVED':
        return <Badge variant="info">Mentor Approved (Pending HOD)</Badge>;
      case 'MENTOR_REJECTED':
        return <Badge variant="danger">Rejected by Mentor</Badge>;
      case 'HOD_REJECTED':
        return <Badge variant="danger">Rejected by HOD</Badge>;
      case 'EXPIRED':
        return <Badge variant="neutral">Expired</Badge>;
      case 'WITHDRAWN':
        return <Badge variant="neutral">Withdrawn</Badge>;
      default:
        return <Badge variant="warning">Pending Mentor</Badge>;
    }
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      if (sortColumn === 'requestNumber') {
        valA = a.requestNumber || a.id || '';
        valB = b.requestNumber || b.id || '';
      } else if (sortColumn === 'studentName') {
        valA = a.studentSnapshot?.name || '';
        valB = b.studentSnapshot?.name || '';
      } else if (sortColumn === 'passType') {
        valA = getPassTypeLabel(a);
        valB = getPassTypeLabel(b);
      } else if (sortColumn === 'startDate') {
        valA = a.startDate || '';
        valB = b.startDate || '';
      } else if (sortColumn === 'facultyInCharge') {
        valA = a.facultyInCharge || '';
        valB = b.facultyInCharge || '';
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
      <ArrowUp className="w-3 h-3 text-[#0B426E] ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#0B426E] ml-1 inline" />
    );
  };

  if (requests.length === 0) {
    return (
      <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">No movement passes found in records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      {/* Mobile Stacked Card View (< md) */}
      <div className="space-y-3 md:hidden">
        {paginatedRequests.map((req) => {
          const isHighlighted = req.id === highlightedId;
          const statusVal = getStatusStr(req);
          return (
            <div
              key={req.id}
              className={`p-4 bg-white dark:bg-gray-800 rounded-md border transition-all space-y-2.5 ${
                isHighlighted
                  ? 'border-[#0B426E] ring-2 ring-[#0B426E] bg-amber-50/50 dark:bg-amber-950/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isHighlighted && (
                    <span className="text-[10px] font-bold bg-[#0B426E] text-white px-1.5 py-0.5 rounded-full shrink-0">
                      Targeted
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs text-[#0B426E] dark:text-blue-300 truncate">
                    {req.requestNumber || req.id}
                  </span>
                </div>
                <div>{getStatusBadge(statusVal)}</div>
              </div>

              {showStudentDetails && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-100 dark:border-gray-600 text-xs">
                  <User className="w-3.5 h-3.5 text-[#0B426E] dark:text-blue-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{req.studentSnapshot?.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Reg: {req.studentSnapshot?.registerNumber} • {req.department}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Pass Type</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{getPassTypeLabel(req)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Schedule</span>
                  <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {req.startDate} ({req.totalDays}d)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700 text-xs">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Faculty: <strong className="text-gray-700 dark:text-gray-200">{req.facultyInCharge}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedViewRequest(req)}
                  className="w-full sm:w-auto"
                >
                  <Eye className="mr-1 w-3.5 h-3.5" /> View Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 uppercase font-semibold text-[11px] tracking-wider select-none">
              <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('requestNumber')}>
                Pass No {renderSortIcon('requestNumber')}
              </th>
              {showStudentDetails && (
                <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('studentName')}>
                  Student {renderSortIcon('studentName')}
                </th>
              )}
              <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('passType')}>
                Pass Type {renderSortIcon('passType')}
              </th>
              <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('startDate')}>
                Schedule {renderSortIcon('startDate')}
              </th>
              <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('facultyInCharge')}>
                Faculty In Charge {renderSortIcon('facultyInCharge')}
              </th>
              <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('status')}>
                Status {renderSortIcon('status')}
              </th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200">
            {paginatedRequests.map((req) => {
              const isHighlighted = req.id === highlightedId;
              const statusVal = getStatusStr(req);
              return (
                <tr
                  key={req.id}
                  className={`transition-colors ${
                    isHighlighted
                      ? 'bg-amber-50 dark:bg-amber-950/30 font-semibold border-l-4 border-l-[#0B426E]'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <td className="p-3 font-mono font-bold text-[#0B426E] dark:text-blue-300">
                    {req.requestNumber || req.id}
                  </td>
                  {showStudentDetails && (
                    <td className="p-3 text-left">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {req.studentSnapshot?.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        Reg: {req.studentSnapshot?.registerNumber} • {req.department} ({req.studentSnapshot?.year}-{req.studentSnapshot?.section})
                      </div>
                    </td>
                  )}
                  <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{getPassTypeLabel(req)}</td>
                  <td className="p-3">
                    <div>{req.startDate}</div>
                    <div className="text-[11px] text-gray-400">
                      {req.endDate ? `To ${req.endDate} ` : ''}({req.totalDays} day)
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{req.facultyInCharge}</td>
                  <td className="p-3">{getStatusBadge(statusVal)}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedViewRequest(req)}
                    >
                      <Eye className="mr-1 w-3.5 h-3.5" /> View
                    </Button>
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

      <ODDetailsModal
        isOpen={!!selectedViewRequest}
        onClose={() => setSelectedViewRequest(null)}
        request={selectedViewRequest}
      />
    </div>
  );
};
