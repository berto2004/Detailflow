import Link from "next/link";
import {
  and,
  asc,
  eq,
  like,
  or,
} from "drizzle-orm";
import {
  Car,
  ChevronDown,
  CircleUserRound,
  Palette,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import {
  customers,
  vehicles,
} from "@/db/schema";
import { requireRole } from "@/lib/permissions";

import {
  createVehicle,
  deleteVehicle,
  updateVehicle,
} from "./actions";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const params = await searchParams;
  const search = String(params.q ?? "").trim();
  const db = getDb();

  // 1. Ambil daftar customer untuk dropdown registrasi kendaraan baru
  const customerRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
    })
    .from(customers)
    .where(
      eq(
        customers.organizationId,
        workspace.organizationId
      )
    )
    .orderBy(asc(customers.name));

  // 2. Susun kondisi pencarian kendaraan
  const conditions = [
    eq(vehicles.organizationId, workspace.organizationId),
  ];

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(vehicles.plateNumber, term),
        like(vehicles.brand, term),
        like(vehicles.model, term),
        like(vehicles.color, term),
        like(customers.name, term),
        like(customers.phone, term)
      )!
    );
  }

  // 3. Query daftar kendaraan
  const rows = await db
    .select({
      vehicleId: vehicles.id,
      plateNumber: vehicles.plateNumber,
      brand: vehicles.brand,
      model: vehicles.model,
      year: vehicles.year,
      color: vehicles.color,
      notes: vehicles.notes,
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
      updatedAt: vehicles.updatedAt,
    })
    .from(vehicles)
    .innerJoin(
      customers,
      eq(vehicles.customerId, customers.id)
    )
    .where(and(...conditions))
    .orderBy(asc(vehicles.plateNumber));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <Car size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Kendaraan
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                Registry database kendaraan customer milik {workspace.organizationName}.
              </p>
            </div>
          </div>

          <a
            href="#tambah-kendaraan"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-gray-800 active:scale-95 sm:w-auto"
          >
            <Plus size={16} className="text-white" />
            <span className="!text-white font-bold">Tambah Kendaraan</span>
          </a>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SummaryCard
            label="Total Kendaraan"
            value={String(rows.length)}
          />

          <SummaryCard
            label="Total Customer"
            value={String(customerRows.length)}
          />

          <div className="col-span-2 md:col-span-1">
            <SummaryCard
              label="Status Filter"
              value={search ? "Aktif" : "Semua"}
            />
          </div>
        </div>

        {/* SEARCH BAR */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <form
            method="GET"
            className="flex gap-2"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                id="search-vehicle"
                name="q"
                defaultValue={search}
                placeholder="Cari plat nomor, brand, model, warna, atau nama customer..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold !text-white transition hover:bg-gray-800 active:scale-95"
            >
              Cari
            </button>

            {search && (
              <Link
                href="/vehicles"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600 transition hover:bg-gray-200"
                title="Reset Pencarian"
              >
                <RotateCcw size={16} />
              </Link>
            )}
          </form>
        </section>

        {/* ADD VEHICLE FORM */}
        <section
          id="tambah-kendaraan"
          className="scroll-mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Plus
                size={19}
                className="text-gray-700"
              />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Tambah Kendaraan Baru
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Daftarkan unit kendaraan baru dan hubungkan ke customer yang terdaftar.
              </p>
            </div>
          </div>

          {customerRows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Belum ada data customer.
              </p>

              <p className="mt-1 text-xs text-amber-700">
                Silakan buat profil customer terlebih dahulu sebelum menambahkan unit kendaraan.
              </p>

              <Link
                href="/customers/new"
                className="mt-3 inline-flex text-xs font-bold text-amber-900 underline"
              >
                + Buat Customer Baru →
              </Link>
            </div>
          ) : (
            <form
              action={createVehicle}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <Field label="Pemilik / Customer">
                <select
                  name="customerId"
                  required
                  defaultValue=""
                  className={inputClass}
                >
                  <option
                    value=""
                    disabled
                  >
                    Pilih customer pemilik
                  </option>

                  {customerRows.map(
                    (customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name} — {customer.phone}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Nomor Polisi (Plat)">
                <input
                  name="plateNumber"
                  required
                  placeholder="B 1234 XYZ"
                  className={`${inputClass} uppercase`}
                />
              </Field>

              <Field label="Brand / Merk">
                <input
                  name="brand"
                  required
                  placeholder="Contoh: Toyota, Honda, BMW"
                  className={inputClass}
                />
              </Field>

              <Field label="Model / Seri">
                <input
                  name="model"
                  required
                  placeholder="Contoh: Fortuner GR, Civic Turbo"
                  className={inputClass}
                />
              </Field>

              <Field label="Tahun Pembuatan">
                <input
                  name="year"
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="2024"
                  className={inputClass}
                />
              </Field>

              <Field label="Warna Unit">
                <input
                  name="color"
                  placeholder="Contoh: Hitam Metalik, Putih Mutiara"
                  className={inputClass}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Catatan Tambahan (Opsional)">
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Catatan baret bawaan, kondisi cat, atau preferensi pemilik..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold !text-white transition hover:bg-gray-800 active:scale-95 md:col-span-2"
              >
                + Simpan Kendaraan
              </button>
            </form>
          )}
        </section>

        {/* LIST TITLE */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Daftar Kendaraan
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              {search
                ? `${rows.length} kendaraan ditemukan untuk "${search}".`
                : `${rows.length} unit kendaraan terdaftar.`}
            </p>
          </div>
        </div>

        {/* LIST OR EMPTY */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Car size={26} />
            </div>

            <h3 className="mt-4 font-bold text-gray-900">
              {search
                ? "Kendaraan tidak ditemukan"
                : "Belum ada data kendaraan"}
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
              {search
                ? "Coba gunakan kata kunci lain atau reset kolom pencarian."
                : "Tambahkan unit kendaraan pertama melalui formulir di atas."}
            </p>

            {search && (
              <Link
                href="/vehicles"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <RotateCcw size={14} /> Reset Pencarian
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((vehicle) => (
              <article
                key={vehicle.vehicleId}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
              >
                {/* CARD CONTENT */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-bold tracking-wide !text-white">
                          {vehicle.plateNumber}
                        </span>

                        {vehicle.year && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                            {vehicle.year}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2.5 truncate text-lg font-bold text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                      <Car size={20} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                      <CircleUserRound
                        size={17}
                        className="shrink-0 text-gray-400"
                      />

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-400">
                          Pemilik
                        </p>

                        <p className="truncate text-xs font-bold text-gray-800">
                          {vehicle.customerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                      <Palette
                        size={17}
                        className="shrink-0 text-gray-400"
                      />

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-400">
                          Warna
                        </p>

                        <p className="truncate text-xs font-bold text-gray-800">
                          {vehicle.color || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {vehicle.notes && (
                    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Catatan Khusus
                      </p>

                      <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                        {vehicle.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* ACCORDION EDIT */}
                <details className="group border-t border-gray-100">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50">
                    Edit Data Kendaraan
                    <ChevronDown
                      size={16}
                      className="transition group-open:rotate-180"
                    />
                  </summary>

                  <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                    <form
                      action={updateVehicle}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <input
                        type="hidden"
                        name="vehicleId"
                        value={vehicle.vehicleId}
                      />

                      <div className="sm:col-span-2">
                        <Field label="Pemilik / Customer">
                          <select
                            name="customerId"
                            required
                            defaultValue={vehicle.customerId}
                            className={inputClass}
                          >
                            {customerRows.map((customer) => (
                              <option
                                key={customer.id}
                                value={customer.id}
                              >
                                {customer.name} — {customer.phone}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <Field label="Plat Nomor">
                        <input
                          name="plateNumber"
                          required
                          defaultValue={vehicle.plateNumber}
                          className={`${inputClass} uppercase`}
                        />
                      </Field>

                      <Field label="Brand">
                        <input
                          name="brand"
                          required
                          defaultValue={vehicle.brand}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Model">
                        <input
                          name="model"
                          required
                          defaultValue={vehicle.model}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Tahun">
                        <input
                          name="year"
                          type="number"
                          min="1900"
                          max="2100"
                          defaultValue={vehicle.year ?? ""}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Warna">
                        <input
                          name="color"
                          defaultValue={vehicle.color ?? ""}
                          className={inputClass}
                        />
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Catatan">
                          <textarea
                            name="notes"
                            rows={2}
                            defaultValue={vehicle.notes ?? ""}
                            className={`${inputClass} resize-none`}
                          />
                        </Field>
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold !text-white transition hover:bg-gray-800 active:scale-95 sm:col-span-2"
                      >
                        Simpan Perubahan
                      </button>
                    </form>

                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <form action={deleteVehicle}>
                        <input
                          type="hidden"
                          name="vehicleId"
                          value={vehicle.vehicleId}
                        />

                        <button
                          type="submit"
                          className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                        >
                          Hapus Kendaraan
                        </button>
                      </form>

                      <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-400">
                        Kendaraan yang sedang terhubung ke Work Order aktif tidak dapat dihapus.
                      </p>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-gray-900">
        {value}
      </p>
    </div>
  );
}