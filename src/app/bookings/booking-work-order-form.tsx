"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { createWorkOrderFromBooking } from "@/app/work-orders/actions";

interface BookingWorkOrderFormProps {
  bookingId: string;
}

export function BookingWorkOrderForm({
  bookingId,
}: BookingWorkOrderFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);

    try {
      await createWorkOrderFromBooking(formData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat Work Order.";

      if (
        message.includes("NEXT_REDIRECT") ||
        message.includes("NEXT_NOT_FOUND")
      ) {
        throw error;
      }

      setError(message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <form action={handleSubmit}>
        <input
          type="hidden"
          name="bookingId"
          value={bookingId}
        />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold !text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 size={17} />

          {pending
            ? "Memproses..."
            : "Check-in & Buat Work Order"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}