import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { NotebookPen, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/person-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMyProfile } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { TEAM_ROLE_LABEL } from "@/lib/people";
import type { Profile } from "@/lib/notes";

export function AppHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useMyProfile();
  const profile = (data?.profile ?? undefined) as Profile | undefined;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <NotebookPen className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">MyCatatanGwe</span>
            <span className="block text-xs text-muted-foreground">Catatan kelompok bersama</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {profile ? (
            <div className="flex items-center gap-2">
              <PersonAvatar person={profile} size="size-8" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-medium">{profile.username}</span>
                <span className="block text-xs text-muted-foreground">
                  {TEAM_ROLE_LABEL[profile.team_role]}
                </span>
              </span>
            </div>
          ) : null}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
