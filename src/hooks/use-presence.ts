import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type PresencePeer = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export type PeerCursor = PresencePeer & {
  x: number; // fraction of document width
  y: number; // absolute page Y in px
  at: number;
};

type Me = { userId: string; username: string; avatarUrl: string | null };

const CURSOR_TTL = 8000;

/**
 * Shared presence channel: tracks who is online and (optionally) broadcasts
 * pointer position so the group can see each other's cursors live.
 */
export function usePresence(room: string, me: Me | null, withCursors = false) {
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [cursors, setCursors] = useState<PeerCursor[]>([]);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!me) return;
    const channel = supabase.channel(`presence:${room}`, {
      config: { presence: { key: me.userId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Me>();
      const list: PresencePeer[] = [];
      Object.values(state).forEach((entries) => {
        const entry = entries[0] as unknown as Me | undefined;
        if (!entry?.userId) return;
        if (list.some((p) => p.userId === entry.userId)) return;
        list.push({
          userId: entry.userId,
          username: entry.username,
          avatarUrl: entry.avatarUrl ?? null,
        });
      });
      setPeers(list);
    });

    if (withCursors) {
      channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
        const data = payload as PeerCursor;
        if (!data?.userId || data.userId === me.userId) return;
        setCursors((current) => [
          ...current.filter((c) => c.userId !== data.userId),
          { ...data, at: Date.now() },
        ]);
      });
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void channel.track(me);
    });

    let onMove: ((event: PointerEvent) => void) | undefined;
    if (withCursors) {
      onMove = (event: PointerEvent) => {
        const now = Date.now();
        if (now - lastSent.current < 70) return;
        lastSent.current = now;
        void channel.send({
          type: "broadcast",
          event: "cursor",
          payload: {
            userId: me.userId,
            username: me.username,
            avatarUrl: me.avatarUrl,
            x: event.pageX / Math.max(document.documentElement.scrollWidth, 1),
            y: event.pageY,
            at: now,
          },
        });
      };
      window.addEventListener("pointermove", onMove);
    }

    const prune = window.setInterval(() => {
      setCursors((current) => current.filter((c) => Date.now() - c.at < CURSOR_TTL));
    }, 2000);

    return () => {
      if (onMove) window.removeEventListener("pointermove", onMove);
      window.clearInterval(prune);
      void supabase.removeChannel(channel);
    };
  }, [room, me?.userId, me?.username, me?.avatarUrl, withCursors]);

  return { peers, cursors };
}
