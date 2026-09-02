import { NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  customers,
  invoices,
  payments,
  vehicles,
  workOrders,
} from "@/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET() {
  const workspace = await requireRole(["owner", "admin"]);
  const db = getDb();

  // Ambil seluruh invoice beserta detail customer & vehicle
  const rows = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      createdAt: invoices.createdAt,
      status: invoices.status,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      customerName: customers.name,
      customerPhone: customers.phone,
      plateNumber: vehicles.plateNumber,
      brand: vehicles.brand,
      model: vehicles.model,
      invoiceId: invoices.id,
    })
    .from(invoices)
    .innerJoin(workOrders, eq(invoices.workOrderId, workOrders.id))
    .innerJoin(customers, eq(workOrders.customerId, customers.id))
    .innerJoin(vehicles, eq(workOrders.vehicleId, vehicles.id))
    .where(
      and(
        eq(invoices.organizationId, workspace.organizationId),
        ne(invoices.status, "cancelled"),
      ),
    )
    .orderBy(desc(invoices.createdAt));

  // Ambil data metode bayar terakhir untuk setiap invoice
  const paymentRows = await db
    .select({
      invoiceId: payments.invoiceId,
      method: payments.method,
    })
    .from(payments)
    .where(eq(payments.organizationId, workspace.organizationId));

  const paymentMethodMap = new Map<string, string>();

  for (const p of paymentRows) {
    if (!paymentMethodMap.has(p.invoiceId)) {
      paymentMethodMap.set(p.invoiceId, p.method.toUpperCase());
    }
  }

  // Header Kolom CSV
  const headers = [
    "No Invoice",
    "Tanggal",
    "Pelanggan",
    "No WhatsApp",
    "Plat Nomor",
    "Kendaraan",
    "Subtotal (Rp)",
    "Diskon (Rp)",
    "Total Tagihan (Rp)",
    "Sudah Dibayar (Rp)",
    "Sisa Tagihan (Rp)",
    "Metode Pembayaran",
    "Status Lunas",
  ];

  const csvRows: string[] = [headers.join(",")];

  for (const row of rows) {
    const remaining = Math.max(0, row.total - row.paidAmount);

    const dateFormatted = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(row.createdAt);

    const method =
      paymentMethodMap.get(row.invoiceId) ||
      (row.status === "paid" ? "CASH" : "-");

    const line = [
      `"${row.invoiceNumber}"`,
      `"${dateFormatted}"`,
      `"${row.customerName.replace(/"/g, '""')}"`,
      `"'${row.customerPhone}"`,
      `"${row.plateNumber}"`,
      `"${row.brand} ${row.model}"`,
      row.subtotal,
      row.discount,
      row.total,
      row.paidAmount,
      remaining,
      `"${method}"`,
      `"${row.status.toUpperCase()}"`,
    ];

    csvRows.push(line.join(","));
  }

  // Tambahkan UTF-8 BOM agar Microsoft Excel membuka huruf Indonesia
  // & format rapi secara otomatis
  const csvContent = "\uFEFF" + csvRows.join("\r\n");

  const filename = `Laporan_Penjualan_${workspace.organizationName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}