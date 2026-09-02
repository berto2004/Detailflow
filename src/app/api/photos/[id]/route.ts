import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { jobPhotos } from "@/db/schema";
import { requireWorkspace } from "@/lib/workspace";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    const workspace = await requireWorkspace();
    const db = getDb();

    const [photo] = await db
      .select()
      .from(jobPhotos)
      .where(
        and(
          eq(jobPhotos.id, id),
          eq(
            jobPhotos.organizationId,
            workspace.organizationId,
          ),
        ),
      )
      .limit(1);

    if (!photo) {
      return new Response("Foto tidak ditemukan", {
        status: 404,
      });
    }

    const { env } = await getCloudflareContext({
      async: true,
    });

    const object = await env.PHOTOS.get(photo.objectKey);

    if (!object) {
      console.error(
        "R2 FILE NOT FOUND:",
        photo.objectKey,
      );

      return new Response("File R2 tidak ditemukan", {
        status: 404,
      });
    }

    const buffer = await object.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType ||
          "image/jpeg",

        "Cache-Control":
          "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("PHOTO GET ERROR:", error);

    return new Response("Gagal membuka foto", {
      status: 500,
    });
  }
} 