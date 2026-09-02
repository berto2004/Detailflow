import Link from "next/link";
import { and, eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import {
  customers,
  invoices,
  organizations,
  payments,
  vehicles,
  workOrderItems,
  workOrders,
} from "@/db/schema";
import { requireRole } from "@/lib/permissions";

import { PrintButton } from "./print-button";

function rupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  const workspace = await requireRole(["owner", "admin"]);
  const db = getDb();

  // 1. Cari Invoice terlebih dahulu (bisa by invoiceId atau workOrderId)
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, workspace.organizationId),
        or(eq(invoices.id, id), eq(invoices.workOrderId, id))!
      )
    )
    .limit(1);

  // Tentukan target workOrderId
  const targetWorkOrderId = invoice ? invoice.workOrderId : id;

  // 2. Ambil data Work Order & Customer & Vehicle
  const [workOrder] = await db
    .select({
      id: workOrders.id,
      subtotal: workOrders.subtotal,
      discount: workOrders.discount,
      total: workOrders.total,
      createdAt: workOrders.createdAt,
      customer: customers.name,
      phone: customers.phone,
      email: customers.email,
      brand: vehicles.brand,
      model: vehicles.model,
      plate: vehicles.plateNumber,
      color: vehicles.color,
      organizationName: organizations.name,
      organizationPhone: organizations.phone,
      organizationAddress: organizations.address,
      invoiceFooterNote: organizations.invoiceFooterNote,
    })
    .from(workOrders)
    .innerJoin(
      customers,
      and(
        eq(workOrders.customerId, customers.id),
        eq(customers.organizationId, workspace.organizationId)
      )
    )
    .innerJoin(
      vehicles,
      and(
        eq(workOrders.vehicleId, vehicles.id),
        eq(vehicles.organizationId, workspace.organizationId)
      )
    )
    .innerJoin(
      organizations,
      eq(workOrders.organizationId, organizations.id)
    )
    .where(
      and(
        eq(workOrders.id, targetWorkOrderId),
        eq(workOrders.organizationId, workspace.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    notFound();
  }

  // 3. Ambil Item Layanan
  const items = await db
    .select({
      id: workOrderItems.id,
      description: workOrderItems.description,
      quantity: workOrderItems.quantity,
      unitPrice: workOrderItems.unitPrice,
      lineTotal: workOrderItems.lineTotal,
    })
    .from(workOrderItems)
    .where(
      and(
        eq(workOrderItems.workOrderId, targetWorkOrderId),
        eq(workOrderItems.organizationId, workspace.organizationId)
      )
    );

  // 4. Ambil Riwayat Pembayaran (jika invoice sudah terbit)
  const paymentRows = invoice
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

  const invoiceNumber = invoice ? invoice.invoiceNumber : `DRAFT-${workOrder.id.slice(0, 8).toUpperCase()}`;
  const invoiceStatus = invoice ? invoice.status : "unpaid";
  const subtotalAmount = invoice ? invoice.subtotal : workOrder.subtotal;
  const discountAmount = invoice ? invoice.discount : workOrder.discount;
  const totalAmount = invoice ? invoice.total : workOrder.total;
  const paidAmount = invoice ? invoice.paidAmount : 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const invoiceDate = invoice ? invoice.createdAt : workOrder.createdAt;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 print:min-h-0 print:bg-white print:p-0">
      {/* CONTROLS */}
      <div className="mx-auto mb-4 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          href={`/work-orders/${targetWorkOrderId}`}
          className="text-sm font-semibold text-gray-500 transition hover:text-gray-900"
        >
          ← Kembali ke Work Order
        </Link>

        <PrintButton />
      </div>

      {/* INVOICE SHEET (A4 / SCREEN) */}
      <article className="invoice-sheet mx-auto max-w-4xl bg-white p-6 shadow-sm sm:p-8 md:p-10 print:max-w-none print:p-0 print:shadow-none">
        {/* HEADER */}
        <header className="invoice-section flex flex-col gap-5 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between print:gap-3 print:pb-3">
          <div className="max-w-md">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gray-900 text-sm font-black text-white print:h-9 print:w-9 print:border print:border-gray-900 print:bg-white print:text-xs print:text-gray-900">
                DF
              </div>

              <div>
                <p className="text-lg font-black text-gray-900 print:text-base">
                  {workOrder.organizationName}
                </p>

                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 print:text-[9px]">
                  Auto Detailing Studio
                </p>

                {workOrder.organizationAddress && (
                  <p className="mt-1 text-xs text-gray-600 print:text-[9px]">
                    {workOrder.organizationAddress}
                  </p>
                )}

                {workOrder.organizationPhone && (
                  <p className="mt-0.5 text-xs text-gray-600 print:text-[9px]">
                    WA/Telp: {workOrder.organizationPhone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400 print:text-[9px]">
              Invoice
            </p>

            <h1 className="mt-1 text-xl font-black text-gray-900 print:text-lg">
              {invoiceNumber}
            </h1>

            <p className="mt-1 text-xs text-gray-500 print:text-[10px]">
              {formatDate(invoiceDate)}
            </p>

            <InvoiceBadge status={invoiceStatus} />
          </div>
        </header>

        {/* CUSTOMER + VEHICLE */}
        <section className="invoice-section grid gap-5 border-b border-gray-200 py-5 sm:grid-cols-2 print:gap-3 print:py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 print:text-[9px]">
              Ditagihkan kepada
            </p>

            <p className="mt-1.5 text-base font-bold text-gray-900 print:text-sm">
              {workOrder.customer}
            </p>

            <p className="mt-1 text-xs text-gray-600 print:text-[10px]">
              {workOrder.phone}
            </p>

            {workOrder.email && (
              <p className="mt-0.5 text-xs text-gray-600 print:text-[10px]">
                {workOrder.email}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 print:text-[9px]">
              Kendaraan
            </p>

            <p className="mt-1.5 text-base font-bold text-gray-900 print:text-sm">
              {workOrder.brand} {workOrder.model}
            </p>

            <p className="mt-1 text-xs font-semibold text-gray-600 print:text-[10px]">
              {workOrder.plate}
              {workOrder.color ? ` · ${workOrder.color}` : ""}
            </p>
          </div>
        </section>

        {/* SERVICES */}
        <section className="invoice-section py-5 print:py-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 print:text-[9px]">
            Detail Layanan
          </h2>

          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 print:mt-2 print:rounded-md">
            <div className="hidden grid-cols-[1fr_70px_120px_130px] bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500 sm:grid print:grid print:grid-cols-[1fr_55px_100px_110px] print:text-[8px]">
              <div>Layanan</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Harga</div>
              <div className="text-right">Total</div>
            </div>

            {items.length === 0 ? (
              <div className="p-4 text-xs text-gray-500 print:p-2 print:text-[9px]">
                Tidak ada item layanan.
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 print:grid print:grid-cols-[1fr_55px_100px_110px] print:items-center print:px-3 print:py-2 ${
                    index !== items.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 print:text-[10px]">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-2 flex justify-between text-xs sm:mt-0 sm:block sm:text-center print:mt-0 print:block print:text-center print:text-[9px]">
                    <span className="text-gray-400 sm:hidden print:hidden">
                      Qty
                    </span>
                    <span>{item.quantity}</span>
                  </div>

                  <div className="mt-2 flex justify-between text-xs sm:mt-0 sm:block sm:text-right print:mt-0 print:block print:text-right print:text-[9px]">
                    <span className="text-gray-400 sm:hidden print:hidden">
                      Harga
                    </span>
                    <span>{rupiah(item.unitPrice)}</span>
                  </div>

                  <div className="mt-2 flex justify-between text-xs font-bold sm:mt-0 sm:block sm:text-right print:mt-0 print:block print:text-right print:text-[9px]">
                    <span className="font-normal text-gray-400 sm:hidden print:hidden">
                      Total
                    </span>
                    <span>{rupiah(item.lineTotal)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* TOTAL */}
        <section className="invoice-section flex justify-end border-t border-gray-200 py-5 print:py-3">
          <div className="w-full max-w-sm space-y-2 print:max-w-xs print:space-y-1.5">
            <MoneyRow label="Subtotal" value={subtotalAmount} />
            <MoneyRow label="Diskon" value={discountAmount} />

            <div className="flex items-center justify-between border-t border-gray-200 pt-3 print:pt-2">
              <span className="text-sm font-bold text-gray-900 print:text-[10px]">
                Total
              </span>
              <span className="text-lg font-black text-gray-900 print:text-sm">
                {rupiah(totalAmount)}
              </span>
            </div>

            <MoneyRow label="Sudah Dibayar" value={paidAmount} />

            <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-white print:rounded-md print:border print:border-gray-900 print:bg-white print:px-3 print:py-2 print:text-gray-900">
              <span className="text-xs font-bold print:text-[9px]">
                Sisa Tagihan
              </span>
              <span className="text-sm font-black print:text-[11px]">
                {rupiah(remainingAmount)}
              </span>
            </div>
          </div>
        </section>

        {/* PAYMENT HISTORY */}
        {paymentRows.length > 0 && (
          <section className="invoice-section border-t border-gray-200 py-5 print:py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 print:text-[9px]">
              Riwayat Pembayaran
            </h2>

            <div className="mt-3 space-y-2 print:mt-2 print:space-y-1">
              {paymentRows.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3 print:rounded-md print:border print:border-gray-200 print:bg-white print:px-3 print:py-2"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-900 print:text-[9px]">
                      {payment.method.toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 print:text-[8px]">
                      {formatDate(payment.paidAt)}
                    </p>
                    {payment.notes && (
                      <p className="mt-0.5 text-[11px] text-gray-400 print:text-[8px]">
                        {payment.notes}
                      </p>
                    )}
                  </div>

                  <p className="whitespace-nowrap text-xs font-bold text-gray-900 print:text-[9px]">
                    {rupiah(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="invoice-section border-t border-gray-200 pt-5 text-center print:pt-3">
          <p className="text-xs font-semibold text-gray-700 print:text-[9px]">
            Terima kasih telah mempercayakan kendaraan Anda kepada{" "}
            {workOrder.organizationName}.
          </p>

          {workOrder.invoiceFooterNote && (
            <p className="mt-0.5 text-xs italic text-gray-500 print:text-[8px]">
              &quot;{workOrder.invoiceFooterNote}&quot;
            </p>
          )}

          <p className="mt-1 text-[11px] text-gray-400 print:text-[8px]">
            Invoice dibuat melalui DetailFlow.
          </p>
        </footer>
      </article>

      {/* STRUK THERMAL LAYOUT */}
      <article className="thermal-receipt hidden font-mono text-black">
        <div className="text-center">
          <p className="text-sm font-bold uppercase">{workOrder.organizationName}</p>
          {workOrder.organizationAddress && (
            <p className="text-[9px] leading-tight text-gray-600">{workOrder.organizationAddress}</p>
          )}
          {workOrder.organizationPhone && (
            <p className="text-[9px] text-gray-600">Telp: {workOrder.organizationPhone}</p>
          )}
          <p className="text-[10px] text-gray-600">================================</p>
        </div>

        <div className="my-2 space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>No. Inv:</span>
            <span className="font-bold">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Tgl:</span>
            <span>{formatDate(invoiceDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>{workOrder.customer}</span>
          </div>
          <div className="flex justify-between">
            <span>Kendaraan:</span>
            <span>{workOrder.plate} ({workOrder.brand})</span>
          </div>
        </div>

        <p className="text-[10px] text-gray-600">--------------------------------</p>

        {/* Item Layanan */}
        <div className="my-2 space-y-1.5 text-[11px]">
          {items.map((item) => (
            <div key={item.id}>
              <p className="font-semibold">{item.description}</p>
              <div className="flex justify-between text-[10px]">
                <span>{item.quantity} x {rupiah(item.unitPrice)}</span>
                <span>{rupiah(item.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-600">--------------------------------</p>

        {/* Total & Bayar */}
        <div className="my-2 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{rupiah(subtotalAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Diskon:</span>
              <span>-{rupiah(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xs">
            <span>Total:</span>
            <span>{rupiah(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Sudah Bayar:</span>
            <span>{rupiah(paidAmount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Sisa:</span>
            <span>{rupiah(remainingAmount)}</span>
          </div>
        </div>

        <p className="text-[10px] text-gray-600">================================</p>

        <div className="mt-3 text-center text-[10px]">
          <p className="font-bold">TERIMA KASIH</p>
          {workOrder.invoiceFooterNote ? (
            <p className="mt-1 text-[9px] leading-tight italic">{workOrder.invoiceFooterNote}</p>
          ) : (
            <p>Harap simpan struk ini sebagai bukti pembayaran yang sah.</p>
          )}
        </div>
      </article>

      {/* DYNAMIC PRINT CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .invoice-sheet {
            display: block !important;
            width: 100% !important;
            max-width: 190mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            font-size: 10px !important;
            box-shadow: none !important;
          }

          .thermal-receipt {
            display: none !important;
          }

          .invoice-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          html[data-print-mode="thermal"] @page {
            size: 80mm auto;
            margin: 3mm;
          }

          html[data-print-mode="thermal"] .invoice-sheet {
            display: none !important;
          }

          html[data-print-mode="thermal"] .thermal-receipt {
            display: block !important;
            width: 100% !important;
            max-width: 76mm !important;
            margin: 0 auto !important;
            padding: 2mm 0 !important;
          }
        }
      `}</style>
    </main>
  );
}

function MoneyRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-xs print:text-[9px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{rupiah(value)}</span>
    </div>
  );
}

function InvoiceBadge({ status }: { status: string }) {
  const style =
    status === "paid"
      ? "bg-green-50 text-green-700"
      : status === "partial"
        ? "bg-amber-50 text-amber-700"
        : status === "cancelled"
          ? "bg-red-50 text-red-700"
          : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase print:px-2 print:py-0.5 print:text-[8px] ${style}`}
    >
      {status}
    </span>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}