import React from 'react';
import { Badge } from '../common/Badge';
import type { ODRequest } from '../../context/AppContext';
import { EmptyState } from '../common/EmptyState';
import { User } from 'lucide-react';

interface StudentTableProps {
  data: ODRequest[];
}

export const StudentTable: React.FC<StudentTableProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-xs">
        <EmptyState
          title="No Students on Duty Today"
          description="There are currently no approved OD applications active for today's date."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile Card Layout (< md) */}
      <div className="space-y-2.5 md:hidden">
        {data.map((student) => (
          <div
            key={student.id}
            className="p-3.5 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#2f5da8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                  {student.name}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  Reg: {student.registerNumber} • Yr {student.year} ({student.section})
                </p>
              </div>
            </div>

            <Badge status={student.finalStatus} />
          </div>
        ))}
      </div>

      {/* Desktop Table Layout (>= md) */}
      <div className="hidden md:block w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-xs">
            <thead className="bg-[#E2E8F0] dark:bg-gray-800 uppercase font-bold text-[11px] text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Register Number</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200">
              {data.map((student) => (
                <tr key={student.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#2f5da8] dark:text-blue-300">
                    {student.registerNumber}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                    {student.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{student.year}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{student.section}</td>
                  <td className="px-4 py-3">
                    <Badge status={student.finalStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
