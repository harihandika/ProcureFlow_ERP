import type { FormField } from '@/components/data/form-modal';
import type { DataTableColumn } from '@/components/data/data-table';
import type { MasterDataStatus } from '@/components/status-badge';

export type MasterDataRecord = {
  id: string;
  code: string;
  name: string;
  type: string;
  owner: string;
  location: string;
  contact: string;
  status: MasterDataStatus;
  updatedAt: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  brand?: string;
  country?: string;
  defaultPackagingUnitId?: string;
  defaultSupplierId?: string;
  description?: string;
  estimatedUnitPrice?: string;
  managerId?: string;
  parentId?: string;
  paymentTerms?: string;
  phone?: string;
};

export type MasterDataModule = 'departments' | 'items' | 'suppliers' | 'warehouses' | 'packaging-units';

export type MasterDataConfig = {
  module: MasterDataModule;
  title: string;
  description: string;
  createLabel: string;
  searchPlaceholder: string;
  deleteLabel: string;
  columns: DataTableColumn[];
  fields: FormField[];
};

const statusOptions = ['Active', 'Inactive'];

export const masterDataConfigs: Record<string, MasterDataConfig> = {
  items: {
    module: 'items',
    title: 'Items',
    description: 'Purchasing item catalog with default supplier and packaging references.',
    createLabel: 'Create Item',
    searchPlaceholder: 'Search item code, name, category, supplier',
    deleteLabel: 'item',
    columns: [
      { key: 'code', label: 'SKU', className: 'min-w-[150px] font-medium text-slate-900' },
      { key: 'name', label: 'Item Name', className: 'min-w-[240px]' },
      { key: 'type', label: 'Category' },
      { key: 'owner', label: 'Default Supplier', className: 'min-w-[220px]' },
      { key: 'location', label: 'Unit' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    fields: [
      { key: 'code', label: 'SKU' },
      { key: 'name', label: 'Item Name' },
      { key: 'type', label: 'Category' },
      { key: 'brand', label: 'Brand' },
      { key: 'estimatedUnitPrice', label: 'Estimated Price', type: 'number' },
      { key: 'defaultSupplierId', label: 'Default Supplier', type: 'select' },
      { key: 'defaultPackagingUnitId', label: 'Packaging Unit', type: 'select' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
  },
  suppliers: {
    module: 'suppliers',
    title: 'Suppliers',
    description: 'Vendor master data for purchase orders and ERP sync payloads.',
    createLabel: 'Create Supplier',
    searchPlaceholder: 'Search supplier code, name, contact, city',
    deleteLabel: 'supplier',
    columns: [
      { key: 'code', label: 'Code', className: 'font-medium text-slate-900' },
      { key: 'name', label: 'Supplier Name', className: 'min-w-[240px]' },
      { key: 'owner', label: 'Contact Person' },
      { key: 'contact', label: 'Email', className: 'min-w-[220px]' },
      { key: 'location', label: 'City' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    fields: [
      { key: 'code', label: 'Supplier Code' },
      { key: 'name', label: 'Supplier Name' },
      { key: 'owner', label: 'Contact Person' },
      { key: 'contact', label: 'Email', type: 'email' },
      { key: 'location', label: 'City' },
      { key: 'phone', label: 'Phone' },
      { key: 'country', label: 'Country' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
  },
  departments: {
    module: 'departments',
    title: 'Departments',
    description: 'Organization units used for requester ownership, budget scope, and approval routing.',
    createLabel: 'Create Department',
    searchPlaceholder: 'Search department code, name, manager',
    deleteLabel: 'department',
    columns: [
      { key: 'code', label: 'Code', className: 'font-medium text-slate-900' },
      { key: 'name', label: 'Department Name', className: 'min-w-[240px]' },
      { key: 'owner', label: 'Manager' },
      { key: 'type', label: 'Function' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    fields: [
      { key: 'code', label: 'Department Code' },
      { key: 'name', label: 'Department Name' },
      { key: 'description', label: 'Function' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
  },
  warehouses: {
    module: 'warehouses',
    title: 'Warehouses',
    description: 'Receiving locations for purchase order fulfillment and inventory handover.',
    createLabel: 'Create Warehouse',
    searchPlaceholder: 'Search warehouse code, name, address, PIC',
    deleteLabel: 'warehouse',
    columns: [
      { key: 'code', label: 'Code', className: 'font-medium text-slate-900' },
      { key: 'name', label: 'Warehouse Name', className: 'min-w-[240px]' },
      { key: 'location', label: 'Address', className: 'min-w-[220px]' },
      { key: 'type', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    fields: [
      { key: 'code', label: 'Warehouse Code' },
      { key: 'name', label: 'Warehouse Name' },
      { key: 'type', label: 'Description' },
      { key: 'location', label: 'Address' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
  },
  'packaging-units': {
    module: 'packaging-units',
    title: 'Packaging Units',
    description: 'Reusable units for item ordering, purchase request lines, and receiving entries.',
    createLabel: 'Create Unit',
    searchPlaceholder: 'Search unit code or name',
    deleteLabel: 'packaging unit',
    columns: [
      { key: 'code', label: 'Code', className: 'font-medium text-slate-900' },
      { key: 'name', label: 'Unit Name', className: 'min-w-[220px]' },
      { key: 'type', label: 'Usage Type' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    fields: [
      { key: 'code', label: 'Unit Code' },
      { key: 'name', label: 'Unit Name' },
      { key: 'type', label: 'Usage Type' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
  },
};
