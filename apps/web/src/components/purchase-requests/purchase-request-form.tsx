'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Save, Send, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchBudgets, getRemainingBudget } from '@/lib/budget-api';
import { fetchMasterData } from '@/lib/master-data-api';
import {
  createPurchaseRequest,
  getRequestTotal,
  submitPurchaseRequest,
  updatePurchaseRequest,
  type PurchaseRequest,
  type PurchaseRequestItemPayload,
  type PurchaseRequestPayload,
} from '@/lib/purchase-request-api';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().trim().min(3, 'Title is required.'),
  description: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required.'),
  budgetId: z.string().min(1, 'Budget is required.'),
  requiredDate: z.string().min(1, 'Required date is required.'),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item is required.'),
        packagingUnitId: z.string().min(1, 'Packaging unit is required.'),
        quantity: z.coerce.number().positive('Quantity must be greater than zero.'),
        estimatedUnitPrice: z.coerce.number().nonnegative('Estimated price cannot be negative.'),
      }),
    )
    .min(1, 'At least one item is required.'),
});

type PurchaseRequestFormInput = z.input<typeof formSchema>;
type PurchaseRequestFormValues = z.output<typeof formSchema>;
type SubmitAction = 'draft' | 'submit';

export function PurchaseRequestForm({ request }: { request?: PurchaseRequest }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(request);

  const departmentsQuery = useQuery({
    queryKey: ['master-data', 'departments', 'pr-options'],
    queryFn: () => fetchMasterData('departments', { page: 1, limit: 100, isActive: true }),
  });

  const itemsQuery = useQuery({
    queryKey: ['master-data', 'items', 'pr-options'],
    queryFn: () => fetchMasterData('items', { page: 1, limit: 100, isActive: true }),
  });

  const {
    control,
    register,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PurchaseRequestFormInput, unknown, PurchaseRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      departmentId: '',
      budgetId: '',
      requiredDate: '',
      items: [{ itemId: '', packagingUnitId: '', quantity: 1, estimatedUnitPrice: 0 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });
  const watchedDepartmentId = useWatch({ control, name: 'departmentId' });
  const watchedBudgetId = useWatch({ control, name: 'budgetId' });
  const watchedItems = useWatch({ control, name: 'items' });

  const budgetsQuery = useQuery({
    queryKey: ['budgets', 'pr-options', watchedDepartmentId],
    queryFn: () =>
      fetchBudgets({
        page: 1,
        limit: 100,
        departmentId: watchedDepartmentId,
        status: 'ACTIVE',
      }),
    enabled: Boolean(watchedDepartmentId),
  });

  const itemOptions = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data?.data]);
  const departments = useMemo(() => departmentsQuery.data?.data ?? [], [departmentsQuery.data?.data]);
  const availableBudgets = useMemo(() => budgetsQuery.data?.data ?? [], [budgetsQuery.data?.data]);
  const selectedBudget = availableBudgets.find((budget) => budget.id === watchedBudgetId);
  const remainingBudget = selectedBudget ? getRemainingBudget(selectedBudget) : 0;
  const grandTotal = getRequestTotal(
    (watchedItems ?? []).map((item) => ({
      quantity: Number(item?.quantity) || 0,
      estimatedUnitPrice: Number(item?.estimatedUnitPrice) || 0,
    })),
  );
  const isOverBudget = selectedBudget ? grandTotal > remainingBudget : false;
  const isOptionsLoading = departmentsQuery.isLoading || itemsQuery.isLoading || budgetsQuery.isLoading;
  const optionsError = departmentsQuery.error ?? itemsQuery.error ?? budgetsQuery.error;

  const firstItemDefaults = useMemo(() => {
    const item = itemOptions[0];

    return {
      itemId: item?.id ?? '',
      packagingUnitId: item?.defaultPackagingUnitId ?? '',
      quantity: 1,
      estimatedUnitPrice: Number(item?.estimatedUnitPrice ?? 0),
    };
  }, [itemOptions]);

  useEffect(() => {
    if (request) {
      reset({
        title: request.title,
        description: request.description ?? '',
        departmentId: request.departmentId,
        budgetId: request.budgetId ?? '',
        requiredDate: request.requiredDate ?? '',
        items: request.items.length
          ? request.items.map((item) => ({
              itemId: item.itemId,
              packagingUnitId: item.packagingUnitId,
              quantity: item.quantity,
              estimatedUnitPrice: item.estimatedUnitPrice,
            }))
          : [firstItemDefaults],
      });
      return;
    }

    if (!departments.length || !itemOptions.length) {
      return;
    }

    reset((current) => ({
      ...current,
      departmentId: current.departmentId || departments[0].id,
      items: current.items?.[0]?.itemId ? current.items : [firstItemDefaults],
    }));
  }, [departments, firstItemDefaults, itemOptions.length, request, reset]);

  useEffect(() => {
    if (!watchedDepartmentId || !availableBudgets.length || watchedBudgetId) {
      return;
    }

    setValue('budgetId', availableBudgets[0].id, { shouldValidate: true });
  }, [availableBudgets, setValue, watchedBudgetId, watchedDepartmentId]);

  const saveMutation = useMutation({
    mutationFn: async ({ values, action }: { values: PurchaseRequestFormValues; action: SubmitAction }) => {
      const payload = toPayload(values);
      const savedRequest = request
        ? await updatePurchaseRequest(request.id, payload)
        : await createPurchaseRequest(payload);

      if (action === 'submit') {
        return submitPurchaseRequest(savedRequest.id, values.budgetId);
      }

      return savedRequest;
    },
    onSuccess: async (savedRequest, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
      showSuccessToast(variables.action === 'submit' ? 'Purchase request submitted successfully.' : 'Purchase request saved as draft.');
      router.replace(`/purchase-requests/${savedRequest.id}`);
    },
    onError: (error, variables) => {
      const message = getApiErrorMessage(
        error,
        variables.action === 'submit' ? 'Unable to submit purchase request.' : 'Unable to save purchase request.',
      );
      setError('root', { message });
      showErrorToast(error, message);
    },
  });

  function handleAction(values: PurchaseRequestFormValues, action: SubmitAction) {
    saveMutation.mutate({ values, action });
  }

  function appendItem() {
    append(firstItemDefaults);
  }

  function handleDepartmentChange(value: string) {
    setValue('departmentId', value, { shouldValidate: true });
    setValue('budgetId', '', { shouldValidate: true });
  }

  if (optionsError) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-red-600 shadow-sm">
        {getApiErrorMessage(optionsError, 'Unable to load purchase request form options.')}
      </div>
    );
  }

  return (
    <form className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Header</CardTitle>
          <CardDescription>Select department and budget before adding request items.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label htmlFor="title">Request Title</Label>
            <Input id="title" className="mt-2" placeholder="Laptop replacement batch" {...register('title')} />
            {errors.title ? <p className="mt-2 text-xs text-red-600">{errors.title.message}</p> : null}
          </div>

          <div>
            <Label>Department</Label>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleDepartmentChange} disabled={isOptionsLoading}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.departmentId ? <p className="mt-2 text-xs text-red-600">{errors.departmentId.message}</p> : null}
          </div>

          <div>
            <Label htmlFor="requiredDate">Required Date</Label>
            <Input id="requiredDate" type="date" className="mt-2" {...register('requiredDate')} />
            {errors.requiredDate ? <p className="mt-2 text-xs text-red-600">{errors.requiredDate.message}</p> : null}
          </div>

          <div className="lg:col-span-2">
            <Label>Budget</Label>
            <Controller
              control={control}
              name="budgetId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!watchedDepartmentId || budgetsQuery.isLoading}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBudgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.code} - {budget.period ?? budget.fiscalYear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.budgetId ? <p className="mt-2 text-xs text-red-600">{errors.budgetId.message}</p> : null}
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" className="mt-2" placeholder="Optional request description" {...register('description')} />
          </div>

          <BudgetAmount label="Budget Remaining" value={selectedBudget ? formatCurrency(remainingBudget) : '-'} />
          <BudgetAmount label="Request Total" value={formatCurrency(grandTotal)} highlight={isOverBudget} />
        </CardContent>
      </Card>

      {isOverBudget ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Request exceeds remaining budget.</div>
            <div>Total request is {formatCurrency(grandTotal - remainingBudget)} above the selected budget balance.</div>
          </div>
        </div>
      ) : null}

      {errors.root?.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.root.message}</div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Request Items</CardTitle>
            <CardDescription>Add multiple items and review calculated subtotals.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={appendItem} disabled={!itemOptions.length}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const watchedItem = watchedItems?.[index];
            const selectedItem = itemOptions.find((item) => item.id === watchedItem?.itemId);
            const subtotal = (Number(watchedItem?.quantity) || 0) * (Number(watchedItem?.estimatedUnitPrice) || 0);

            return (
              <div key={field.id} className="grid gap-3 rounded-lg border bg-white p-4 xl:grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr_auto] xl:items-start">
                <div>
                  <Label>Item</Label>
                  <Controller
                    control={control}
                    name={`items.${index}.itemId`}
                    render={({ field: itemField }) => (
                      <Select
                        value={itemField.value}
                        onValueChange={(value) => {
                          itemField.onChange(value);
                          const item = itemOptions.find((option) => option.id === value);
                          setValue(`items.${index}.packagingUnitId`, item?.defaultPackagingUnitId ?? '', { shouldValidate: true });
                          setValue(`items.${index}.estimatedUnitPrice`, Number(item?.estimatedUnitPrice ?? 0), { shouldValidate: true });
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.code} - {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedItem ? `${selectedItem.name} (${selectedItem.location})` : 'Select an item'}
                  </p>
                  {errors.items?.[index]?.itemId ? <p className="mt-2 text-xs text-red-600">{errors.items[index]?.itemId?.message}</p> : null}
                </div>

                <input type="hidden" {...register(`items.${index}.packagingUnitId`)} />

                <div>
                  <Label htmlFor={`quantity-${field.id}`}>Quantity</Label>
                  <Input id={`quantity-${field.id}`} type="number" min="1" className="mt-2" {...register(`items.${index}.quantity`)} />
                  {errors.items?.[index]?.quantity ? <p className="mt-2 text-xs text-red-600">{errors.items[index]?.quantity?.message}</p> : null}
                </div>

                <div>
                  <Label htmlFor={`price-${field.id}`}>Estimated Price</Label>
                  <Input id={`price-${field.id}`} type="number" min="0" className="mt-2" {...register(`items.${index}.estimatedUnitPrice`)} />
                  {errors.items?.[index]?.estimatedUnitPrice ? (
                    <p className="mt-2 text-xs text-red-600">{errors.items[index]?.estimatedUnitPrice?.message}</p>
                  ) : null}
                </div>

                <div>
                  <Label>Subtotal</Label>
                  <div className="mt-2 flex h-10 items-center rounded-md border bg-slate-50 px-3 text-sm font-semibold text-slate-900">
                    {formatCurrency(subtotal)}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-7"
                  aria-label="Remove item row"
                  disabled={fields.length === 1}
                  onClick={() => {
                    if (fields.length === 1) {
                      replace([firstItemDefaults]);
                      return;
                    }

                    remove(index);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            );
          })}

          <div className="flex flex-col gap-3 rounded-lg bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-300">Grand Total</div>
              <div className="mt-1 text-2xl font-semibold tracking-normal">{formatCurrency(grandTotal)}</div>
            </div>
            {isOverBudget ? <Badge variant="red">Over Budget</Badge> : <Badge variant="green">Within Budget</Badge>}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={handleSubmit((values) => handleAction(values, 'draft'))}>
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save as Draft'}
        </Button>
        <Button type="button" disabled={saveMutation.isPending} onClick={handleSubmit((values) => handleAction(values, 'submit'))}>
          <Send className="h-4 w-4" />
          {saveMutation.isPending ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}

function toPayload(values: PurchaseRequestFormValues): PurchaseRequestPayload {
  return {
    title: values.title,
    description: values.description,
    priority: 'NORMAL',
    requiredDate: values.requiredDate,
    departmentId: values.departmentId,
    budgetId: values.budgetId,
    items: values.items.map(
      (item): PurchaseRequestItemPayload => ({
        itemId: item.itemId,
        packagingUnitId: item.packagingUnitId,
        quantity: item.quantity,
        estimatedUnitPrice: item.estimatedUnitPrice,
      }),
    ),
  };
}

function BudgetAmount({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? 'rounded-lg border border-amber-200 bg-amber-50 p-3' : 'rounded-lg border bg-slate-50 p-3'}>
      <div className={highlight ? 'text-xs font-medium text-amber-700' : 'text-xs font-medium text-slate-500'}>{label}</div>
      <div className={highlight ? 'mt-1 text-lg font-semibold text-amber-900' : 'mt-1 text-lg font-semibold text-slate-950'}>{value}</div>
    </div>
  );
}
