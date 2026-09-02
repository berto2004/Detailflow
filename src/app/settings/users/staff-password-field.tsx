"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function StaffPasswordField({
  name,
  placeholder,
}: {
  name: string;
  placeholder: string;
}) {
  const [showPassword, setShowPassword] =
    useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={
          showPassword
            ? "text"
            : "password"
        }
        minLength={8}
        required
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 pr-12 text-sm text-gray-900 outline-none focus:border-gray-900"
      />

      <button
        type="button"
        onClick={() =>
          setShowPassword(
            (current) => !current,
          )
        }
        aria-label={
          showPassword
            ? "Sembunyikan password"
            : "Tampilkan password"
        }
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 hover:text-gray-900"
      >
        {showPassword ? (
          <EyeOff size={18} />
        ) : (
          <Eye size={18} />
        )}
      </button>
    </div>
  );
}