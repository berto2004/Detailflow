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
import {
  and,
  count,
  desc,
  eq,
  gte,
  like,
  lt,
  or,
} from "drizzle-orm";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import {
  customers,
  subscriptions,
  vehicles,
  workOrders,
} from "@/db/schema";
import {
  getEntitlement,
  getOrganizationPlan,
} from "@/lib/entitlement";
import { requireWorkspace } from "@/lib/workspace";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

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

  const {
    search = "",
    status = "",
    page: pageParam = "1",
  } = await searchParams;

  const searchTerm = search.trim();

  /*
   * Pagination
   *
   * Pastikan page selalu angka positif.
   */
  const parsedPage = Number.parseInt(
    pageParam,
    10,
  );

  const currentPage =
    Number.isFinite(parsedPage) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const offset =
    (currentPage - 1) * PAGE_SIZE;

  const isTechnician =
    workspace.role === "technician";

  /*
   * SaaS entitlement
   */
  const [plan, workOrderEntitlement] =
    await Promise.all([
      getOrganizationPlan(
        workspace.organizationId,
      ),
      getEntitlement(
        workspace.organizationId,
        "work_orders",
      ),
    ]);

  /*
   * Ambil subscription aktif organisasi.
   */
  const [subscription] = await db
    .select({
      status: subscriptions.status,
      startedAt: subscriptions.startedAt,
      currentPeriodStart:
        subscriptions.currentPeriodStart,
      currentPeriodEnd:
        subscriptions.currentPeriodEnd,
      trialEndsAt:
        subscriptions.trialEndsAt,
    })
    .from(subscriptions)
    .where(
      eq(
        subscriptions.organizationId,
        workspace.organizationId,
      ),
    )
    .orderBy(
      desc(subscriptions.startedAt),
    )
    .limit(1);

  /*
   * Hitung Work Order usage pada periode billing.
   *
   * Ini TIDAK menggunakan pagination.
   * Usage harus tetap menghitung seluruh WO
   * dalam periode subscription.
   */
  let workOrderUsage = 0;

  if (subscription?.currentPeriodStart) {
    const usageConditions = [
      eq(
        workOrders.organizationId,
        workspace.organizationId,
      ),
      gte(
        workOrders.createdAt,
        subscription.currentPeriodStart,
      ),
    ];

    if (subscription.currentPeriodEnd) {
      usageConditions.push(
        lt(
          workOrders.createdAt,
          subscription.currentPeriodEnd,
        ),
      );
    }

    const [usageResult] = await db
      .select({
        count: count(),
      })
      .from(workOrders)
      .where(
        and(...usageConditions),
      );

    workOrderUsage =
      usageResult?.count ?? 0;
  } else {
    /*
     * Fallback untuk subscription lama/test.
     */
    const [usageResult] = await db
      .select({
        count: count(),
      })
      .from(workOrders)
      .where(
        eq(
          workOrders.organizationId,
          workspace.organizationId,
        ),
      );

    workOrderUsage =
      usageResult?.count ?? 0;
  }

  const workOrderLimit =
    workOrderEntitlement?.unlimited ||
    workOrderEntitlement?.limitValue === null
      ? null
      : workOrderEntitlement?.limitValue ??
        null;

  const workOrderEnabled =
    workOrderEntitlement?.enabled ?? false;

  const workOrderLimitReached =
    workOrderLimit !== null &&
    workOrderUsage >= workOrderLimit;

  /*
   * Kondisi dasar query Work Order.
   */
  const conditions = [
    eq(
      workOrders.organizationId,
      workspace.organizationId,
    ),
  ];

  /*
   * Filter status.
   */
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
    validStatuses.includes(
      status as AllowedStatus,
    )
  ) {
    conditions.push(
      eq(
        workOrders.status,
        status as AllowedStatus,
      ),
    );
  }

  /*
   * Filter search.
   */
  if (searchTerm) {
    const term = `%${searchTerm}%`;

    conditions.push(
      or(
        like(workOrders.id, term),
        like(customers.name, term),
        like(customers.phone, term),
        like(
          vehicles.plateNumber,
          term,
        ),
        like(vehicles.brand, term),
        like(vehicles.model, term),
      )!,
    );
  }

  /*
   * =========================================================
   * TOTAL FILTERED
   * =========================================================
   *
   * Query ini hanya menghitung jumlah data.
   *
   * Tidak menggunakan LIMIT/OFFSET karena kita perlu
   * mengetahui jumlah total hasil filter untuk pagination.
   */
  const [totalResult] = await db
    .select({
      count: count(),
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
    .where(and(...conditions));

  const totalFiltered =
    totalResult?.count ?? 0;

  /*
   * =========================================================
   * SUMMARY COUNTS
   * =========================================================
   *
   * Tetap dihitung dari seluruh hasil filter,
   * bukan hanya data pada halaman saat ini.
   */
  const [activeResult] = await db
    .select({
      count: count(),
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
    .where(
      and(
        ...conditions,
        /*
         * Active = semua status kecuali
         * completed dan cancelled.
         */
        or(
          eq(
            workOrders.status,
            "inspection",
          ),
          eq(
            workOrders.status,
            "in_progress",
          ),
          eq(
            workOrders.status,
            "qc",
          ),
          eq(
            workOrders.status,
            "ready",
          ),
        )!,
      ),
    );

  const [readyResult] = await db
    .select({
      count: count(),
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
    .where(
      and(
        ...conditions,
        eq(
          workOrders.status,
          "ready",
        ),
      ),
    );

  const [completedResult] =
    await db
      .select({
        count: count(),
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
      .where(
        and(
          ...conditions,
          eq(
            workOrders.status,
            "completed",
          ),
        ),
      );

  const activeCount =
    activeResult?.count ?? 0;

  const readyCount =
    readyResult?.count ?? 0;

  const completedCount =
    completedResult?.count ?? 0;

  /*
   * =========================================================
   * PAGINATED WORK ORDERS
   * =========================================================
   *
   * Inilah query utama yang sekarang hanya mengambil
   * 20 data per halaman.
   */
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
    .orderBy(
      desc(workOrders.createdAt),
    )
    .limit(PAGE_SIZE)
    .offset(offset);

  /*
   * Total halaman.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(
      totalFiltered / PAGE_SIZE,
    ),
  );

  /*
   * Jika user mengetik page yang terlalu tinggi,
   * kita tidak perlu membuat tombol aneh.
   */
  const safeCurrentPage =
    currentPage > totalPages
      ? totalPages
      : currentPage;

  const safeOffset =
    (safeCurrentPage - 1) *
    PAGE_SIZE;

  /*
   * Range data yang sedang ditampilkan.
   */
  const showingFrom =
    totalFiltered === 0
      ? 0
      : safeOffset + 1;

  const showingTo =
    Math.min(
      safeOffset + rows.length,
      totalFiltered,
    );

  const hasFilterActive = Boolean(
    searchTerm ||
      (status && status !== "ALL"),
  );

  /*
   * Helper URL pagination.
   */
  function pageHref(
    targetPage: number,
  ) {
    const params =
      new URLSearchParams();

    if (searchTerm) {
      params.set(
        "search",
        searchTerm,
      );
    }

    if (
      status &&
      validStatuses.includes(
        status as AllowedStatus,
      )
    ) {
      params.set(
        "status",
        status,
      );
    }

    params.set(
      "page",
      String(targetPage),
    );

    return `/work-orders?${params.toString()}`;
  }

  /*
   * Nomor halaman yang ditampilkan.
   *
   * Contoh:
   * 1 2 3 ... 10
   * atau
   * 1 ... 4 5 6 ... 10
   */
  const pageNumbers =
    getPageNumbers(
      safeCurrentPage,
      totalPages,
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
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
                Kendaraan yang sedang atau sudah
                dikerjakan.
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
                  {plan?.planName ??
                    "Tidak ada paket"}
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
            label="Total Hasil"
            value={String(
              totalFiltered,
            )}
          />

          <SummaryCard
            label="Aktif"
            value={String(
              activeCount,
            )}
          />

          <SummaryCard
            label="Ready"
            value={String(
              readyCount,
            )}
          />

          <SummaryCard
            label="Completed"
            value={String(
              completedCount,
            )}
          />
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <form
            method="GET"
            className="grid grid-cols-1 gap-3 md:grid-cols-12"
          >
            {/* SEARCH */}
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

            {/* STATUS */}
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

            {/* BUTTON */}
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
                Filter aktif (
                {totalFiltered} hasil)
              </span>
            )}
          </div>

          {/* EMPTY STATE */}
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
            <>
              {/* TABLE */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] border-collapse text-left">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                          Dibuat
                        </th>

                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                          Customer
                        </th>

                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                          Kendaraan
                        </th>

                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                          Status
                        </th>

                        {!isTechnician && (
                          <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-gray-400">
                            Nilai
                          </th>
                        )}

                        <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-gray-400">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className="group transition hover:bg-gray-50"
                        >
                          {/* DIBUAT */}
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Clock3
                                size={16}
                                className="shrink-0 text-gray-400"
                              />

                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatDate(
                                    row.createdAt,
                                  )}
                                </p>

                                <p className="mt-0.5 max-w-[170px] truncate text-[11px] text-gray-400">
                                  {row.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* CUSTOMER */}
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2.5">
                              <UserRound
                                size={17}
                                className="mt-0.5 shrink-0 text-gray-400"
                              />

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-900">
                                  {row.customer}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-500">
                                  {row.phone}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* KENDARAAN */}
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2.5">
                              <Car
                                size={17}
                                className="mt-0.5 shrink-0 text-gray-400"
                              />

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-900">
                                  {row.brand}{" "}
                                  {row.model}
                                </p>

                                <p className="mt-0.5 text-xs font-semibold text-gray-500">
                                  {row.plate}
                                  {row.color
                                    ? ` · ${row.color}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                row.status
                              }
                            />
                          </td>

                          {/* NILAI */}
                          {!isTechnician && (
                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <span className="text-sm font-bold text-gray-900">
                                Rp{" "}
                                {row.total.toLocaleString(
                                  "id-ID",
                                )}
                              </span>
                            </td>
                          )}

                          {/* AKSI */}
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/work-orders/${row.id}`}
                              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                            >
                              Buka

                              <span className="ml-1.5 transition group-hover:translate-x-0.5">
                                →
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TABLE FOOTER */}
                <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-gray-500">
                    Menampilkan{" "}
                    <span className="font-bold text-gray-700">
                      {showingFrom}
                    </span>
                    {" - "}
                    <span className="font-bold text-gray-700">
                      {showingTo}
                    </span>
                    {" dari "}
                    <span className="font-bold text-gray-700">
                      {totalFiltered}
                    </span>{" "}
                    Work Order
                  </p>

                  {/* PAGINATION */}
                  <div className="flex items-center gap-1.5">
                    {/* PREVIOUS */}
                    {safeCurrentPage >
                    1 ? (
                      <Link
                        href={pageHref(
                          safeCurrentPage -
                            1,
                        )}
                        className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                      >
                        ← Sebelumnya
                      </Link>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-300">
                        ← Sebelumnya
                      </span>
                    )}

                    {/* PAGE NUMBERS */}
                    <div className="hidden items-center gap-1 sm:flex">
                      {pageNumbers.map(
                        (pageNumber, index) =>
                          pageNumber ===
                          "ellipsis" ? (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-2 text-xs text-gray-400"
                            >
                              ...
                            </span>
                          ) : pageNumber ===
                            safeCurrentPage ? (
                            <span
                              key={pageNumber}
                              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-gray-900 px-2.5 text-xs font-bold text-white"
                            >
                              {pageNumber}
                            </span>
                          ) : (
                            <Link
                              key={pageNumber}
                              href={pageHref(
                                pageNumber,
                              )}
                              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                            >
                              {pageNumber}
                            </Link>
                          ),
                      )}
                    </div>

                    {/* MOBILE PAGE */}
                    <span className="px-2 text-xs font-semibold text-gray-500 sm:hidden">
                      {safeCurrentPage} /{" "}
                      {totalPages}
                    </span>

                    {/* NEXT */}
                    {safeCurrentPage <
                    totalPages ? (
                      <Link
                        href={pageHref(
                          safeCurrentPage +
                            1,
                        )}
                        className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                      >
                        Berikutnya →
                      </Link>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-300">
                        Berikutnya →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    },
  ).format(date);
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
    inspection:
      "bg-amber-50 text-amber-700",
    in_progress:
      "bg-blue-50 text-blue-700",
    qc:
      "bg-purple-50 text-purple-700",
    ready:
      "bg-cyan-50 text-cyan-700",
    completed:
      "bg-green-50 text-green-700",
    cancelled:
      "bg-red-50 text-red-700",
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

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      totalPages,
    ];
  }

  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}