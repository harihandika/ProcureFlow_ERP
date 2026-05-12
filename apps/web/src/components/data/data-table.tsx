'use client';

import type React from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchBar } from '@/components/data/search-bar';
import { StatusBadge } from '@/components/status-badge';
import type { MasterDataRecord } from '@/lib/master-data';

export type DataTableColumn = {
  key: keyof MasterDataRecord;
  label: string;
  className?: string;
  render?: (record: MasterDataRecord) => React.ReactNode;
};

export function DataTable({
  rows,
  columns,
  search,
  status,
  page,
  pageSize,
  createLabel,
  searchPlaceholder,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onCreate,
  onEdit,
  onDelete,
}: {
  rows: MasterDataRecord[];
  columns: DataTableColumn[];
  search: string;
  status: 'All' | 'Active' | 'Inactive';
  page: number;
  pageSize: number;
  createLabel: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: 'All' | 'Active' | 'Inactive') => void;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onEdit: (record: MasterDataRecord) => void;
  onDelete: (record: MasterDataRecord) => void;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesSearch = normalizedSearch
      ? Object.values(row).join(' ').toLowerCase().includes(normalizedSearch)
      : true;
    const matchesStatus = status === 'All' ? true : row.status === status;

    return matchesSearch && matchesStatus;
  });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center">
        <SearchBar value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={status} onValueChange={(value) => onStatusChange(value as 'All' | 'Active' | 'Inactive')}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className={column.className}>
                      {column.render ? column.render(row) : column.key === 'status' ? <StatusBadge status={row.status} /> : row[column.key]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${row.code}`} onClick={() => onEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${row.code}`} onClick={() => onDelete(row)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-28 text-center text-slate-500">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {visibleRows.length} of {filteredRows.length} records
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="w-20 text-center text-sm font-medium">
            {currentPage} / {pageCount}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function statusColumn(): DataTableColumn {
  return {
    key: 'status',
    label: 'Status',
    render: (record) => <StatusBadge status={record.status} />,
  };
}
