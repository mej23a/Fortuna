"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameClean = username.trim();
  const emailClean = email.trim();
  const emailValid = /^\S+@\S+\.\S+$/.test(emailClean);

  async function onSignup() {
    if (loading) return;

    setLoading(true);
    setErr(null);

    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email: emailClean,
        password,
        options: {
          data: { username: usernameClean },
        },
      });

      if (error) throw error;

      // If confirmations were turned ON later, session may be null.
      if (!data.session) {
        router.push("/login");
        return;
      }

      router.push("/home");
    } catch (e: unknown) {
      const message =
        typeof e === "object" && e && "message" in e
          ? String((e as any).message)
          : "Signup failed.";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md space-y-4 px-4">
      <h1 className="text-2xl font-semibold">Sign up</h1>

      <input
        className="w-full rounded-md border p-3"
        placeholder="Username (3+ chars)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />

      <input
        className="w-full rounded-md border p-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <input
        className="w-full rounded-md border p-3"
        type="password"
        placeholder="Password (8+ chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      <button
        className="w-full rounded-md bg-black p-3 text-white disabled:opacity-60"
        disabled={loading || usernameClean.length < 3 || password.length < 8 || !emailValid}
        onClick={onSignup}
        type="button"
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <Link className="underline text-sm" href="/login">
        Already have an account? Log in
      </Link>
    </div>
  );
}
