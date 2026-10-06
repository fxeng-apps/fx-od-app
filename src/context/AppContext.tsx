/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole } from '../types/user';

export interface ODRequest {
  id: string;
  registerNumber: string;
  name: string;
  year: string;
  section: string;
  department: string;
  dateType: 'SINGLE' | 'MULTIPLE';
  startDate: string;
  endDate?: string;
  description: string;
  facultyInCharge: string;
  odType: 'Applied Lab' | 'Individual';
  mentorStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  hodStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  finalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  appliedDate: string;
}

interface AppContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  requests: ODRequest[];
  addRequest: (request: Omit<ODRequest, 'id' | 'mentorStatus' | 'hodStatus' | 'finalStatus' | 'appliedDate'>) => void;
  updateMentorStatus: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => void;
  updateHODStatus: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => void;
  bulkHODApprove: (ids: string[]) => void;
  bulkHODReject: (ids: string[], reason: string) => void;
}

const mockRequests: ODRequest[] = [
  {
    id: 'OD-1001',
    registerNumber: '951221104001',
    name: 'Arun Kumar K',
    year: 'III',
    section: 'A',
    department: 'CSE',
    dateType: 'SINGLE',
    startDate: '2026-07-17',
    description: 'Smart India Hackathon 2026 Preliminary Round',
    facultyInCharge: 'Dr. S. Premkumar',
    odType: 'Individual',
    mentorStatus: 'APPROVED',
    hodStatus: 'PENDING',
    finalStatus: 'PENDING',
    appliedDate: '2026-07-16',
  },
  {
    id: 'OD-1002',
    registerNumber: '951221104045',
    name: 'Priya Dharshini M',
    year: 'III',
    section: 'B',
    department: 'CSE',
    dateType: 'MULTIPLE',
    startDate: '2026-07-18',
    endDate: '2026-07-20',
    description: 'Paper Presentation at Anna University, Chennai',
    facultyInCharge: 'Mrs. R. Jeyanthi',
    odType: 'Individual',
    mentorStatus: 'PENDING',
    hodStatus: 'PENDING',
    finalStatus: 'PENDING',
    appliedDate: '2026-07-15',
  },
  {
    id: 'OD-1003',
    registerNumber: '951222106012',
    name: 'Harish R',
    year: 'II',
    section: 'A',
    department: 'ECE',
    dateType: 'SINGLE',
    startDate: '2026-07-17',
    description: 'IoT Workshop Hands-on Training',
    facultyInCharge: 'Dr. G. Rajkumar',
    odType: 'Applied Lab',
    mentorStatus: 'APPROVED',
    hodStatus: 'APPROVED',
    finalStatus: 'APPROVED',
    appliedDate: '2026-07-14',
  },
  {
    id: 'OD-1004',
    registerNumber: '951220105088',
    name: 'Sanjay P',
    year: 'IV',
    section: 'C',
    department: 'EEE',
    dateType: 'SINGLE',
    startDate: '2026-07-15',
    description: 'Symposium Technical Event Coordination',
    facultyInCharge: 'Mr. A. Albert',
    odType: 'Individual',
    mentorStatus: 'REJECTED',
    hodStatus: 'PENDING',
    finalStatus: 'REJECTED',
    rejectionReason: 'Low attendance in monthly review (below 75%)',
    appliedDate: '2026-07-14',
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('STUDENT');
  const [requests, setRequests] = useState<ODRequest[]>(() => {
    const local = localStorage.getItem('od_requests');
    return local ? JSON.parse(local) : mockRequests;
  });

  useEffect(() => {
    localStorage.setItem('od_requests', JSON.stringify(requests));
  }, [requests]);

  const addRequest = (newReq: Omit<ODRequest, 'id' | 'mentorStatus' | 'hodStatus' | 'finalStatus' | 'appliedDate'>) => {
    const req: ODRequest = {
      ...newReq,
      id: `OD-${Math.floor(1000 + Math.random() * 9000)}`,
      mentorStatus: 'PENDING',
      hodStatus: 'PENDING',
      finalStatus: 'PENDING',
      appliedDate: new Date().toISOString().split('T')[0],
    };
    setRequests((prev) => [req, ...prev]);
  };

  const updateMentorStatus = (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== id) return req;
        const finalStatus = status === 'REJECTED' ? 'REJECTED' : req.hodStatus === 'APPROVED' ? 'APPROVED' : 'PENDING';
        return {
          ...req,
          mentorStatus: status,
          rejectionReason: reason || req.rejectionReason,
          finalStatus,
        };
      })
    );
  };

  const updateHODStatus = (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== id) return req;
        const finalStatus = status === 'APPROVED' && req.mentorStatus === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING';
        return {
          ...req,
          hodStatus: status,
          rejectionReason: reason || req.rejectionReason,
          finalStatus,
        };
      })
    );
  };

  const bulkHODApprove = (ids: string[]) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (!ids.includes(req.id)) return req;
        if (req.mentorStatus !== 'APPROVED') return req; // HOD can only approve mentor approved ones
        return {
          ...req,
          hodStatus: 'APPROVED',
          finalStatus: 'APPROVED',
        };
      })
    );
  };

  const bulkHODReject = (ids: string[], reason: string) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (!ids.includes(req.id)) return req;
        return {
          ...req,
          hodStatus: 'REJECTED',
          finalStatus: 'REJECTED',
          rejectionReason: reason,
        };
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        requests,
        addRequest,
        updateMentorStatus,
        updateHODStatus,
        bulkHODApprove,
        bulkHODReject,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
