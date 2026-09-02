import Link from "next/link";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Plus,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import {
  bookings,
  customers,
  services,
  vehicles,
} from "@/db/schema";
import { requireRole } from "@/lib/permissions";
import { createWorkOrderFromBooking } from "@/app/work-orders/actions";

export default async function BookingsPage() {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const db = getDb();

  const rows = await db
    .select({
      id: bookings.id,
      scheduledAt: bookings.scheduledAt,
      status: bookings.status,
      notes: bookings.notes,

      customer: customers.name,
      phone: customers.phone,

      brand: vehicles.brand,
      model: vehicles.model,
      plate: vehicles.plateNumber,
      color: vehicles.color,

      service: services.name,
    })
    .from(bookings)
    .innerJoin(
      customers,
      and(
        eq(
          bookings.customerId,
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
      eq(
        bookings.organizationId,
        workspace.organizationId,
      ),
    )
    .orderBy(
      desc(bookings.scheduledAt),
    );

  const bookedCount = rows.filter(
    (row) => row.status === "booked",
  ).length;

  const checkedInCount = rows.filter(
    (row) => row.status === "checked_in",
  ).length;

  const cancelledCount = rows.filter(
    (row) =>
      row.status === "cancelled" ||
      row.status === "no_show",
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <CalendarDays size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bookings
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                Jadwal kendaraan yang akan masuk ke studio.
              </p>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            label="Total Booking"
            value={String(rows.length)}
          />

          <SummaryCard
            label="Menunggu"
            value={String(bookedCount)}
          />

          <SummaryCard
            label="Check-in"
            value={String(checkedInCount)}
          />

          <SummaryCard
            label="Batal / No Show"
            value={String(cancelledCount)}
          />
        </div>

        {/* BOOKING LIST */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Daftar Booking
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Booking terbaru ditampilkan paling atas.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <CalendarDays
                  size={27}
                  className="text-gray-400"
                />
              </div>

              <h3 className="mt-4 font-bold text-gray-900">
                Belum ada booking
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                Buat booking pertama untuk menjadwalkan kendaraan customer.
              </p>

              <Link
                href="/bookings/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold !text-white"
              >
                <Plus size={16} />
                Booking Baru
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
                >
                  <div className="p-5">
                    {/* DATE + STATUS */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Jadwal
                        </p>

                        <div className="mt-1 flex items-center gap-2 text-gray-900">
                          <Clock3
                            size={17}
                            className="text-gray-400"
                          />

                          <span className="font-bold">
                            {formatBookingDate(
                              row.scheduledAt,
                            )}
                          </span>
                        </div>
                      </div>

                      <StatusBadge
                        status={row.status}
                      />
                    </div>

                    {/* CUSTOMER */}
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

                      {/* VEHICLE */}
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

                    {/* SERVICE */}
                    <div className="mt-3 flex items-start gap-3 rounded-xl border border-gray-100 p-3.5">
                      <Wrench
                        size={18}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />

                      <div>
                        <p className="text-xs text-gray-400">
                          Layanan
                        </p>

                        <p className="text-sm font-semibold text-gray-800">
                          {row.service ??
                            "Layanan belum ditentukan"}
                        </p>
                      </div>
                    </div>

                    {/* NOTES */}
                    {row.notes && (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          Catatan
                        </p>

                        <p className="mt-1 text-sm leading-6 text-amber-900">
                          {row.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ACTION */}
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    {row.status === "booked" ? (
                      <form
                        action={
                          createWorkOrderFromBooking
                        }
                      >
                        <input
                          type="hidden"
                          name="bookingId"
                          value={row.id}
                        />

                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold !text-white transition hover:bg-gray-800"
                        >
                          <CheckCircle2
                            size={17}
                          />
                          Check-in & Buat Work Order
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                        <CheckCircle2
                          size={16}
                        />

                        {row.status ===
                        "checked_in"
                          ? "Booking sudah diproses ke Work Order"
                          : "Booking tidak dapat diproses"}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatBookingDate(
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

function StatusBadge({
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

  const labels = {
    booked: "Booked",
    checked_in: "Checked-in",
    cancelled: "Cancelled",
    no_show: "No Show",
  };

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${styles[status]}`}
    >
      {labels[status]}
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