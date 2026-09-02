# DetailFlow Development Status

## Step 7 — Invoice & Payment
Status: implemented in source.

Sudah tersedia:
- buat invoice dari Work Order
- nomor invoice otomatis
- status unpaid / partial / paid
- catat pembayaran Cash / Transfer / QRIS / Lainnya
- riwayat pembayaran
- total dibayar dan sisa tagihan
- data invoice/payment tetap terpisah per studio

Untuk testing lokal:
1. `npm install`
2. `npm run db:migrate:local`
3. `npm run dev`
4. Buka Work Order
5. Klik **Buat Invoice**
6. Catat pembayaran

Catatan: build penuh belum diverifikasi bila dependency sandbox belum selesai terpasang.

## Step 08 — Dashboard & laporan dasar
- Dashboard sekarang memakai data nyata dari D1.
- Menampilkan booking hari ini, pekerjaan aktif, omzet tercatat, dan tagihan belum lunas.
- Menampilkan daftar work order terbaru.


## Step 09 — UI / CSS polish
- Login dan onboarding diperbarui agar lebih profesional.
- Sidebar desktop diperjelas.
- Navigasi bawah ditambahkan untuk mobile.
- Card, tombol, form, dan list memakai style konsisten.
- Dashboard, Customer, Booking, Service, dan Work Order dirapikan tanpa mengubah fungsi.
