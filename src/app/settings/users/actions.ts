"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { authUsers, members } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireRole } from "@/lib/permissions";

const allowedStaffRoles = [
  "admin",
  "technician",
] as const;

type StaffRole =
  (typeof allowedStaffRoles)[number];

export async function createStaff(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
  ]);

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const email = String(
    formData.get("email") ?? "",
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? "",
  );

  const role = String(
    formData.get("role") ?? "",
  ) as StaffRole;

  if (!name || !email || !password) {
    throw new Error(
      "Nama, email, dan password wajib diisi.",
    );
  }

  if (password.length < 8) {
    throw new Error(
      "Password minimal 8 karakter.",
    );
  }

  if (!allowedStaffRoles.includes(role)) {
    throw new Error(
      "Role staff tidak valid.",
    );
  }

  const db = getDb();

  const [existingUser] = await db
    .select({
      id: authUsers.id,
    })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);

  if (existingUser) {
    throw new Error(
      "Email sudah terdaftar. Gunakan email lain.",
    );
  }

  const auth = await getAuth();

  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!result?.user?.id) {
    throw new Error(
      "Gagal membuat akun staff.",
    );
  }

  const now = new Date();

  await db.insert(members).values({
    id: createId("member"),
    organizationId:
      workspace.organizationId,
    authUserId: result.user.id,
    role,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/settings/users");
}

export async function updateMemberRole(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
  ]);

  const memberId = String(
    formData.get("memberId") ?? "",
  ).trim();

  const role = String(
    formData.get("role") ?? "",
  ).trim() as StaffRole;

  if (!memberId) {
    throw new Error(
      "User tidak ditemukan.",
    );
  }

  if (!allowedStaffRoles.includes(role)) {
    throw new Error(
      "Role hanya dapat diubah menjadi Admin atau Technician.",
    );
  }

  const db = getDb();

  const [targetMember] = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.id, memberId),
        eq(
          members.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!targetMember) {
    throw new Error(
      "User tidak ditemukan.",
    );
  }

  if (
    targetMember.authUserId ===
    workspace.session.user.id
  ) {
    throw new Error(
      "Owner tidak dapat mengubah role dirinya sendiri.",
    );
  }

  if (targetMember.role === "owner") {
    throw new Error(
      "Role owner tidak dapat diubah dari halaman ini.",
    );
  }

  await db
    .update(members)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(members.id, memberId),
        eq(
          members.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  revalidatePath("/settings/users");
}

export async function updateStaffEmail(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
  ]);

  const memberId = String(
    formData.get("memberId") ?? "",
  ).trim();

  const newEmail = String(
    formData.get("newEmail") ?? "",
  )
    .trim()
    .toLowerCase();

  if (!memberId || !newEmail) {
    throw new Error(
      "Email baru wajib diisi.",
    );
  }

  if (!newEmail.includes("@")) {
    throw new Error(
      "Format email tidak valid.",
    );
  }

  const db = getDb();

  const [targetMember] = await db
    .select({
      authUserId: members.authUserId,
      role: members.role,
      active: members.active,
    })
    .from(members)
    .where(
      and(
        eq(members.id, memberId),
        eq(
          members.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!targetMember) {
    throw new Error(
      "Staff tidak ditemukan.",
    );
  }

  if (!targetMember.active) {
    throw new Error(
      "Akun staff tidak aktif.",
    );
  }

  if (
    targetMember.authUserId ===
    workspace.session.user.id
  ) {
    throw new Error(
      "Email owner tidak dapat diubah dari menu staff.",
    );
  }

  if (targetMember.role === "owner") {
    throw new Error(
      "Email owner tidak dapat diubah dari menu staff.",
    );
  }

  const [existingEmail] = await db
    .select({
      id: authUsers.id,
    })
    .from(authUsers)
    .where(eq(authUsers.email, newEmail))
    .limit(1);

  if (
    existingEmail &&
    existingEmail.id !==
      targetMember.authUserId
  ) {
    throw new Error(
      "Email sudah digunakan oleh akun lain.",
    );
  }

  const auth = await getAuth();
  const requestHeaders = await headers();

  await auth.api.adminUpdateUser({
    body: {
      userId: targetMember.authUserId,
      data: {
        email: newEmail,
      },
    },
    headers: requestHeaders,
  });

  await auth.api.revokeUserSessions({
    body: {
      userId: targetMember.authUserId,
    },
    headers: requestHeaders,
  });

  revalidatePath("/settings/users");
}

export async function resetStaffPassword(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
  ]);

  const memberId = String(
    formData.get("memberId") ?? "",
  ).trim();

  const newPassword = String(
    formData.get("newPassword") ?? "",
  );

  if (!memberId) {
    throw new Error(
      "User tidak ditemukan.",
    );
  }

  if (newPassword.length < 8) {
    throw new Error(
      "Password baru minimal 8 karakter.",
    );
  }

  const db = getDb();

  const [targetMember] = await db
    .select({
      memberId: members.id,
      authUserId: members.authUserId,
      role: members.role,
      active: members.active,
    })
    .from(members)
    .where(
      and(
        eq(members.id, memberId),
        eq(
          members.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!targetMember) {
    throw new Error(
      "Staff tidak ditemukan.",
    );
  }

  if (!targetMember.active) {
    throw new Error(
      "Akun staff tidak aktif.",
    );
  }

  if (
    targetMember.authUserId ===
    workspace.session.user.id
  ) {
    throw new Error(
      "Password owner tidak dapat direset dari menu staff.",
    );
  }

  if (targetMember.role === "owner") {
    throw new Error(
      "Password owner tidak dapat direset dari menu staff.",
    );
  }

  const auth = await getAuth();
  const requestHeaders = await headers();

  await auth.api.setUserPassword({
    body: {
      userId: targetMember.authUserId,
      newPassword,
    },
    headers: requestHeaders,
  });

  await auth.api.revokeUserSessions({
    body: {
      userId: targetMember.authUserId,
    },
    headers: requestHeaders,
  });

  revalidatePath("/settings/users");
}