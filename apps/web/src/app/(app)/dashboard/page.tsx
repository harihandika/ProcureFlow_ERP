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
} from 'lucide-react';
import { POStatusChart, PRStatusChart } from '@/components/dashboard/dashboard-charts';
import { StatusBadge, type WorkflowStatus } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

const totalBudget = 850000000;
const usedBudget = 184000000;
const remainingBudget = totalBudget - usedBudget;

const summaryCards = [
  {
    label: 'Total Budget',
    value: formatCurrency(totalBudget),
    caption: 'Active allocation for FY 2026',
    icon: Landmark,
    tone: 'blue',
  },
  {
    label: 'Used Budget',
    value: formatCurrency(usedBudget),
    caption: 'Committed and consumed spend',
    icon: Wallet,
    tone: 'emerald',
  },
  {
    label: 'Remaining Budget',
    value: formatCurrency(remainingBudget),
    caption: 'Available for new requests',
    icon: Banknote,
    tone: 'sky',
  },
  {
    label: 'Pending Approvals',
    value: '33',
    caption: 'Manager and finance queue',
    icon: Clock3,
    tone: 'amber',
  },
];

const recentPurchaseRequests: Array<{
  prNo: string;
  requester: string;
  department: string;
  requiredDate: string;
  amount: number;
  status: WorkflowStatus;
}> = [
  {
    prNo: 'PR-2026-0014',
    requester: 'Rina Requester',
    department: 'Information Technology',
    requiredDate: '2026-05-20',
    amount: 37500000,
    status: 'Submitted',
  },
  {
    prNo: 'PR-2026-0013',
    requester: 'Maya Manager',
    department: 'Operations',
    requiredDate: '2026-05-22',
    amount: 18850000,
    status: 'Approved',
  },
  {
    prNo: 'PR-2026-0012',
    requester: 'Faris Finance',
    department: 'Finance',
    requiredDate: '2026-05-25',
    amount: 9200000,
    status: 'Draft',
  },
  {
    prNo: 'PR-2026-0011',
    requester: 'Rina Requester',
    department: 'Information Technology',
    requiredDate: '2026-05-18',
    amount: 2150000,
    status: 'Rejected',
  },
];

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
  {
    id: 'ERP-0092',
    poNo: 'PO-2026-0014',
    operation: 'CREATE_PO',
    attempt: '1 of 3',
    syncedAt: '2026-05-11 16:08',
    status: 'Success',
    message: 'Accepted by mock ERP',
  },
  {
    id: 'ERP-0091',
    poNo: 'PO-2026-0013',
    operation: 'CREATE_PO',
    attempt: '3 of 3',
    syncedAt: '2026-05-11 14:35',
    status: 'Failed',
    message: 'Supplier code rejected',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="grid gap-6 bg-slate-950 px-6 py-6 text-white lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-200">
              <FileText className="h-4 w-4" />
              Procurement command center
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">
              Budget control, request approvals, receiving, and ERP sync status.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Portfolio-ready overview for finance, purchasing, warehouse, and department managers using dummy data.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric label="Budget Utilization" value="21.6%" />
            <HeroMetric label="Approval SLA" value="92%" />
            <HeroMetric label="ERP Success" value="87%" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="overflow-hidden">
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
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
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
            <Badge variant="blue">87 PR</Badge>
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
            <Badge variant="green">97 PO</Badge>
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
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPurchaseRequests.map((request) => (
                    <TableRow key={request.prNo}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{request.prNo}</div>
                        <div className="text-xs text-slate-500">Need by {request.requiredDate}</div>
                      </TableCell>
                      <TableCell>{request.requester}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(request.amount)}</TableCell>
                    </TableRow>
                  ))}
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
                    <TableRow key={log.id}>
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
