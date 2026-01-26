"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onLogin() {
    setLoading(true);
    setErr(null);

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) return setErr(error.message);

    router.push("/home");
  }

  return (
    <div className="mx-auto mt-16 max-w-md space-y-4 px-4">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <input className="w-full rounded-md border p-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input className="w-full rounded-md border p-3"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="w-full rounded-md bg-black p-3 text-white disabled:opacity-60"
        disabled={loading || !email || !password}
        onClick={onLogin}
      >
        {loading ? "Logging in..." : "Log in"}
      </button>

      {err && <p className="text-red-500">{err}</p>}
      <a className="underline text-sm" href="/signup">No account? Sign up</a>
    </div>
  );
}
