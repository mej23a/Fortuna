"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setEmail(data.user.email ?? null);
      }
    });
  }, [router]);

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="mx-auto mt-10 max-w-xl space-y-4 px-4">
      <h1 className="text-2xl font-semibold">Home</h1>

      {email && (
        <p className="text-sm opacity-80">
          Logged in as <strong>{email}</strong>
        </p>
      )}

      <div className="space-y-2 pt-4">
        <Link className="block underline" href="/feed">
          → View feed
        </Link>

        <Link className="block underline" href="/picks/new">
          → Create a pick
        </Link>

        <Link className="block underline" href="/profile">
          → Profile (coming next)
        </Link>
      </div>

      <button
        onClick={logout}
        className="mt-6 rounded-md border px-4 py-2 text-sm"
      >
        Log out
      </button>
    </div>
  );
}
