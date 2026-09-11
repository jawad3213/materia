/**
 * Web request DTO for a purchase requisition line.
 * Matches backend RequisitionLineWebRequest.java
 */
export interface RequisitionLineWebRequest {
  id?: string;
  materialId?: string;
  materialCode?: string;
  quantity: number;
  requiredDate?: string;
  supplierId?: string;
  supplierCode?: string;
  notes?: string;
  deliveryTerms?: string;
  storageLocation?: string;
  batchNumber?: string;
  expiryDate?: string;
}
