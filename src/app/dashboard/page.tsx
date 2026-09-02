import Link from "next/link";
import {
  and,
  desc,
  eq,
  gte,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Download,
  Plus,
  ReceiptText,
  TrendingUp,
  UserRound,
  Wallet,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import {
  bookings,
  customers,
  invoices,
  payments,
  vehicles,
  workOrders,
} from "@/db/schema";
import { formatRupiah } from "@/lib/utils";
import { requireWorkspace } from "@/lib/workspace";

const statusLabel: Record<string, string> = {
  inspection: "Inspection",
  in_progress: "In Progress",
  qc: "QC",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function Dashboard() {
  const workspace = await requireWorkspace();
  const db = getDb();

  const isTechnician = workspace.role === "technician";
  const now = new Date();

  // Range Hari Ini
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Range Bulan Ini
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Queries Paralel
  const [
    bookingCountRow,
    activeJobsRow,
    readyJobsRow,
    monthlyRevenueRow,
    totalRevenueRow,
    unpaidRow,
    paymentBreakdownRows,
    jobs,
  ] = await Promise.all([
    // 1. Booking Hari Ini
    db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, workspace.organizationId),
          gte(bookings.scheduledAt, startOfDay),
          lt(bookings.scheduledAt, endOfDay)
        )
      ),

    // 2. Pekerjaan Aktif
    db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.organizationId, workspace.organizationId),
          ne(workOrders.status, "completed"),
          ne(workOrders.status, "cancelled")
        )
      ),

    // 3. Unit Ready Siap Diambil
    db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.organizationId, workspace.organizationId),
          eq(workOrders.status, "ready")
        )
      ),

    // 4. Omzet Bulan Ini (Owner/Admin Saja)
    !isTechnician
      ? db
          .select({
            total: sql<number>`coalesce(sum(${invoices.paidAmount}), 0)`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.organizationId, workspace.organizationId),
              gte(invoices.createdAt, startOfMonth),
              lt(invoices.createdAt, endOfMonth),
              ne(invoices.status, "cancelled")
            )
          )
      : Promise.resolve([{ total: 0 }]),

    // 5. Total Pendapatan Tercatat (Owner/Admin Saja)
    !isTechnician
      ? db
          .select({
            total: sql<number>`coalesce(sum(${invoices.paidAmount}), 0)`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.organizationId, workspace.organizationId),
              ne(invoices.status, "cancelled")
            )
          )
      : Promise.resolve([{ total: 0 }]),

    // 6. Total Belum Lunas (Owner/Admin Saja)
    !isTechnician
      ? db
          .select({
            total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.paidAmount}), 0)`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.organizationId, workspace.organizationId),
              ne(invoices.status, "paid"),
              ne(invoices.status, "cancelled")
            )
          )
      : Promise.resolve([{ total: 0 }]),

    // 7. Breakdown Metode Pembayaran (Owner/Admin Saja)
    !isTechnician
      ? db
          .select({
            method: payments.method,
            totalAmount: sql<number>`coalesce(sum(${payments.amount}), 0)`,
            totalCount: sql<number>`count(*)`,
          })
          .from(payments)
          .where(eq(payments.organizationId, workspace.organizationId))
          .groupBy(payments.method)
      : Promise.resolve([]),

    // 8. Work Order Terbaru
    db
      .select({
        id: workOrders.id,
        createdAt: workOrders.createdAt,
        status: workOrders.status,
        customer: customers.name,
        brand: vehicles.brand,
        model: vehicles.model,
        plate: vehicles.plateNumber,
        color: vehicles.color,
      })
      .from(workOrders)
      .innerJoin(
        customers,
        eq(workOrders.customerId, customers.id)
      )
      .innerJoin(
        vehicles,
        eq(workOrders.vehicleId, vehicles.id)
      )
      .where(
        and(
          eq(workOrders.organizationId, workspace.organizationId),
          ne(workOrders.status, "cancelled")
        )
      )
      .orderBy(desc(workOrders.createdAt))
      .limit(6),
  ]);

  const bookingCount = Number(bookingCountRow[0]?.count ?? 0);
  const activeJobs = Number(activeJobsRow[0]?.count ?? 0);
  const readyJobs = Number(readyJobsRow[0]?.count ?? 0);
  const monthlyRevenue = Number(monthlyRevenueRow[0]?.total ?? 0);
  const totalRevenue = Number(totalRevenueRow[0]?.total ?? 0);
  const unpaid = Number(unpaidRow[0]?.total ?? 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
              {workspace.organizationName}
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {isTechnician
                ? "Ringkasan antrean dan aktivitas pengerjaan unit."
                : "Ringkasan performa operasional dan kesehatan finansial studio."}
            </p>
          </div>

          {!isTechnician && (
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="/api/reports/sales/export"
                download
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
              >
                <Download size={15} />
                Export CSV / Excel
              </a>

              <Link
                href="/bookings/new"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-xs font-bold !text-white shadow-sm transition hover:bg-gray-800 active:scale-95"
              >
                <Plus size={15} className="text-white" />
                <span className="!text-white font-bold">Booking Baru</span>
              </Link>
            </div>
          )}
        </div>

        {/* SUMMARY CARDS */}
        {isTechnician ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <DashboardCard
              label="Booking Hari Ini"
              value={String(bookingCount)}
              icon={<CalendarDays size={20} />}
            />
            <DashboardCard
              label="Pekerjaan Aktif"
              value={String(activeJobs)}
              icon={<Wrench size={20} />}
              href="/work-orders"
            />
            <DashboardCard
              label="Siap Diambil (Ready)"
              value={String(readyJobs)}
              icon={<BadgeCheck size={20} />}
              href="/work-orders?status=ready"
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              label="Omzet Bulan Ini"
              value={formatRupiah(monthlyRevenue)}
              icon={<TrendingUp size={20} />}
              highlight
            />
            <DashboardCard
              label="Total Kas Masuk"
              value={formatRupiah(totalRevenue)}
              icon={<CircleDollarSign size={20} />}
            />
            <DashboardCard
              label="Piutang Belum Lunas"
              value={formatRupiah(unpaid)}
              icon={<ReceiptText size={20} />}
            />
            <DashboardCard
              label="Pekerjaan Aktif"
              value={`${activeJobs} Unit`}
              icon={<ClipboardList size={20} />}
              href="/work-orders"
            />
          </div>
        )}

        {/* METODE PEMBAYARAN & REKAP KAS */}
        {!isTechnician && (
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={19} className="text-gray-700" />
                <h2 className="text-base font-bold text-gray-900">
                  Arus Kas Masuk Berdasarkan Metode
                </h2>
              </div>

              <a
                href="/api/reports/sales/export"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                Unduh Rekap Laporan →
              </a>
            </div>

            {paymentBreakdownRows.length === 0 ? (
              <p className="text-xs text-gray-500 py-3">Belum ada transaksi pembayaran yang tercatat.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {paymentBreakdownRows.map((row) => (
                  <div
                    key={row.method}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        {row.method}
                      </p>
                      <p className="mt-1 text-base font-black text-gray-900">
                        {formatRupiah(Number(row.totalAmount || 0))}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-500 ring-1 ring-gray-200">
                      {row.totalCount} trx
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* QUICK ACTIONS */}
        {!isTechnician && (
          <section>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-gray-900">Akses Cepat</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Akses instan ke modul operasional utama studio.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <QuickAction
                href="/bookings/new"
                icon={<CalendarDays size={19} />}
                title="Booking Baru"
                description="Jadwalkan unit pelanggan."
              />
              <QuickAction
                href="/work-orders"
                icon={<ClipboardList size={19} />}
                title="Work Orders"
                description="Status & pengerjaan teknisi."
              />
              <QuickAction
                href="/vehicles"
                icon={<CarFront size={19} />}
                title="Kendaraan"
                description="Database registrasi kendaraan."
              />
            </div>
          </section>
        )}

        {/* RECENT WORK ORDERS */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Work Order Terbaru
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Aktivitas kendaraan paling akhir di studio.
              </p>
            </div>

            <Link
              href="/work-orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 transition hover:text-gray-900"
            >
              Lihat semua <ArrowRight size={14} />
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <ClipboardList size={26} className="text-gray-400" />
              </div>
              <h3 className="mt-4 font-bold text-gray-900">
                Belum ada Work Order
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                Work order akan muncul otomatis saat booking di-check-in ke studio.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/work-orders/${job.id}`}
                  className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <UserRound
                            size={16}
                            className="shrink-0 text-gray-400"
                          />
                          <p className="truncate font-bold text-gray-900">
                            {job.customer}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <CarFront
                            size={16}
                            className="shrink-0 text-gray-400"
                          />
                          <p className="truncate text-sm text-gray-600">
                            {job.brand} {job.model} · {job.plate}
                            {job.color ? ` · ${job.color}` : ""}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={job.status} />
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5">
                      <Clock3 size={15} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500">
                        {formatDate(job.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3.5">
                    <span className="text-xs font-bold text-gray-700">
                      Buka Detail
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

function DashboardCard({
  label,
  value,
  icon,
  href,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`h-full rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${
        highlight
          ? "border-blue-200 bg-gradient-to-br from-blue-50/50 to-white"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-black tracking-tight text-gray-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            highlight
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 transition group-hover:bg-gray-900 group-hover:text-white">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-bold text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </Link>
  );
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
    inspection: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    qc: "bg-purple-50 text-purple-700 border-purple-200",
    ready: "bg-cyan-50 text-cyan-700 border-cyan-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}