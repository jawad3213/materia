import type { RequisitionLineWebRequest } from './RequisitionLineWebRequest';

/**
 * Web request DTO for creating a purchase requisition.
 * Matches backend CreateRequisitionWebRequest.java
 */
export interface CreateRequisitionWebRequest {
  title: string;
  description?: string;
  justification?: string;
  requesterId?: string;
  requesterName: string;
  requiredDate?: string;
  currencyCode?: string;
  lines: RequisitionLineWebRequest[];
  createdBy?: string;
  status?: 'DRAFT' | 'SUBMITTED' | string;
}

// Alias for standard usage across frontend forms
export type CreateRequisitionRequest = CreateRequisitionWebRequest;
