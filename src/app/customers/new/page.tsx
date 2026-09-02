import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/workspace";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  await requireWorkspace();
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Link href="/customers" className="text-sm text-gray-500 hover:text-gray-900">← Kembali</Link>
        <h1 className="mt-3 text-2xl font-bold">Tambah Customer</h1>
        <p className="mt-1 text-sm text-gray-500">Simpan data dasar customer terlebih dahulu.</p>

        <form action={createCustomer} className="mt-6 space-y-4 df-card p-6">
          <Field label="Nama *" name="name" placeholder="Budi Santoso" />
          <Field label="WhatsApp *" name="phone" placeholder="081234567890" />
          <Field label="Email" name="email" type="email" placeholder="budi@email.com" />
          <label className="block text-sm font-medium">Catatan<textarea name="notes" rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" placeholder="Catatan customer..." /></label>
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/customers" className="df-btn-secondary">Batal</Link>
            <button className="df-btn-primary">Simpan Customer</button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Field({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder?: string; type?: string }) {
  return <label className="block text-sm font-medium">{label}<input required={label.includes("*")} name={name} type={type} placeholder={placeholder} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" /></label>;
}
