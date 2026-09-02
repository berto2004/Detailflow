import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";

export type AppRole =
  | "owner"
  | "admin"
  | "technician";

export async function requireRole(
  allowedRoles: AppRole[],
) {
  const workspace = await requireWorkspace();

  if (!allowedRoles.includes(workspace.role)) {
    redirect("/dashboard");
  }

  return workspace;
}