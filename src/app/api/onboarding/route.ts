import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { members, organizations } from "@/db/schema";
import { getSession } from "@/lib/workspace";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  const existing = await db.select({ id: members.id }).from(members).where(eq(members.authUserId, session.user.id)).limit(1);
  if (existing[0]) return Response.json({ ok: true });

  const body = await request.json() as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length < 3) return Response.json({ error: "invalid_name" }, { status: 400 });

  const now = new Date();
  const organizationId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const slug = `${slugify(name)}-${organizationId.slice(0, 6)}`;

  await db.insert(organizations).values({ id: organizationId, name, slug, status: "trial", createdAt: now, updatedAt: now });
  await db.insert(members).values({ id: memberId, organizationId, authUserId: session.user.id, role: "owner", active: true, createdAt: now, updatedAt: now });

  return Response.json({ ok: true, organizationId });
}
