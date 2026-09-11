import type { RequisitionLineWebRequest } from './RequisitionLineWebRequest';

/**
 * Web request DTO for updating a purchase requisition.
 * Matches backend UpdateRequisitionWebRequest.java
 */
export interface UpdateRequisitionWebRequest {
  title?: string;
  description?: string;
  justification?: string;
  requiredDate?: string;
  currencyCode?: string;
  lines?: RequisitionLineWebRequest[];
  updatedBy?: string;
}

// Alias for standard usage across frontend forms
export type UpdateRequisitionRequest = UpdateRequisitionWebRequest;
