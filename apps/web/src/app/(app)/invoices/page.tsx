'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoices, payInvoice, type Invoice } from '@/lib/invoice-api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2, FileText, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => payInvoice(id),
    onSuccess: () => {
      toast.success('Invoice paid successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to pay invoice');
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-slate-500">Manage supplier invoices and payments.</p>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-slate-200">
        <CardHeader className="bg-slate-50/50 pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-blue-100 p-2 text-blue-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Invoice List</CardTitle>
              <CardDescription>All generated invoices from received purchase orders.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[180px]">Invoice No.</TableHead>
                  <TableHead>PO No.</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No invoices found. Generate one from a received PO.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices?.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-medium text-slate-900">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-slate-600">{invoice.purchaseOrder?.poNumber}</TableCell>
                      <TableCell>{invoice.supplier?.name}</TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(invoice.totalAmount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.status === 'UNPAID' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                            onClick={() => payMutation.mutate(invoice.id)}
                            disabled={payMutation.isPending}
                          >
                            {payMutation.isPending && payMutation.variables === invoice.id ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-2 h-3.5 w-3.5" />
                            )}
                            Pay Invoice
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: Invoice['status'] }) {
  switch (status) {
    case 'PAID':
      return <Badge variant="green" className="flex w-fit items-center gap-1.5"><CheckCircle className="h-3 w-3"/> Paid</Badge>;
    case 'UNPAID':
      return <Badge variant="amber" className="flex w-fit items-center gap-1.5"><Clock className="h-3 w-3"/> Unpaid</Badge>;
    case 'DRAFT':
      return <Badge variant="slate" className="flex w-fit items-center gap-1.5"><FileText className="h-3 w-3"/> Draft</Badge>;
    case 'CANCELLED':
      return <Badge variant="red">Cancelled</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
}
