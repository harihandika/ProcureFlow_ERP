'use client';

import { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auditTrails, type AuditTrail } from '@/lib/erp-audit-data';

const allValue = 'All';

export function AuditTrails() {
  const [moduleFilter, setModuleFilter] = useState(allValue);
  const [userFilter, setUserFilter] = useState(allValue);
  const [actionFilter, setActionFilter] = useState(allValue);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTrail, setSelectedTrail] = useState<AuditTrail | null>(null);

  const modules = useMemo(() => [allValue, ...Array.from(new Set(auditTrails.map((trail) => trail.module)))], []);
  const users = useMemo(() => [allValue, ...Array.from(new Set(auditTrails.map((trail) => trail.user)))], []);
  const actions = useMemo(() => [allValue, ...Array.from(new Set(auditTrails.map((trail) => trail.action)))], []);

  const filteredTrails = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return auditTrails.filter((trail) => {
      const matchesModule = moduleFilter === allValue || trail.module === moduleFilter;
      const matchesUser = userFilter === allValue || trail.user === userFilter;
      const matchesAction = actionFilter === allValue || trail.action === actionFilter;
      const matchesDate = !dateFilter || trail.timestamp.startsWith(dateFilter);
      const matchesSearch =
        !keyword ||
        trail.id.toLowerCase().includes(keyword) ||
        trail.entityId.toLowerCase().includes(keyword) ||
        trail.summary.toLowerCase().includes(keyword);

      return matchesModule && matchesUser && matchesAction && matchesDate && matchesSearch;
    });
  }, [actionFilter, dateFilter, moduleFilter, search, userFilter]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Audit Trails</CardTitle>
          <CardDescription>Dummy activity log for important user actions across ProcureFlow ERP modules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px_160px_180px]">
            <div>
              <Label htmlFor="audit-search">Search</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="audit-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search audit id, entity, or summary"
                  className="pl-9"
                />
              </div>
            </div>
            <FilterSelect label="Module" value={moduleFilter} options={modules} onChange={setModuleFilter} />
            <FilterSelect label="User" value={userFilter} options={users} onChange={setUserFilter} />
            <FilterSelect label="Action" value={actionFilter} options={actions} onChange={setActionFilter} />
            <div>
              <Label htmlFor="audit-date">Date</Label>
              <Input id="audit-date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="mt-2" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="min-w-[320px]">Summary</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrails.map((trail) => (
                  <TableRow key={trail.id}>
                    <TableCell className="whitespace-nowrap">{trail.timestamp}</TableCell>
                    <TableCell>{trail.module}</TableCell>
                    <TableCell>
                      <ActionBadge action={trail.action} />
                    </TableCell>
                    <TableCell>{trail.user}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{trail.entity}</div>
                      <div className="text-xs text-slate-500">{trail.entityId}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{trail.summary}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedTrail(trail)}>
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTrails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      No audit trails match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={Boolean(selectedTrail)} onOpenChange={(open) => !open && setSelectedTrail(null)}>
        <SheetContent className="overflow-y-auto sm:w-[640px] sm:max-w-[640px]">
          {selectedTrail ? <AuditTrailDetail trail={selectedTrail} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActionBadge({ action }: { action: AuditTrail['action'] }) {
  const variant = action === 'DELETE' || action === 'REJECT' ? 'red' : action === 'APPROVE' || action === 'SYNC' ? 'green' : 'blue';

  return <Badge variant={variant}>{action}</Badge>;
}

function AuditTrailDetail({ trail }: { trail: AuditTrail }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>{trail.id}</SheetTitle>
        <SheetDescription>{trail.summary}</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 p-6">
        <section className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailLine label="Timestamp" value={trail.timestamp} />
          <DetailLine label="User" value={trail.user} />
          <DetailLine label="Module" value={trail.module} />
          <DetailLine label="Action" value={trail.action} />
          <DetailLine label="Entity" value={trail.entity} />
          <DetailLine label="Entity ID" value={trail.entityId} />
          <DetailLine label="IP Address" value={trail.ipAddress} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-950">Value Changes</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            <JsonPanel title="Old Value" value={trail.oldValue} />
            <JsonPanel title="New Value" value={trail.newValue} />
          </div>
        </section>
      </div>
    </>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function JsonPanel({ title, value }: { title: string; value?: AuditTrail['oldValue'] }) {
  return (
    <div className="rounded-md border">
      <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">{title}</div>
      {value ? (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-xs leading-5 text-slate-700">{JSON.stringify(value, null, 2)}</pre>
      ) : (
        <div className="p-3 text-sm text-slate-500">No value captured.</div>
      )}
    </div>
  );
}
