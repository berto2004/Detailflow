"use server";

import {
  and,
  eq,
  ne,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  bookings,
  customers,
  vehicles,
  workOrders,
} from "@/db/schema";
import { createId } from "@/lib/ids";
import { requireRole } from "@/lib/permissions";

function normalizePlate(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function optionalText(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();

  return result || null;
}

function optionalYear(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const year = Number(raw);

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2100
  ) {
    throw new Error(
      "Tahun kendaraan tidak valid.",
    );
  }

  return year;
}

export async function createVehicle(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const customerId = String(
    formData.get("customerId") ?? "",
  ).trim();

  const plateNumber = normalizePlate(
    String(
      formData.get("plateNumber") ?? "",
    ),
  );

  const brand = String(
    formData.get("brand") ?? "",
  ).trim();

  const model = String(
    formData.get("model") ?? "",
  ).trim();

  const year = optionalYear(
    formData.get("year"),
  );

  const color = optionalText(
    formData.get("color"),
  );

  const notes = optionalText(
    formData.get("notes"),
  );

  if (
    !customerId ||
    !plateNumber ||
    !brand ||
    !model
  ) {
    throw new Error(
      "Customer, plat nomor, brand, dan model wajib diisi.",
    );
  }

  const db = getDb();

  const [customer] = await db
    .select({
      id: customers.id,
    })
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(
          customers.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!customer) {
    throw new Error(
      "Customer tidak ditemukan.",
    );
  }

  const [existingVehicle] = await db
    .select({
      id: vehicles.id,
    })
    .from(vehicles)
    .where(
      and(
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
        eq(
          vehicles.plateNumber,
          plateNumber,
        ),
      ),
    )
    .limit(1);

  if (existingVehicle) {
    throw new Error(
      "Plat nomor sudah terdaftar.",
    );
  }

  const now = new Date();

  await db.insert(vehicles).values({
    id: createId("vehicle"),
    organizationId:
      workspace.organizationId,
    customerId,
    plateNumber,
    brand,
    model,
    year,
    color,
    notes,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/vehicles");
}

export async function updateVehicle(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const vehicleId = String(
    formData.get("vehicleId") ?? "",
  ).trim();

  const customerId = String(
    formData.get("customerId") ?? "",
  ).trim();

  const plateNumber = normalizePlate(
    String(
      formData.get("plateNumber") ?? "",
    ),
  );

  const brand = String(
    formData.get("brand") ?? "",
  ).trim();

  const model = String(
    formData.get("model") ?? "",
  ).trim();

  const year = optionalYear(
    formData.get("year"),
  );

  const color = optionalText(
    formData.get("color"),
  );

  const notes = optionalText(
    formData.get("notes"),
  );

  if (
    !vehicleId ||
    !customerId ||
    !plateNumber ||
    !brand ||
    !model
  ) {
    throw new Error(
      "Data kendaraan belum lengkap.",
    );
  }

  const db = getDb();

  const [vehicle] = await db
    .select({
      id: vehicles.id,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.id, vehicleId),
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!vehicle) {
    throw new Error(
      "Kendaraan tidak ditemukan.",
    );
  }

  const [customer] = await db
    .select({
      id: customers.id,
    })
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(
          customers.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!customer) {
    throw new Error(
      "Customer tidak ditemukan.",
    );
  }

  const [duplicatePlate] = await db
    .select({
      id: vehicles.id,
    })
    .from(vehicles)
    .where(
      and(
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
        eq(
          vehicles.plateNumber,
          plateNumber,
        ),
        ne(
          vehicles.id,
          vehicleId,
        ),
      ),
    )
    .limit(1);

  if (duplicatePlate) {
    throw new Error(
      "Plat nomor sudah digunakan kendaraan lain.",
    );
  }

  await db
    .update(vehicles)
    .set({
      customerId,
      plateNumber,
      brand,
      model,
      year,
      color,
      notes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(vehicles.id, vehicleId),
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  revalidatePath("/vehicles");
}

export async function deleteVehicle(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const vehicleId = String(
    formData.get("vehicleId") ?? "",
  ).trim();

  if (!vehicleId) {
    throw new Error(
      "Kendaraan tidak ditemukan.",
    );
  }

  const db = getDb();

  const [vehicle] = await db
    .select({
      id: vehicles.id,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.id, vehicleId),
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!vehicle) {
    throw new Error(
      "Kendaraan tidak ditemukan.",
    );
  }

  const [booking] = await db
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
        eq(
          bookings.vehicleId,
          vehicleId,
        ),
      ),
    )
    .limit(1);

  if (booking) {
    throw new Error(
      "Kendaraan tidak dapat dihapus karena sudah digunakan pada booking.",
    );
  }

  const [workOrder] = await db
    .select({
      id: workOrders.id,
    })
    .from(workOrders)
    .where(
      and(
        eq(
          workOrders.organizationId,
          workspace.organizationId,
        ),
        eq(
          workOrders.vehicleId,
          vehicleId,
        ),
      ),
    )
    .limit(1);

  if (workOrder) {
    throw new Error(
      "Kendaraan tidak dapat dihapus karena sudah digunakan pada work order.",
    );
  }

  await db
    .delete(vehicles)
    .where(
      and(
        eq(vehicles.id, vehicleId),
        eq(
          vehicles.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  revalidatePath("/vehicles");
}