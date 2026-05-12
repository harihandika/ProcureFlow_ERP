'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const prStatusData = [
  { name: 'Draft', value: 18, color: '#64748b' },
  { name: 'Submitted', value: 24, color: '#2563eb' },
  { name: 'Approved', value: 39, color: '#059669' },
  { name: 'Rejected', value: 6, color: '#dc2626' },
];

const poStatusData = [
  { status: 'Draft', count: 7, fill: '#64748b' },
  { status: 'Issued', count: 31, fill: '#1d4ed8' },
  { status: 'Partial', count: 12, fill: '#f59e0b' },
  { status: 'Received', count: 44, fill: '#059669' },
  { status: 'Cancelled', count: 3, fill: '#dc2626' },
];

export function PRStatusChart() {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <PieChart>
        <Pie
          data={prStatusData}
          dataKey="value"
          nameKey="name"
          innerRadius={66}
          outerRadius={104}
          paddingAngle={3}
          strokeWidth={3}
        >
          {prStatusData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number, name: string) => [`${value} requests`, name]} />
        <Legend iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function POStatusChart() {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={poStatusData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="status" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value: number) => [`${value} orders`, 'Purchase Orders']} />
        <Bar dataKey="count" name="PO Status" radius={[6, 6, 0, 0]}>
          {poStatusData.map((entry) => (
            <Cell key={entry.status} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
