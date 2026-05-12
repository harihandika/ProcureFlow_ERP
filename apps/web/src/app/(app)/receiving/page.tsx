import Link from 'next/link';
import { Plus, PackageCheck } from 'lucide-react';
import { ReceivingStatusBadge } from '@/components/receiving/receiving-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { receivingRecords } from '@/lib/receiving-data';

export default function ReceivingPage() {
  const partialCount = receivingRecords.filter((record) => record.status === 'Partial').length;
  const fullCount = receivingRecords.filter((record) => record.status === 'Full').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Receiving</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Record partial or full goods receiving against issued purchase orders using dummy data.
          </p>
        </div>
        <Button asChild>
          <Link href="/receiving/create">
            <Plus className="h-4 w-4" />
            Create Receiving
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Receiving Records" value={String(receivingRecords.length)} caption="Dummy GRN history" />
        <SummaryCard label="Partial" value={String(partialCount)} caption="PO still has remaining quantity" />
        <SummaryCard label="Full" value={String(fullCount)} caption="PO quantity fulfilled" />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Receiving List</CardTitle>
            <CardDescription>Goods receipt notes and their receiving status.</CardDescription>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-800">
            <PackageCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Receiving No</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead className="min-w-[230px]">Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Received At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{record.receivingNo}</div>
                      <div className="text-xs text-slate-500">{record.deliveryNoteNo}</div>
                    </TableCell>
                    <TableCell>{record.poNo}</TableCell>
                    <TableCell>{record.supplierName}</TableCell>
                    <TableCell>{record.warehouse}</TableCell>
                    <TableCell>
                      <ReceivingStatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>{record.receivedBy}</TableCell>
                    <TableCell>{record.receivedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receiving History Table</CardTitle>
          <CardDescription>Line-level received quantity versus ordered quantity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receiving No</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[240px]">Item</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received This GRN</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingRecords.flatMap((record) =>
                  record.items.map((item) => (
                    <TableRow key={`${record.id}-${item.sku}`}>
                      <TableCell className="font-medium text-slate-900">{record.receivingNo}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {item.previouslyReceived + item.receivedQuantity} / {item.orderedQuantity}
                        </div>
                        <div className="text-xs text-slate-500">this GRN {item.receivedQuantity}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.acceptedQuantity}</TableCell>
                      <TableCell className="text-right">{item.rejectedQuantity}</TableCell>
                    </TableRow>
                  )),
                )}
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
