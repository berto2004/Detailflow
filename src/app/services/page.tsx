import Link from "next/link";
import { and, desc, eq, like, or } from "drizzle-orm";
import {
  Clock3,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import { services } from "@/db/schema";
import { formatRupiah } from "@/lib/utils";
import { requireRole } from "@/lib/permissions";

import {
  createService,
  deleteService,
  toggleService,
  updateService,
} from "./actions";

interface PageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const workspace = await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const search = String(params.q ?? "").trim();
  const db = getDb();

  const conditions = [
    eq(services.organizationId, workspace.organizationId),
  ];

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(services.name, term),
        like(services.category, term)
      )!
    );
  }

  const rows = await db
    .select()
    .from(services)
    .where(and(...conditions))
    .orderBy(desc(services.createdAt));

  const activeCount = rows.filter((service) => service.active).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <Sparkles size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Katalog Layanan & Treatment
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                Kelola paket servis, estimasi durasi pengerjaan, dan tarif harga untuk {workspace.organizationName}.
              </p>
            </div>
          </div>

          <a
            href="#tambah-layanan"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-gray-800 active:scale-95 sm:w-auto"
          >
            <Plus size={16} className="text-white" />
            <span className="!text-white font-bold">Tambah Layanan</span>
          </a>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <InfoCard
            label="Total Katalog"
            value={String(rows.length)}
            icon={<Layers size={20} />}
          />

          <InfoCard
            label="Layanan Aktif"
            value={String(activeCount)}
            icon={<Wrench size={20} />}
            highlight
          />

          <div className="col-span-2 md:col-span-1">
            <InfoCard
              label="Nonaktif"
              value={String(rows.length - activeCount)}
              icon={<Clock3 size={20} />}
            />
          </div>
        </div>

        {/* SEARCH BAR */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <form method="GET" className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                id="search-services"
                name="q"
                defaultValue={search}
                placeholder="Cari nama layanan atau kategori (contoh: Coating, Interior, Wash)..."
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
                href="/services"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600 transition hover:bg-gray-200"
                title="Reset Filter"
              >
                <RotateCcw size={16} />
              </Link>
            )}
          </form>
        </section>

        {/* ADD SERVICE FORM */}
        <section
          id="tambah-layanan"
          className="scroll-mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <Plus size={19} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Tambah Paket Layanan Baru
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Definisikan nama paket, kategori, tarif dasar, dan estimasi waktu pengerjaannya.
              </p>
            </div>
          </div>

          <form
            action={createService}
            className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                Nama Layanan
              </label>
              <Input
                name="name"
                placeholder="Contoh: Ceramic Coating 3 Layers"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                Kategori
              </label>
              <Input
                name="category"
                placeholder="Contoh: Detailing / Coating / Wash"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                Tarif Harga (Rp)
              </label>
              <Input
                name="price"
                type="number"
                min="0"
                placeholder="Contoh: 1500000"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                Estimasi Durasi (Menit)
              </label>
              <Input
                name="durationMinutes"
                type="number"
                min="1"
                placeholder="Contoh: 120"
                required
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold !text-white transition hover:bg-gray-800 active:scale-95 md:col-span-2 lg:col-span-4"
            >
              + Simpan Layanan ke Katalog
            </button>
          </form>
        </section>

        {/* LIST SECTION */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Daftar Paket Layanan
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                {search
                  ? `${rows.length} layanan ditemukan untuk "${search}".`
                  : `${rows.length} layanan tersedia di katalog studio.`}
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Wrench size={24} />
              </div>
              <p className="mt-4 font-bold text-gray-900">
                {search ? "Layanan tidak ditemukan" : "Belum ada katalog layanan"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
                {search
                  ? "Coba kata pencarian lain atau klik tombol reset."
                  : "Tambahkan paket treatment pertama Anda menggunakan form di atas."}
              </p>
              {search && (
                <Link
                  href="/services"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <RotateCcw size={14} /> Reset Pencarian
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((service) => (
                <article
                  key={service.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">
                          {service.name}
                        </h3>

                        <StatusBadge active={service.active} />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-semibold text-gray-700">
                          <Tag size={13} className="text-gray-400" />
                          {service.category}
                        </span>
                        <span>·</span>
                        <span className="font-black text-gray-900">
                          {formatRupiah(service.price)}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock3 size={13} className="text-gray-400" />
                          {service.durationMinutes} menit
                        </span>
                      </div>
                    </div>

                    <form action={toggleService}>
                      <input
                        type="hidden"
                        name="id"
                        value={service.id}
                      />

                      <button
                        type="submit"
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                          service.active
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {service.active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </form>
                  </div>

                  <details className="group border-t border-gray-100 pt-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-gray-600 transition hover:text-gray-900">
                      <span>Edit Tarif & Durasi</span>
                      <span className="text-gray-400 transition group-open:rotate-180">↓</span>
                    </summary>

                    <form
                      action={updateService}
                      className="mt-3 grid gap-2.5 sm:grid-cols-2"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={service.id}
                      />

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-500">Nama</label>
                        <Input
                          name="name"
                          defaultValue={service.name}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-500">Kategori</label>
                        <Input
                          name="category"
                          defaultValue={service.category}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-500">Harga (Rp)</label>
                        <Input
                          name="price"
                          type="number"
                          min="0"
                          defaultValue={service.price}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-500">Durasi (Menit)</label>
                        <Input
                          name="durationMinutes"
                          type="number"
                          min="1"
                          defaultValue={service.durationMinutes}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold !text-white transition hover:bg-gray-800 active:scale-95 sm:col-span-2"
                      >
                        Simpan Perubahan
                      </button>
                    </form>

                    <div className="mt-3 border-t border-gray-100 pt-2.5 flex items-center justify-between">
                      <form action={deleteService}>
                        <input
                          type="hidden"
                          name="id"
                          value={service.id}
                        />

                        <button
                          type="submit"
                          className="text-xs font-bold text-red-600 transition hover:text-red-700"
                        >
                          Hapus Layanan
                        </button>
                      </form>

                      <span className="text-[11px] text-gray-400">
                        Layanan riwayat WO aman via nonaktif
                      </span>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Input({
  name,
  type = "text",
  placeholder,
  defaultValue,
  min,
  required = false,
}: {
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  min?: string;
  required?: boolean;
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      min={min}
      required={required}
      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
    />
  );
}

function InfoCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition ${
        highlight
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <span className={highlight ? "text-emerald-600" : "text-gray-400"}>
          {icon}
        </span>
      </div>

      <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
        active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}