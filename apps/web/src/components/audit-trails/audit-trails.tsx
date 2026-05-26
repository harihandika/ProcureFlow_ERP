'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  auditActionOptions,
  auditEntityTypeOptions,
  fetchAuditTrails,
  type AuditAction,
  type AuditTrail,
  type AuditEntityType,
} from '@/lib/audit-trail-api';

const allValue = 'All';

export function AuditTrails() {
  const [moduleFilter, setModuleFilter] = useState<typeof allValue | AuditEntityType>(allValue);
  const [userFilter, setUserFilter] = useState(allValue);
  const [actionFilter, setActionFilter] = useState<typeof allValue | AuditAction>(allValue);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTrail, setSelectedTrail] = useState<AuditTrail | null>(null);

  const auditQuery = useQuery({
    queryKey: ['audit-trails', 'list', { moduleFilter, userFilter, actionFilter, dateFilter, search }],
    queryFn: () =>
      fetchAuditTrails({
        page: 1,
        limit: 100,
        search,
        entityType: moduleFilter === allValue ? undefined : moduleFilter,
        actorId: userFilter === allValue ? undefined : userFilter,
        action: actionFilter === allValue ? undefined : actionFilter,
        date: dateFilter || undefined,
      }),
  });

  const userOptionsQuery = useQuery({
    queryKey: ['audit-trails', 'user-options'],
    queryFn: () => fetchAuditTrails({ page: 1, limit: 100 }),
  });

  const trails = auditQuery.data?.data ?? [];
  const userOptions = useMemo(() => {
    const actors = new Map<string, string>();

    for (const trail of userOptionsQuery.data?.data ?? []) {
      if (trail.actor?.id) {
        actors.set(trail.actor.id, trail.actor.fullName || trail.actor.email);
      }
    }

    return Array.from(actors.entries()).map(([id, label]) => ({ id, label }));
  }, [userOptionsQuery.data]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Audit Trails</CardTitle>
          <CardDescription>Activity log for important user actions across ProcureFlow ERP modules.</CardDescription>
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
                  placeholder="Search entity, actor, or label"
                  className="pl-9"
                />
              </div>
            </div>
            <FilterSelect
              label="Module"
              value={moduleFilter}
              options={[{ value: allValue, label: allValue }, ...auditEntityTypeOptions]}
              onChange={(value) => setModuleFilter(value as typeof moduleFilter)}
            />
            <FilterSelect
              label="User"
              value={userFilter}
              options={[{ value: allValue, label: allValue }, ...userOptions.map((user) => ({ value: user.id, label: user.label }))]}
              onChange={setUserFilter}
            />
            <FilterSelect
              label="Action"
              value={actionFilter}
              options={[{ value: allValue, label: allValue }, ...auditActionOptions]}
              onChange={(value) => setActionFilter(value as typeof actionFilter)}
            />
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
                {auditQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading audit trails...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : null}
                {auditQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-red-600">
                      {getApiErrorMessage(auditQuery.error, 'Unable to load audit trails.')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!auditQuery.isLoading && !auditQuery.isError
                  ? trails.map((trail) => (
                      <TableRow key={trail.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(trail.createdAt)}</TableCell>
                        <TableCell>{trail.moduleLabel}</TableCell>
                        <TableCell>
                          <ActionBadge action={trail.action} label={trail.actionLabel} />
                        </TableCell>
                        <TableCell>{trail.actor?.fullName ?? trail.actor?.email ?? '-'}</TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">{trail.entityLabel ?? trail.entityType}</div>
                          <div className="text-xs text-slate-500">{trail.entityId ?? '-'}</div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{buildSummary(trail)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedTrail(trail)}>
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {!auditQuery.isLoading && !auditQuery.isError && trails.length === 0 ? (
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
  options: Array<{ value: string; label: string }>;
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
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActionBadge({ action, label }: { action: AuditTrail['action']; label: string }) {
  const variant =
    action === 'DELETE'
      ? 'red'
      : action === 'CREATE' || action === 'SYNC_ERP' || action === 'RETRY_ERP_SYNC' || action === 'RECEIVE'
        ? 'green'
        : 'blue';

  return <Badge variant={variant}>{label}</Badge>;
}

function AuditTrailDetail({ trail }: { trail: AuditTrail }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>{trail.id}</SheetTitle>
        <SheetDescription>{buildSummary(trail)}</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 p-6">
        <section className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailLine label="Timestamp" value={formatDateTime(trail.createdAt)} />
          <DetailLine label="User" value={trail.actor?.fullName ?? trail.actor?.email ?? '-'} />
          <DetailLine label="Module" value={trail.moduleLabel} />
          <DetailLine label="Action" value={trail.actionLabel} />
          <DetailLine label="Entity" value={trail.entityLabel ?? trail.entityType} />
          <DetailLine label="Entity ID" value={trail.entityId ?? '-'} />
          <DetailLine label="IP Address" value={trail.ipAddress ?? '-'} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-950">Value Changes</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            <JsonPanel title="Old Value" value={trail.before} />
            <JsonPanel title="New Value" value={trail.after} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-950">Metadata</h3>
          <JsonPanel title="Metadata" value={trail.metadata} />
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

function JsonPanel({ title, value }: { title: string; value: unknown }) {
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

function buildSummary(trail: AuditTrail) {
  const actor = trail.actor?.fullName ?? trail.actor?.email ?? 'System';
  const entity = trail.entityLabel ?? trail.entityType;

  return `${actor} ${trail.actionLabel.toLowerCase()} ${entity}.`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
