"use client";
import { useMemo, useState } from "react";

type Customer = { id: string; name: string };
type Vehicle = { id: string; customerId: string; label: string };
type Service = { id: string; label: string };

export function BookingForm({ customers, vehicles, services, action }: {customers: Customer[]; vehicles: Vehicle[]; services: Service[]; action: (formData: FormData) => void | Promise<void>}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const filtered = useMemo(() => vehicles.filter(v => v.customerId === customerId), [vehicles, customerId]);
  return <form action={action} className="mt-6 space-y-4 df-card p-6">
    <label className="block text-sm font-medium">Customer<select name="customerId" required value={customerId} onChange={e=>setCustomerId(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Pilih customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="block text-sm font-medium">Kendaraan<select key={customerId} name="vehicleId" required className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Pilih kendaraan</option>{filtered.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
    <label className="block text-sm font-medium">Layanan<select name="serviceId" required className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Pilih layanan</option>{services.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
    <label className="block text-sm font-medium">Tanggal & jam<input name="scheduledAt" required type="datetime-local" className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
    <label className="block text-sm font-medium">Catatan<textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Permintaan customer..."/></label>
    <button className="df-btn-primary w-full">Simpan Booking</button>
  </form>;
}
