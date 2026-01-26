"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import PickComments, { type CommentRow } from "@/components/PickComments";

type PickRow = {
  id: number; // picks.id (int/bigint)
  user_id: string; // uuid
  sport: string;
  bet_type: string;
  summary: string;
  odds: number;
  stake: number | null;
  confidence: number;
  reasoning: string | null;
  created_at: string;

  profiles?: { username: string } | null;

  // aggregate (array shape when selected like this)
  pick_likes?: { count: number }[] | null;

  // joined rows for liked state (we compute liked state client-side)
  pick_likes_user?: { user_id: string }[] | null;

  // nested comments
  pick_comments?: CommentRow[] | null;
};

function timeAgo(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;

  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;

  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}

export default function FeedPage() {
  // supabaseBrowser is already the client instance (not a function)
  const supabase = supabaseBrowser;

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState<PickRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load user once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) {
        setError(error.message);
        setUserId(null);
        return;
      }

      setUserId(data.user?.id ?? null);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Load feed
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      // ✅ IMPORTANT FIX:
      // You must destructure { data, error } from the query.
      const { data, error } = await supabase
        .from("picks")
        .select(
          `
            id,
            user_id,
            sport,
            bet_type,
            summary,
            odds,
            stake,
            confidence,
            reasoning,
            created_at,
            profiles:profiles!picks_user_id_fkey ( username ),
            pick_likes:pick_likes ( count ),
            pick_likes_user:pick_likes ( user_id ),
            pick_comments:pick_comments (
              id,
              pick_id,
              user_id,
              body,
              created_at,
              profiles:profiles!pick_comments_user_id_fkey ( username )
            )
          `
        )
        .order("created_at", { ascending: false })
        .order("created_at", { ascending: true, foreignTable: "pick_comments" });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setPicks([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as PickRow[];

      // Compute liked state on the client without filtering the whole query
      const normalized = rows.map((p) => {
        const liked =
          userId != null &&
          (p.pick_likes_user ?? []).some((x) => x.user_id === userId);

        return {
          ...p,
          pick_likes_user: liked && userId ? [{ user_id: userId }] : [],
        };
      });

      setPicks(normalized);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, userId]);

  const toggleLike = async (pickId: number, isLiked: boolean) => {
    if (!userId) {
      setError("You must be logged in to like picks.");
      return;
    }

    setError(null);

    // Optimistic update
    setPicks((prev) =>
      prev.map((p) => {
        if (p.id !== pickId) return p;

        const currentCount = p.pick_likes?.[0]?.count ?? 0;
        const nextCount = Math.max(0, currentCount + (isLiked ? -1 : 1));

        return {
          ...p,
          pick_likes: [{ count: nextCount }],
          pick_likes_user: isLiked ? [] : [{ user_id: userId }],
        };
      })
    );

    if (!isLiked) {
      const { error } = await supabase.from("pick_likes").insert({
        pick_id: pickId,
        user_id: userId,
      });

      if (error) {
        // revert
        setPicks((prev) =>
          prev.map((p) => {
            if (p.id !== pickId) return p;
            const count = p.pick_likes?.[0]?.count ?? 0;
            return {
              ...p,
              pick_likes: [{ count: Math.max(0, count - 1) }],
              pick_likes_user: [],
            };
          })
        );
        setError(error.message);
      }
    } else {
      const { error } = await supabase
        .from("pick_likes")
        .delete()
        .eq("pick_id", pickId)
        .eq("user_id", userId);

      if (error) {
        // revert
        setPicks((prev) =>
          prev.map((p) => {
            if (p.id !== pickId) return p;
            const count = p.pick_likes?.[0]?.count ?? 0;
            return {
              ...p,
              pick_likes: [{ count: count + 1 }],
              pick_likes_user: [{ user_id: userId }],
            };
          })
        );
        setError(error.message);
      }
    }
  };

  const handleCommentCreated = (pickId: number, newComment: CommentRow) => {
    setPicks((prev) =>
      prev.map((p) => {
        if (p.id !== pickId) return p;
        const existing = p.pick_comments ?? [];
        return { ...p, pick_comments: [...existing, newComment] };
      })
    );
  };

  const handleCommentDeleted = (pickId: number, commentId: string | number) => {
    setPicks((prev) =>
      prev.map((p) => {
        if (p.id !== pickId) return p;
        const existing = p.pick_comments ?? [];
        return {
          ...p,
          pick_comments: existing.filter(
            (c) => String(c.id) !== String(commentId)
          ),
        };
      })
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Feed</h1>
          <p className="text-sm opacity-70">Latest picks from the community</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/picks/new"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            New pick
          </Link>
          <Link href="/home" className="text-sm opacity-70 hover:underline">
            Home
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : picks.length === 0 ? (
        <div className="text-sm opacity-70">No picks yet.</div>
      ) : (
        <div className="space-y-4">
          {picks.map((pick) => {
            const username = pick.profiles?.username ?? "unknown";
            const likeCount = pick.pick_likes?.[0]?.count ?? 0;
            const isLiked = (pick.pick_likes_user?.length ?? 0) > 0;

            return (
              <div key={pick.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">@{username}</span>
                      <span className="text-xs opacity-70">
                        {timeAgo(pick.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm">{pick.summary}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-70">
                      <span className="rounded border px-2 py-1">
                        Sport: {pick.sport}
                      </span>
                      <span className="rounded border px-2 py-1">
                        Type: {pick.bet_type}
                      </span>
                      <span className="rounded border px-2 py-1">
                        Odds: {pick.odds > 0 ? `+${pick.odds}` : pick.odds}
                      </span>
                      <span className="rounded border px-2 py-1">
                        Stake: {pick.stake ?? "—"}
                      </span>
                      <span className="rounded border px-2 py-1">
                        Confidence: {pick.confidence}/10
                      </span>
                    </div>

                    {pick.reasoning && (
                      <p className="mt-3 whitespace-pre-wrap text-sm opacity-90">
                        {pick.reasoning}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => void toggleLike(pick.id, isLiked)}
                    className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-black/5"
                    aria-label={isLiked ? "Unlike" : "Like"}
                    type="button"
                  >
                    <span className="mr-2">{isLiked ? "♥" : "♡"}</span>
                    {likeCount}
                  </button>
                </div>

                <div className="mt-4">
                  <PickComments
                    pickId={pick.id}
                    userId={userId}
                    initialComments={pick.pick_comments ?? []}
                    onCreated={(c) => handleCommentCreated(pick.id, c)}
                    onDeleted={(commentId) =>
                      handleCommentDeleted(pick.id, commentId)
                    }
                    onError={(msg) => setError(msg)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
