'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ClipboardList, Plus } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { SearchBar } from '@/components/data/search-bar';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  fetchPurchaseRequests,
  getStatusLabel,
  type PurchaseRequestStatus,
} from '@/lib/purchase-request-api';
import { formatCurrency } from '@/lib/utils';

const pageSize = 5;
const allFilter = 'All';
const statuses: PurchaseRequestStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'];

export default function PurchaseRequestsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PurchaseRequestStatus | typeof allFilter>(allFilter);
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['purchase-requests', { page, search, status }],
    queryFn: () =>
      fetchPurchaseRequests({
        page,
        limit: pageSize,
        search,
        status: status === allFilter ? undefined : status,
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ['purchase-requests', 'summary'],
    queryFn: () => fetchPurchaseRequests({ page: 1, limit: 100 }),
  });

  const rows = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const summaryRows = summaryQuery.data?.data ?? [];
  const totalRequests = summaryQuery.data?.meta.total ?? 0;
  const submittedCount = summaryRows.filter((request) => request.status === 'SUBMITTED').length;
  const draftCount = summaryRows.filter((request) => request.status === 'DRAFT').length;
  const pageCount = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(page, pageCount);
  const errorMessage = listQuery.isError ? getApiErrorMessage(listQuery.error, 'Unable to load purchase requests.') : null;
  const canCreatePurchaseRequest = user?.roles.some((role) => role === 'ADMIN' || role === 'REQUESTER') ?? false;

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Purchase Requests</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Draft, submit, and review purchase requests with budget visibility and multi-item request lines.
          </p>
        </div>
        {canCreatePurchaseRequest ? (
          <Button asChild>
            <Link href="/purchase-requests/create">
              <Plus className="h-4 w-4" />
              Create PR
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total PR" value={summaryQuery.isLoading ? '...' : String(totalRequests)} caption="API request records" />
        <SummaryCard label="Submitted" value={summaryQuery.isLoading ? '...' : String(submittedCount)} caption="Awaiting approval" />
        <SummaryCard label="Draft" value={summaryQuery.isLoading ? '...' : String(draftCount)} caption="Editable requests" />
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Purchase Request List</CardTitle>
              <CardDescription>API-backed purchase request records.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <SearchBar
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  resetPage();
                }}
                placeholder="Search PR number, title, requester"
              />
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as PurchaseRequestStatus | typeof allFilter);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allFilter}>All Status</SelectItem>
                  {statuses.map((option) => (
                    <SelectItem key={option} value={option}>
                      {getStatusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-md bg-blue-50 p-2 text-blue-800">
                <ClipboardList className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[170px]">PR No</TableHead>
                  <TableHead className="min-w-[260px]">Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[90px] text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-slate-500">
                      Loading purchase requests...
                    </TableCell>
                  </TableRow>
                ) : errorMessage ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-red-600">
                      {errorMessage}
                    </TableCell>
                  </TableRow>
                ) : rows.length ? (
                  rows.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{request.requestNumber}</div>
                        <div className="text-xs text-slate-500">Need by {request.requiredDate ?? '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{request.title}</div>
                        <div className="text-xs text-slate-500">Requester: {request.requester.fullName}</div>
                      </TableCell>
                      <TableCell>{request.department.name}</TableCell>
                      <TableCell>{request.budget?.code ?? '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={getStatusLabel(request.status)} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(request.totalAmount)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon" aria-label={`View ${request.requestNumber}`}>
                          <Link href={`/purchase-requests/${request.id}`}>
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-slate-500">
                      No purchase requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {rows.length} of {meta?.total ?? 0} purchase requests
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1 || listQuery.isLoading} onClick={() => setPage(currentPage - 1)}>
                Previous
              </Button>
              <div className="w-20 text-center font-medium">
                {currentPage} / {pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount || listQuery.isLoading}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
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
