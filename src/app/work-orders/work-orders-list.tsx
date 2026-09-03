"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Car,
  Check,
  ClipboardList,
  Clock3,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const statusLabel: Record<string, string> = {
  inspection: "Inspection",
  in_progress: "In Progress",
  qc: "QC",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

type Status =
  | "inspection"
  | "in_progress"
  | "qc"
  | "ready"
  | "completed"
  | "cancelled";

type StatusFilter = "all" | Status;

type Row = {
  id: string;
  status: Status;
  total: number;
  createdAt: Date;
  customer: string;
  phone: string | null;
  brand: string;
  model: string;
  plate: string;
  color: string | null;
};

export default function WorkOrdersList({
  rows,
  isTechnician,
}: {
  rows: Row[];
  isTechnician: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<StatusFilter>("all");

  const filteredRows = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        status === "all" ||
        row.status === status;

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        row.customer,
        row.phone ?? "",
        row.brand,
        row.model,
        row.plate,
        row.color ?? "",
        row.id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [rows, search, status]);

  const activeCount = rows.filter(
    (row) =>
      row.status !== "completed" &&
      row.status !== "cancelled",
  ).length;

  const completedCount = rows.filter(
    (row) =>
      row.status === "completed",
  ).length;

  const readyCount = rows.filter(
    (row) =>
      row.status === "ready",
  ).length;

  const hasFilter =
    search.trim() !== "" ||
    status !== "all";

  function resetFilters() {
    setSearch("");
    setStatus("all");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white">
            <ClipboardList size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Work Orders
            </h1>

            <p className="mt-0.5 text-sm text-gray-500">
              Kendaraan yang sedang atau
              sudah dikerjakan.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Total WO"
          value={String(rows.length)}
        />

        <SummaryCard
          label="Aktif"
          value={String(activeCount)}
        />

        <SummaryCard
          label="Ready"
          value={String(readyCount)}
        />

        <SummaryCard
          label="Completed"
          value={String(completedCount)}
        />
      </div>

      {/* FILTER */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* SEARCH */}
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari customer, plat, kendaraan..."
              className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-900"
                aria-label="Hapus pencarian"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {/* STATUS */}
          <div className="relative">
            <SlidersHorizontal
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as StatusFilter,
                )
              }
              className="h-11 w-full min-w-[190px] appearance-none rounded-xl border border-gray-300 bg-white pl-10 pr-9 text-sm font-medium text-gray-700 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="all">
                Semua Status
              </option>

              <option value="inspection">
                Inspection
              </option>

              <option value="in_progress">
                In Progress
              </option>

              <option value="qc">
                QC
              </option>

              <option value="ready">
                Ready
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </div>

          {/* RESET */}
          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <X size={16} />
              Reset
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            Menampilkan{" "}
            <span className="font-bold text-gray-700">
              {filteredRows.length}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-gray-700">
              {rows.length}
            </span>{" "}
            Work Order
          </p>

          {hasFilter && (
            <div className="text-xs font-semibold text-gray-500">
              Filter aktif
            </div>
          )}
        </div>
      </section>

      {/* LIST */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            Daftar Work Order
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Work order terbaru ditampilkan
            paling atas.
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada work order"
            description="Work order akan muncul setelah booking di-check-in."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="Work order tidak ditemukan"
            description="Coba ubah kata pencarian atau filter status."
            filtered
            onReset={resetFilters}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Work Order
                    </th>

                    <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Tanggal
                    </th>

                    <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Customer
                    </th>

                    <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Kendaraan
                    </th>

                    <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Status
                    </th>

                    {!isTechnician && (
                      <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-gray-400">
                        Total
                      </th>
                    )}

                    <th className="w-10 px-4 py-3.5" />
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="group border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70"
                    >
                      {/* WO */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/work-orders/${row.id}`}
                          className="block"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition group-hover:bg-gray-900 group-hover:text-white">
                              <ClipboardList size={17} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-900">
                                {row.id}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-400">
                                Work Order
                              </p>
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* DATE */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/work-orders/${row.id}`}
                          className="block"
                        >
                          <div className="flex items-center gap-2">
                            <Clock3
                              size={15}
                              className="shrink-0 text-gray-400"
                            />

                            <span className="whitespace-nowrap text-sm font-semibold text-gray-700">
                              {formatDate(
                                row.createdAt,
                              )}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* CUSTOMER */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/work-orders/${row.id}`}
                          className="block max-w-[190px]"
                        >
                          <div className="flex items-start gap-2.5">
                            <UserRound
                              size={17}
                              className="mt-0.5 shrink-0 text-gray-400"
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-900">
                                {row.customer}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {row.phone || "-"}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* VEHICLE */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/work-orders/${row.id}`}
                          className="block max-w-[210px]"
                        >
                          <div className="flex items-start gap-2.5">
                            <Car
                              size={17}
                              className="mt-0.5 shrink-0 text-gray-400"
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-900">
                                {row.brand}{" "}
                                {row.model}
                              </p>

                              <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">
                                {row.plate}

                                {row.color
                                  ? ` · ${row.color}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/work-orders/${row.id}`}
                          className="inline-block"
                        >
                          <StatusBadge
                            status={row.status}
                          />
                        </Link>
                      </td>

                      {/* TOTAL */}
                      {!isTechnician && (
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/work-orders/${row.id}`}
                            className="block"
                          >
                            <span className="whitespace-nowrap text-sm font-bold text-gray-900">
                              Rp{" "}
                              {row.total.toLocaleString(
                                "id-ID",
                              )}
                            </span>
                          </Link>
                        </td>
                      )}

                      {/* ARROW */}
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/work-orders/${row.id}`}
                          aria-label={`Buka Work Order ${row.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-300 transition group-hover:bg-gray-100 group-hover:text-gray-900"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE HINT */}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-center text-xs text-gray-400 md:hidden">
              Geser tabel ke kiri atau kanan untuk
              melihat semua informasi.
            </div>
          </div>
        )}
      </section>
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

function StatusBadge({
  status,
}: {
  status: Status;
}) {
  const styles: Record<Status, string> = {
    inspection:
      "bg-amber-50 text-amber-700",
    in_progress:
      "bg-blue-50 text-blue-700",
    qc: "bg-purple-50 text-purple-700",
    ready:
      "bg-cyan-50 text-cyan-700",
    completed:
      "bg-green-50 text-green-700",
    cancelled:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${styles[status]}`}
    >
      {status === "completed" && (
        <BadgeCheck size={14} />
      )}

      {statusLabel[status] ?? status}
    </span>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  filtered = false,
  onReset,
}: {
  title: string;
  description: string;
  filtered?: boolean;
  onReset?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        {filtered ? (
          <Search
            size={27}
            className="text-gray-400"
          />
        ) : (
          <ClipboardList
            size={27}
            className="text-gray-400"
          />
        )}
      </div>

      <h3 className="mt-4 font-bold text-gray-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
        {description}
      </p>

      {filtered && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <Check size={16} />
          Reset Filter
        </button>
      )}
    </div>
  );
}