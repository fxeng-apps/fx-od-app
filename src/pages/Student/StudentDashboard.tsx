import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  Send,
  User,
  ArrowRight,
  Lock,
  Check,
  X,
  Sparkles,
  MapPin,
  Award,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStudentODRequests } from '../../hooks/useODRequests';
import { RequestsTable } from '../../components/tables/RequestsTable';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import type { ODRequest } from '../../types/od';

export const StudentDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const { data: requests = [], isLoading: isLoadingRequests } = useStudentODRequests(userProfile?.uid);

  const getStatus = (r: ODRequest) => typeof r.status === 'object' ? r.status.overall : r.status;

  // Latest OD Request for Timeline tracking
  const latestRequest: ODRequest | null = requests.length > 0 ? requests[0] : null;

  // Format today's date in YYYY-MM-DD
  const todayStr = React.useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Filter approved passes active today
  const activeApprovedPasses = React.useMemo(() => {
    return requests.filter((req) => {
      const overallStatus = getStatus(req);
      if (overallStatus !== 'HOD_APPROVED') return false;

      // Check schedule entries
      if (req.schedule && req.schedule.length > 0) {
        return req.schedule.some((entry) => entry.date === todayStr);
      }
      if (req.startDate && req.endDate) {
        return todayStr >= req.startDate && todayStr <= req.endDate;
      }
      return req.startDate === todayStr;
    });
  }, [requests, todayStr]);

  const getPassTypeLabelForToday = (req: ODRequest): string => {
    if (!req.schedule || req.schedule.length === 0) {
      return 'Full Day';
    }
    const todayEntry = req.schedule.find((entry) => entry.date === todayStr);
    if (!todayEntry) return 'Full Day';
    if (todayEntry.passType === 'FULL_DAY') return 'Full Day';
    return `Partial - Periods: ${todayEntry.periods.map((p) => `P${p}`).join(', ')}`;
  };

  if (isLoadingRequests) {
    return <Loader label="Loading student dashboard..." />;
  }

  return (
    <div className="space-y-4 text-left">
      {/* Student Profile Overview Banner */}
      <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-md bg-[#0B426E] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
            {userProfile?.displayName ? userProfile.displayName.charAt(0) : <User className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              {userProfile?.displayName || 'Student'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Reg: {userProfile?.registerNumber || 'N/A'} • {userProfile?.department} (Year {userProfile?.year || 'III'}-{userProfile?.section || 'A'})
            </p>
          </div>
        </div>

        {/* Quick Apply Button */}
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/student/apply')}
          className="w-full sm:w-auto shadow-xs font-semibold shrink-0"
        >
          <Send className="w-4 h-4 mr-1.5" /> Apply New Pass
        </Button>
      </div>

      {/* 1. Active Movement Passes Proof Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Active Movement Passes (Today's Proof)
        </h3>

        {activeApprovedPasses.length === 0 ? (
          <div className="p-5 text-center bg-gray-50 dark:bg-gray-800 rounded-md border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
            No active approved passes for today. If you have an approved pass, it will show up here as proof on the schedule date.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeApprovedPasses.map((pass) => (
              <div
                key={pass.id}
                className="p-4 bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/60 rounded-md space-y-3 relative overflow-hidden"
              >
                {/* Visual badge at the top */}
                <div className="absolute right-0 top-0 bg-green-600 text-white font-extrabold text-[9px] uppercase px-3 py-1 tracking-wider rounded-bl">
                  Official Proof
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-green-800 dark:text-green-300">
                      SANCTIONED MOVEMENT PASS
                    </h4>
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-mono">
                      Pass ID: {pass.requestNumber}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-gray-700 dark:text-gray-300 border-t border-green-200/50 dark:border-green-800/40 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Date:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-white">
                      {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      {getPassTypeLabelForToday(pass)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Faculty In-Charge:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{pass.facultyInCharge}</span>
                  </div>
                  <div className="flex items-start justify-between gap-1 pt-1.5 border-t border-green-200/30">
                    <span className="text-gray-400 flex items-center gap-1 shrink-0">
                      <MapPin className="w-3.5 h-3.5" /> Event & Venue:
                    </span>
                    <span className="font-bold text-[#0B426E] dark:text-blue-300 text-right truncate max-w-[200px]" title={pass.purpose || pass.description}>
                      {pass.purpose || pass.description}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2/3 width): Recent Approval Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0B426E] dark:text-blue-400" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  Recent Approval Timeline
                </h3>
              </div>
              {latestRequest && (
                <span className="font-mono text-[11px] font-bold text-[#0B426E] dark:text-blue-300">
                  {latestRequest.requestNumber}
                </span>
              )}
            </div>

            {!latestRequest ? (
              <div className="p-6 text-center text-xs text-gray-400">
                No active pass applications to display timeline for.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-3 gap-2 text-center text-xs relative">
                  {/* Step 1: Submission */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 flex items-center justify-center font-bold text-xs ring-2 ring-green-600">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-[11px]">Submitted</span>
                    <span className="text-[10px] text-gray-400">{latestRequest.startDate}</span>
                  </div>

                  {/* Step 2: Mentor Review */}
                  <div className="flex flex-col items-center space-y-1">
                    {getStatus(latestRequest) === 'PENDING' ? (
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-xs ring-2 ring-amber-500 animate-pulse">
                        <Clock className="w-4 h-4" />
                      </div>
                    ) : getStatus(latestRequest) === 'MENTOR_REJECTED' ? (
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold text-xs ring-2 ring-red-600">
                        <X className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 flex items-center justify-center font-bold text-xs ring-2 ring-green-600">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white text-[11px]">Mentor Review</span>
                    <span className="text-[10px] text-gray-400 truncate max-w-[90px]">
                      {latestRequest.mentorReview
                        ? latestRequest.mentorReview.status === 'APPROVED'
                          ? 'Approved'
                          : 'Rejected'
                        : 'In Progress'}
                    </span>
                  </div>

                  {/* Step 3: HOD Sanction */}
                  <div className="flex flex-col items-center space-y-1">
                    {getStatus(latestRequest) === 'HOD_APPROVED' ? (
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 flex items-center justify-center font-bold text-xs ring-2 ring-green-600">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : getStatus(latestRequest) === 'HOD_REJECTED' ? (
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold text-xs ring-2 ring-red-600">
                        <X className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center font-bold text-xs">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white text-[11px]">HOD Sanction</span>
                    <span className="text-[10px] text-gray-400 truncate max-w-[90px]">
                      {getStatus(latestRequest) === 'HOD_APPROVED'
                        ? 'Sanctioned'
                        : getStatus(latestRequest) === 'HOD_REJECTED'
                        ? 'Rejected'
                        : 'Gated / Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width): Recent Movement Pass Applications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Recent Applications
            </h3>
            <button
              onClick={() => navigate('/student/requests')}
              className="text-xs text-[#0B426E] dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <RequestsTable requests={requests.slice(0, 4)} />
        </div>
      </div>
    </div>
  );
};
