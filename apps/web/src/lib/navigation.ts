import {
  Archive,
  Boxes,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileClock,
  Gauge,
  Handshake,
  Landmark,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type UserRole = 'ADMIN' | 'FINANCE' | 'MANAGER' | 'REQUESTER' | 'PURCHASING' | 'WAREHOUSE';

export const roleOptions: UserRole[] = ['ADMIN', 'FINANCE', 'MANAGER', 'REQUESTER', 'PURCHASING', 'WAREHOUSE'];

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  MANAGER: 'Manager',
  REQUESTER: 'Requester',
  PURCHASING: 'Purchasing',
  WAREHOUSE: 'Warehouse',
};

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Gauge,
    roles: roleOptions,
  },
  {
    title: 'Items',
    href: '/items',
    icon: Archive,
    roles: ['ADMIN', 'PURCHASING'] satisfies UserRole[],
  },
  {
    title: 'Suppliers',
    href: '/suppliers',
    icon: Handshake,
    roles: ['ADMIN', 'PURCHASING'] satisfies UserRole[],
  },
  {
    title: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: ['ADMIN', 'FINANCE', 'MANAGER'] satisfies UserRole[],
  },
  {
    title: 'Warehouses',
    href: '/warehouses',
    icon: Warehouse,
    roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'] satisfies UserRole[],
  },
  {
    title: 'Packaging Units',
    href: '/packaging-units',
    icon: Boxes,
    roles: ['ADMIN', 'PURCHASING', 'WAREHOUSE'] satisfies UserRole[],
  },
  {
    title: 'Budgets',
    href: '/budgets',
    icon: Landmark,
    roles: ['ADMIN', 'FINANCE', 'MANAGER'] satisfies UserRole[],
  },
  {
    title: 'Purchase Requests',
    href: '/purchase-requests',
    icon: ClipboardList,
    roles: ['ADMIN', 'REQUESTER', 'MANAGER', 'FINANCE'] satisfies UserRole[],
  },
  {
    title: 'Approval Queue',
    href: '/approvals',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'MANAGER', 'FINANCE'] satisfies UserRole[],
  },
  {
    title: 'Purchase Orders',
    href: '/purchase-orders',
    icon: ShoppingCart,
    roles: ['ADMIN', 'PURCHASING', 'FINANCE'] satisfies UserRole[],
  },
  {
    title: 'Receiving',
    href: '/receiving',
    icon: PackageCheck,
    roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'] satisfies UserRole[],
  },
  {
    title: 'ERP Sync Logs',
    href: '/erp-sync-logs',
    icon: RefreshCw,
    roles: ['ADMIN', 'PURCHASING'] satisfies UserRole[],
  },
  {
    title: 'Audit Trails',
    href: '/audit-trails',
    icon: FileClock,
    roles: ['ADMIN'] satisfies UserRole[],
  },
];
