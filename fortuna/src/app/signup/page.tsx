"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSignup() {
    setLoading(true);
    setErr(null);

    const { error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    setLoading(false);
    if (error) return setErr(error.message);

    router.push("/login");
  }

  return (
    <div className="mx-auto mt-16 max-w-md space-y-4 px-4">
      <h1 className="text-2xl font-semibold">Sign up</h1>

      <input className="w-full rounded-md border p-3"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input className="w-full rounded-md border p-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input className="w-full rounded-md border p-3"
        type="password"
        placeholder="Password (8+ chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="w-full rounded-md bg-black p-3 text-white disabled:opacity-60"
        disabled={loading || username.length < 3 || password.length < 8 || !email}
        onClick={onSignup}
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {err && <p className="text-red-500">{err}</p>}
      <a className="underline text-sm" href="/login">Already have an account? Log in</a>
    </div>
  );
}
