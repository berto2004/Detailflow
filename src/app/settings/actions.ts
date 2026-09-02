"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { requireRole } from "@/lib/permissions";

export async function updateOrganization(formData: FormData) {
  const workspace = await requireRole(["owner"]);
  const db = getDb();

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const invoiceFooterNote = String(formData.get("invoiceFooterNote") || "").trim() || null;
  const customMessage = String(formData.get("customMessage") || "").trim() || null;

  if (!name) {
    throw new Error("Nama studio wajib diisi.");
  }

  await db
    .update(organizations)
    .set({
      name,
      phone,
      address,
      invoiceFooterNote,
      customMessage,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, workspace.organizationId));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
}

export async function changeOwnerPassword(formData: FormData) {
  await requireRole(["owner"]);

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error("Semua kolom password wajib diisi.");
  }

  if (newPassword.length < 8) {
    throw new Error("Password baru minimal 8 karakter.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Konfirmasi password tidak sama.");
  }

  if (currentPassword === newPassword) {
    throw new Error("Password baru harus berbeda dari password lama.");
  }

  const auth = await getAuth();

  await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
    headers: await headers(),
  });

  revalidatePath("/settings");
}