"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function PasswordInput({
  name,
  placeholder,
  autoComplete,
}: {
  name: string;
  placeholder: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        minLength={8}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 pr-12 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
      />

      <button
        type="button"
        onClick={() => setShow((current) => !current)}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 transition hover:text-gray-900"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function OwnerPasswordFields() {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Password Lama
        </label>

        <PasswordInput
          name="currentPassword"
          placeholder="Password saat ini"
          autoComplete="current-password"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Password Baru
        </label>

        <PasswordInput
          name="newPassword"
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Konfirmasi Password Baru
        </label>

        <PasswordInput
          name="confirmPassword"
          placeholder="Ulangi password baru"
          autoComplete="new-password"
        />
      </div>
    </div>
  );
}