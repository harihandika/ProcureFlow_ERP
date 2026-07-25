'use client';

import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock3,
  FileText,
  Landmark,
  RefreshCw,
  Wallet,
  Loader2,
} from 'lucide-react';
import { POStatusChart, PRStatusChart } from '@/components/dashboard/dashboard-charts';
import { StatusBadge, type WorkflowStatus } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/lib/dashboard-api';

const recentErpLogs: Array<{
  id: string;
  poNo: string;
  operation: string;
  attempt: string;
  syncedAt: string;
  status: 'Success' | 'Failed';
  message: string;
}> = [
  {
    id: 'ERP-0094',
    poNo: 'PO-2026-0016',
    operation: 'CREATE_PO',
    attempt: '1 of 3',
    syncedAt: '2026-05-12 09:42',
    status: 'Success',
    message: 'Accepted by mock ERP',
  },
  {
    id: 'ERP-0093',
    poNo: 'PO-2026-0015',
    operation: 'CREATE_PO',
    attempt: '2 of 3',
    syncedAt: '2026-05-12 09:16',
    status: 'Failed',
    message: 'Temporary ERP timeout',
  },
];

export default function DashboardPage() {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Budget',
      value: formatCurrency(summary.budget.total),
      caption: 'Active allocation for current FY',
      icon: Landmark,
      tone: 'blue',
    },
    {
      label: 'Used Budget',
      value: formatCurrency(summary.budget.spent),
      caption: 'Committed and consumed spend',
      icon: Wallet,
      tone: 'emerald',
    },
    {
      label: 'Remaining Budget',
      value: formatCurrency(summary.budget.remaining),
      caption: 'Available for new requests',
      icon: Banknote,
      tone: 'sky',
    },
    {
      label: 'Pending Approvals',
      value: summary.totalPrPending.toString(),
      caption: 'Manager and finance queue',
      icon: Clock3,
      tone: 'amber',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 shadow-xl">
        <div className="grid gap-6 px-6 py-8 text-white lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-200">
              <FileText className="h-4 w-4" />
              Procurement command center
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">
              Budget control, request approvals, receiving, and ERP sync status.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Real-time portfolio overview for finance, purchasing, warehouse, and department managers.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric label="Budget Utilization" value={`${summary.budget.usagePercentage.toFixed(1)}%`} />
            <HeroMetric label="Approved PRs" value={summary.totalPrApproved.toString()} />
            <HeroMetric label="Received POs" value={summary.totalPoReceived.toString()} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 group">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle className="mt-2 text-2xl">{card.value}</CardTitle>
                </div>
                <div className={getIconClassName(card.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">{card.caption}</p>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>PR Status Chart</CardTitle>
              <CardDescription>Current purchase request pipeline</CardDescription>
            </div>
            <Badge variant="blue">{summary.totalPrPending + summary.totalPrApproved} PR Active</Badge>
          </CardHeader>
          <CardContent>
            <PRStatusChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>PO Status Chart</CardTitle>
              <CardDescription>Purchase order lifecycle status</CardDescription>
            </div>
            <Badge variant="green">{summary.totalPoIssued + summary.totalPoReceived} PO Active</Badge>
          </CardHeader>
          <CardContent>
            <POStatusChart />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 2xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Purchase Requests</CardTitle>
              <CardDescription>Latest submitted and updated requests</CardDescription>
            </div>
            <div className="rounded-md bg-blue-50 p-2 text-blue-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR No</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentPurchaseRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors cursor-default">
                      <TableCell>
                        <div className="font-medium text-slate-900">{request.requestNumber}</div>
                        <div className="text-xs text-slate-500">{request.title}</div>
                      </TableCell>
                      <TableCell>{request.requester.fullName}</TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status as WorkflowStatus} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(request.totalAmount))}</TableCell>
                    </TableRow>
                  ))}
                  {summary.recentPurchaseRequests.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={5} className="text-center py-4 text-slate-500">No requests found</TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent ERP Sync Logs</CardTitle>
              <CardDescription>Mock ERP integration results and retry signals</CardDescription>
            </div>
            <div className="rounded-md bg-slate-100 p-2 text-slate-700">
              <RefreshCw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sync ID</TableHead>
                    <TableHead>PO No</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentErpLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors cursor-default">
                      <TableCell>
                        <div className="font-medium text-slate-900">{log.id}</div>
                        <div className="text-xs text-slate-500">{log.syncedAt}</div>
                      </TableCell>
                      <TableCell>{log.poNo}</TableCell>
                      <TableCell>
                        <div>{log.operation}</div>
                        <div className="text-xs text-slate-500">{log.attempt}</div>
                      </TableCell>
                      <TableCell>
                        {log.status === 'Success' ? (
                          <Badge variant="green">Success</Badge>
                        ) : (
                          <Badge variant="red">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.status === 'Failed' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                          <span>{log.message}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-xs font-medium uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-normal">{value}</div>
    </div>
  );
}

function getIconClassName(tone: string) {
  const base = 'rounded-md p-2';

  switch (tone) {
    case 'emerald':
      return `${base} bg-emerald-50 text-emerald-700`;
    case 'sky':
      return `${base} bg-sky-50 text-sky-700`;
    case 'amber':
      return `${base} bg-amber-50 text-amber-700`;
    default:
      return `${base} bg-blue-50 text-blue-800`;
  }
}
