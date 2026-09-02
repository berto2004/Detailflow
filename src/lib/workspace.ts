import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { members, organizations } from "@/db/schema";

export async function getSession() {
  const auth = await getAuth();

  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireWorkspace() {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = getDb();
  const rows = await db
    .select({
      memberId: members.id,
      organizationId: organizations.id,
      organizationName: organizations.name,
      role: members.role,
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(eq(members.authUserId, session.user.id))
    .limit(1);

  if (!rows[0]) redirect("/onboarding");
  return { session, ...rows[0] };
}
