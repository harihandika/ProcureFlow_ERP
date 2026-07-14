# Sprint 5: Frontend UI Modal + Testing + Error Handling

## Tujuan
Menambahkan tombol "✨ Analisis AI" di halaman approvals dan modal UI untuk menampilkan hasil audit risiko. Lalu melakukan testing end-to-end dan menambahkan error handling.

## Prasyarat
- Sprint 1-4 sudah selesai
- Python AI Service berjalan di port 8000
- NestJS sudah memiliki endpoint `POST /api/ai/audit-pr/:id`

## Konteks Penting
- Baca `apps/web/src/app/approvals/` untuk memahami struktur halaman approvals yang sudah ada
- Baca `apps/web/src/lib/` untuk memahami pola API client dan axios instance yang sudah ada
- Baca `apps/web/src/components/` untuk memahami pola komponen UI yang sudah ada
- Project menggunakan: Tailwind CSS, Radix UI Dialog, TanStack Query, Sonner (toast), Lucide React (icons), Axios

## Langkah-Langkah

### 1. Buat API function: `apps/web/src/lib/api/ai.ts`

Buat fungsi API client untuk memanggil endpoint AI:

```typescript
// Gunakan axios instance yang sudah ada di project (cari di folder lib/)
// Fungsi: auditPr(prId: string) → POST /ai/audit-pr/:prId
// Return type: AuditPrResponse (definisikan interface yang sama dengan DTO NestJS)
```

Definisikan juga interface TypeScript:
- `Finding` — category, severity, message, affectedItemSku
- `BudgetImpact` — remainingBefore, remainingAfter, usagePercentage  
- `Recommendation` — action, justification
- `AuditPrResponse` — riskScore, riskLevel, budgetImpact, findings, recommendation

### 2. Buat komponen modal: `apps/web/src/components/ai/AiAuditModal.tsx`

Buat komponen React untuk menampilkan hasil audit AI dalam modal/dialog.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `prId: string`
- `prTitle: string` (untuk ditampilkan di header modal)

**Behavior:**
- Saat `isOpen` berubah ke `true`, panggil `auditPr(prId)` menggunakan TanStack Query (`useQuery` atau `useMutation`)
- Tampilkan loading spinner saat memproses (dengan teks "Sedang menganalisis...")
- Saat data tersedia, tampilkan:

**Layout Modal:**
```
┌─────────────────────────────────────────────┐
│  ✨ Analisis AI — PR-2026-0001              │
│  "Pembelian Laptop Departemen IT"           │
│─────────────────────────────────────────────│
│                                              │
│  ┌───────────────────┐                      │
│  │  Risk Score: 72   │  ← Angka besar       │
│  │  🔴 HIGH RISK     │  ← Badge berwarna    │
│  └───────────────────┘                      │
│                                              │
│  📊 Dampak Budget                           │
│  ├─ Sisa sebelum: Rp 15.000.000            │
│  ├─ Sisa setelah: Rp 8.500.000             │
│  └─ Penggunaan: 43.3% ████████░░ (bar)     │
│                                              │
│  🔍 Temuan (2)                              │
│  ┌──────────────────────────────────────┐   │
│  │ 🔴 CRITICAL — Anomali Harga         │   │
│  │ Item 'Laptop Asus ROG' diajukan      │   │
│  │ Rp 18.500.000, 28% lebih mahal...    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ 🟡 WARNING — Peringatan Budget       │   │
│  │ Sisa budget hanya 23% setelah PR...  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  💡 Rekomendasi                              │
│  ┌──────────────────────────────────────┐   │
│  │ 🔍 INVESTIGATE                       │   │
│  │ Terdapat anomali harga signifikan... │   │
│  └──────────────────────────────────────┘   │
│                                              │
│                              [ Tutup ]       │
└─────────────────────────────────────────────┘
```

**Styling:**
- Gunakan Tailwind CSS
- Risk badge warna: LOW = `bg-green-100 text-green-800`, MEDIUM = `bg-yellow-100 text-yellow-800`, HIGH = `bg-red-100 text-red-800`
- Severity icons: CRITICAL = 🔴, WARNING = 🟡, INFO = 🔵
- Gunakan Radix UI Dialog yang sudah ada di project
- Budget progress bar menggunakan div dengan width percentage
- Format angka menggunakan `Intl.NumberFormat('id-ID')` untuk format Rupiah
- Tampilkan error state jika API gagal (dengan pesan dari backend)

### 3. Modifikasi halaman Approvals

Baca file halaman approvals yang sudah ada. Tambahkan:
- Import `AiAuditModal` dan `useState`
- State: `selectedPrForAudit: { id: string, title: string } | null`
- Tombol "✨ Analisis AI" di setiap baris PR dalam tabel/list approvals
  - Gunakan icon `Sparkles` dari `lucide-react`
  - Styling: tombol kecil dengan warna ungu/violet (`bg-violet-50 text-violet-700 hover:bg-violet-100`)
  - OnClick: set `selectedPrForAudit` ke PR yang diklik
- Render `AiAuditModal` di bawah tabel:
  ```tsx
  <AiAuditModal
    isOpen={selectedPrForAudit !== null}
    onClose={() => setSelectedPrForAudit(null)}
    prId={selectedPrForAudit?.id ?? ''}
    prTitle={selectedPrForAudit?.title ?? ''}
  />
  ```

### 4. Error Handling

Tambahkan error handling di semua layer:

**Di `AiAuditModal.tsx`:**
- Jika API return 429: tampilkan toast (Sonner) dengan pesan "Kuota AI harian tercapai. Silakan coba lagi besok."
- Jika API return 503: tampilkan toast "Layanan AI sedang tidak tersedia."
- Jika API return error lain: tampilkan toast generic "Terjadi kesalahan saat menganalisis PR."
- Disable tombol "Analisis AI" saat request sedang berlangsung (loading state)

## Verifikasi End-to-End

Setelah semua file dibuat, lakukan testing berikut:

1. Pastikan ketiga server berjalan:
   - Python: `cd apps/ai && python main.py` (port 8000)
   - NestJS: `npm run api:dev` (port 3001)
   - Next.js: `npm run web:dev` (port 3000)

2. Buka browser di `http://localhost:3000/approvals`
3. Pastikan tombol "✨ Analisis AI" muncul di setiap baris PR
4. Klik tombol tersebut pada salah satu PR
5. Verifikasi:
   - Loading spinner muncul
   - Modal menampilkan hasil audit (jika GEMINI_API_KEY sudah diisi)
   - Tombol Tutup berfungsi
   - Jika GEMINI_API_KEY belum diisi, error ditangani dengan baik

## Output Sprint

Laporkan:
1. Semua file yang dibuat/dimodifikasi
2. Screenshot atau deskripsi visual dari modal UI yang berfungsi
3. Status testing end-to-end (berhasil atau ada error yang perlu diperbaiki)
