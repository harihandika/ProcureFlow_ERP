'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { DataTable } from '@/components/data/data-table';
import { FormModal, type FormField } from '@/components/data/form-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createMasterData,
  deleteMasterData,
  fetchMasterData,
  updateMasterData,
} from '@/lib/master-data-api';
import type { MasterDataConfig, MasterDataRecord } from '@/lib/master-data';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

const pageSize = 5;

export function MasterDataPage({ config }: { config: MasterDataConfig }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [page, setPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState<MasterDataRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MasterDataRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: ['master-data', config.module, { page, search, status }],
    queryFn: () =>
      fetchMasterData(config.module, {
        page,
        limit: pageSize,
        search,
        isActive: toActiveFilter(status),
      }),
  });

  const totalQuery = useQuery({
    queryKey: ['master-data', config.module, 'stats', 'total'],
    queryFn: () => fetchMasterData(config.module, { page: 1, limit: 1 }),
  });

  const activeQuery = useQuery({
    queryKey: ['master-data', config.module, 'stats', 'active'],
    queryFn: () => fetchMasterData(config.module, { page: 1, limit: 1, isActive: true }),
  });

  const inactiveQuery = useQuery({
    queryKey: ['master-data', config.module, 'stats', 'inactive'],
    queryFn: () => fetchMasterData(config.module, { page: 1, limit: 1, isActive: false }),
  });

  const supplierOptionsQuery = useQuery({
    queryKey: ['master-data', 'suppliers', 'options'],
    queryFn: () => fetchMasterData('suppliers', { page: 1, limit: 100, isActive: true }),
    enabled: config.module === 'items',
  });

  const packagingUnitOptionsQuery = useQuery({
    queryKey: ['master-data', 'packaging-units', 'options'],
    queryFn: () => fetchMasterData('packaging-units', { page: 1, limit: 100, isActive: true }),
    enabled: config.module === 'items',
  });

  const fields = useMemo(
    () =>
      config.fields.map((field): FormField => {
        if (field.key === 'defaultSupplierId') {
          return {
            ...field,
            options: (supplierOptionsQuery.data?.data ?? []).map((supplier) => ({
              label: `${supplier.code} - ${supplier.name}`,
              value: supplier.id,
            })),
          };
        }

        if (field.key === 'defaultPackagingUnitId') {
          return {
            ...field,
            options: (packagingUnitOptionsQuery.data?.data ?? []).map((unit) => ({
              label: `${unit.code} - ${unit.name}`,
              value: unit.id,
            })),
          };
        }

        return field;
      }),
    [config.fields, packagingUnitOptionsQuery.data?.data, supplierOptionsQuery.data?.data],
  );

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      editingRecord
        ? updateMasterData(config.module, editingRecord.id, values)
        : createMasterData(config.module, values),
    onSuccess: async () => {
      await invalidateMasterDataQueries();
      showSuccessToast(`${config.title} record ${editingRecord ? 'updated' : 'created'} successfully.`);
      setFormOpen(false);
      setEditingRecord(null);

      if (!editingRecord) {
        setPage(1);
      }
    },
    onError: (error) => {
      showErrorToast(error, `Unable to save ${config.deleteLabel}.`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (record: MasterDataRecord) => deleteMasterData(config.module, record.id),
    onSuccess: async () => {
      await invalidateMasterDataQueries();
      showSuccessToast(`${config.title} record deleted successfully.`);
      setDeletingRecord(null);
      setPage(1);
    },
    onError: (error) => {
      showErrorToast(error, `Unable to delete ${config.deleteLabel}.`);
    },
  });

  function openCreateModal() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function openEditModal(record: MasterDataRecord) {
    setEditingRecord(record);
    setFormOpen(true);
  }

  function handleSubmit(values: Record<string, string>) {
    saveMutation.mutate(values);
  }

  function handleDelete() {
    if (!deletingRecord) {
      return;
    }

    deleteMutation.mutate(deletingRecord);
  }

  async function invalidateMasterDataQueries() {
    await queryClient.invalidateQueries({ queryKey: ['master-data', config.module] });

    if (config.module === 'suppliers' || config.module === 'packaging-units') {
      await queryClient.invalidateQueries({ queryKey: ['master-data', config.module, 'options'] });
    }
  }

  const records = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const totalRecords = totalQuery.data?.meta.total ?? 0;
  const activeRecords = activeQuery.data?.meta.total ?? 0;
  const inactiveRecords = inactiveQuery.data?.meta.total ?? 0;
  const errorMessage = listQuery.isError ? getApiErrorMessage(listQuery.error, `Unable to load ${config.title}.`) : undefined;

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
            <CardTitle className="text-2xl">{formatStat(totalRecords, totalQuery.isLoading)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">API master records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">{formatStat(activeRecords, activeQuery.isLoading)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Available for transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl">{formatStat(inactiveRecords, inactiveQuery.isLoading)}</CardTitle>
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
        totalRows={meta?.total ?? 0}
        pageCount={meta?.totalPages ?? 1}
        isServerDriven
        isLoading={listQuery.isLoading}
        errorMessage={errorMessage}
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
        fields={fields}
        record={editingRecord}
        isSubmitting={saveMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingRecord)}
        title={`Delete ${config.deleteLabel}`}
        description={
          deletingRecord
            ? `This will remove ${deletingRecord.code} - ${deletingRecord.name} from the API data.`
            : 'This record will be removed.'
        }
        isConfirming={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeletingRecord(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function toActiveFilter(status: 'All' | 'Active' | 'Inactive') {
  if (status === 'All') {
    return undefined;
  }

  return status === 'Active';
}

function formatStat(value: number, isLoading: boolean) {
  return isLoading ? '...' : value;
}
