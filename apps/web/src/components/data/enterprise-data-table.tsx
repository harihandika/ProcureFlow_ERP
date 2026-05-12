'use client';

import { useMemo, useState } from 'react';
import { Eye, Filter, Pencil, Plus, Search } from 'lucide-react';
import { StatusBadge, type WorkflowStatus } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ModuleConfig, ModuleRecord } from '@/lib/dummy-data';
import { formatCurrency } from '@/lib/utils';

const statusOptions: Array<'All' | WorkflowStatus> = [
  'All',
  'Draft',
  'Submitted',
  'Approved',
  'Rejected',
  'Completed',
  'Failed',
];

export function EnterpriseDataTable({ config }: { config: ModuleConfig }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | WorkflowStatus>('All');
  const [page, setPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<ModuleRecord | null>(null);
  const [formRecord, setFormRecord] = useState<ModuleRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const pageSize = 5;

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return config.records.filter((record) => {
      const searchable = [
        record.id,
        record.title,
        record.subtitle,
        record.owner,
        record.department,
        record.status,
        record.reference,
        ...Object.values(record.meta),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedSearch ? searchable.includes(normalizedSearch) : true;
      const matchesStatus = status === 'All' ? true : record.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [config.records, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function openCreateForm() {
    setFormRecord(null);
    setFormOpen(true);
  }

  function openEditForm(record: ModuleRecord) {
    setFormRecord(record);
    setFormOpen(true);
  }

  return (
    <>
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={config.searchPlaceholder}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as 'All' | WorkflowStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              {config.primaryAction}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[130px]">Reference</TableHead>
                <TableHead className="min-w-[240px]">Record</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-[180px]">Department</TableHead>
                <TableHead className="min-w-[160px]">Owner</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium text-slate-900">{record.reference}</TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{record.title}</div>
                    <div className="text-xs text-slate-500">{record.subtitle}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>{record.department}</TableCell>
                  <TableCell>{record.owner}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(record.amount)}</TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`View ${record.reference}`} onClick={() => setDetailRecord(record)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${record.reference}`} onClick={() => openEditForm(record)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing {rows.length} of {filteredRecords.length} records
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Previous
            </Button>
            <div className="w-20 text-center text-sm font-medium">
              {currentPage} / {pageCount}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <RecordFormDialog config={config} open={formOpen} onOpenChange={setFormOpen} record={formRecord} />
      <RecordDetailSheet config={config} record={detailRecord} onOpenChange={(open) => !open && setDetailRecord(null)} />
    </>
  );
}

function RecordFormDialog({
  config,
  open,
  onOpenChange,
  record,
}: {
  config: ModuleConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ModuleRecord | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? `Edit ${record.reference}` : config.primaryAction}</DialogTitle>
          <DialogDescription>{config.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {config.formFields.map((field, index) => (
            <div key={field} className={index === config.formFields.length - 1 && config.formFields.length % 2 === 1 ? 'sm:col-span-2' : ''}>
              <Label htmlFor={`${config.slug}-${field}`}>{field}</Label>
              <Input
                id={`${config.slug}-${field}`}
                className="mt-2"
                defaultValue={record ? defaultFieldValue(field, record) : ''}
                placeholder={field}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecordDetailSheet({
  config,
  record,
  onOpenChange,
}: {
  config: ModuleConfig;
  record: ModuleRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(record)} onOpenChange={onOpenChange}>
      <SheetContent>
        {record ? (
          <>
            <SheetHeader>
              <SheetTitle>{config.drawerTitle}</SheetTitle>
              <SheetDescription>{record.reference}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{record.title}</h3>
                  <p className="text-sm text-slate-500">{record.subtitle}</p>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <div className="mt-6 grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm">
                <DetailLine label="Owner" value={record.owner} />
                <DetailLine label="Department" value={record.department} />
                <DetailLine label="Amount" value={formatCurrency(record.amount)} />
                <DetailLine label="Date" value={record.date} />
                {Object.entries(record.meta).map(([label, value]) => (
                  <DetailLine key={label} label={label} value={value} />
                ))}
              </div>

              {config.drawerMode === 'approval' ? <ApprovalTimeline /> : null}
              {config.drawerMode === 'audit' ? <AuditPayload record={record} /> : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ApprovalTimeline() {
  const steps = [
    { label: 'Requester submitted', value: 'Rina Requester' },
    { label: 'Manager review', value: 'Maya Manager' },
    { label: 'Finance review', value: 'Faris Finance' },
  ];

  return (
    <div className="mt-6 rounded-lg border bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">Approval Timeline</h4>
      <div className="mt-4 space-y-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-700" />
              {index < steps.length - 1 ? <div className="mt-1 h-8 w-px bg-slate-200" /> : null}
            </div>
            <div className="-mt-1">
              <div className="text-sm font-medium text-slate-900">{step.label}</div>
              <div className="text-xs text-slate-500">{step.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditPayload({ record }: { record: ModuleRecord }) {
  const payload = {
    entity: record.reference,
    actor: record.owner,
    status: record.status,
    timestamp: `${record.date}T09:30:00+07:00`,
  };

  return (
    <div className="mt-6 rounded-lg border bg-slate-950 p-4 font-mono text-xs text-slate-100">
      <pre className="whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
    </div>
  );
}

function defaultFieldValue(field: string, record: ModuleRecord) {
  const normalized = field.toLowerCase();

  if (normalized.includes('code') || normalized.includes('number') || normalized.includes('sku')) {
    return record.reference;
  }

  if (normalized.includes('name') || normalized.includes('item') || normalized.includes('supplier')) {
    return record.title;
  }

  if (normalized.includes('department')) {
    return record.department;
  }

  if (normalized.includes('amount') || normalized.includes('price')) {
    return String(record.amount);
  }

  return record.meta[field] ?? '';
}
