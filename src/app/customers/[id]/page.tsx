import Link from "next/link";
import {
  and,
  desc,
  eq,
} from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Car,
  ClipboardList,
  Mail,
  Phone,
  Plus,
  ReceiptText,
  UserRound,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import {
  bookings,
  customers,
  invoices,
  services,
  vehicles,
  workOrders,
} from "@/db/schema";
import { requireRole } from "@/lib/permissions";
import { formatRupiah } from "@/lib/utils";

const bookingStatusLabel: Record<string, string> = {
  booked: "Booked",
  checked_in: "Checked-in",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const workOrderStatusLabel: Record<string, string> = {
  inspection: "Inspection",
  in_progress: "In Progress",
  qc: "QC",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const db = getDb();

  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, id),
        eq(
          customers.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!customer) {
    notFound();
  }

  const [
    customerVehicles,
    customerBookings,
    customerWorkOrders,
  ] = await Promise.all([
    db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(
            vehicles.customerId,
            id,
          ),
          eq(
            vehicles.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .orderBy(
        desc(vehicles.createdAt),
      ),

    db
      .select({
        id: bookings.id,
        scheduledAt:
          bookings.scheduledAt,
        status:
          bookings.status,

        brand:
          vehicles.brand,
        model:
          vehicles.model,
        plate:
          vehicles.plateNumber,

        service:
          services.name,
      })
      .from(bookings)
      .innerJoin(
        vehicles,
        and(
          eq(
            bookings.vehicleId,
            vehicles.id,
          ),
          eq(
            vehicles.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .leftJoin(
        services,
        and(
          eq(
            bookings.serviceId,
            services.id,
          ),
          eq(
            services.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .where(
        and(
          eq(
            bookings.customerId,
            id,
          ),
          eq(
            bookings.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .orderBy(
        desc(
          bookings.scheduledAt,
        ),
      )
      .limit(6),

    db
      .select({
        id:
          workOrders.id,
        createdAt:
          workOrders.createdAt,
        status:
          workOrders.status,
        total:
          workOrders.total,

        brand:
          vehicles.brand,
        model:
          vehicles.model,
        plate:
          vehicles.plateNumber,

        invoiceStatus:
          invoices.status,
        paidAmount:
          invoices.paidAmount,
      })
      .from(workOrders)
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
      .leftJoin(
        invoices,
        and(
          eq(
            invoices.workOrderId,
            workOrders.id,
          ),
          eq(
            invoices.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .where(
        and(
          eq(
            workOrders.customerId,
            id,
          ),
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .orderBy(
        desc(
          workOrders.createdAt,
        ),
      ),
  ]);

  const completedVisits =
    customerWorkOrders.filter(
      (workOrder) =>
        workOrder.status ===
        "completed",
    ).length;

  const activeJobs =
    customerWorkOrders.filter(
      (workOrder) =>
        workOrder.status !==
          "completed" &&
        workOrder.status !==
          "cancelled",
    ).length;

  const totalPaid =
    customerWorkOrders.reduce(
      (total, workOrder) =>
        total +
        Number(
          workOrder.paidAmount ??
            0,
        ),
      0,
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* BACK */}
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
        >
          ← Customers
        </Link>

        {/* CUSTOMER HEADER */}
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-xl font-black text-white">
                {customer.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
                  Customer
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                  {customer.name}
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/customers/${customer.id}/vehicles/new`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                <Car size={17} />
                Tambah Kendaraan
              </Link>

              <Link
                href="/bookings/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold !text-white transition hover:bg-gray-800"
              >
                <Plus size={17} />
                Booking Baru
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-gray-100 p-5 sm:grid-cols-2 md:p-6">
            <ContactCard
              icon={<Phone size={18} />}
              label="WhatsApp / Telepon"
              value={
                customer.phone ||
                "-"
              }
            />

            <ContactCard
              icon={<Mail size={18} />}
              label="Email"
              value={
                customer.email ||
                "-"
              }
            />
          </div>

          {customer.notes && (
            <div className="border-t border-gray-100 px-5 py-4 md:px-6">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Catatan Customer
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {customer.notes}
              </p>
            </div>
          )}
        </section>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Kendaraan"
            value={String(
              customerVehicles.length,
            )}
            icon={<Car size={19} />}
          />

          <SummaryCard
            label="Kunjungan Selesai"
            value={String(
              completedVisits,
            )}
            icon={
              <ClipboardList
                size={19}
              />
            }
          />

          <SummaryCard
            label="Pekerjaan Aktif"
            value={String(
              activeJobs,
            )}
            icon={<Wrench size={19} />}
          />

          <SummaryCard
            label="Total Dibayar"
            value={formatRupiah(
              totalPaid,
            )}
            icon={
              <ReceiptText
                size={19}
              />
            }
          />
        </div>

        {/* VEHICLES */}
        <section>
          <SectionHeader
            eyebrow="Customer Garage"
            title="Kendaraan"
            description={`${customerVehicles.length} kendaraan terdaftar.`}
          />

          {customerVehicles.length ===
          0 ? (
            <EmptyState
              icon={<Car size={27} />}
              title="Belum ada kendaraan"
              description="Tambahkan kendaraan customer untuk mulai membuat booking dan Work Order."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customerVehicles.map(
                (vehicle) => (
                  <article
                    key={
                      vehicle.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                          <Car
                            size={20}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-gray-900">
                            {
                              vehicle.brand
                            }{" "}
                            {
                              vehicle.model
                            }
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {vehicle.year ??
                              "Tahun -"}
                            {" · "}
                            {vehicle.color ??
                              "Warna -"}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-bold text-white">
                        {
                          vehicle.plateNumber
                        }
                      </span>
                    </div>

                    {vehicle.notes && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-3">
                        <p className="text-xs leading-5 text-gray-500">
                          {
                            vehicle.notes
                          }
                        </p>
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        {/* BOOKINGS */}
        <section>
          <SectionHeader
            eyebrow="Schedule"
            title="Booking Terbaru"
            description="Jadwal terbaru customer."
          />

          {customerBookings.length ===
          0 ? (
            <EmptyState
              icon={
                <CalendarDays
                  size={27}
                />
              }
              title="Belum ada booking"
              description="Booking customer akan tampil di sini."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {customerBookings.map(
                (
                  booking,
                  index,
                ) => (
                  <div
                    key={
                      booking.id
                    }
                    className={`p-4 sm:p-5 ${
                      index !==
                      customerBookings.length -
                        1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {
                            booking.brand
                          }{" "}
                          {
                            booking.model
                          }{" "}
                          ·{" "}
                          {
                            booking.plate
                          }
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {booking.service ??
                            "Layanan -"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(
                            booking.scheduledAt,
                          )}
                        </p>
                      </div>

                      <BookingStatusBadge
                        status={
                          booking.status
                        }
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* WORK ORDER HISTORY */}
        <section>
          <SectionHeader
            eyebrow="History"
            title="Riwayat Work Order"
            description={`${customerWorkOrders.length} Work Order tercatat.`}
          />

          {customerWorkOrders.length ===
          0 ? (
            <EmptyState
              icon={
                <ClipboardList
                  size={27}
                />
              }
              title="Belum ada Work Order"
              description="Riwayat pekerjaan customer akan tampil setelah booking di-check-in."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {customerWorkOrders.map(
                (workOrder) => (
                  <Link
                    key={
                      workOrder.id
                    }
                    href={`/work-orders/${workOrder.id}`}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">
                            {
                              workOrder.brand
                            }{" "}
                            {
                              workOrder.model
                            }
                          </p>

                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            {
                              workOrder.plate
                            }
                          </p>
                        </div>

                        <WorkOrderStatusBadge
                          status={
                            workOrder.status
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoBox
                          label="Tanggal"
                          value={formatDate(
                            workOrder.createdAt,
                          )}
                        />

                        <InfoBox
                          label="Nilai WO"
                          value={formatRupiah(
                            workOrder.total,
                          )}
                        />
                      </div>

                      {workOrder.invoiceStatus && (
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
                          <span className="text-xs font-semibold text-gray-500">
                            Invoice
                          </span>

                          <span className="text-xs font-bold uppercase text-gray-700">
                            {
                              workOrder.invoiceStatus
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                      <span className="text-sm font-semibold text-gray-700">
                        Buka Work Order
                      </span>

                      <span className="text-gray-400 transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function ContactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
      <div className="text-gray-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400">
          {label}
        </p>

        <p className="mt-1 break-all text-sm font-bold text-gray-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </p>

          <p className="mt-2 break-words text-xl font-black text-gray-900">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-bold text-gray-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-gray-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-gray-800">
        {value}
      </p>
    </div>
  );
}

function BookingStatusBadge({
  status,
}: {
  status:
    | "booked"
    | "checked_in"
    | "cancelled"
    | "no_show";
}) {
  const styles = {
    booked:
      "bg-blue-50 text-blue-700",
    checked_in:
      "bg-green-50 text-green-700",
    cancelled:
      "bg-red-50 text-red-700",
    no_show:
      "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${styles[status]}`}
    >
      {bookingStatusLabel[status] ??
        status}
    </span>
  );
}

function WorkOrderStatusBadge({
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
      className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${styles[status]}`}
    >
      {workOrderStatusLabel[
        status
      ] ?? status}
    </span>
  );
}

function formatDate(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    },
  ).format(date);
}