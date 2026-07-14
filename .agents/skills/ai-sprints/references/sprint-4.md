# Sprint 4: NestJS Proxy Bridge (AiModule)

## Tujuan
Menambahkan modul baru di NestJS (`apps/api`) yang mem-forward request AI dari frontend ke Python FastAPI service.

## Prasyarat
- Sprint 1-3 sudah selesai (Python AI Service sudah memiliki endpoint `/ai/audit-pr`)

## Konteks Penting
- Baca `apps/api/src/app.module.ts` untuk memahami pola modul yang sudah ada
- Baca `apps/api/.env` untuk melihat environment variables yang sudah ada
- Baca `apps/api/src/common/guards/roles.guard.ts` untuk memahami cara dekorator `@Roles()` digunakan
- Baca satu controller yang sudah ada (misal `apps/api/src/approvals/approvals.controller.ts`) sebagai referensi pola kode

## Langkah-Langkah

### 1. Install package `@nestjs/axios` dan `axios`

Jalankan di folder `apps/api`:
```bash
npm install @nestjs/axios axios
```

### 2. Tambahkan environment variable di `apps/api/.env`

Tambahkan baris baru (JANGAN hapus baris yang sudah ada):
```env
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

### 3. Buat file `apps/api/src/ai/dto/audit-pr.dto.ts`

Buat DTO TypeScript yang mereplikasi response dari Python:
```typescript
export class FindingDto {
  category: 'PRICE_ANOMALY' | 'BUDGET_WARNING' | 'SUPPLIER_RISK' | 'GENERAL';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  affectedItemSku?: string;
}

export class BudgetImpactDto {
  remainingBefore: number;
  remainingAfter: number;
  usagePercentage: number;
}

export class RecommendationDto {
  action: 'APPROVE' | 'REJECT' | 'INVESTIGATE';
  justification: string;
}

export class AuditPrResponseDto {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  budgetImpact: BudgetImpactDto;
  findings: FindingDto[];
  recommendation: RecommendationDto;
}
```

### 4. Buat file `apps/api/src/ai/ai-proxy.service.ts`

Service yang melakukan HTTP call ke Python:
- Inject `HttpService` dari `@nestjs/axios`
- Inject `ConfigService` dari `@nestjs/config`
- Baca `PYTHON_AI_SERVICE_URL` dari ConfigService
- Method `async auditPr(prId: string): Promise<AuditPrResponseDto>`:
  - POST ke `${pythonUrl}/ai/audit-pr` dengan body `{ prId }`
  - Timeout: 35 detik
  - Handle errors:
    - Jika Python service down (ECONNREFUSED): throw `ServiceUnavailableException("Layanan AI sedang tidak tersedia")`
    - Jika Python return 404: throw `NotFoundException` dengan pesan dari Python
    - Jika Python return 429: throw `HttpException(429, "Kuota AI harian tercapai")`
    - Error lain: throw `InternalServerErrorException("Terjadi kesalahan pada layanan AI")`

### 5. Buat file `apps/api/src/ai/ai.controller.ts`

Controller dengan endpoint:
- Route prefix: `'ai'`
- `POST 'audit-pr/:id'`:
  - Gunakan `@Roles()` decorator untuk membatasi akses ke: `'MANAGER'`, `'FINANCE'`, `'ADMIN'`
  - Ambil `id` dari `@Param('id')`
  - Panggil `this.aiProxyService.auditPr(id)`
  - Return hasilnya

Ikuti pola yang sama dengan controller lain di project (lihat dekorator, guard, dan swagger yang sudah dipakai).

### 6. Buat file `apps/api/src/ai/ai.module.ts`

Module yang:
- Import `HttpModule` dari `@nestjs/axios` dengan konfigurasi timeout 35000ms
- Declare `AiController` di controllers
- Declare `AiProxyService` di providers

### 7. Modifikasi `apps/api/src/app.module.ts`

- Import `AiModule` di bagian atas file
- Tambahkan `AiModule` ke array `imports` (letakkan setelah `ErpIntegrationModule`)
- JANGAN ubah apapun selain menambahkan import dan entry di array imports

## Verifikasi

1. Pastikan NestJS masih bisa compile tanpa error: `npm run build` di folder `apps/api`
2. Restart NestJS dev server
3. Cek apakah endpoint baru muncul di Swagger docs NestJS (`http://localhost:3001/api/docs`) — jika project menggunakan Swagger
4. Test dengan curl (perlu JWT token valid):
```bash
curl -X POST http://localhost:3001/api/ai/audit-pr/<PR_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

## Output Sprint

Laporkan semua file yang dibuat/dimodifikasi, hasil build, dan apakah endpoint baru bisa diakses.
