"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  and,
  count,
  eq,
  gte,
  lt,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  bookings,
  invoices,
  inspections,
  jobPhotos,
  members,
  payments,
  services,
  subscriptions,
  workOrderItems,
  workOrders,
} from "@/db/schema";
import { createId } from "@/lib/ids";
import { checkLimit } from "@/lib/entitlement";
import { requireRole } from "@/lib/permissions";

export async function createWorkOrderFromBooking(
  formData: FormData,
) {
  const workspace = await requireRole([
    "owner",
    "admin",
  ]);

  const db = getDb();

  const bookingId = String(
    formData.get("bookingId") ?? "",
  );

  if (!bookingId) {
    throw new Error(
      "Booking tidak ditemukan.",
    );
  }

  const [booking] = await db
    .select({
      id: bookings.id,
      customerId: bookings.customerId,
      vehicleId: bookings.vehicleId,
      serviceId: bookings.serviceId,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(
          bookings.id,
          bookingId,
        ),
        eq(
          bookings.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (!booking) {
    throw new Error(
      "Booking tidak valid.",
    );
  }

  if (
    booking.status === "cancelled" ||
    booking.status === "no_show"
  ) {
    throw new Error(
      "Booking ini tidak bisa dijadikan work order.",
    );
  }

  const [existing] = await db
    .select({
      id: workOrders.id,
    })
    .from(workOrders)
    .where(
      and(
        eq(
          workOrders.bookingId,
          bookingId,
        ),
        eq(
          workOrders.organizationId,
          workspace.organizationId,
        ),
      ),
    )
    .limit(1);

  if (existing) {
    redirect(
      `/work-orders/${existing.id}`,
    );
  }

  let service:
    | {
        id: string;
        name: string;
        price: number;
      }
    | undefined;

  if (booking.serviceId) {
    [service] = await db
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
      })
      .from(services)
      .where(
        and(
          eq(
            services.id,
            booking.serviceId,
          ),
          eq(
            services.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);
  }

  const now = new Date();
  const workOrderId =
    createId("wo");

  const total =
    service?.price ?? 0;

  /*
   * Ambil subscription organisasi.
   */
  const [subscription] =
    await db
      .select({
        currentPeriodStart:
          subscriptions.currentPeriodStart,
        currentPeriodEnd:
          subscriptions.currentPeriodEnd,
        startedAt:
          subscriptions.startedAt,
        status:
          subscriptions.status,
      })
      .from(subscriptions)
      .where(
        eq(
          subscriptions.organizationId,
          workspace.organizationId,
        ),
      )
      .limit(1);

  if (
    !subscription ||
    ![
      "trialing",
      "active",
    ].includes(
      subscription.status,
    )
  ) {
    throw new Error(
      "Subscription Anda tidak aktif.",
    );
  }

  /*
   * Gunakan periode billing jika tersedia.
   */
  const periodStart =
    subscription.currentPeriodStart ??
    subscription.startedAt;

  const periodEnd =
    subscription.currentPeriodEnd ??
    now;

  /*
   * Hitung Work Order hanya dalam periode
   * subscription yang sedang berjalan.
   */
  const [usage] =
    await db
      .select({
        count: count(),
      })
      .from(workOrders)
      .where(
        and(
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
          gte(
            workOrders.createdAt,
            periodStart,
          ),
          lt(
            workOrders.createdAt,
            periodEnd,
          ),
        ),
      );

  const canCreate =
    await checkLimit(
      workspace.organizationId,
      "work_orders",
      usage?.count ?? 0,
    );

  if (!canCreate) {
    throw new Error(
      "Batas Work Order paket Anda sudah tercapai.",
    );
  }

  await db
    .insert(workOrders)
    .values({
      id: workOrderId,
      organizationId:
        workspace.organizationId,
      bookingId,
      customerId:
        booking.customerId,
      vehicleId:
        booking.vehicleId,
      assignedMemberId: null,
      status: "inspection",
      subtotal: total,
      discount: 0,
      total,
      createdAt: now,
      updatedAt: now,
    });

  if (service) {
    await db
      .insert(workOrderItems)
      .values({
        id: createId("woi"),
        organizationId:
          workspace.organizationId,
        workOrderId,
        serviceId: service.id,
        description:
          service.name,
        quantity: 1,
        unitPrice:
          service.price,
        lineTotal:
          service.price,
      });
  }

  await db
    .update(bookings)
    .set({
      status: "checked_in",
      updatedAt: now,
    })
    .where(
      and(
        eq(
          bookings.id,
          bookingId,
        ),
        eq(
          bookings.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  revalidatePath(
    "/bookings",
  );

  revalidatePath(
    "/work-orders",
  );

  redirect(
    `/work-orders/${workOrderId}`,
  );
}

/*
 * =========================================================
 * ASSIGN TECHNICIAN
 * =========================================================
 *
 * Hanya owner/admin yang boleh melakukan assignment.
 *
 * assignedMemberId boleh dikosongkan untuk melepas
 * technician dari Work Order.
 */
export async function assignWorkOrder(
  formData: FormData,
) {
  const workspace =
    await requireRole([
      "owner",
      "admin",
    ]);

  const db = getDb();

  const workOrderId =
    String(
      formData.get(
        "workOrderId",
      ) ?? "",
    ).trim();

  const memberIdValue =
    String(
      formData.get(
        "memberId",
      ) ?? "",
    ).trim();

  if (!workOrderId) {
    throw new Error(
      "Work order tidak valid.",
    );
  }

  /*
   * String kosong berarti unassign.
   */
  const memberId =
    memberIdValue || null;

  /*
   * Pastikan Work Order memang milik
   * organisasi user yang sedang login.
   */
  const [workOrder] =
    await db
      .select({
        id: workOrders.id,
        assignedMemberId:
          workOrders.assignedMemberId,
      })
      .from(workOrders)
      .where(
        and(
          eq(
            workOrders.id,
            workOrderId,
          ),
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

  if (!workOrder) {
    throw new Error(
      "Work order tidak ditemukan.",
    );
  }

  /*
   * Kalau memberId null:
   * lepaskan technician.
   */
  if (!memberId) {
    await db
      .update(workOrders)
      .set({
        assignedMemberId: null,
        updatedAt:
          new Date(),
      })
      .where(
        and(
          eq(
            workOrders.id,
            workOrderId,
          ),
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
      );

    revalidatePath(
      "/work-orders",
    );

    revalidatePath(
      `/work-orders/${workOrderId}`,
    );

    return;
  }

  /*
   * Pastikan member:
   *
   * 1. berasal dari organisasi yang sama
   * 2. masih aktif
   * 3. memiliki role technician
   */
  const [technician] =
    await db
      .select({
        id: members.id,
      })
      .from(members)
      .where(
        and(
          eq(
            members.id,
            memberId,
          ),
          eq(
            members.organizationId,
            workspace.organizationId,
          ),
          eq(
            members.role,
            "technician",
          ),
          eq(
            members.active,
            true,
          ),
        ),
      )
      .limit(1);

  if (!technician) {
    throw new Error(
      "Technician tidak valid atau tidak aktif.",
    );
  }

  await db
    .update(workOrders)
    .set({
      assignedMemberId:
        technician.id,
      updatedAt:
        new Date(),
    })
    .where(
      and(
        eq(
          workOrders.id,
          workOrderId,
        ),
        eq(
          workOrders.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  revalidatePath(
    "/work-orders",
  );

  revalidatePath(
    `/work-orders/${workOrderId}`,
  );
}

export async function updateWorkOrderStatus(
  formData: FormData,
) {
  const workspace =
    await requireRole([
      "owner",
      "admin",
      "technician",
    ]);

  const db = getDb();

  const workOrderId =
    String(
      formData.get(
        "workOrderId",
      ) ?? "",
    );

  const status =
    String(
      formData.get(
        "status",
      ) ?? "",
    );

  const allowed = [
    "inspection",
    "in_progress",
    "qc",
    "ready",
    "completed",
    "cancelled",
  ] as const;

  if (
    !workOrderId ||
    !allowed.includes(
      status as (typeof allowed)[number],
    )
  ) {
    throw new Error(
      "Status work order tidak valid.",
    );
  }

  const [workOrder] =
    await db
      .select({
        id: workOrders.id,
      })
      .from(workOrders)
      .where(
        and(
          eq(
            workOrders.id,
            workOrderId,
          ),
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

  if (!workOrder) {
    throw new Error(
      "Work order tidak ditemukan.",
    );
  }

  await db
    .update(workOrders)
    .set({
      status:
        status as (typeof allowed)[number],
      updatedAt:
        new Date(),
    })
    .where(
      and(
        eq(
          workOrders.id,
          workOrderId,
        ),
        eq(
          workOrders.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  revalidatePath(
    "/work-orders",
  );

  revalidatePath(
    `/work-orders/${workOrderId}`,
  );
}

export async function saveInspection(
  formData: FormData,
) {
  const workspace =
    await requireRole([
      "owner",
      "admin",
      "technician",
    ]);

  const db = getDb();

  const workOrderId =
    String(
      formData.get(
        "workOrderId",
      ) ?? "",
    );

  if (!workOrderId) {
    throw new Error(
      "Work order tidak valid.",
    );
  }

  const [workOrder] =
    await db
      .select({
        id: workOrders.id,
      })
      .from(workOrders)
      .where(
        and(
          eq(
            workOrders.id,
            workOrderId,
          ),
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

  if (!workOrder) {
    throw new Error(
      "Work order tidak ditemukan.",
    );
  }

  const now =
    new Date();

  const values = {
    bodyChecked:
      formData.get(
        "bodyChecked",
      ) === "on",

    wheelsChecked:
      formData.get(
        "wheelsChecked",
      ) === "on",

    glassChecked:
      formData.get(
        "glassChecked",
      ) === "on",

    interiorChecked:
      formData.get(
        "interiorChecked",
      ) === "on",

    notes:
      String(
        formData.get(
          "notes",
        ) ?? "",
      ).trim() || null,

    updatedAt: now,
  };

  const [existing] =
    await db
      .select({
        id: inspections.id,
      })
      .from(inspections)
      .where(
        and(
          eq(
            inspections.workOrderId,
            workOrderId,
          ),
          eq(
            inspections.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

  if (existing) {
    await db
      .update(inspections)
      .set(values)
      .where(
        eq(
          inspections.id,
          existing.id,
        ),
      );
  } else {
    await db
      .insert(inspections)
      .values({
        id: createId("ins"),
        organizationId:
          workspace.organizationId,
        workOrderId,
        ...values,
        createdAt: now,
      });
  }

  revalidatePath(
    `/work-orders/${workOrderId}`,
  );
}

export async function uploadJobPhoto(
  formData: FormData,
) {
  const workspace =
    await requireRole([
      "owner",
      "admin",
      "technician",
    ]);

  const db = getDb();

  const workOrderId =
    String(
      formData.get(
        "workOrderId",
      ) ?? "",
    );

  const type =
    String(
      formData.get(
        "type",
      ) ?? "",
    );

  const file =
    formData.get(
      "photo",
    );

  const allowedTypes = [
    "inspection",
    "before",
    "after",
    "damage",
  ] as const;

  if (
    !workOrderId ||
    !allowedTypes.includes(
      type as (typeof allowedTypes)[number],
    ) ||
    !(file instanceof File) ||
    file.size === 0
  ) {
    throw new Error(
      "Foto tidak valid.",
    );
  }

  if (
    !file.type.startsWith(
      "image/",
    )
  ) {
    throw new Error(
      "File harus berupa gambar.",
    );
  }

  if (
    file.size >
    8 * 1024 * 1024
  ) {
    throw new Error(
      "Ukuran foto maksimal 8 MB.",
    );
  }

  const [workOrder] =
    await db
      .select({
        id: workOrders.id,
      })
      .from(workOrders)
      .where(
        and(
          eq(
            workOrders.id,
            workOrderId,
          ),
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

  if (!workOrder) {
    throw new Error(
      "Work order tidak ditemukan.",
    );
  }

  const {
    getCloudflareContext,
  } = await import(
    "@opennextjs/cloudflare"
  );

  const { jobPhotos } =
    await import(
      "@/db/schema"
    );

  const { env } =
    await getCloudflareContext({
      async: true,
    });

  if (!env.PHOTOS) {
    throw new Error(
      "Penyimpanan foto belum diaktifkan.",
    );
  }

  const photoId =
    createId("photo");

  const ext =
    file.type
      .split("/")[1]
      ?.replace(
        "jpeg",
        "jpg",
      ) || "jpg";

  const objectKey =
    `${workspace.organizationId}/` +
    `${workOrderId}/` +
    `${type}/` +
    `${photoId}.${ext}`;

  await env.PHOTOS.put(
    objectKey,
    await file.arrayBuffer(),
    {
      httpMetadata: {
        contentType:
          file.type,
      },
    },
  );

  await db
    .insert(jobPhotos)
    .values({
      id: photoId,
      organizationId:
        workspace.organizationId,
      workOrderId,
      type:
        type as (typeof allowedTypes)[number],
      objectKey,
      caption: null,
      createdAt:
        new Date(),
    });

  revalidatePath(
    `/work-orders/${workOrderId}`,
  );
}

export async function createInvoice(
  formData: FormData,
) {
  const workspace =
    await requireRole([
      "owner",
      "admin",
    ]);

  const db = getDb();

  const workOrderId =
    String(
      formData.get(
        "workOrderId",
      ) ?? "",
    );

  if (!workOrderId) {
    throw new Error(
      "Work order tidak valid.",
    );
  }

  const [wo] =
    await db
      .select({
        id: workOrders.id,
        subtotal:
          workOrders.subtotal,
        discount:
          workOrders.discount,
        total:
          workOrders.total,
      })
      .from(workOrders)
      .where(
        and(
          eq(
            workOrders.id,
            workOrderId,
          ),
          eq(
            workOrders.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

  if (!wo) {
    throw new Error(
      "Work order tidak ditemukan.",
    );
  }

  const [existing] =
    await db
      .select({
        id: invoices.id,
      })
      .from(invoices)
      .where(
        and(
          eq(
            invoices.workOrderId,
            workOrderId,
          ),
          eq(
            invoices.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

  if (existing) {
    revalidatePath(
      `/work-orders/${workOrderId}`,
    );

    return;
  }

  const now =
    new Date();

  const invoiceNumber =
    `INV-${now.getFullYear()}` +
    `${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-` +
    `${Math.floor(
      Date.now() / 1000,
    )
      .toString()
      .slice(-6)}`;

  await db
    .insert(invoices)
    .values({
      id: createId("inv"),
      organizationId:
        workspace.organizationId,
      workOrderId,
      invoiceNumber,
      status: "unpaid",
      subtotal:
        wo.subtotal,
      discount:
        wo.discount,
      total:
        wo.total,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    });

  revalidatePath(
    `/work-orders/${workOrderId}`,
  );
}

export async function addPayment(
  formData: FormData,
) {
  const workspace =
    await requireRole([
      "owner",
      "admin",
    ]);

  const db = getDb();

  const workOrderId =
    String(
      formData.get(
        "workOrderId",
      ) ?? "",
    );

  const invoiceId =
    String(
      formData.get(
        "invoiceId",
      ) ?? "",
    );

  const amount =
    Number(
      formData.get(
        "amount",
      ) ?? 0,
    );

  const method =
    String(
      formData.get(
        "method",
      ) ?? "cash",
    );

  const notes =
    String(
      formData.get(
        "notes",
      ) ?? "",
    ).trim() || null;

  const allowedMethods = [
    "cash",
    "transfer",
    "qris",
    "other",
  ] as const;

  if (
    !workOrderId ||
    !invoiceId ||
    !Number.isInteger(
      amount,
    ) ||
    amount <= 0 ||
    !allowedMethods.includes(
      method as (typeof allowedMethods)[number],
    )
  ) {
    throw new Error(
      "Pembayaran tidak valid.",
    );
  }

  const [invoice] =
    await db
      .select({
        id: invoices.id,
        total: invoices.total,
        paidAmount:
          invoices.paidAmount,
      })
      .from(invoices)
      .where(
        and(
          eq(
            invoices.id,
            invoiceId,
          ),
          eq(
            invoices.organizationId,
            workspace.organizationId,
          ),
          eq(
            invoices.workOrderId,
            workOrderId,
          ),
        ),
      )
      .limit(1);

  if (!invoice) {
    throw new Error(
      "Invoice tidak ditemukan.",
    );
  }

  const remaining =
    Math.max(
      0,
      invoice.total -
        invoice.paidAmount,
    );

  const appliedAmount =
    Math.min(
      amount,
      remaining,
    );

  if (
    appliedAmount <= 0
  ) {
    throw new Error(
      "Invoice sudah lunas.",
    );
  }

  const now =
    new Date();

  await db
    .insert(payments)
    .values({
      id: createId("pay"),
      organizationId:
        workspace.organizationId,
      invoiceId,
      amount:
        appliedAmount,
      method:
        method as (typeof allowedMethods)[number],
      notes,
      paidAt: now,
      createdAt: now,
    });

  const newPaidAmount =
    invoice.paidAmount +
    appliedAmount;

  const status =
    newPaidAmount >=
    invoice.total
      ? "paid"
      : "partial";

  await db
    .update(invoices)
    .set({
      paidAmount:
        newPaidAmount,
      status,
      updatedAt: now,
    })
    .where(
      and(
        eq(
          invoices.id,
          invoiceId,
        ),
        eq(
          invoices.organizationId,
          workspace.organizationId,
        ),
      ),
    );

  revalidatePath(
    `/work-orders/${workOrderId}`,
  );
}