"use client";

import { Receipt, FileText } from "lucide-react";

export function PrintButton() {
  const handlePrint = (
    selectedMode: "a4" | "thermal",
  ) => {
    document.documentElement.setAttribute(
      "data-print-mode",
      selectedMode,
    );

    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Tombol Cetak Struk Thermal */}
      <button
        type="button"
        onClick={() =>
          handlePrint("thermal")
        }
        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
      >
        <Receipt
          size={15}
          className="text-gray-500"
        />
        Struk Thermal (58/80mm)
      </button>

      {/* Tombol Cetak Invoice A4 */}
      <button
        type="button"
        onClick={() =>
          handlePrint("a4")
        }
        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800 active:scale-95"
      >
        <FileText size={15} />
        Cetak Invoice A4 (PDF)
      </button>
    </div>
  );
}