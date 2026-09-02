import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  CalendarPlus,
  Car,
  UserRound,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BookingForm } from "@/components/booking-form";
import { getDb } from "@/db";
import {
  customers,
  services,
  vehicles,
} from "@/db/schema";
import { requireRole } from "@/lib/permissions";
import { formatRupiah } from "@/lib/utils";

import { createBooking } from "../actions";

export default async function NewBookingPage() {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const db = getDb();

  const [
    customerRows,
    vehicleRows,
    serviceRows,
  ] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
      })
      .from(customers)
      .where(
        eq(
          customers.organizationId,
          workspace.organizationId,
        ),
      ),

    db
      .select({
        id: vehicles.id,
        customerId: vehicles.customerId,
        brand: vehicles.brand,
        model: vehicles.model,
        plateNumber: vehicles.plateNumber,
      })
      .from(vehicles)
      .where(
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
      ),

    db
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
      })
      .from(services)
      .where(
        eq(
          services.organizationId,
          workspace.organizationId,
        ),
      ),
  ]);

  const missingCustomers =
    customerRows.length === 0;

  const missingVehicles =
    vehicleRows.length === 0;

  const missingServices =
    serviceRows.length === 0;

  const dataReady =
    !missingCustomers &&
    !missingVehicles &&
    !missingServices;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/bookings"
            className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            ← Kembali ke Booking
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <CalendarPlus size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Booking Baru
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                Jadwalkan kendaraan customer masuk ke studio.
              </p>
            </div>
          </div>
        </div>

        {/* DATA CHECK */}
        {!dataReady ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:p-6">
            <h2 className="font-bold text-amber-900">
              Data belum siap
            </h2>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Booking membutuhkan customer, kendaraan,
              dan layanan.
            </p>

            <div className="mt-5 space-y-3">
              <DataStatus
                icon={
                  <UserRound size={18} />
                }
                label="Customer"
                available={!missingCustomers}
              />

              <DataStatus
                icon={<Car size={18} />}
                label="Kendaraan"
                available={!missingVehicles}
              />

              <DataStatus
                icon={<Wrench size={18} />}
                label="Layanan"
                available={!missingServices}
              />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {missingCustomers && (
                <Link
                  href="/customers"
                  className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-gray-800 ring-1 ring-gray-200"
                >
                  Buka Customers
                </Link>
              )}

              {missingVehicles && (
                <Link
                  href="/vehicles"
                  className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-gray-800 ring-1 ring-gray-200"
                >
                  Buka Kendaraan
                </Link>
              )}

              {missingServices && (
                <Link
                  href="/services"
                  className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-gray-800 ring-1 ring-gray-200"
                >
                  Buka Layanan
                </Link>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <BookingForm
              action={createBooking}
              customers={customerRows}
              vehicles={vehicleRows.map(
                (vehicle) => ({
                  id: vehicle.id,
                  customerId:
                    vehicle.customerId,
                  label: `${vehicle.brand} ${vehicle.model} · ${vehicle.plateNumber}`,
                }),
              )}
              services={serviceRows.map(
                (service) => ({
                  id: service.id,
                  label: `${service.name} · ${formatRupiah(service.price)}`,
                }),
              )}
            />
          </section>
        )}
      </div>
    </AppShell>
  );
}

function DataStatus({
  icon,
  label,
  available,
}: {
  icon: React.ReactNode;
  label: string;
  available: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-amber-100">
      <div className="flex items-center gap-3 text-gray-700">
        <span className="text-gray-400">
          {icon}
        </span>

        <span className="text-sm font-semibold">
          {label}
        </span>
      </div>

      <span
        className={
          available
            ? "text-sm font-bold text-green-700"
            : "text-sm font-bold text-red-600"
        }
      >
        {available
          ? "✓ Tersedia"
          : "✕ Belum ada"}
      </span>
    </div>
  );
}