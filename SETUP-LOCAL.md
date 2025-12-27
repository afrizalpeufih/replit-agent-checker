# Panduan Setup & Menjalankan Proyek di Local

## Prerequisites (Persyaratan)

Pastikan Anda sudah menginstall:
- **Node.js** versi 18 atau lebih tinggi ([Download di sini](https://nodejs.org/))
- **npm** (biasanya sudah termasuk dengan Node.js)

Untuk cek versi yang terinstall:
```bash
node --version
npm --version
```

## Struktur Proyek

Proyek ini adalah aplikasi web modern menggunakan:
- ⚡ **Vite** - Build tool yang cepat
- ⚛️ **React 18** - Library UI
- 📘 **TypeScript** - Type safety
- 🎨 **Tailwind CSS** - Styling
- 🧩 **shadcn-ui** - Komponen UI
- 📊 **TanStack Query** - State management untuk fetching data
- 📋 **React Hook Form** - Form handling
- 📁 **xlsx** - Excel file processing

## Langkah-Langkah Persiapan

### ✅ Status Saat Ini
- ✅ Dependencies sudah terinstall (folder `node_modules` sudah ada)
- ✅ Konfigurasi Vite sudah siap
- ✅ TypeScript config sudah ada
- ✅ Tailwind CSS sudah dikonfigurasi

### Jika Perlu Install Ulang Dependencies

Jika Anda ingin memastikan semua dependencies up-to-date atau ada masalah:

```bash
# Hapus node_modules dan package-lock.json (opsional)
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Install ulang dependencies
npm install
```

## Cara Menjalankan Aplikasi

### 1. Mode Development (Pengembangan)

Untuk menjalankan aplikasi dalam mode development dengan hot-reload:

```bash
npm run dev
```

Aplikasi akan berjalan di:
- **URL**: http://localhost:8080
- Server akan otomatis reload saat ada perubahan code

### 2. Build untuk Production

Jika ingin membuat build production:

```bash
npm run build
```

Build files akan ada di folder `dist/`

### 3. Preview Build Production

Untuk preview hasil build production:

```bash
npm run preview
```

## Perintah-Perintah Lainnya

### Linting (Cek Kode)
```bash
npm run lint
```

### Build Development Mode
```bash
npm run build:dev
```

## Port & Network

Berdasarkan konfigurasi di `vite.config.ts`:
- **Host**: `::` (IPv6, accessible dari network lain)
- **Port**: `8080`

Jadi aplikasi bisa diakses dari:
- http://localhost:8080 (dari komputer Anda)
- http://[IP-Address-Anda]:8080 (dari perangkat lain di network yang sama)

## Troubleshooting

### Port 8080 Sudah Digunakan
Jika port 8080 sudah dipakai aplikasi lain, Anda bisa:
1. Edit file `vite.config.ts` dan ubah port ke nomor lain (misalnya 3000, 5173, dll)
2. Atau stop aplikasi yang menggunakan port 8080

### Dependencies Error
Jika ada error terkait dependencies:
```bash
# Clear npm cache
npm cache clean --force

# Install ulang
Remove-Item -Recurse -Force node_modules
npm install
```

### TypeScript Errors
Pastikan VSCode menggunakan TypeScript workspace version:
- Buka file `.ts` atau `.tsx`
- Tekan `Ctrl+Shift+P`
- Ketik "TypeScript: Select TypeScript Version"
- Pilih "Use Workspace Version"

## Struktur Folder Penting

```
replit-agent-checker/
├── src/
│   ├── components/     # Komponen React
│   ├── pages/          # Halaman aplikasi
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── index.html          # HTML template
├── package.json        # Dependencies
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```

## Informasi Tambahan

- **Hot Module Replacement (HMR)**: Diaktifkan secara default dalam mode dev
- **SWC**: Menggunakan SWC untuk React refresh yang lebih cepat
- **Path Alias**: `@` di-alias ke `./src/` (bisa import dengan `@/components/...`)

## Siap Dijalankan! 🚀

Semua sudah siap! Tinggal jalankan:
```bash
npm run dev
```

Kemudian buka browser dan akses http://localhost:8080
