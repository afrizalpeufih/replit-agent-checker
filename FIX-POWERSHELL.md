# ⚠️ PENTING: Fix PowerShell Error

## Masalah yang Ditemukan

PowerShell execution policy di sistem Anda tidak mengizinkan menjalankan script npm. Anda akan melihat error seperti ini:

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts 
is disabled on this system.
```

## Solusi (Pilih Salah Satu)

### ✅ Solusi 1: Ubah Execution Policy (Recommended)

Buka PowerShell **sebagai Administrator** dan jalankan:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Ketik `Y` untuk konfirmasi.

Penjelasan:
- `RemoteSigned`: Mengizinkan script lokal, tapi script dari internet harus ditandatangani
- `CurrentUser`: Hanya untuk user Anda, tidak mempengaruhi user lain

### ✅ Solusi 2: Gunakan Command Prompt (CMD)

Sebagai alternatif, gunakan **Command Prompt** atau **Git Bash** instead of PowerShell:

1. Buka **Command Prompt** (cmd.exe)
2. Navigate ke folder proyek:
   ```cmd
   cd "c:\Users\AMN\Downloads\Projectg\CEK-NIK & KK\replit-agent-checker"
   ```
3. Jalankan npm:
   ```cmd
   npm run dev
   ```

### ✅ Solusi 3: Bypass untuk Perintah Tertentu

Setiap kali menjalankan npm di PowerShell, tambahkan bypass:

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run dev"
```

## Setelah Fix

Coba jalankan lagi:
```bash
npm --version
```

Jika berhasil, Anda akan melihat versi npm (misalnya: 10.x.x)

Kemudian Anda bisa lanjut menjalankan aplikasi:
```bash
npm run dev
```

---

**✨ UPDATE**: Node.js v24.12.0 sudah terdeteksi di sistem Anda!
