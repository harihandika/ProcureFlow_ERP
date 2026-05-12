'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { DataTable } from '@/components/data/data-table';
import { FormModal } from '@/components/data/form-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MasterDataConfig, MasterDataRecord } from '@/lib/master-data';

const pageSize = 5;

export function MasterDataPage({ config }: { config: MasterDataConfig }) {
  const [records, setRecords] = useState(config.records);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [page, setPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState<MasterDataRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MasterDataRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function openCreateModal() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function openEditModal(record: MasterDataRecord) {
    setEditingRecord(record);
    setFormOpen(true);
  }

  function handleSubmit(values: Record<string, string>) {
    if (editingRecord) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingRecord.id
            ? {
                ...record,
                ...values,
                status: values.status === 'Inactive' ? 'Inactive' : 'Active',
                updatedAt: '2026-05-12',
              }
            : record,
        ),
      );
    } else {
      setRecords((current) => [
        {
          id: `${config.title.toUpperCase().replace(/\W/g, '').slice(0, 3)}-${String(current.length + 1).padStart(3, '0')}`,
          code: values.code || `NEW-${String(current.length + 1).padStart(3, '0')}`,
          name: values.name || 'New Record',
          type: values.type || '-',
          owner: values.owner || '-',
          location: values.location || '-',
          contact: values.contact || '-',
          status: values.status === 'Inactive' ? 'Inactive' : 'Active',
          updatedAt: '2026-05-12',
        },
        ...current,
      ]);
      setPage(1);
    }

    setFormOpen(false);
  }

  function handleDelete() {
    if (!deletingRecord) {
      return;
    }

    setRecords((current) => current.filter((record) => record.id !== deletingRecord.id));
    setDeletingRecord(null);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{config.title}</h1>
        <p className="max-w-3xl text-sm text-slate-600">{config.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Records</CardDescription>
            <CardTitle className="text-2xl">{records.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Dummy master records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">{records.filter((record) => record.status === 'Active').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Available for transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl">{records.filter((record) => record.status === 'Inactive').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Hidden from new usage</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        rows={records}
        columns={config.columns}
        search={search}
        status={status}
        page={page}
        pageSize={pageSize}
        createLabel={config.createLabel}
        searchPlaceholder={config.searchPlaceholder}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onCreate={openCreateModal}
        onEdit={openEditModal}
        onDelete={setDeletingRecord}
      />

      <FormModal
        open={formOpen}
        title={editingRecord ? `Edit ${editingRecord.code}` : config.createLabel}
        description={editingRecord ? `Update ${editingRecord.name}.` : `Create a new ${config.deleteLabel}.`}
        fields={config.fields}
        record={editingRecord}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingRecord)}
        title={`Delete ${config.deleteLabel}`}
        description={
          deletingRecord
            ? `This will remove ${deletingRecord.code} - ${deletingRecord.name} from the dummy table.`
            : 'This record will be removed.'
        }
        onOpenChange={(open) => !open && setDeletingRecord(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
