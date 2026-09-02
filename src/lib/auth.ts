import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

const DEV_SECRET =
  "detailflow-local-development-secret-please-change-before-production";

export async function getAuth() {
  const { env } = await getCloudflareContext({
    async: true,
  });

  return betterAuth({
    database: env.DB,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    secret:
      process.env.BETTER_AUTH_SECRET ||
      DEV_SECRET,

    baseURL:
      process.env.BETTER_AUTH_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://detailflow.detailflow.workers.dev"
        : "http://192.168.1.6:3000"),

    trustedOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.1.56:3000",
      "https://detailflow.detailflow.workers.dev",
    ],

    plugins: [
      admin(),
    ],
  });
}