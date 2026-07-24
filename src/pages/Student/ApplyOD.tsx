import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, User, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCreateODMutation } from '../../hooks/useODRequests';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TextArea } from '../../components/common/TextArea';
import type { ScheduleEntry } from '../../types/od';

export const ApplyOD: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const createODMutation = useCreateODMutation();

  // Form Fields
  const [facultyInCharge, setFacultyInCharge] = useState('');
  const [purpose, setPurpose] = useState('');
  const [proofDocumentUrl, setProofDocumentUrl] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([
    { date: new Date().toISOString().split('T')[0], passType: 'FULL_DAY', periods: [] },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleToggleFullDay = (checked: boolean) => {
    setIsFullDay(checked);
    setSchedule((prev) =>
      prev.map((item) => ({
        ...item,
        passType: checked ? 'FULL_DAY' : 'PARTIAL',
        periods: [],
      }))
    );
  };

  const handleAddDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSchedule((prev) => [
      ...prev,
      {
        date: tomorrow.toISOString().split('T')[0],
        passType: isFullDay ? 'FULL_DAY' : 'PARTIAL',
        periods: [],
      },
    ]);
  };

  const handleRemoveDate = (index: number) => {
    setSchedule((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateDate = (index: number, val: string) => {
    setSchedule((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, date: val, periods: [] } : item))
    );
  };

  const handleTogglePeriod = (index: number, period: number) => {
    setSchedule((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const exists = item.periods.includes(period);
        const newPeriods = exists
          ? item.periods.filter((p) => p !== period)
          : [...item.periods, period].sort((a, b) => a - b);
        return { ...item, periods: newPeriods };
      })
    );
  };

  const getDayDetails = (dateStr: string) => {
    if (!dateStr) return { name: '', dayOfWeek: -1, isSunday: false, maxPeriods: 7 };
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      name: weekdays[dayOfWeek],
      dayOfWeek,
      isSunday: dayOfWeek === 0,
      maxPeriods: dayOfWeek === 6 ? 6 : 7,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setFormError(null);

    const errors: Record<string, string> = {};

    if (facultyInCharge.trim().length < 3) {
      errors.facultyInCharge = 'Faculty in charge name is required (min 3 characters)';
    }

    if (purpose.trim().length < 10) {
      errors.purpose = 'Please provide a detailed purpose (min 10 characters)';
    } else if (purpose.trim().length > 500) {
      errors.purpose = 'Purpose cannot exceed 500 characters';
    }

    if (proofDocumentUrl.trim() && !proofDocumentUrl.startsWith('http://') && !proofDocumentUrl.startsWith('https://')) {
      errors.proofDocumentUrl = 'Must be a valid URL link (e.g. Google Drive link)';
    }

    // Schedule validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max60Days = new Date();
    max60Days.setDate(max60Days.getDate() + 60);
    max60Days.setHours(23, 59, 59, 999);

    if (schedule.length === 0) {
      setFormError('At least one schedule date is required.');
      return;
    }

    for (let i = 0; i < schedule.length; i++) {
      const entry = schedule[i];
      if (!entry.date) {
        errors[`date-${i}`] = 'Date is required';
        continue;
      }

      const [y, m, d] = entry.date.split('-').map(Number);
      const entryDate = new Date(y, m - 1, d);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate < today) {
        errors[`date-${i}`] = 'Date cannot be in the past';
      } else if (entryDate > max60Days) {
        errors[`date-${i}`] = 'Date cannot be more than 60 days in advance';
      } else if (entryDate.getDay() === 0) {
        errors[`date-${i}`] = 'Sundays are closed';
      }

      if (entry.passType === 'PARTIAL' && entry.periods.length === 0) {
        errors[`periods-${i}`] = 'Select at least one period';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!userProfile) return;

    try {
      await createODMutation.mutateAsync({
        dto: {
          facultyInCharge,
          purpose,
          proofDocumentUrl: proofDocumentUrl || undefined,
          schedule,
        },
        student: userProfile,
      });
      navigate('/student/requests');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit Movement Pass application');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xs flex items-center justify-between">
        <div className="space-y-0.5 text-left">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Send className="w-4 h-4 text-[#0B426E] dark:text-blue-400" /> Apply for a Movement Pass
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Submit movement pass for faculty mentor review and department HOD sanction.
          </p>
        </div>
      </div>

      {/* Student Identity Card */}
      {userProfile && (
        <div className="p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-700 dark:text-gray-300 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#0B426E] text-white flex items-center justify-center font-bold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">{userProfile.displayName}</p>
              <p className="text-gray-500 dark:text-gray-400">Reg: {userProfile.registerNumber || '951221104000'} • Dept: {userProfile.department}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Assigned Mentor</span>
            <span className="font-medium text-[#0B426E] dark:text-blue-300">{userProfile.mentorName || 'Faculty Mentor'}</span>
          </div>
        </div>
      )}

      {/* Form Application */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xs space-y-5 text-left">
        
        {/* Core details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Faculty In Charge"
            placeholder="Name of coordinating faculty member"
            value={facultyInCharge}
            onChange={(e) => setFacultyInCharge(e.target.value)}
            error={validationErrors.facultyInCharge}
          />

          <Input
            label="Proof Document URL (Optional)"
            placeholder="https://drive.google.com/file/d/..."
            value={proofDocumentUrl}
            onChange={(e) => setProofDocumentUrl(e.target.value)}
            error={validationErrors.proofDocumentUrl}
          />
        </div>

        <TextArea
          label="Reason & Purpose of Movement Pass"
          rows={3}
          placeholder="Describe the institutional purpose of the movement pass request, event details, venue location..."
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          error={validationErrors.purpose}
        />

        {/* Schedule Type Selection */}
        <div className="bg-gray-50 dark:bg-zinc-900/60 p-4 rounded-md border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-200">
              Pass Duration & Timetable Mode
            </h4>
            <p className="text-[11px] text-gray-400">
              Uncheck Full Day to specify exact timetable periods for individual dates.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFullDay}
              onChange={(e) => handleToggleFullDay(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Full Day Pass
          </label>
        </div>

        {/* Schedule dates entries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Schedule Configurator
            </h4>
            <button
              type="button"
              onClick={handleAddDate}
              className="text-[11px] text-[#0B426E] dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Date
            </button>
          </div>

          <div className="space-y-3.5">
            {schedule.map((entry, idx) => {
              const day = getDayDetails(entry.date);
              const isDateError = !!validationErrors[`date-${idx}`];
              const isPeriodError = !!validationErrors[`periods-${idx}`];

              return (
                <div
                  key={idx}
                  className={`p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md border transition-all space-y-2.5 ${
                    isDateError || isPeriodError ? 'border-red-500 bg-red-50/10' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 max-w-[200px]">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleUpdateDate(idx, e.target.value)}
                        className={`w-full bg-white dark:bg-gray-800 border rounded-md p-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0B426E] ${
                          isDateError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div className="flex-1 text-left">
                      {entry.date ? (
                        day.isSunday ? (
                          <span className="text-red-500 font-bold text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Sunday (Closed)
                          </span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-300 font-semibold text-xs">
                            {day.name} {entry.passType === 'FULL_DAY' ? '(Full Day)' : '(Partial)'}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 text-[11px]">Select a date</span>
                      )}
                    </div>

                    {schedule.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md cursor-pointer transition-colors"
                        title="Remove date entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Validation Error for date */}
                  {isDateError && (
                    <p className="text-[10px] text-red-500 font-medium pl-1">
                      {validationErrors[`date-${idx}`]}
                    </p>
                  )}

                  {/* Period Checkboxes for Partial Pass */}
                  {!isFullDay && entry.date && !day.isSunday && (
                    <div className="space-y-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Select Timetable Periods:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: day.maxPeriods }).map((_, pIdx) => {
                          const periodNum = pIdx + 1;
                          const isSelected = entry.periods.includes(periodNum);
                          return (
                            <button
                              key={periodNum}
                              type="button"
                              onClick={() => handleTogglePeriod(idx, periodNum)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#0B426E] text-white border-[#0B426E]'
                                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              P{periodNum}
                            </button>
                          );
                        })}
                      </div>

                      {isPeriodError && (
                        <p className="text-[10px] text-red-500 font-medium pl-1">
                          {validationErrors[`periods-${idx}`]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mutate Error or clash warning */}
        {(createODMutation.isError || formError) && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-700 dark:text-red-300 font-semibold flex items-start gap-1.5 leading-relaxed">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 dark:text-red-200">Application Blocked</p>
              <p className="mt-0.5">{formError || (createODMutation.error as Error).message}</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Button variant="ghost" type="button" onClick={() => navigate('/student/requests')} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={createODMutation.isPending} className="w-full sm:w-auto font-semibold">
            Submit Movement Pass
          </Button>
        </div>
      </form>
    </div>
  );
};
