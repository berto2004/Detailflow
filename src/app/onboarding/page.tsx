"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);setError("");const name=String(new FormData(event.currentTarget).get("studioName")||"");const response=await fetch("/api/onboarding",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name})});setLoading(false);if(!response.ok){setError("Gagal membuat studio");return;}router.push("/dashboard");router.refresh();}
  return <main className="grid min-h-screen place-items-center bg-gray-100 p-5"><form onSubmit={submit} className="df-card w-full max-w-md p-8"><div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-gray-900 text-sm font-black text-white">DF</div><p className="text-xs font-bold uppercase tracking-wider text-gray-400">Langkah terakhir</p><h1 className="mt-2 text-2xl font-extrabold">Nama studio kamu</h1><p className="mt-2 text-sm text-gray-500">Nama ini akan tampil di dashboard DetailFlow.</p><label className="mt-6 block text-sm font-semibold">Nama studio<input name="studioName" required minLength={3} className="mt-1.5 w-full rounded-xl border px-3.5 py-3" placeholder="Contoh: Koda Auto Detailing" /></label>{error&&<p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="df-btn-primary mt-5 w-full py-3 disabled:opacity-60">{loading?"Membuat...":"Buat Studio & Masuk"}</button></form></main>;
}
