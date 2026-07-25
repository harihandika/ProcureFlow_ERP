import { apiClient } from './api-client';

export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PAID' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  totalAmount: string;
  currency: string;
  taxAmount: string;
  notes: string | null;
  purchaseOrderId: string;
  supplierId: string;
  supplier: { name: string; code: string };
  purchaseOrder: { poNumber: string };
  items?: InvoiceItem[];
  createdAt: string;
}

export async function getInvoices(): Promise<Invoice[]> {
  const response = await apiClient.get('/invoices');
  return response.data;
}

export async function generateInvoice(poId: string): Promise<Invoice> {
  const response = await apiClient.post(`/invoices/generate-from-po/${poId}`);
  return response.data;
}

export async function payInvoice(id: string): Promise<Invoice> {
  const response = await apiClient.post(`/invoices/${id}/pay`);
  return response.data;
}
