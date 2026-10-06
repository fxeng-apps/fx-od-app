import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../services/firebase/odService';

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: () => fetchAuditLogs(100),
    refetchInterval: 30000, // Reactive polling every 30s for active security monitoring
  });
};
