# ✅ Checklist: Siap Run di Local

## Status Persiapan Proyek

### ✅ Yang Sudah Siap

- [x] **Node.js terinstall** - v24.12.0 ✓
- [x] **Dependencies terinstall** - folder `node_modules` sudah ada ✓
- [x] **Konfigurasi Vite** - `vite.config.ts` sudah dikonfigurasi ✓
- [x] **TypeScript config** - `tsconfig.json` sudah ada ✓
- [x] **Tailwind CSS** - `tailwind.config.ts` sudah dikonfigurasi ✓
- [x] **Package.json** - semua scripts sudah dikonfigurasi ✓
- [x] **Struktur folder** - src/, components/, pages/ sudah ada ✓

### ⚠️ Yang Perlu Anda Lakukan

- [ ] **Fix PowerShell (jika diperlukan)**
  - Baca: [`FIX-POWERSHELL.md`](file:///c:/Users/AMN/Downloads/Projectg/CEK-NIK%20&%20KK/replit-agent-checker/FIX-POWERSHELL.md)
  - Set execution policy atau gunakan Command Prompt

- [ ] **Verifikasi npm berfungsi**
  ```bash
  npm --version
  ```
  Harus berhasil tanpa error.

- [ ] **Test menjalankan aplikasi**
  ```bash
  npm run dev
  ```
  Aplikasi harus berjalan di http://localhost:8080

## Quick Start (Langkah Cepat)

### Opsi 1: Gunakan PowerShell (Setelah Fix)

```powershell
# 1. Fix execution policy dulu (baca FIX-POWERSHELL.md)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 2. Jalankan aplikasi
npm run dev
```

### Opsi 2: Gunakan Command Prompt (Lebih Mudah)

```cmd
# 1. Buka Command Prompt (cmd.exe)
# 2. Navigate ke folder proyek
cd "c:\Users\AMN\Downloads\Projectg\CEK-NIK & KK\replit-agent-checker"

# 3. Jalankan aplikasi
npm run dev
```

### Opsi 3: Gunakan Git Bash atau Terminal Lain

```bash
cd "/c/Users/AMN/Downloads/Projectg/CEK-NIK & KK/replit-agent-checker"
npm run dev
```

## Informasi Penting

### Port & URL
- **Development URL**: http://localhost:8080
- **Port**: 8080 (bisa diubah di `vite.config.ts` jika port sudah terpakai)

### Scripts yang Tersedia

| Script | Perintah | Kegunaan |
|--------|----------|----------|
| Dev Server | `npm run dev` | Jalankan development server dengan hot-reload |
| Build | `npm run build` | Build untuk production |
| Build Dev | `npm run build:dev` | Build dalam mode development |
| Lint | `npm run lint` | Check code quality dengan ESLint |
| Preview | `npm run preview` | Preview hasil build production |

### File Dokumentasi

1. **[SETUP-LOCAL.md](file:///c:/Users/AMN/Downloads/Projectg/CEK-NIK%20&%20KK/replit-agent-checker/SETUP-LOCAL.md)**
   - Panduan lengkap setup dan menjalankan proyek
   - Penjelasan struktur folder
   - Troubleshooting umum

2. **[FIX-POWERSHELL.md](file:///c:/Users/AMN/Downloads/Projectg/CEK-NIK%20&%20KK/replit-agent-checker/FIX-POWERSHELL.md)**
   - Solusi untuk error PowerShell execution policy
   - 3 cara untuk mengatasi masalah

3. **[README.md](file:///c:/Users/AMN/Downloads/Projectg/CEK-NIK%20&%20KK/replit-agent-checker/README.md)**
   - Dokumentasi original dari Lovable
   - Informasi tentang teknologi yang digunakan

## Troubleshooting

### Error: "cannot be loaded because running scripts is disabled"
➡️ **Solusi**: Baca [`FIX-POWERSHELL.md`](file:///c:/Users/AMN/Downloads/Projectg/CEK-NIK%20&%20KK/replit-agent-checker/FIX-POWERSHELL.md)

### Error: "Port 8080 is already in use"
➡️ **Solusi**: 
1. Stop aplikasi yang menggunakan port 8080, atau
2. Edit `vite.config.ts` dan ubah port ke nomor lain

### Error: Dependencies missing
➡️ **Solusi**:
```bash
npm install
```

### TypeScript errors di VSCode
➡️ **Solusi**:
1. Ctrl+Shift+P
2. "TypeScript: Select TypeScript Version"
3. Pilih "Use Workspace Version"

## Teknologi Stack

- ⚡ **Vite** - Fast build tool
- ⚛️ **React 18** - UI library
- 📘 **TypeScript** - Type safety
- 🎨 **Tailwind CSS** - Utility-first CSS
- 🧩 **shadcn/ui** - Beautiful UI components
- 📊 **TanStack Query** - Data fetching
- 📋 **React Hook Form + Zod** - Form validation
- 🔀 **React Router** - Routing
- 📁 **xlsx** - Excel file processing

## Kesimpulan

✅ **Proyek sudah 95% siap!**

Yang perlu Anda lakukan:
1. Fix PowerShell (atau gunakan CMD)
2. Jalankan `npm run dev`
3. Buka http://localhost:8080

Selamat coding! 🚀
