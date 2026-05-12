'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Plus, Save, Send, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { budgets, getRemainingBudget } from '@/lib/budget-data';
import { getRequestTotal, requestItemOptions } from '@/lib/purchase-request-data';
import { formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().trim().min(3, 'Title is required.'),
  department: z.string().min(1, 'Department is required.'),
  budgetId: z.string().min(1, 'Budget is required.'),
  requiredDate: z.string().min(1, 'Required date is required.'),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item is required.'),
        quantity: z.coerce.number().positive('Quantity must be greater than zero.'),
        estimatedPrice: z.coerce.number().nonnegative('Estimated price cannot be negative.'),
      }),
    )
    .min(1, 'At least one item is required.'),
});

type PurchaseRequestFormInput = z.input<typeof formSchema>;
type PurchaseRequestFormValues = z.output<typeof formSchema>;

const departments = Array.from(new Set(budgets.map((budget) => budget.department)));

export function PurchaseRequestForm() {
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseRequestFormInput, unknown, PurchaseRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      department: departments[0],
      budgetId: budgets[0]?.id ?? '',
      requiredDate: '2026-05-20',
      items: [{ itemId: requestItemOptions[0].id, quantity: 1, estimatedPrice: requestItemOptions[0].estimatedPrice }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedDepartment = useWatch({ control, name: 'department' });
  const watchedBudgetId = useWatch({ control, name: 'budgetId' });
  const watchedItems = useWatch({ control, name: 'items' });
  const availableBudgets = budgets.filter((budget) => budget.department === watchedDepartment);
  const selectedBudget = budgets.find((budget) => budget.id === watchedBudgetId) ?? availableBudgets[0];
  const remainingBudget = selectedBudget ? getRemainingBudget(selectedBudget) : 0;
  const grandTotal = getRequestTotal(
    (watchedItems ?? []).map((item) => ({
      quantity: Number(item?.quantity) || 0,
      estimatedPrice: Number(item?.estimatedPrice) || 0,
    })),
  );
  const isOverBudget = grandTotal > remainingBudget;

  function onSubmit(values: PurchaseRequestFormValues, action: 'draft' | 'submit') {
    console.info('Dummy purchase request action', action, values);
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
              name="department"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    const firstBudget = budgets.find((budget) => budget.department === value);
                    if (firstBudget) {
                      setValue('budgetId', firstBudget.id, { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.department ? <p className="mt-2 text-xs text-red-600">{errors.department.message}</p> : null}
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBudgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.code} - {budget.period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.budgetId ? <p className="mt-2 text-xs text-red-600">{errors.budgetId.message}</p> : null}
          </div>

          <BudgetAmount label="Budget Remaining" value={formatCurrency(remainingBudget)} />
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Request Items</CardTitle>
            <CardDescription>Add multiple items and review calculated subtotals.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ itemId: requestItemOptions[0].id, quantity: 1, estimatedPrice: requestItemOptions[0].estimatedPrice })
            }
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const watchedItem = watchedItems?.[index];
            const selectedItem = requestItemOptions.find((item) => item.id === watchedItem?.itemId);
            const subtotal = (Number(watchedItem?.quantity) || 0) * (Number(watchedItem?.estimatedPrice) || 0);

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
                          const item = requestItemOptions.find((option) => option.id === value);
                          if (item) {
                            setValue(`items.${index}.estimatedPrice`, item.estimatedPrice, { shouldValidate: true });
                          }
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {requestItemOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.sku} - {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="mt-1 text-xs text-slate-500">{selectedItem ? `${selectedItem.name} (${selectedItem.unit})` : 'Select an item'}</p>
                  {errors.items?.[index]?.itemId ? <p className="mt-2 text-xs text-red-600">{errors.items[index]?.itemId?.message}</p> : null}
                </div>

                <div>
                  <Label htmlFor={`quantity-${field.id}`}>Quantity</Label>
                  <Input id={`quantity-${field.id}`} type="number" min="1" className="mt-2" {...register(`items.${index}.quantity`)} />
                  {errors.items?.[index]?.quantity ? <p className="mt-2 text-xs text-red-600">{errors.items[index]?.quantity?.message}</p> : null}
                </div>

                <div>
                  <Label htmlFor={`price-${field.id}`}>Estimated Price</Label>
                  <Input id={`price-${field.id}`} type="number" min="0" className="mt-2" {...register(`items.${index}.estimatedPrice`)} />
                  {errors.items?.[index]?.estimatedPrice ? (
                    <p className="mt-2 text-xs text-red-600">{errors.items[index]?.estimatedPrice?.message}</p>
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
                  onClick={() => remove(index)}
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
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleSubmit((values) => onSubmit(values, 'draft'))}>
          <Save className="h-4 w-4" />
          Save as Draft
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit((values) => onSubmit(values, 'submit'))}>
          <Send className="h-4 w-4" />
          Submit Request
        </Button>
      </div>
    </form>
  );
}

function BudgetAmount({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? 'rounded-lg border border-amber-200 bg-amber-50 p-3' : 'rounded-lg border bg-slate-50 p-3'}>
      <div className={highlight ? 'text-xs font-medium text-amber-700' : 'text-xs font-medium text-slate-500'}>{label}</div>
      <div className={highlight ? 'mt-1 text-lg font-semibold text-amber-900' : 'mt-1 text-lg font-semibold text-slate-950'}>{value}</div>
    </div>
  );
}
