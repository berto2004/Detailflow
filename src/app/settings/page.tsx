import Link from "next/link";
import { eq } from "drizzle-orm";
import { Building2, KeyRound, MessageSquare, Receipt, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { requireRole } from "@/lib/permissions";

import {
  changeOwnerPassword,
  updateOrganization,
} from "./actions";
import { OwnerPasswordFields } from "./owner-password-fields";

export default async function SettingsPage() {
  const workspace = await requireRole(["owner"]);
  const db = getDb();

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, workspace.organizationId))
    .limit(1);

  if (!organization) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Organization tidak ditemukan.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Pengaturan Studio
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola profil bisnis, template notifikasi, branding invoice, dan akun Anda.
          </p>
        </div>

        {/* PROFIL & BRANDING STUDIO */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Profil & Branding Studio
              </h2>
              <p className="text-xs text-gray-500">
                Informasi ini akan tercetak otomatis pada Invoice A4, Struk Thermal, dan pesan pelanggan.
              </p>
            </div>
          </div>

          <form action={updateOrganization} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-gray-700">
                  Nama Studio / Bengkel
                </label>
                <input
                  name="name"
                  defaultValue={organization.name}
                  required
                  placeholder="Contoh: AutoShine Studio"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">
                  No. WhatsApp Resmi Bengkel
                </label>
                <input
                  name="phone"
                  defaultValue={organization.phone ?? ""}
                  placeholder="Contoh: 081234567890"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">
                Alamat Fisik Studio
              </label>
              <textarea
                name="address"
                rows={2}
                defaultValue={organization.address ?? ""}
                placeholder="Jl. Raya Utama No. 123, Jakarta Selatan"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <Receipt size={14} className="text-gray-400" />
                Catatan Kaki Invoice & Struk (Footer Note)
              </label>
              <textarea
                name="invoiceFooterNote"
                rows={2}
                defaultValue={organization.invoiceFooterNote ?? ""}
                placeholder="Contoh: Garansi coating berlaku 1 tahun. Wajib cuci berkala di studio resmi kami."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <MessageSquare size={14} className="text-gray-400" />
                Template Salam Notifikasi WhatsApp
              </label>
              <input
                name="customMessage"
                defaultValue={organization.customMessage ?? ""}
                placeholder="Contoh: Terima kasih telah mempercayakan perawatan kendaraan Anda di bengkel kami."
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-gray-700">Slug Studio</label>
                <input
                  value={organization.slug}
                  disabled
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Status Langganan</label>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700 ring-1 ring-emerald-200">
                    <ShieldCheck size={14} /> {organization.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold !text-white shadow-sm transition hover:bg-gray-800 active:scale-95 sm:w-auto"
              >
                Simpan Profil Studio
              </button>
            </div>
          </form>
        </section>

        {/* MANAGEMENT SHORTCUTS */}
        <section>
          <h2 className="mb-3 text-base font-bold text-gray-900">
            Manajemen Internal
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/services"
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <h3 className="font-bold text-gray-900">Katalog Layanan</h3>
              <p className="mt-1 text-xs text-gray-500">
                Atur paket servis, kategori, tarif dasar, dan durasi pengerjaan.
              </p>
              <span className="mt-3 inline-block text-xs font-bold text-gray-900">
                Buka Katalog →
              </span>
            </Link>

            <Link
              href="/settings/users"
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Users size={17} className="text-gray-700" />
                <h3 className="font-bold text-gray-900">Staf & Role Akses</h3>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Kelola hak akses untuk Owner, Admin Kasir, dan Teknisi.
              </p>
              <span className="mt-3 inline-block text-xs font-bold text-gray-900">
                Kelola Pengguna →
              </span>
            </Link>
          </div>
        </section>

        {/* AKUN OWNER & PASSWORD */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={19} className="text-gray-700" />
            <h2 className="text-base font-bold text-gray-900">
              Keamanan Akun Owner
            </h2>
          </div>

          <form action={changeOwnerPassword} className="space-y-4">
            <OwnerPasswordFields />

            <button
              type="submit"
              className="w-full rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold !text-white transition hover:bg-gray-800 active:scale-95 sm:w-auto"
            >
              Ubah Password
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10";