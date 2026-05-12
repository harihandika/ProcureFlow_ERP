'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MasterDataRecord } from '@/lib/master-data';

export type FormField = {
  key: keyof MasterDataRecord;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'number' | 'select';
  options?: string[];
};

export function FormModal({
  open,
  title,
  description,
  fields,
  record,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  fields: FormField[];
  record: MasterDataRecord | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(
      Object.fromEntries(
        fields.map((field) => {
          const value = record?.[field.key];
          return [field.key, value === undefined || value === null ? '' : String(value)];
        }),
      ),
    );
  }, [fields, open, record]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field, index) => (
              <div key={String(field.key)} className={index === fields.length - 1 && fields.length % 2 === 1 ? 'sm:col-span-2' : ''}>
                <Label htmlFor={String(field.key)}>{field.label}</Label>
                {field.type === 'select' ? (
                  <Select
                    value={values[String(field.key)] ?? ''}
                    onValueChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                  >
                    <SelectTrigger id={String(field.key)} className="mt-2">
                      <SelectValue placeholder={field.placeholder ?? field.label} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={String(field.key)}
                    type={field.type ?? 'text'}
                    className="mt-2"
                    value={values[String(field.key)] ?? ''}
                    placeholder={field.placeholder ?? field.label}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
