/**
 * Web response DTO for a purchase requisition line.
 * Matches backend RequisitionLineWebResponse.java
 */
export interface RequisitionLineWebResponse {
  id: string;
  lineNumber: number;
  materialId?: string;
  materialCode: string;
  materialName: string;
  materialDescription?: string;
  unitOfMeasure: string;
  standardPrice?: string;
  unitPrice: string;
  currencyCode: string;
  quantity: number;
  quantityReceived?: number;
  quantityRejected?: number;
  requiredDate: string;
  lineTotal: string;
  currencyCodeLine?: string;
  supplierId?: string;
  supplierName?: string;
  supplierCode?: string;
  notes?: string;
  deliveryTerms?: string;
  storageLocation?: string;
  batchNumber?: string;
  expiryDate?: string;
}

// Alias for standard usage
export type RequisitionLine = RequisitionLineWebResponse;
