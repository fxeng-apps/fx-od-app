import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Historical passes and movement passes are now unified under /student/requests.
 * This redirect ensures all direct deep links and legacy references route properly.
 */
export const History: React.FC = () => {
  return <Navigate to="/student/requests" replace />;
};

export default History;
