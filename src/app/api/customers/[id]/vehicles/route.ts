import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireWorkspace } from "@/lib/workspace";

function makeId() {
  return `veh_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: customerId } = await context.params;
    const workspace = await requireWorkspace();
    const { env } = await getCloudflareContext({ async: true });
    const formData = await request.formData();

    const brand = String(formData.get("brand") || "").trim();
    const model = String(formData.get("model") || "").trim();
    const plateNumber = String(formData.get("plateNumber") || "")
      .trim()
      .toUpperCase();
    const color = String(formData.get("color") || "").trim();
    const yearValue = String(formData.get("year") || "").trim();
    const year = yearValue ? Number(yearValue) : null;

    if (!brand || !model || !plateNumber) {
      return NextResponse.json(
        { error: "Merek, model, dan nomor polisi wajib diisi." },
        { status: 400 },
      );
    }

    const customer = await env.DB.prepare(
      `SELECT id FROM customers WHERE id = ? AND organization_id = ? LIMIT 1`,
    )
      .bind(customerId, workspace.organizationId)
      .first();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer tidak ditemukan." },
        { status: 404 },
      );
    }

    const vehicleId = makeId();

    await env.DB.prepare(
      `INSERT INTO vehicles (
        id,
        organization_id,
        customer_id,
        brand,
        model,
        plate_number,
        color,
        year,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    )
      .bind(
        vehicleId,
        workspace.organizationId,
        customerId,
        brand,
        model,
        plateNumber,
        color || null,
        year,
      )
      .run();

    return NextResponse.redirect(
      new URL(`/customers/${customerId}`, request.url),
      303,
    );
  } catch (error) {
    console.error("CREATE VEHICLE ERROR:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan kendaraan." },
      { status: 500 },
    );
  }
}
