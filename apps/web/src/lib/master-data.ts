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
};

export type MasterDataConfig = {
  title: string;
  description: string;
  createLabel: string;
  searchPlaceholder: string;
  deleteLabel: string;
  columns: DataTableColumn[];
  fields: FormField[];
  records: MasterDataRecord[];
};

const statusOptions = ['Active', 'Inactive'];

export const masterDataConfigs: Record<string, MasterDataConfig> = {
  items: {
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
      { key: 'owner', label: 'Default Supplier' },
      { key: 'location', label: 'Packaging Unit' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    records: [
      makeRecord('ITM-001', 'LAPTOP-STD-001', 'Standard Business Laptop', 'IT Equipment', 'PT Global Tech Hardware', 'PCS'),
      makeRecord('ITM-002', 'MOUSE-WL-001', 'Wireless Mouse', 'IT Accessories', 'PT Global Tech Hardware', 'PCS'),
      makeRecord('ITM-003', 'PAPER-A4-80G', 'A4 Copy Paper 80gsm', 'Office Supplies', 'PT Nusantara Office Supplies', 'BOX'),
      makeRecord('ITM-004', 'ROUTER-ENT-001', 'Enterprise Router', 'Network Equipment', 'PT Global Tech Hardware', 'PCS'),
      makeRecord('ITM-005', 'TONER-BLK-001', 'Black Printer Toner', 'Office Supplies', 'PT Nusantara Office Supplies', 'PCS', 'Inactive'),
      makeRecord('ITM-006', 'CHAIR-ERG-001', 'Ergonomic Office Chair', 'Office Furniture', 'PT Nusantara Office Supplies', 'PCS'),
    ],
  },
  suppliers: {
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
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    records: [
      makeRecord('SUP-001', 'SUP-001', 'PT Nusantara Office Supplies', 'Office Supplies', 'Sari Vendor', 'Jakarta', 'Active', 'sales@nusantara-supplies.test'),
      makeRecord('SUP-002', 'SUP-002', 'PT Global Tech Hardware', 'IT Hardware', 'Bima Account', 'Bandung', 'Active', 'sales@global-tech.test'),
      makeRecord('SUP-003', 'SUP-003', 'PT Prima Facility', 'Facility Services', 'Dewi Account', 'Surabaya', 'Inactive', 'sales@prima-facility.test'),
      makeRecord('SUP-004', 'SUP-004', 'PT Logistik Cepat', 'Logistics', 'Andra Logistik', 'Jakarta', 'Active', 'ops@logistik-cepat.test'),
    ],
  },
  departments: {
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
      { key: 'owner', label: 'Manager' },
      { key: 'type', label: 'Function' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    records: [
      makeRecord('DEP-001', 'IT', 'Information Technology', 'Internal Technology', 'Maya Manager', 'Head Office'),
      makeRecord('DEP-002', 'FIN', 'Finance', 'Budget Control', 'Faris Finance', 'Head Office'),
      makeRecord('DEP-003', 'OPS', 'Operations', 'Operational Purchasing', 'Oka Operations', 'Plant A'),
      makeRecord('DEP-004', 'PUR', 'Purchasing', 'Supplier Coordination', 'Pandu Purchasing', 'Head Office'),
      makeRecord('DEP-005', 'WH', 'Warehouse', 'Goods Receiving', 'Wahyu Warehouse', 'Main Warehouse'),
    ],
  },
  warehouses: {
    title: 'Warehouses',
    description: 'Receiving locations for purchase order fulfillment and inventory handover.',
    createLabel: 'Create Warehouse',
    searchPlaceholder: 'Search warehouse code, name, address, PIC',
    deleteLabel: 'warehouse',
    columns: [
      { key: 'code', label: 'Code', className: 'font-medium text-slate-900' },
      { key: 'name', label: 'Warehouse Name', className: 'min-w-[240px]' },
      { key: 'location', label: 'Address', className: 'min-w-[220px]' },
      { key: 'owner', label: 'PIC' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    fields: [
      { key: 'code', label: 'Warehouse Code' },
      { key: 'name', label: 'Warehouse Name' },
      { key: 'location', label: 'Address' },
      { key: 'owner', label: 'PIC' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    records: [
      makeRecord('WHR-001', 'WH-MAIN', 'Main Warehouse', 'Primary Receiving', 'Wahyu Warehouse', 'Kawasan Industri Block A'),
      makeRecord('WHR-002', 'WH-SEC', 'Secondary Warehouse', 'Backup Receiving', 'Dina Warehouse', 'Kawasan Industri Block B'),
      makeRecord('WHR-003', 'WH-QC', 'QC Holding Area', 'Inspection', 'Raka QC', 'Kawasan Industri Block C', 'Inactive'),
    ],
  },
  'packaging-units': {
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
    records: [
      makeRecord('PKG-001', 'PCS', 'Piece', 'Count', 'System', 'General'),
      makeRecord('PKG-002', 'BOX', 'Box', 'Packaging', 'System', 'General'),
      makeRecord('PKG-003', 'PACK', 'Pack', 'Packaging', 'System', 'General'),
      makeRecord('PKG-004', 'KG', 'Kilogram', 'Weight', 'System', 'General'),
      makeRecord('PKG-005', 'LTR', 'Liter', 'Volume', 'System', 'General', 'Inactive'),
    ],
  },
};

function makeRecord(
  id: string,
  code: string,
  name: string,
  type: string,
  owner: string,
  location: string,
  status: MasterDataStatus = 'Active',
  contact = '-',
): MasterDataRecord {
  return {
    id,
    code,
    name,
    type,
    owner,
    location,
    contact,
    status,
    updatedAt: '2026-05-12',
  };
}
