import { apiClient } from '@/lib/api-client';
import type { PaginatedApiResponse } from '@/lib/api-types';
import type { MasterDataModule, MasterDataRecord } from '@/lib/master-data';

export type MasterDataListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

type MasterDataPayload = Record<string, string | number | boolean | undefined>;

type ApiEntity = Record<string, unknown>;

const modulePaths: Record<MasterDataModule, string> = {
  departments: '/departments',
  items: '/items',
  suppliers: '/suppliers',
  warehouses: '/warehouses',
  'packaging-units': '/packaging-units',
};

export async function fetchMasterData(module: MasterDataModule, params: MasterDataListParams) {
  const response = await apiClient.get<PaginatedApiResponse<ApiEntity>>(modulePaths[module], {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      isActive: params.isActive,
    },
  });

  return {
    ...response.data,
    data: response.data.data.map((entity) => mapMasterDataRecord(module, entity)),
  };
}

export async function createMasterData(module: MasterDataModule, values: Record<string, string>) {
  const response = await apiClient.post<ApiEntity>(modulePaths[module], toMasterDataPayload(module, values));

  return mapMasterDataRecord(module, response.data);
}

export async function updateMasterData(module: MasterDataModule, id: string, values: Record<string, string>) {
  const response = await apiClient.patch<ApiEntity>(`${modulePaths[module]}/${id}`, toMasterDataPayload(module, values));

  return mapMasterDataRecord(module, response.data);
}

export async function deleteMasterData(module: MasterDataModule, id: string) {
  const response = await apiClient.delete<ApiEntity>(`${modulePaths[module]}/${id}`);

  return mapMasterDataRecord(module, response.data);
}

function toMasterDataPayload(module: MasterDataModule, values: Record<string, string>): MasterDataPayload {
  const status = values.status === 'Inactive' ? false : true;

  switch (module) {
    case 'departments':
      return compactPayload({
        code: values.code,
        name: values.name,
        description: values.description,
        isActive: status,
      });
    case 'items':
      return compactPayload({
        sku: values.code,
        name: values.name,
        category: values.type,
        brand: values.brand,
        estimatedUnitPrice: values.estimatedUnitPrice ? Number(values.estimatedUnitPrice) : undefined,
        defaultSupplierId: values.defaultSupplierId,
        defaultPackagingUnitId: values.defaultPackagingUnitId,
        isActive: status,
      });
    case 'suppliers':
      return compactPayload({
        code: values.code,
        name: values.name,
        contactName: values.owner,
        email: values.contact,
        city: values.location,
        phone: values.phone,
        country: values.country,
        paymentTerms: values.paymentTerms,
        isActive: status,
      });
    case 'warehouses':
      return compactPayload({
        code: values.code,
        name: values.name,
        description: values.type,
        address: values.location,
        isActive: status,
      });
    case 'packaging-units':
      return compactPayload({
        code: values.code,
        name: values.name,
        description: values.type,
        isActive: status,
      });
  }
}

function mapMasterDataRecord(module: MasterDataModule, entity: ApiEntity): MasterDataRecord {
  const id = stringValue(entity.id);
  const isActive = Boolean(entity.isActive);
  const updatedAt = formatDate(entity.updatedAt);

  switch (module) {
    case 'departments': {
      const manager = objectValue(entity.manager);
      const parent = objectValue(entity.parent);
      const description = stringValue(entity.description, '-');

      return {
        id,
        code: stringValue(entity.code),
        name: stringValue(entity.name),
        type: description,
        owner: stringValue(manager?.fullName, '-'),
        location: stringValue(parent?.name, '-'),
        contact: '-',
        status: isActive ? 'Active' : 'Inactive',
        updatedAt,
        description,
        managerId: stringValue(manager?.id),
        parentId: stringValue(parent?.id),
      };
    }
    case 'items': {
      const supplier = objectValue(entity.defaultSupplier);
      const packagingUnit = objectValue(entity.defaultPackagingUnit);

      return {
        id,
        code: stringValue(entity.sku),
        name: stringValue(entity.name),
        type: stringValue(entity.category, '-'),
        owner: stringValue(supplier?.name, '-'),
        location: stringValue(packagingUnit?.code, '-'),
        contact: stringValue(entity.brand, '-'),
        status: isActive ? 'Active' : 'Inactive',
        updatedAt,
        brand: stringValue(entity.brand),
        defaultSupplierId: stringValue(supplier?.id),
        defaultPackagingUnitId: stringValue(packagingUnit?.id),
        estimatedUnitPrice: stringValue(entity.estimatedUnitPrice),
      };
    }
    case 'suppliers':
      return {
        id,
        code: stringValue(entity.code),
        name: stringValue(entity.name),
        type: stringValue(entity.paymentTerms, '-'),
        owner: stringValue(entity.contactName, '-'),
        location: stringValue(entity.city, '-'),
        contact: stringValue(entity.email, '-'),
        status: isActive ? 'Active' : 'Inactive',
        updatedAt,
        country: stringValue(entity.country),
        paymentTerms: stringValue(entity.paymentTerms),
        phone: stringValue(entity.phone),
      };
    case 'warehouses':
      return {
        id,
        code: stringValue(entity.code),
        name: stringValue(entity.name),
        type: stringValue(entity.description, '-'),
        owner: '-',
        location: stringValue(entity.address, '-'),
        contact: '-',
        status: isActive ? 'Active' : 'Inactive',
        updatedAt,
      };
    case 'packaging-units':
      return {
        id,
        code: stringValue(entity.code),
        name: stringValue(entity.name),
        type: stringValue(entity.description, '-'),
        owner: '-',
        location: '-',
        contact: '-',
        status: isActive ? 'Active' : 'Inactive',
        updatedAt,
      };
  }
}

function compactPayload(payload: MasterDataPayload): MasterDataPayload {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? undefined : value]),
  );
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? (value as ApiEntity) : null;
}

function stringValue(value: unknown, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

function formatDate(value: unknown) {
  if (!value) {
    return '-';
  }

  return String(value).slice(0, 10);
}
