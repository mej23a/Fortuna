"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type CommentRow = {
  id: string | number;
  pick_id: number;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { username: string } | null;
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

type Props = {
  pickId: number;
  userId: string | null;
  initialComments: CommentRow[];
  onCreated: (comment: CommentRow) => void;
  onDeleted: (commentId: string | number) => void;
  onError: (message: string) => void;
};

export default function PickComments({
  pickId,
  userId,
  initialComments,
  onCreated,
  onDeleted,
  onError,
}: Props) {
  const supabase = supabaseBrowser;

  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setComments(initialComments);
    setDeletingId(null);
  }, [pickId, initialComments]);

  const canPost = !!userId;

  const createComment = async () => {
    if (submitting) return;

    if (!userId) {
      onError("You must be logged in to comment.");
      return;
    }

    const body = text.trim();
    if (!body) return;

    setSubmitting(true);
    onError("");

    const { data, error } = await supabase
      .from("pick_comments")
      .insert({
        pick_id: pickId,
        user_id: userId,
        body,
      })
      .select(
        `
          id,
          pick_id,
          user_id,
          body,
          created_at,
          profiles:profiles ( username )
        `
      )
      .single();

    setSubmitting(false);

    if (error) {
      onError(error.message);
      return;
    }

    if (!data) {
      onError("Comment insert returned no data.");
      return;
    }

    const newComment = data as unknown as CommentRow;

    setText("");
    setComments((prev) => [...prev, newComment]);
    onCreated(newComment);
  };

  const deleteComment = async (commentId: string | number) => {
    if (!userId) {
      onError("You must be logged in.");
      return;
    }

    const commentIdStr = String(commentId);

    setDeletingId(commentIdStr);
    onError("");

    const prev = comments;
    setComments((cur) => cur.filter((c) => String(c.id) !== commentIdStr));

    const { error } = await supabase
      .from("pick_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId);

    setDeletingId(null);

    if (error) {
      setComments(prev);
      onError(error.message);
      return;
    }

    onDeleted(commentId);
  };

  return (
    <div className="rounded-md bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-white">Comments</div>
        <div className="text-xs text-white/60">{comments.length}</div>
      </div>

      {comments.length === 0 ? (
        <div className="mb-3 text-sm text-white/60">No comments yet.</div>
      ) : (
        <div className="mb-3 space-y-2">
          {comments.map((c) => {
            const username = c.profiles?.username ?? "unknown";
            const isMine = userId != null && c.user_id === userId;

            return (
              <div
                key={String(c.id)}
                className="rounded-md border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        @{username}
                      </span>
                      <span className="text-[11px] text-white/60">
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-white">
                      {c.body}
                    </p>
                  </div>

                  {isMine && (
                    <button
                      onClick={() => void deleteComment(c.id)}
                      disabled={deletingId === String(c.id)}
                      className="shrink-0 text-xs text-white/60 hover:text-red-400 disabled:opacity-50"
                      aria-label="Delete comment"
                      type="button"
                    >
                      {deletingId === String(c.id) ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!canPost || submitting}
          placeholder={canPost ? "Write a comment…" : "Log in to comment"}
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-60"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void createComment();
            }
          }}
        />
        <button
          onClick={() => void createComment()}
          disabled={!canPost || submitting || text.trim().length === 0}
          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          type="button"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
