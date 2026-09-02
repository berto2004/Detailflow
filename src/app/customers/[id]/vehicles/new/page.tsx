import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { requireRole } from "@/lib/permissions";
import { createVehicle } from "../../../actions";

export default async function NewVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await requireRole(["owner", "admin"]);
  const result = await getDb().select({ name: customers.name }).from(customers).where(and(eq(customers.id, id), eq(customers.organizationId, workspace.organizationId))).limit(1);
  if (!result[0]) notFound();
  const action = createVehicle.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Link href={`/customers/${id}`} className="text-sm text-gray-500 hover:text-gray-900">← {result[0].name}</Link>
        <h1 className="mt-3 text-2xl font-bold">Tambah Kendaraan</h1>
        <p className="mt-1 text-sm text-gray-500">Kendaraan akan tersimpan di profil customer.</p>
        <form action={action} className="mt-6 grid gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2">
          <Field label="Plat Nomor *" name="plateNumber" placeholder="B 1234 ABC" />
          <Field label="Merek *" name="brand" placeholder="Toyota" />
          <Field label="Model *" name="model" placeholder="Fortuner" />
          <Field label="Tahun" name="year" type="number" placeholder="2024" />
          <Field label="Warna" name="color" placeholder="Hitam" />
          <label className="block text-sm font-medium sm:col-span-2">Catatan<textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" placeholder="Kondisi atau informasi kendaraan..." /></label>
          <div className="flex justify-end gap-3 pt-2 sm:col-span-2"><Link href={`/customers/${id}`} className="rounded-lg border px-4 py-2 text-sm font-semibold">Batal</Link><button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Simpan Kendaraan</button></div>
        </form>
      </div>
    </AppShell>
  );
}

function Field({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder?: string; type?: string }) {
  return <label className="block text-sm font-medium">{label}<input required={label.includes("*")} name={name} type={type} placeholder={placeholder} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" /></label>;
}
