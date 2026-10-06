/**
 * Reusable Structured Debug Logger for OD Approval Pipeline.
 * Formats console logs with grouping, colors, and step tracking for easy debugging.
 */

export interface LogStepParams {
  currentUser?: { uid: string; name: string; role: string; email: string };
  odId?: string;
  requestNumber?: string;
  currentStatus?: string;
  action?: string;
  firestoreUpdate?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export const debugLogger = {
  groupStart: (stepName: string, params?: LogStepParams) => {
    console.groupCollapsed(
      `%c[OD_APPROVAL] ${stepName}`,
      'color: #2f5da8; font-weight: bold; font-size: 12px;'
    );

    if (params) {
      if (params.currentUser) {
        console.log(
          '%cCurrent User:',
          'color: #8b5cf6; font-weight: bold;',
          params.currentUser
        );
      }
      if (params.odId || params.requestNumber) {
        console.log(
          '%cOD Request ID / Num:',
          'color: #3b82f6; font-weight: bold;',
          { odId: params.odId, requestNumber: params.requestNumber }
        );
      }
      if (params.currentStatus) {
        console.log(
          '%cCurrent Status:',
          'color: #f59e0b; font-weight: bold;',
          params.currentStatus
        );
      }
      if (params.action) {
        console.log(
          '%cAction:',
          'color: #10b981; font-weight: bold;',
          params.action
        );
      }
      if (params.firestoreUpdate) {
        console.log(
          '%cFirestore Payload Written:',
          'color: #ec4899; font-weight: bold;',
          params.firestoreUpdate
        );
      }
      if (params.details) {
        console.log(
          '%cDetails:',
          'color: #64748b; font-weight: bold;',
          params.details
        );
      }
    }
  },

  step: (stepName: string, data?: unknown) => {
    console.log(
      `%c  [STEP] ${stepName}`,
      'color: #06b6d4; font-weight: bold;',
      data || ''
    );
  },

  success: (message: string, data?: unknown) => {
    console.log(
      `%c[OD_APPROVAL SUCCESS] ${message}`,
      'color: #22c55e; font-weight: bold;',
      data || ''
    );
    console.groupEnd();
  },

  error: (fnName: string, error: unknown, odId?: string) => {
    console.groupEnd();
    console.group(
      `%c[OD_APPROVAL ERROR] In Function: ${fnName}`,
      'color: #ef4444; font-weight: bold; font-size: 13px;'
    );
    console.log('%cDocument ID:', 'color: #f97316; font-weight: bold;', odId || 'N/A');
    console.log('%cError Message:', 'color: #ef4444; font-weight: bold;', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.log('%cStack Trace:', 'color: #94a3b8;', error.stack);
    }
    console.groupEnd();
  },
};
