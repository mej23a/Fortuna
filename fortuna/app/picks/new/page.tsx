"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function NewPickPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser, []); // stable reference

  const [email, setEmail] = useState<string | null>(null);

  const [sport, setSport] = useState("");
  const [summary, setSummary] = useState("");
  const [odds, setOdds] = useState<string>(""); // keep as string for input
  const [betType, setBetType] = useState("");
  const [stake, setStake] = useState<string>(""); // optional
  const [confidence, setConfidence] = useState<number>(5);
  const [reasoning, setReasoning] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data.user) {
        router.push("/login");
        return;
      }

      setEmail(data.user.email ?? null);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // Odds: allow "+120", "-110", "  -110  "
  const oddsClean = odds.trim().replace(/\s+/g, "");
  const oddsInt = Number.parseInt(oddsClean, 10);

  const stakeClean = stake.trim();
  const stakeNum = stakeClean ? Number.parseFloat(stakeClean) : null;

  const canSubmit =
    sport.trim().length > 0 &&
    summary.trim().length > 0 &&
    betType.trim().length > 0 &&
    Number.isFinite(oddsInt) &&
    oddsInt !== 0 &&
    confidence >= 1 &&
    confidence <= 10 &&
    !loading;

  async function onCreatePick() {
    if (!canSubmit) return;

    setLoading(true);
    setErr(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase.from("picks").insert({
        user_id: userData.user.id,
        sport: sport.trim(),
        summary: summary.trim(),
        odds: oddsInt,
        bet_type: betType.trim(),
        stake: stakeNum,
        confidence,
        reasoning: reasoning.trim() || null,
      });

      if (error) throw error;

      router.push("/feed");
    } catch (e: unknown) {
      const message =
        typeof e === "object" && e && "message" in e ? String((e as any).message) : "Failed to create pick";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-xl space-y-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New pick</h1>
          {email && (
            <p className="text-xs opacity-70">
              Logged in as <strong>{email}</strong>
            </p>
          )}
        </div>

        <Link className="rounded-md border px-3 py-2 text-sm" href="/feed">
          Back to feed
        </Link>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <input
          className="w-full rounded-md border p-3"
          placeholder="Sport (e.g., NBA)"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        />

        <input
          className="w-full rounded-md border p-3"
          placeholder="Bet type (e.g., moneyline, spread, prop)"
          value={betType}
          onChange={(e) => setBetType(e.target.value)}
        />

        <input
          className="w-full rounded-md border p-3"
          placeholder="Summary (e.g., Lakers ML)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />

        <input
          className="w-full rounded-md border p-3"
          placeholder="Odds (American, e.g., -110 or +180)"
          value={odds}
          onChange={(e) => setOdds(e.target.value)}
          inputMode="text"
        />

        <input
          className="w-full rounded-md border p-3"
          placeholder="Stake (optional, e.g., 25)"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          inputMode="decimal"
        />

        <div className="space-y-1">
          <label className="text-sm opacity-80">Confidence: {confidence}/10</label>
          <input
            className="w-full"
            type="range"
            min={1}
            max={10}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
          />
        </div>

        <textarea
          className="w-full rounded-md border p-3"
          placeholder="Reasoning (optional)"
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={4}
        />

        <button
          className="w-full rounded-md bg-black p-3 text-white disabled:opacity-60"
          disabled={!canSubmit}
          onClick={onCreatePick}
          type="button"
        >
          {loading ? "Posting..." : "Post pick"}
        </button>

        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
    </div>
  );
}
