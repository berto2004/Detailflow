import Image from "next/image";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Car,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ImageIcon,
  MessageSquareShare,
  Phone,
  Printer,
  ReceiptText,
  UserRound,
  WalletCards,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db";
import {
  customers,
  inspections,
  invoices,
  jobPhotos,
  organizations,
  payments,
  vehicles,
  workOrderItems,
  workOrders,
} from "@/db/schema";
import { requireWorkspace } from "@/lib/workspace";

import {
  addPayment,
  createInvoice,
  saveInspection,
  updateWorkOrderStatus,
  uploadJobPhoto,
} from "../actions";

const statuses = [
  ["inspection", "Inspection"],
  ["in_progress", "In Progress"],
  ["qc", "QC"],
  ["ready", "Ready"],
  ["completed", "Selesai"],
] as const;

const statusNames: Record<string, string> = {
  inspection: "Inspection",
  in_progress: "In Progress",
  qc: "Quality Control",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

function rupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatWhatsAppNumber(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return `62${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("8")) {
    return `62${cleaned}`;
  }
  return cleaned;
}

function generateWhatsAppMessage({
  customer,
  brand,
  model,
  plate,
  status,
  total,
  orgName,
  customMessage,
  trackingId,
}: {
  customer: string;
  brand: string;
  model: string;
  plate: string;
  status: string;
  total: number;
  orgName: string;
  customMessage?: string | null;
  trackingId: string;
}) {
  let statusText = "sedang dalam pengerjaan";

  if (status === "inspection") {
    statusText = "telah masuk tahap *Inspeksi Awal*. Tim kami sedang memeriksa kondisi kendaraan.";
  } else if (status === "in_progress") {
    statusText = "sedang dalam proses *Pengerjaan / Treatment*.";
  } else if (status === "qc") {
    statusText = "telah memasuki tahap akhir (*Quality Control*) untuk pengecekan detail hasil pengerjaan.";
  } else if (status === "ready") {
    statusText = "sudah *SELESAI* dikerjakan dan siap diambil. ✨";
  } else if (status === "completed") {
    statusText = "telah selesai dan diserahkan. Terima kasih! 🙏";
  }

  const closingText =
    customMessage?.trim() ||
    `Terima kasih telah mempercayakan perawatan kendaraan Anda kepada *${orgName}*.`;

  const message = [
    `Halo Kak *${customer}*,`,
    ``,
    `Berikut update pengerjaan kendaraan Anda dari *${orgName}*:`,
    `🚗 *Kendaraan:* ${brand} ${model} (${plate})`,
    `📋 *Status:* ${statusText}`,
    `💰 *Total Biaya:* ${rupiah(total)}`,
    ``,
    `🔍 *Pantau Progres & Foto Kendaraan:*`,
    `https://detailflow.com/track/${trackingId}`,
    ``,
    closingText,
  ].join("\n");

  return encodeURIComponent(message);
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await requireWorkspace();
  const db = getDb();

  const isTechnician = workspace.role === "technician";

  const [row] = await db
    .select({
      id: workOrders.id,
      status: workOrders.status,
      subtotal: workOrders.subtotal,
      discount: workOrders.discount,
      total: workOrders.total,
      createdAt: workOrders.createdAt,

      customer: customers.name,
      phone: customers.phone,

      brand: vehicles.brand,
      model: vehicles.model,
      plate: vehicles.plateNumber,
      color: vehicles.color,

      organizationName: organizations.name,
      customMessage: organizations.customMessage,
    })
    .from(workOrders)
    .innerJoin(
      customers,
      eq(workOrders.customerId, customers.id)
    )
    .innerJoin(
      vehicles,
      eq(workOrders.vehicleId, vehicles.id)
    )
    .innerJoin(
      organizations,
      eq(workOrders.organizationId, organizations.id)
    )
    .where(
      and(
        eq(workOrders.id, id),
        eq(workOrders.organizationId, workspace.organizationId)
      )
    )
    .limit(1);

  if (!row) {
    notFound();
  }

  const items = await db
    .select({
      id: workOrderItems.id,
      description: workOrderItems.description,
      quantity: workOrderItems.quantity,
      lineTotal: workOrderItems.lineTotal,
    })
    .from(workOrderItems)
    .where(
      and(
        eq(workOrderItems.workOrderId, id),
        eq(workOrderItems.organizationId, workspace.organizationId)
      )
    );

  const [inspection] = await db
    .select()
    .from(inspections)
    .where(
      and(
        eq(inspections.workOrderId, id),
        eq(inspections.organizationId, workspace.organizationId)
      )
    )
    .limit(1);

  const photos = await db
    .select({
      id: jobPhotos.id,
      type: jobPhotos.type,
    })
    .from(jobPhotos)
    .where(
      and(
        eq(jobPhotos.workOrderId, id),
        eq(jobPhotos.organizationId, workspace.organizationId)
      )
    );

  const [invoice] = isTechnician
    ? [undefined]
    : await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.workOrderId, id),
            eq(invoices.organizationId, workspace.organizationId)
          )
        )
        .limit(1);

  const paymentRows =
    !isTechnician && invoice
      ? await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.invoiceId, invoice.id),
              eq(payments.organizationId, workspace.organizationId)
            )
          )
      : [];

  const remainingAmount = invoice
    ? Math.max(0, invoice.total - invoice.paidAmount)
    : 0;

  const currentStatusIndex = statuses.findIndex(
    ([value]) => value === row.status
  );

  const inspectionCount = [
    inspection?.bodyChecked,
    inspection?.wheelsChecked,
    inspection?.glassChecked,
    inspection?.interiorChecked,
  ].filter(Boolean).length;

  const beforePhotos = photos.filter((photo) => photo.type === "before");
  const afterPhotos = photos.filter((photo) => photo.type === "after");

  const waNumber = formatWhatsAppNumber(row.phone);
  const waEncodedMsg = generateWhatsAppMessage({
    customer: row.customer,
    brand: row.brand,
    model: row.model,
    plate: row.plate,
    status: row.status,
    total: row.total,
    orgName: row.organizationName,
    customMessage: row.customMessage,
    trackingId: row.id,
  });
  const waUrl = `https://wa.me/${waNumber}?text=${waEncodedMsg}`;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <header className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <Link
            href="/work-orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Work Orders
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white">
                <ClipboardCheck size={23} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
                  Work Order · {row.organizationName}
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                  {row.brand} {row.model}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                    {row.plate}
                  </span>

                  <span className="text-xs text-gray-400">
                    {formatDate(row.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {row.phone && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold !text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                >
                  <MessageSquareShare size={16} />
                  Kirim Update WA
                </a>
              )}

              <StatusBadge status={row.status} />
            </div>
          </div>

          <p className="mt-5 break-all border-t border-gray-100 pt-4 text-xs text-gray-400">
            ID: {row.id}
          </p>
        </header>

        {/* PROGRESS */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <SectionHeading
            eyebrow="Progress"
            title="Status Pekerjaan"
            description="Update proses kendaraan sesuai kondisi pekerjaan di studio."
          />

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {statuses.map(([value, label], index) => {
              const isCurrent = row.status === value;
              const isPassed = currentStatusIndex > index;

              return (
                <form key={value} action={updateWorkOrderStatus}>
                  <input type="hidden" name="workOrderId" value={row.id} />
                  <input type="hidden" name="status" value={value} />

                  <button
                    type="submit"
                    className={`flex min-h-20 w-full flex-col items-start justify-between rounded-2xl border p-3 text-left transition ${
                      isCurrent
                        ? "border-gray-900 bg-gray-900 !text-white shadow-sm"
                        : isPassed
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                        isCurrent
                          ? "bg-white text-gray-900"
                          : isPassed
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <span className="mt-2 text-xs font-bold sm:text-sm">
                      {label}
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
        </section>

        {/* CUSTOMER / VEHICLE */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <UserRound size={20} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Customer
                </p>

                <h2 className="font-bold text-gray-900">{row.customer}</h2>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Phone size={18} className="shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">WhatsApp / Telepon</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-800">
                    {row.phone}
                  </p>
                </div>
              </div>

              {row.phone && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <MessageSquareShare size={14} />
                  Chat Customer
                </a>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <Car size={20} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Kendaraan
                </p>

                <h2 className="font-bold text-gray-900">
                  {row.brand} {row.model}
                </h2>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="Nomor Polisi" value={row.plate} />
              <Info label="Warna" value={row.color || "-"} />
            </div>
          </div>
        </section>

        {/* INSPECTION */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeading
              eyebrow="Vehicle Check"
              title="Inspection Kendaraan"
              description="Catat kondisi kendaraan sebelum pekerjaan dimulai."
            />

            <span className="w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
              {inspectionCount}/4 dicek
            </span>
          </div>

          <form action={saveInspection} className="mt-5 space-y-4">
            <input type="hidden" name="workOrderId" value={row.id} />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["bodyChecked", "Body", inspection?.bodyChecked],
                ["wheelsChecked", "Velg & Ban", inspection?.wheelsChecked],
                ["glassChecked", "Kaca", inspection?.glassChecked],
                ["interiorChecked", "Interior", inspection?.interiorChecked],
              ].map(([name, label, checked]) => (
                <label
                  key={String(name)}
                  className="flex min-h-20 cursor-pointer flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300"
                >
                  <input
                    type="checkbox"
                    name={String(name)}
                    defaultChecked={Boolean(checked)}
                    className="h-5 w-5"
                  />

                  <span className="mt-3 text-sm font-bold text-gray-800">
                    {String(label)}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Catatan Inspection
              </label>

              <textarea
                name="notes"
                defaultValue={inspection?.notes ?? ""}
                placeholder="Contoh: baret pintu kanan, water spot kaca, jok kotor..."
                className="min-h-28 w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold !text-white transition hover:bg-gray-800 sm:w-auto"
            >
              Simpan Inspection
            </button>
          </form>
        </section>

        {/* PHOTOS */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <SectionHeading
            eyebrow="Documentation"
            title="Foto Before / After"
            description="Dokumentasikan kondisi kendaraan sebelum dan sesudah pengerjaan."
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <PhotoSection
              type="before"
              title="Before"
              photos={beforePhotos}
              workOrderId={row.id}
            />

            <PhotoSection
              type="after"
              title="After"
              photos={afterPhotos}
              workOrderId={row.id}
            />
          </div>
        </section>

        {/* TREATMENT */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <Wrench size={19} />
            </div>

            <SectionHeading
              eyebrow="Treatment"
              title="Layanan"
              description="Treatment yang tercatat pada Work Order."
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Belum ada layanan.
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-4 p-4 ${
                    index !== items.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {item.description}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  {!isTechnician && (
                    <p className="whitespace-nowrap text-sm font-bold text-gray-900">
                      {rupiah(item.lineTotal)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {!isTechnician && (
            <div className="mt-4 flex items-end justify-between rounded-2xl bg-gray-900 p-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Total Work Order
                </p>

                {row.discount > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    Discount: {rupiah(row.discount)}
                  </p>
                )}
              </div>

              <p className="text-xl font-black md:text-2xl">
                {rupiah(row.total)}
              </p>
            </div>
          )}
        </section>

        {/* FINANCE */}
        {!isTechnician && (
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <CircleDollarSign size={20} />
              </div>

              <SectionHeading
                eyebrow="Finance"
                title="Invoice & Payment"
                description="Kelola invoice dan pembayaran Work Order."
              />
            </div>

            {!invoice ? (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
                  <ReceiptText size={22} />
                </div>

                <h3 className="mt-4 font-bold text-gray-900">
                  Invoice belum dibuat
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-gray-500">
                  Buat invoice untuk mulai mencatat pembayaran customer.
                </p>

                <form action={createInvoice} className="mt-5">
                  <input type="hidden" name="workOrderId" value={row.id} />

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold !text-white sm:w-auto"
                  >
                    Buat Invoice
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {/* INVOICE HEADER */}
                <div className="rounded-2xl bg-gray-900 p-5 text-white">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Nomor Invoice
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {invoice.invoiceNumber}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <InvoiceStatusBadge status={invoice.status} />

                      <Link
                        href={`/invoices/${row.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold !text-gray-900 transition hover:bg-gray-100"
                      >
                        <Printer size={16} />
                        Cetak Invoice
                      </Link>
                    </div>
                  </div>
                </div>

                {/* MONEY */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <MoneyCard label="Total Invoice" value={invoice.total} />
                  <MoneyCard
                    label="Sudah Dibayar"
                    value={invoice.paidAmount}
                  />
                  <div className="col-span-2 md:col-span-1">
                    <MoneyCard
                      label="Sisa Tagihan"
                      value={remainingAmount}
                      highlight={remainingAmount > 0}
                    />
                  </div>
                </div>

                {/* PAYMENT FORM */}
                {invoice.status !== "paid" && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-start gap-3">
                      <WalletCards
                        size={20}
                        className="mt-0.5 shrink-0 text-gray-500"
                      />

                      <div>
                        <h3 className="font-bold text-gray-900">
                          Catat Pembayaran
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          Maksimal: {rupiah(remainingAmount)}
                        </p>
                      </div>
                    </div>

                    <form
                      action={addPayment}
                      className="mt-5 grid gap-4 md:grid-cols-2"
                    >
                      <input type="hidden" name="workOrderId" value={row.id} />
                      <input
                        type="hidden"
                        name="invoiceId"
                        value={invoice.id}
                      />

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Jumlah Bayar
                        </label>

                        <input
                          name="amount"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={remainingAmount}
                          required
                          placeholder="Contoh: 500000"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Metode Pembayaran
                        </label>

                        <select name="method" className={inputClass}>
                          <option value="cash">Cash</option>
                          <option value="transfer">Transfer</option>
                          <option value="qris">QRIS</option>
                          <option value="other">Lainnya</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Catatan
                        </label>

                        <input
                          name="notes"
                          placeholder="Opsional"
                          className={inputClass}
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-gray-900 px-5 py-3 font-bold !text-white md:col-span-2"
                      >
                        Simpan Pembayaran
                      </button>
                    </form>
                  </div>
                )}

                {/* PAID */}
                {invoice.status === "paid" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
                    <BadgeCheck
                      size={22}
                      className="shrink-0 text-green-700"
                    />

                    <div>
                      <p className="font-bold text-green-800">
                        Invoice sudah lunas
                      </p>

                      <p className="mt-1 text-sm text-green-700">
                        Seluruh pembayaran telah tercatat.
                      </p>
                    </div>
                  </div>
                )}

                {/* PAYMENT HISTORY */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Riwayat Pembayaran
                      </h3>

                      <p className="mt-1 text-xs text-gray-400">
                        Transaksi yang sudah dicatat.
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                      {paymentRows.length} transaksi
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                    {paymentRows.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        Belum ada pembayaran.
                      </div>
                    ) : (
                      paymentRows.map((payment, index) => (
                        <div
                          key={payment.id}
                          className={`flex items-center justify-between gap-4 p-4 ${
                            index !== paymentRows.length - 1
                              ? "border-b border-gray-100"
                              : ""
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {payment.method.toUpperCase()}
                            </p>

                            {payment.notes && (
                              <p className="mt-1 text-xs text-gray-400">
                                {payment.notes}
                              </p>
                            )}
                          </div>

                          <p className="whitespace-nowrap text-sm font-bold text-gray-900">
                            {rupiah(payment.amount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function PhotoSection({
  type,
  title,
  photos,
  workOrderId,
}: {
  type: "before" | "after";
  title: string;
  photos: {
    id: string;
    type: "inspection" | "before" | "after" | "damage";
  }[];
  workOrderId: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-gray-500" />
          <h3 className="font-bold text-gray-900">{title}</h3>
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-500 ring-1 ring-gray-200">
          {photos.length} foto
        </span>
      </div>

      <form
        action={uploadJobPhoto}
        className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-4"
      >
        <input type="hidden" name="workOrderId" value={workOrderId} />
        <input type="hidden" name="type" value={type} />

        <input
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          required
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-gray-700"
        />

        <button
          type="submit"
          className="mt-3 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold !text-white"
        >
          Upload Foto {title}
        </button>
      </form>

      {photos.length === 0 ? (
        <div className="mt-3 flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-center">
          <ImageIcon size={24} className="text-gray-300" />
          <p className="mt-2 text-xs text-gray-400">
            Belum ada foto {title.toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
            >
              <Image
                src={`/api/photos/${photo.id}`}
                alt={`Foto ${type}`}
                fill
                sizes="(max-width: 768px) 33vw, 180px"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-lg font-bold text-gray-900">{title}</h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-gray-800">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    inspection: "bg-amber-50 text-amber-700",
    in_progress: "bg-blue-50 text-blue-700",
    qc: "bg-purple-50 text-purple-700",
    ready: "bg-cyan-50 text-cyan-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`w-fit rounded-full px-4 py-2 text-xs font-bold uppercase ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {statusNames[status] ?? status}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const style =
    status === "paid"
      ? "bg-green-400 text-green-950"
      : status === "partial"
        ? "bg-amber-300 text-amber-950"
        : status === "cancelled"
          ? "bg-red-300 text-red-950"
          : "bg-white text-gray-900";

  return (
    <span
      className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold uppercase ${style}`}
    >
      {status}
    </span>
  );
}

function MoneyCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`h-full rounded-2xl p-4 ${
        highlight
          ? "border border-amber-200 bg-amber-50"
          : "bg-gray-50"
      }`}
    >
      <p
        className={`text-xs font-semibold ${
          highlight ? "text-amber-700" : "text-gray-400"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 break-words text-lg font-black ${
          highlight ? "text-amber-900" : "text-gray-900"
        }`}
      >
        {rupiah(value)}
      </p>
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

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";