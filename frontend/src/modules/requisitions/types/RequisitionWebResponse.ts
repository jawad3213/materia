import type { RequisitionStatus } from './RequisitionStatus';
import type { RequisitionLineWebResponse } from './RequisitionLineWebResponse';

/**
 * Web response DTO for purchase requisitions.
 * Matches backend RequisitionWebResponse.java
 */
export interface RequisitionWebResponse {
  id: string;
  requisitionCode: string;
  title: string;
  description?: string;
  justification?: string;
  status: RequisitionStatus;
  requesterId: string;
  requesterName: string;
  requiredDate?: string;
  submittedDate?: string;
  approvedDate?: string;
  convertedDate?: string;
  totalAmount: string;
  currencyCode: string;
  approverId?: string;
  approverName?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  purchaseOrderId?: string;
  purchaseOrderCode?: string;
  lines: RequisitionLineWebResponse[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

// Alias for standard usage across frontend
export type Requisition = RequisitionWebResponse;
