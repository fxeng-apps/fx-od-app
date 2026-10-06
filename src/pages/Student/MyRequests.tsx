import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStudentODRequests } from '../../hooks/useODRequests';
import { RequestsTable } from '../../components/tables/RequestsTable';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';

export const MyRequests: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useStudentODRequests(userProfile?.uid);

  return (
    <div className="space-y-4 text-left">
      {/* Header Banner */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            My Movement Passes
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Track and manage all your active, approved, and archived movement pass applications.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/student/apply')} className="w-full sm:w-auto font-semibold">
          <Send className="mr-1.5 w-3.5 h-3.5" /> Apply Pass
        </Button>
      </div>

      {isLoading ? (
        <Loader label="Loading movement passes..." />
      ) : (
        <RequestsTable requests={requests} />
      )}
    </div>
  );
};
