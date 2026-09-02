"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  and,
  eq,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  bookings,
  customers,
  services,
  vehicles,
} from "@/db/schema";
import { createId } from "@/lib/ids";
import { requireRole } from "@/lib/permissions";

export async function createBooking(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const db = getDb();

  const customerId = String(
    formData.get("customerId") ?? "",
  ).trim();

  const vehicleId = String(
    formData.get("vehicleId") ?? "",
  ).trim();

  const serviceId = String(
    formData.get("serviceId") ?? "",
  ).trim();

  const scheduled = String(
    formData.get("scheduledAt") ?? "",
  ).trim();

  const notes = String(
    formData.get("notes") ?? "",
  ).trim();

  if (
    !customerId ||
    !vehicleId ||
    !serviceId ||
    !scheduled
  ) {
    throw new Error(
      "Data booking belum lengkap.",
    );
  }

  const [customer] = await db
    .select({
      id: customers.id,
    })
    .from(customers)
    .where(
      and(
        eq(
          customers.id,
          customerId,
        ),
        eq(
          customers.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  const [vehicle] = await db
    .select({
      id: vehicles.id,
      customerId:
        vehicles.customerId,
    })
    .from(vehicles)
    .where(
      and(
        eq(
          vehicles.id,
          vehicleId,
        ),
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  const [service] = await db
    .select({
      id: services.id,
    })
    .from(services)
    .where(
      and(
        eq(
          services.id,
          serviceId,
        ),
        eq(
          services.organizationId,
          workspace.organizationId,
        ),
        eq(
          services.active,
          true,
        ),
      ),
    )
    .limit(1);

  if (!customer) {
    throw new Error(
      "Customer tidak ditemukan.",
    );
  }

  if (!vehicle) {
    throw new Error(
      "Kendaraan tidak ditemukan.",
    );
  }

  if (
    vehicle.customerId !== customerId
  ) {
    throw new Error(
      "Kendaraan bukan milik customer yang dipilih.",
    );
  }

  if (!service) {
    throw new Error(
      "Layanan tidak valid atau tidak aktif.",
    );
  }

  const scheduledAt =
    new Date(scheduled);

  if (
    Number.isNaN(
      scheduledAt.getTime(),
    )
  ) {
    throw new Error(
      "Tanggal booking tidak valid.",
    );
  }

  const now = new Date();

  await db
    .insert(bookings)
    .values({
      id: createId("bkg"),

      organizationId:
        workspace.organizationId,

      customerId,
      vehicleId,
      serviceId,
      scheduledAt,

      status: "booked",

      notes:
        notes || null,

      createdAt: now,
      updatedAt: now,
    });

  revalidatePath("/bookings");
  revalidatePath("/dashboard");

  redirect("/bookings");
}