# Sprint 1: Setup Project Python FastAPI

## Tujuan
Membuat folder `apps/ai/` dengan semua file fondasi project Python FastAPI.

## File yang Harus Dibuat

### 1. `apps/ai/requirements.txt`

```txt
fastapi==0.115.0
uvicorn==0.32.0
google-genai==1.0.0
psycopg2-binary==2.9.10
python-dotenv==1.0.1
pydantic==2.9.0
```

### 2. `apps/ai/.env`

```env
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=postgresql://postgres:winner1234@localhost:5432/procureflow_erp
PORT=8000
```

> PENTING: Baca `apps/api/.env` untuk mendapatkan DATABASE_URL yang benar. Gunakan nilai yang sama.

### 3. `apps/ai/config.py`

Buat file konfigurasi yang:
- Menggunakan `python-dotenv` untuk load file `.env`
- Export variabel: `GEMINI_API_KEY`, `DATABASE_URL`, `PORT`
- Validasi bahwa `GEMINI_API_KEY` dan `DATABASE_URL` tidak kosong (raise error jika kosong)

### 4. `apps/ai/main.py`

Buat entry point FastAPI yang:
- Import FastAPI dan konfigurasi CORS middleware
- Allow origins: `["http://localhost:3000", "http://localhost:3001"]`
- Allow methods: `["*"]`, Allow headers: `["*"]`
- Buat endpoint health check: `GET /health` → return `{"status": "ok", "service": "procureflow-ai"}`
- Buat placeholder untuk router yang akan ditambahkan di sprint berikutnya (comment saja)
- Tambahkan block `if __name__ == "__main__"` yang menjalankan `uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)`

### 5. Buat folder kosong (dengan `__init__.py`)

Buat file `__init__.py` kosong di setiap subfolder berikut agar Python mengenalinya sebagai package:
- `apps/ai/db/__init__.py`
- `apps/ai/routers/__init__.py`
- `apps/ai/services/__init__.py`
- `apps/ai/schemas/__init__.py`
- `apps/ai/prompts/` (folder ini tidak butuh `__init__.py`, cukup buat foldernya saja)

### 6. Tambahkan script di root `package.json`

Modifikasi file `package.json` di root monorepo. Tambahkan script baru:
```json
"ai:dev": "cd apps/ai && python main.py",
"ai:install": "cd apps/ai && pip install -r requirements.txt"
```

## Verifikasi

Setelah semua file dibuat:
1. Jalankan `pip install -r requirements.txt` di folder `apps/ai/`
2. Jalankan `python main.py` di folder `apps/ai/` dan pastikan server berjalan di port 8000
3. Test `GET http://localhost:8000/health` dan pastikan return `{"status": "ok", "service": "procureflow-ai"}`

## Output Sprint

Laporkan semua file yang dibuat dan hasil verifikasi.
