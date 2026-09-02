import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  BadgeCheck,
  Camera,
  Car,
  CheckCircle2,
  Clock3,
  ImageIcon,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { getDb } from "@/db";
import {
  customers,
  inspections,
  jobPhotos,
  organizations,
  vehicles,
  workOrderItems,
  workOrders,
} from "@/db/schema";

interface PageProps {
  params: Promise<{ id: string }>;
}

const steps = [
  { key: "inspection", label: "Inspeksi", desc: "Pengecekan fisik kendaraan awal" },
  { key: "in_progress", label: "Pengerjaan", desc: "Treatment dan proses detailing" },
  { key: "qc", label: "Quality Control", desc: "Pemeriksaan detail hasil kerja" },
  { key: "ready", label: "Siap Diambil", desc: "Unit siap diserahkan kepada Anda" },
  { key: "completed", label: "Selesai", desc: "Pengerjaan selesai dan diserahkan" },
];

export default async function PublicTrackingPage({ params }: PageProps) {
  const { id } = await params;
  const db = getDb();

  // Gunakan LEFT JOIN agar jika ada relasi kosong tidak memicu 404
  const [row] = await db
    .select({
      id: workOrders.id,
      status: workOrders.status,
      createdAt: workOrders.createdAt,
      organizationName: organizations.name,
      customerName: customers.name,
      brand: vehicles.brand,
      model: vehicles.model,
      plate: vehicles.plateNumber,
      color: vehicles.color,
    })
    .from(workOrders)
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(vehicles, eq(workOrders.vehicleId, vehicles.id))
    .leftJoin(organizations, eq(workOrders.organizationId, organizations.id))
    .where(eq(workOrders.id, id))
    .limit(1);

  if (!row) {
    notFound();
  }

  // Ambil data checklist inspeksi
  const [inspection] = await db
    .select()
    .from(inspections)
    .where(eq(inspections.workOrderId, id))
    .limit(1);

  // Ambil daftar layanan
  const items = await db
    .select({
      id: workOrderItems.id,
      description: workOrderItems.description,
      quantity: workOrderItems.quantity,
    })
    .from(workOrderItems)
    .where(eq(workOrderItems.workOrderId, id));

  // Ambil foto dokumentasi
  const photos = await db
    .select({
      id: jobPhotos.id,
      type: jobPhotos.type,
    })
    .from(jobPhotos)
    .where(eq(jobPhotos.workOrderId, id));

  const beforePhotos = photos.filter((p) => p.type === "before");
  const afterPhotos = photos.filter((p) => p.type === "after");

  const currentStepIndex = steps.findIndex((s) => s.key === row.status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-500/30">
              DF
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Live Status Tracker
              </p>
              <h1 className="text-base font-bold text-white leading-tight">
                {row.organizationName || "Auto Detailing Studio"}
              </h1>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Update
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-6">
        {/* Vehicle Identity Card */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/60 p-6 shadow-xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400">Pelanggan</p>
              <p className="text-base font-bold text-white">{row.customerName || "-"}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {[row.brand, row.model].filter(Boolean).join(" ") || "Kendaraan Servis"}
              </h2>
            </div>
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 text-center">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Plat Nomor</p>
              <p className="font-mono text-sm font-black text-white">{row.plate || "-"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
            <span className="flex items-center gap-1.5">
              <Car size={14} className="text-slate-400" />
              Warna: {row.color || "-"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} className="text-slate-400" />
              Masuk: {row.createdAt ? formatDate(row.createdAt) : "-"}
            </span>
          </div>
        </section>

        {/* Live Timeline Tracker */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Progres Pengerjaan
            </h3>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {steps.map((step, idx) => {
              const isCurrent = row.status === step.key;
              const isPassed = currentStepIndex > idx;

              return (
                <div key={step.key} className="relative flex items-start gap-4">
                  <div
                    className={`absolute -left-6 sm:-left-8 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-4 ring-slate-950 transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110"
                        : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 size={14} /> : idx + 1}
                  </div>

                  <div>
                    <p
                      className={`text-sm font-bold ${
                        isCurrent
                          ? "text-blue-400 text-base"
                          : isPassed
                            ? "text-slate-200"
                            : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Treatment / Services */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Paket Perawatan
            </h3>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-950/40">
            {items.length === 0 ? (
              <p className="p-4 text-xs text-slate-400 text-center">
                Belum ada rincian paket terlampir.
              </p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 text-sm">
                  <span className="font-semibold text-slate-200">{item.description}</span>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Visual Inspection Summary */}
        {inspection && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Hasil Inspeksi Masuk
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              <InspectionItem label="Body Luar" checked={inspection.bodyChecked} />
              <InspectionItem label="Velg & Ban" checked={inspection.wheelsChecked} />
              <InspectionItem label="Kaca Mobil" checked={inspection.glassChecked} />
              <InspectionItem label="Interior" checked={inspection.interiorChecked} />
            </div>

            {inspection.notes && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-[11px] font-bold uppercase text-slate-400">Catatan Teknisi:</p>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {inspection.notes}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Photo Gallery: Before & After */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Dokumentasi Foto
            </h3>
          </div>

          <div className="space-y-4">
            <PhotoGroup title="Foto Sebelum (Before)" photos={beforePhotos} />
            <PhotoGroup title="Foto Sesudah (After)" photos={afterPhotos} />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-900">
          <p>Terima kasih atas kepercayaan Anda pada {row.organizationName || "kami"}.</p>
          <p className="mt-1 text-[11px] text-slate-500">Powered by DetailFlow Auto Studio</p>
        </footer>
      </main>
    </div>
  );
}

function PhotoGroup({
  title,
  photos,
}: {
  title: string;
  photos: { id: string }[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-300">{title}</p>
        <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
          {photos.length} foto
        </span>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-slate-800 text-slate-400">
          <ImageIcon size={22} className="mb-1 text-slate-400" />
          <span className="text-xs">Foto belum diunggah</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm"
            >
              <Image
                src={`/api/photos/${photo.id}`}
                alt="Dokumentasi Pekerjaan"
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover transition-transform duration-300 hover:scale-105"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InspectionItem({ label, checked }: { label: string; checked: boolean | null }) {
  return (
    <div
      className={`rounded-2xl border p-3 flex flex-col items-center justify-center gap-1.5 ${
        checked
          ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
          : "border-slate-800 bg-slate-950/40 text-slate-400"
      }`}
    >
      <BadgeCheck size={18} className={checked ? "text-blue-400" : "text-slate-400"} />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}