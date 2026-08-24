import { useEffect, useState } from "react";

import { PersonAvatar } from "@/components/person-mark";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PeerCursor, PresencePeer } from "@/hooks/use-presence";
import { personHex } from "@/lib/people";
import type { Profile } from "@/lib/notes";

export function PresenceBar({
  peers,
  profileById,
}: {
  peers: PresencePeer[];
  profileById: Map<string, Profile>;
}) {
  if (peers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {peers.length} online
        </span>
        <div className="flex -space-x-2">
          {peers.slice(0, 5).map((peer) => (
            <Tooltip key={peer.userId}>
              <TooltipTrigger asChild>
                <span
                  className="rounded-full ring-2"
                  style={{ ["--tw-ring-color" as string]: personHex(peer.userId) }}
                >
                  <PersonAvatar person={profileById.get(peer.userId)} size="size-7" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {profileById.get(peer.userId)?.username ?? peer.username} sedang online
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

/** Live cursors of other members, rendered over the page. */
export function CursorLayer({ cursors }: { cursors: PeerCursor[] }) {
  const [scrollY, setScrollY] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      setScrollY(window.scrollY);
      setWidth(document.documentElement.scrollWidth);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (cursors.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 hidden overflow-hidden md:block">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute -translate-y-1 transition-transform duration-75"
          style={{ left: cursor.x * width, top: cursor.y - scrollY }}
        >
          <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden>
            <path d="M1 1 L1 16 L5.5 12 L8.5 18.5 L11 17 L8 11 L14 10.5 Z" fill={personHex(cursor.userId)} />
          </svg>
          <span
            className="ml-3 -mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
            style={{ backgroundColor: personHex(cursor.userId) }}
          >
            {cursor.username}
          </span>
        </div>
      ))}
    </div>
  );
}
