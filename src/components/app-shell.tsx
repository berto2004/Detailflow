import Link from "next/link";

import {
  CalendarDays,
  CarFront,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { requireWorkspace } from "@/lib/workspace";
import { LogoutButton } from "@/components/logout-button";
import { InstallPwaButton } from "@/components/install-pwa-button";

const nav = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Customers", "/customers", UsersRound],
  ["Vehicles", "/vehicles", CarFront],
  ["Bookings", "/bookings", CalendarDays],
  ["Layanan", "/services", Sparkles],
  ["Work Orders", "/work-orders", ClipboardList],
  ["Settings", "/settings", Settings],
] as const;

type Role = "owner" | "admin" | "technician";

function getAllowedNav(role: Role) {
  if (role === "owner") {
    return nav;
  }

  if (role === "admin") {
    return nav.filter(
      ([label]) => label !== "Settings",
    );
  }

  return nav.filter(
    ([label]) =>
      label === "Dashboard" ||
      label === "Work Orders",
  );
}

export async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await requireWorkspace();

  const allowedNav = getAllowedNav(
    workspace.role,
  );

  const mobileNav = allowedNav.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50 md:grid md:grid-cols-[250px_1fr]">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden border-r border-gray-200 bg-white p-5 md:flex md:flex-col">
        <Link
          href="/dashboard"
          className="mb-8 flex items-center gap-3 px-2"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gray-900 text-sm font-black text-white">
            DF
          </span>

          <div>
            <div className="font-extrabold tracking-tight">
              DetailFlow
            </div>

            <div className="text-[11px] text-gray-400">
              Studio Management
            </div>
          </div>
        </Link>

        {/* MENU DESKTOP */}
        <nav className="space-y-1">
          {allowedNav.map(
            ([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950"
              >
                <Icon size={18} />
                {label}
              </Link>
            ),
          )}
        </nav>

        {/* BOTTOM SIDEBAR */}
        <div className="mt-auto space-y-3">
          <InstallPwaButton />

          <div className="border-t border-gray-200 pt-3">
            <LogoutButton />
          </div>

          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            MVP Development
            <br />

            <b className="text-gray-700">
              DetailFlow v0.1
            </b>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 pb-20 md:pb-0">
        {/* HEADER */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-5 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gray-900 text-xs font-black text-white md:hidden">
              DF
            </span>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                Studio
              </p>

              <p className="max-w-[150px] truncate text-sm font-bold text-gray-900 sm:max-w-[220px] md:max-w-none">
                {workspace.organizationName}
              </p>
            </div>
          </div>

          {/* HEADER RIGHT */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-extrabold text-gray-700 sm:block">
              {workspace.role.toUpperCase()}
            </div>

            <div className="md:hidden">
              <InstallPwaButton />
            </div>

            <div className="md:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="mx-auto max-w-[1400px] p-5 md:p-8">
          {children}
        </div>
      </main>

      {/* MOBILE NAVIGATION */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-gray-200 bg-white px-1 py-2 md:hidden"
        style={{
          gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))`,
        }}
      >
        {mobileNav.map(
          ([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex min-w-0 flex-col items-center gap-1 px-1 py-1 text-[9px] font-semibold text-gray-500 transition hover:text-gray-900"
            >
              <Icon size={18} />

              <span className="max-w-full truncate">
                {label === "Work Orders"
                  ? "Jobs"
                  : label}
              </span>
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}