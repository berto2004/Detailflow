"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { customers, vehicles } from "@/db/schema";
import { createId } from "@/lib/ids";
import { requireRole } from "@/lib/permissions";

function textValue(
  formData: FormData,
  key: string,
) {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

export async function createCustomer(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const name = textValue(
    formData,
    "name",
  );

  const phone = textValue(
    formData,
    "phone",
  );

  const email = textValue(
    formData,
    "email",
  );

  const notes = textValue(
    formData,
    "notes",
  );

  if (!name || !phone) {
    throw new Error(
      "Nama dan WhatsApp wajib diisi.",
    );
  }

  const customerId = createId("cus");
  const now = new Date();

  await getDb()
    .insert(customers)
    .values({
      id: customerId,
      organizationId:
        workspace.organizationId,
      name,
      phone,
      email: email || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    });

  revalidatePath("/customers");

  redirect(
    `/customers/${customerId}`,
  );
}

export async function createVehicle(
  customerId: string,
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

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

  const plateNumber = textValue(
    formData,
    "plateNumber",
  ).toUpperCase();

  const brand = textValue(
    formData,
    "brand",
  );

  const model = textValue(
    formData,
    "model",
  );

  const yearText = textValue(
    formData,
    "year",
  );

  const color = textValue(
    formData,
    "color",
  );

  const notes = textValue(
    formData,
    "notes",
  );

  if (
    !plateNumber ||
    !brand ||
    !model
  ) {
    throw new Error(
      "Plat nomor, merek, dan model wajib diisi.",
    );
  }

  const year = yearText
    ? Number(yearText)
    : null;

  if (
    year !== null &&
    (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2100
    )
  ) {
    throw new Error(
      "Tahun kendaraan tidak valid.",
    );
  }

  const now = new Date();

  await db
    .insert(vehicles)
    .values({
      id: createId("veh"),
      organizationId:
        workspace.organizationId,
      customerId,
      plateNumber,
      brand,
      model,
      year,
      color: color || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    });

  revalidatePath("/customers");
  revalidatePath(
    `/customers/${customerId}`,
  );

  redirect(
    `/customers/${customerId}`,
  );
}