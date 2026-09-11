/**
 * Web request payload for advanced requisition search.
 * Matches backend RequisitionSearchWebRequest.java
 */
export interface RequisitionSearchWebRequest {
  keyword?: string;
  requesterId?: string;
  approverId?: string;
  status?: string;
  currencyCode?: string;
  requiredDateFrom?: string;
  requiredDateTo?: string;
  submittedDateFrom?: string;
  submittedDateTo?: string;
}

// Alias for standard usage across frontend services
export type RequisitionSearchRequest = RequisitionSearchWebRequest;
