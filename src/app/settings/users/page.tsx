import { and, eq } from "drizzle-orm";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import {
  authUsers,
  members,
} from "@/db/schema";
import { requireRole } from "@/lib/permissions";

import {
  createStaff,
  resetStaffPassword,
  updateMemberRole,
  updateStaffEmail,
} from "./actions";
import { StaffPasswordField } from "./staff-password-field";

export default async function UsersSettingsPage() {
  const workspace = await requireRole([
    "owner",
  ]);

  const db = getDb();

  const rows = await db
    .select({
      memberId: members.id,
      userId: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: members.role,
      active: members.active,
    })
    .from(members)
    .innerJoin(
      authUsers,
      eq(
        members.authUserId,
        authUsers.id,
      ),
    )
    .where(
      and(
        eq(
          members.organizationId,
          workspace.organizationId,
        ),
        eq(members.active, true),
      ),
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Users & Role
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Kelola user yang memiliki akses ke studio.
          </p>
        </div>

        {/* TAMBAH STAFF */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="font-bold text-gray-900">
            Tambah Staff
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Buat akun login untuk admin atau technician.
          </p>

          <form
            action={createStaff}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <input
              name="name"
              required
              placeholder="Nama staff"
              className="rounded-xl border border-gray-300 px-3.5 py-3 outline-none focus:border-gray-900"
            />

            <input
              name="email"
              type="email"
              required
              placeholder="staff@email.com"
              className="rounded-xl border border-gray-300 px-3.5 py-3 outline-none focus:border-gray-900"
            />

            <StaffPasswordField
              name="password"
              placeholder="Password minimal 8 karakter"
            />

            <select
              name="role"
              defaultValue="technician"
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-3 outline-none focus:border-gray-900"
            >
              <option value="technician">
                Technician
              </option>

              <option value="admin">
                Admin
              </option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-3 font-semibold !text-white transition hover:bg-gray-800 md:col-span-2"
            >
              + Tambah Staff
            </button>
          </form>
        </section>

        {/* SUMMARY */}
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard
            label="Total User"
            value={String(rows.length)}
          />

          <InfoCard
            label="Owner"
            value={String(
              rows.filter(
                (user) =>
                  user.role === "owner",
              ).length,
            )}
          />

          <InfoCard
            label="Staff"
            value={String(
              rows.filter(
                (user) =>
                  user.role !== "owner",
              ).length,
            )}
          />
        </div>

        {/* USER LIST */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Belum ada user.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((user) => {
              const isCurrentUser =
                user.userId ===
                workspace.session.user.id;

              const isOwner =
                user.role === "owner";

              return (
                <article
                  key={user.memberId}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  {/* USER HEADER */}
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-gray-900">
                          {user.name}
                        </h2>

                        <RoleBadge
                          role={user.role}
                        />

                        {isCurrentUser && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Kamu
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {user.email}
                      </p>

                      <p className="mt-2 text-xs font-medium text-green-700">
                        ● Aktif
                      </p>
                    </div>

                    {/* UBAH ROLE */}
                    {!isCurrentUser &&
                      !isOwner && (
                        <form
                          action={
                            updateMemberRole
                          }
                          className="flex w-full gap-2 md:w-auto"
                        >
                          <input
                            type="hidden"
                            name="memberId"
                            value={
                              user.memberId
                            }
                          />

                          <select
                            name="role"
                            defaultValue={
                              user.role
                            }
                            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 md:w-40"
                          >
                            <option value="admin">
                              Admin
                            </option>

                            <option value="technician">
                              Technician
                            </option>
                          </select>

                          <button
                            type="submit"
                            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold !text-white"
                          >
                            Simpan
                          </button>
                        </form>
                      )}
                  </div>

                  {!isCurrentUser &&
                    !isOwner && (
                      <>
                        {/* EDIT EMAIL */}
                        <div className="mt-5 border-t border-gray-100 pt-5">
                          <h3 className="text-sm font-bold text-gray-900">
                            Edit Email Login
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Setelah email diubah, staff harus login ulang
                            menggunakan email baru.
                          </p>

                          <form
                            action={
                              updateStaffEmail
                            }
                            className="mt-3 flex flex-col gap-3 sm:flex-row"
                          >
                            <input
                              type="hidden"
                              name="memberId"
                              value={
                                user.memberId
                              }
                            />

                            <input
                              name="newEmail"
                              type="email"
                              required
                              defaultValue={
                                user.email
                              }
                              placeholder="Email baru"
                              className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
                            />

                            <button
                              type="submit"
                              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                              Simpan Email
                            </button>
                          </form>
                        </div>

                        {/* RESET PASSWORD */}
                        <div className="mt-5 border-t border-gray-100 pt-5">
                          <h3 className="text-sm font-bold text-gray-900">
                            Reset Password
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Buat password baru untuk staff. Setelah reset,
                            session staff akan dikeluarkan.
                          </p>

                          <form
                            action={
                              resetStaffPassword
                            }
                            className="mt-3 flex flex-col gap-3 sm:flex-row"
                          >
                            <input
                              type="hidden"
                              name="memberId"
                              value={
                                user.memberId
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <StaffPasswordField
                                name="newPassword"
                                placeholder="Password baru minimal 8 karakter"
                              />
                            </div>

                            <button
                              type="submit"
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Reset Password
                            </button>
                          </form>
                        </div>
                      </>
                    )}

                  {isCurrentUser && (
                    <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
                      Email dan password owner tidak diubah dari menu staff.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function RoleBadge({
  role,
}: {
  role:
    | "owner"
    | "admin"
    | "technician";
}) {
  const style =
    role === "owner"
      ? "bg-purple-50 text-purple-700"
      : role === "admin"
        ? "bg-blue-50 text-blue-700"
        : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {role}
    </span>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}