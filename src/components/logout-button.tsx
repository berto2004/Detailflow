"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="Logout"
      className="
        flex items-center justify-center gap-3
        rounded-xl
        text-red-600
        transition
        hover:bg-red-50

        h-10 w-10
        md:h-auto md:w-full
        md:justify-start
        md:px-3 md:py-2.5
      "
    >
      <LogOut size={18} />

      <span className="hidden text-sm font-semibold md:inline">
        Logout
      </span>
    </button>
  );
}