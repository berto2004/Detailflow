"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "Owner").trim();

    try {
      if (mode === "register") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message || "Gagal membuat akun.");
          return;
        }

        window.location.href = "/onboarding";
        return;
      }

      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Username atau password salah.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("AUTH ERROR:", err);
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-gray-950 lg:grid-cols-2">
      {/* LEFT SIDE */}
      <section className="hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-sm font-black text-gray-950">
            DF
          </span>

          <b className="text-xl">DetailFlow</b>
        </div>

        <div className="max-w-lg">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
            Auto Detailing Management
          </p>

          <h1 className="text-5xl font-black leading-tight">
            Kelola studio detailing dari satu tempat.
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-gray-400">
            Customer, kendaraan, booking, work order, dokumentasi, dan
            pembayaran.
          </p>
        </div>

        <p className="text-xs text-gray-600">
          DetailFlow MVP
        </p>
      </section>

      {/* LOGIN SIDE */}
      <section className="grid min-h-screen place-items-center bg-gray-50 p-5 lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gray-900 text-xs font-black text-white">
              DF
            </span>

            <b className="text-xl text-gray-900">
              DetailFlow
            </b>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm md:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
              {mode === "login"
                ? "Selamat datang"
                : "Buat akun owner"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {mode === "login"
                ? "Masuk untuk mengelola studio kamu."
                : "Mulai setup studio detailing kamu."}
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-4"
            >
              {mode === "register" && (
                <Field
                  label="Nama owner"
                  name="name"
                  autoComplete="name"
                />
              )}

              <Field
                label={mode === "login" ? "Username / Email" : "Email"}
                name="email"
                type="email"
                autoComplete="email"
              />

              <PasswordField
                label="Password"
                name="password"
                minLength={8}
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
              />

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold !text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Memproses..."
                  : mode === "login"
                    ? "Masuk ke DetailFlow"
                    : "Buat Akun"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setError("");
                setMode(
                  mode === "login"
                    ? "register"
                    : "login",
                );
              }}
              className="mt-5 w-full text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              {mode === "login"
                ? "Belum punya akun? Daftar"
                : "Sudah punya akun? Masuk"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  minLength,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}

      <input
        name={name}
        type={type}
        minLength={minLength}
        autoComplete={autoComplete}
        required
        className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
      />
    </label>
  );
}

function PasswordField({
  label,
  name,
  minLength,
  autoComplete,
}: {
  label: string;
  name: string;
  minLength?: number;
  autoComplete?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}

      <div className="relative mt-1.5">
        <input
          name={name}
          type={showPassword ? "text" : "password"}
          minLength={minLength}
          autoComplete={autoComplete}
          required
          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 pr-12 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        />

        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 transition hover:text-gray-900"
        >
          {showPassword ? (
            <EyeOff size={19} />
          ) : (
            <Eye size={19} />
          )}
        </button>
      </div>
    </label>
  );
}