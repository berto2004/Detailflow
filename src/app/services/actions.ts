"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  bookings,
  services,
  workOrderItems,
} from "@/db/schema";
import { createId } from "@/lib/ids";
import { requireRole } from "@/lib/permissions";

function refreshServices() {
  revalidatePath("/services");
  revalidatePath("/bookings/new");
  revalidatePath("/settings");
}

export async function createService(formData: FormData) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const category =
    String(
      formData.get("category") ?? "",
    ).trim() || "Detailing";

  const price = Number(
    formData.get("price") ?? 0,
  );

  const durationMinutes = Number(
    formData.get("durationMinutes") ?? 0,
  );

  if (
    !name ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new Error(
      "Data layanan belum lengkap.",
    );
  }

  const now = new Date();

  await getDb()
    .insert(services)
    .values({
      id: createId("svc"),
      organizationId:
        workspace.organizationId,
      name,
      category,
      price: Math.round(price),
      durationMinutes:
        Math.round(durationMinutes),
      active: true,
      createdAt: now,
      updatedAt: now,
    });

  refreshServices();
}

export async function updateService(formData: FormData) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const id = String(
    formData.get("id") ?? "",
  ).trim();

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const category =
    String(
      formData.get("category") ?? "",
    ).trim() || "Detailing";

  const price = Number(
    formData.get("price") ?? 0,
  );

  const durationMinutes = Number(
    formData.get("durationMinutes") ?? 0,
  );

  if (
    !id ||
    !name ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new Error(
      "Data layanan belum lengkap.",
    );
  }

  await getDb()
    .update(services)
    .set({
      name,
      category,
      price: Math.round(price),
      durationMinutes:
        Math.round(durationMinutes),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(services.id, id),
        eq(
          services.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  refreshServices();
}

export async function toggleService(formData: FormData) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const id = String(
    formData.get("id") ?? "",
  ).trim();

  if (!id) {
    throw new Error(
      "Layanan tidak ditemukan.",
    );
  }

  const db = getDb();

  const [service] = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, id),
        eq(
          services.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!service) {
    throw new Error(
      "Layanan tidak ditemukan.",
    );
  }

  await db
    .update(services)
    .set({
      active: !service.active,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(services.id, id),
        eq(
          services.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  refreshServices();
}

export async function deleteService(formData: FormData) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const id = String(
    formData.get("id") ?? "",
  ).trim();

  if (!id) {
    throw new Error(
      "Layanan tidak ditemukan.",
    );
  }

  const db = getDb();

  const bookingUsage = await db
    .select({
      id: bookings.id,
    })
    .from(bookings)
    .where(
      and(
        eq(
          bookings.organizationId,
          workspace.organizationId,
        ),
        eq(bookings.serviceId, id),
      ),
    )
    .limit(1);

  const workOrderUsage = await db
    .select({
      id: workOrderItems.id,
    })
    .from(workOrderItems)
    .where(
      and(
        eq(
          workOrderItems.organizationId,
          workspace.organizationId,
        ),
        eq(
          workOrderItems.serviceId,
          id,
        ),
      ),
    )
    .limit(1);

  if (
    bookingUsage.length > 0 ||
    workOrderUsage.length > 0
  ) {
    throw new Error(
      "Layanan sudah pernah digunakan. Nonaktifkan layanan daripada menghapusnya.",
    );
  }

  await db
    .delete(services)
    .where(
      and(
        eq(services.id, id),
        eq(
          services.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  refreshServices();
}