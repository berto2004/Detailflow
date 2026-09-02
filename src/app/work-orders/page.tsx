import Link from "next/link";
import {
  BadgeCheck,
  Car,
  ClipboardList,
  Clock3,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import { and, count, desc, eq, like, or } from "drizzle-orm";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import { customers, vehicles, workOrders } from "@/db/schema";
import {
  getEntitlement,
  getOrganizationPlan,
} from "@/lib/entitlement";
import { requireWorkspace } from "@/lib/workspace";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

const statusLabel: Record<string, string> = {
  inspection: "Inspection",
  in_progress: "In Progress",
  qc: "QC",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

type AllowedStatus =
  | "inspection"
  | "in_progress"
  | "qc"
  | "ready"
  | "completed"
  | "cancelled";

export default async function WorkOrdersPage({
  searchParams,
}: PageProps) {
  const workspace = await requireWorkspace();
  const db = getDb();

  const { search = "", status = "" } = await searchParams;
  const searchTerm = search.trim();

  const isTechnician = workspace.role === "technician";

  /*
   * SaaS entitlement
   *
   * Ambil plan organisasi dan entitlement Work Orders
   * untuk ditampilkan sebagai usage meter di halaman.
   */
  const [plan, workOrderEntitlement, usageResult] =
    await Promise.all([
      getOrganizationPlan(workspace.organizationId),
      getEntitlement(
        workspace.organizationId,
        "work_orders",
      ),
      db
        .select({
          count: count(),
        })
        .from(workOrders)
        .where(
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
    ]);

  const workOrderUsage = usageResult[0]?.count ?? 0;

  const workOrderLimit =
    workOrderEntitlement?.unlimited ||
    workOrderEntitlement?.limitValue === null
      ? null
      : workOrderEntitlement?.limitValue ?? null;

  const workOrderEnabled =
    workOrderEntitlement?.enabled ?? false;

  const workOrderLimitReached =
    workOrderLimit !== null &&
    workOrderUsage >= workOrderLimit;

  // Kondisi dasar per organization
  const conditions = [
    eq(
      workOrders.organizationId,
      workspace.organizationId,
    ),
  ];

  // Filter Status
  const validStatuses: AllowedStatus[] = [
    "inspection",
    "in_progress",
    "qc",
    "ready",
    "completed",
    "cancelled",
  ];

  if (
    status &&
    validStatuses.includes(status as AllowedStatus)
  ) {
    conditions.push(
      eq(
        workOrders.status,
        status as AllowedStatus,
      ),
    );
  }

  // Filter Search:
  // Plat Nomor, Pelanggan, No Telepon,
  // Merk, Model, atau ID
  if (searchTerm) {
    const term = `%${searchTerm}%`;

    conditions.push(
      or(
        like(workOrders.id, term),
        like(customers.name, term),
        like(customers.phone, term),
        like(vehicles.plateNumber, term),
        like(vehicles.brand, term),
        like(vehicles.model, term),
      )!,
    );
  }

  const rows = await db
    .select({
      id: workOrders.id,
      status: workOrders.status,
      total: workOrders.total,
      createdAt: workOrders.createdAt,

      customer: customers.name,
      phone: customers.phone,

      brand: vehicles.brand,
      model: vehicles.model,
      plate: vehicles.plateNumber,
      color: vehicles.color,
    })
    .from(workOrders)
    .innerJoin(
      customers,
      and(
        eq(
          workOrders.customerId,
          customers.id,
        ),
        eq(
          customers.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .innerJoin(
      vehicles,
      and(
        eq(
          workOrders.vehicleId,
          vehicles.id,
        ),
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(workOrders.createdAt));

  const activeCount = rows.filter(
    (row) =>
      row.status !== "completed" &&
      row.status !== "cancelled",
  ).length;

  const completedCount = rows.filter(
    (row) => row.status === "completed",
  ).length;

  const readyCount = rows.filter(
    (row) => row.status === "ready",
  ).length;

  const hasFilterActive = Boolean(
    searchTerm ||
      (status && status !== "ALL"),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <ClipboardList size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Work Orders
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                Kendaraan yang sedang atau sudah dikerjakan.
              </p>
            </div>
          </div>
        </div>

        {/* PLAN / ENTITLEMENT */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Paket Anda
              </p>

              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {plan?.planName ?? "Tidak ada paket"}
                </h2>

                {plan?.subscriptionStatus && (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                    {plan.subscriptionStatus}
                  </span>
                )}
              </div>
            </div>

            <div className="sm:min-w-[280px]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">
                  Work Orders
                </p>

                <p className="text-sm font-bold text-gray-900">
                  {workOrderUsage}
                  {workOrderLimit !== null
                    ? ` / ${workOrderLimit}`
                    : " / Unlimited"}
                </p>
              </div>

              {workOrderLimit !== null && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-900 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (workOrderUsage /
                          workOrderLimit) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              )}

              <p
                className={`mt-2 text-xs ${
                  !workOrderEnabled ||
                  workOrderLimitReached
                    ? "font-semibold text-red-600"
                    : "text-gray-500"
                }`}
              >
                {!workOrderEnabled
                  ? "Fitur Work Order tidak aktif pada paket ini."
                  : workOrderLimitReached
                    ? "Limit Work Order paket Anda sudah tercapai."
                    : workOrderLimit !== null
                      ? `${workOrderLimit - workOrderUsage} Work Order tersisa.`
                      : "Work Order tersedia tanpa batas."}
              </p>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            label="Total Ditampilkan"
            value={String(rows.length)}
          />

          <SummaryCard
            label="Aktif"
            value={String(activeCount)}
          />

          <SummaryCard
            label="Ready"
            value={String(readyCount)}
          />

          <SummaryCard
            label="Completed"
            value={String(completedCount)}
          />
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <form
            method="GET"
            className="grid grid-cols-1 gap-3 md:grid-cols-12"
          >
            {/* Search Input */}
            <div className="relative md:col-span-6">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                id="search"
                name="search"
                type="text"
                defaultValue={searchTerm}
                placeholder="Cari Plat / Pelanggan / HP / Model..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Status Dropdown */}
            <div className="md:col-span-4">
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
              >
                <option value="">
                  Semua Status
                </option>

                <option value="inspection">
                  Inspection
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="qc">
                  QC
                </option>

                <option value="ready">
                  Ready
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            {/* Submit & Reset Buttons */}
            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Cari
              </button>

              {hasFilterActive && (
                <Link
                  href="/work-orders"
                  className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600 transition hover:bg-gray-200"
                  title="Reset Filter"
                >
                  <RotateCcw size={16} />
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* LIST */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Daftar Work Order
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Work order terbaru ditampilkan paling atas.
              </p>
            </div>

            {hasFilterActive && (
              <span className="text-xs font-semibold text-blue-600">
                Filter aktif ({rows.length} hasil)
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <ClipboardList
                  size={27}
                  className="text-gray-400"
                />
              </div>

              <h3 className="mt-4 font-bold text-gray-900">
                {hasFilterActive
                  ? "Tidak ada work order yang cocok"
                  : "Belum ada work order"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                {hasFilterActive
                  ? "Silakan coba kata kunci lain atau reset filter pencarian."
                  : "Work order akan muncul setelah booking di-check-in."}
              </p>

              {hasFilterActive && (
                <Link
                  href="/work-orders"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <RotateCcw size={14} />
                  Reset Filter
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map((row) => (
                <Link
                  key={row.id}
                  href={`/work-orders/${row.id}`}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
                >
                  <div className="p-5">
                    {/* STATUS + DATE */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Dibuat
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <Clock3
                            size={17}
                            className="text-gray-400"
                          />

                          <span className="text-sm font-bold text-gray-900">
                            {formatDate(
                              row.createdAt,
                            )}
                          </span>
                        </div>
                      </div>

                      <StatusBadge
                        status={row.status}
                      />
                    </div>

                    {/* CUSTOMER + VEHICLE */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 p-3.5">
                        <div className="flex items-start gap-3">
                          <UserRound
                            size={19}
                            className="mt-0.5 shrink-0 text-gray-400"
                          />

                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">
                              Customer
                            </p>

                            <p className="truncate text-sm font-bold text-gray-900">
                              {row.customer}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {row.phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3.5">
                        <div className="flex items-start gap-3">
                          <Car
                            size={19}
                            className="mt-0.5 shrink-0 text-gray-400"
                          />

                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">
                              Kendaraan
                            </p>

                            <p className="truncate text-sm font-bold text-gray-900">
                              {row.brand}{" "}
                              {row.model}
                            </p>

                            <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">
                              {row.plate}
                              {row.color
                                ? ` · ${row.color}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TOTAL */}
                    {!isTechnician && (
                      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Nilai Work Order
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-900">
                          Rp{" "}
                          {row.total.toLocaleString(
                            "id-ID",
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FOOTER */}
                  <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    <span className="text-sm font-semibold text-gray-700">
                      Buka Work Order
                    </span>

                    <span className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-gray-900">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function StatusBadge({
  status,
}: {
  status:
    | "inspection"
    | "in_progress"
    | "qc"
    | "ready"
    | "completed"
    | "cancelled";
}) {
  const styles = {
    inspection: "bg-amber-50 text-amber-700",
    in_progress: "bg-blue-50 text-blue-700",
    qc: "bg-purple-50 text-purple-700",
    ready: "bg-cyan-50 text-cyan-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${styles[status]}`}
    >
      {status === "completed" && (
        <BadgeCheck size={14} />
      )}

      {statusLabel[status] ?? status}
    </span>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}