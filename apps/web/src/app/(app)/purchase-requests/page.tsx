import Link from 'next/link';
import { ArrowUpRight, ClipboardList, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRequestTotal, purchaseRequests } from '@/lib/purchase-request-data';
import { formatCurrency } from '@/lib/utils';

export default function PurchaseRequestsPage() {
  const totalRequests = purchaseRequests.length;
  const submittedCount = purchaseRequests.filter((request) => request.status === 'Submitted').length;
  const approvedCount = purchaseRequests.filter((request) => request.status === 'Approved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Purchase Requests</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Draft, submit, and review purchase requests with budget visibility and multi-item request lines.
          </p>
        </div>
        <Button asChild>
          <Link href="/purchase-requests/create">
            <Plus className="h-4 w-4" />
            Create PR
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total PR" value={String(totalRequests)} caption="Dummy request records" />
        <SummaryCard label="Submitted" value={String(submittedCount)} caption="Awaiting approval" />
        <SummaryCard label="Approved" value={String(approvedCount)} caption="Ready for purchasing" />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase Request List</CardTitle>
            <CardDescription>Recent purchase requests using dummy data.</CardDescription>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-800">
            <ClipboardList className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">PR No</TableHead>
                  <TableHead className="min-w-[240px]">Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[90px] text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{request.prNo}</div>
                      <div className="text-xs text-slate-500">Need by {request.requiredDate}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{request.title}</div>
                      <div className="text-xs text-slate-500">Requester: {request.requester}</div>
                    </TableCell>
                    <TableCell>{request.department}</TableCell>
                    <TableCell>{request.budgetCode}</TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(getRequestTotal(request.items))}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon" aria-label={`View ${request.prNo}`}>
                        <Link href={`/purchase-requests/${request.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500">{caption}</p>
      </CardContent>
    </Card>
  );
}
