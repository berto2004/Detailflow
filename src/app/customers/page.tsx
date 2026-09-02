import Link from "next/link";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { Plus, RotateCcw, Search, UserRound, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import { customers, vehicles } from "@/db/schema";
import { requireRole } from "@/lib/permissions";

interface PageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const workspace = await requireRole(["owner", "admin"]);
  const { search = "" } = await searchParams;
  const searchTerm = search.trim();

  const conditions = [
    eq(customers.organizationId, workspace.organizationId),
  ];

  if (searchTerm) {
    const term = `%${searchTerm}%`;
    conditions.push(
      or(
        like(customers.name, term),
        like(customers.phone, term),
        like(customers.email, term)
      )!
    );
  }

  const rows = await getDb()
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      vehicleCount: sql<number>`count(${vehicles.id})`,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .leftJoin(vehicles, eq(vehicles.customerId, customers.id))
    .where(and(...conditions))
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt));

  const hasFilterActive = Boolean(searchTerm);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customers</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Database pelanggan dan jumlah unit kendaraan milik {workspace.organizationName}.
            </p>
          </div>

          <Link
            href="/customers/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-gray-800 active:scale-95"
          >
            <Plus size={16} className="text-white" />
            <span className="!text-white font-bold">Customer Baru</span>
          </Link>
        </div>

        {/* SEARCH BAR */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <form method="GET" className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="search"
                name="search"
                type="text"
                defaultValue={searchTerm}
                placeholder="Cari nama, no. HP, atau email customer..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold !text-white transition hover:bg-gray-800 active:scale-95"
            >
              Cari
            </button>

            {hasFilterActive && (
              <Link
                href="/customers"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600 transition hover:bg-gray-200"
                title="Reset Filter"
              >
                <RotateCcw size={16} />
              </Link>
            )}
          </form>
        </div>

        {/* LIST SECTION */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Total <strong>{rows.length}</strong> customer
            </span>
            {hasFilterActive && (
              <span className="text-xs font-semibold text-blue-600">
                Filter aktif
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {rows.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <Users size={24} />
                </div>
                <p className="mt-4 font-bold text-gray-900">
                  {hasFilterActive ? "Customer tidak ditemukan" : "Belum ada customer"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
                  {hasFilterActive
                    ? "Coba gunakan kata kunci lain atau reset kolom pencarian."
                    : "Tambahkan customer pertama untuk mulai mencatat registrasi kendaraan."}
                </p>
                {hasFilterActive && (
                  <Link
                    href="/customers"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <RotateCcw size={14} /> Reset Pencarian
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    href={`/customers/${row.id}`}
                    className="flex flex-col gap-2 p-4 transition hover:bg-gray-50/80 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                        <UserRound size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{row.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {row.email || "Tanpa email"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <span className="font-semibold text-gray-700">{row.phone}</span>
                      <span className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-600">
                        {Number(row.vehicleCount)} Kendaraan
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}