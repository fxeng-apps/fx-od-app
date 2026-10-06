import React, { useState } from 'react';
import { Card } from '../common/Card';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarWidget: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { requests } = useApp();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const today = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to count ODs on a given day
  const getODCountForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return requests.filter((r) => {
      if (r.finalStatus !== 'APPROVED') return false;
      if (r.dateType === 'SINGLE') {
        return r.startDate === dateStr;
      } else {
        const start = new Date(r.startDate);
        const end = r.endDate ? new Date(r.endDate) : start;
        const current = new Date(dateStr);
        return current >= start && current <= end;
      }
    }).length;
  };

  const days = [];
  // Fill empty spaces for starting days of week
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 sm:h-9" />);
  }

  // Fill day numbers
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const odCount = getODCountForDay(d);
    
    days.push(
      <button
        key={d}
        type="button"
        className={`h-8 sm:h-9 w-full relative flex flex-col items-center justify-center rounded-md text-[11px] sm:text-xs font-semibold transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
          isToday ? 'bg-[#2f5da8] text-white hover:bg-[#234a87]' : 'text-gray-800 dark:text-gray-200'
        }`}
      >
        <span>{d}</span>
        {odCount > 0 && (
          <span className={`absolute bottom-0.5 sm:bottom-1 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-green-600'}`} />
        )}
      </button>
    );
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="p-3.5 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
          OD Calendar ({monthNames[month]} {year})
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDate(new Date(year, month - 1, 1))}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-[11px] font-semibold px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(new Date(year, month + 1, 1))}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {weekdays.map((w) => (
          <div key={w} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-1">
            {w}
          </div>
        ))}
        {days}
      </div>
    </Card>
  );
};
