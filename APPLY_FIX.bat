@echo off
setlocal

REM Hapus route.ts yang salah lokasi jika ada
if exist "src\app\(app)\customers\[id]\vehicles\new\route.ts" (
  del /f /q "src\app\(app)\customers\[id]\vehicles\new\route.ts"
)

echo.
echo Quick fix kendaraan sudah diterapkan.
echo Jalankan: npm run dev
pause
