# DetailFlow

MVP SaaS untuk operasional auto detailing: CRM customer/vehicle, booking, work order, inspection photos, invoice, dan retention automation.

## Milestone saat ini

Sprint 00 + foundation Sprint 01. Struktur multi-tenant dan schema inti sudah disiapkan. Dashboard/customer screen masih menggunakan demo data agar UI dapat diverifikasi sebelum wiring database/auth.

## Stack
- Next.js App Router + TypeScript
- Cloudflare Workers via OpenNext
- Cloudflare D1 + Drizzle ORM
- Cloudflare R2 untuk foto
- Tailwind CSS

## Local setup
1. `npm install`
2. `npx wrangler d1 create detailflow-db` lalu salin `database_id` ke `wrangler.jsonc`.
3. `npx wrangler r2 bucket create detailflow-photos`
4. `npm run db:migrate:local`
5. `npm run dev`
6. Sebelum release: `npm run preview` untuk menjalankan build pada runtime Cloudflare.

## Security rule
Semua tabel bisnis membawa `organization_id`. Query production wajib mendapatkan organization dari session server-side; jangan menerima organization_id dari payload client sebagai source of truth.

## Next tasks
- Better Auth/session integration
- organization bootstrap + owner onboarding
- tenant-scoped repository layer
- customer/vehicle CRUD dengan Zod validation
- automated tenant isolation tests
