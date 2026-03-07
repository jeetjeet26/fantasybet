"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeMember } from "@/lib/actions/leagues";
import { toast } from "sonner";

interface Member {
  user_id: string;
  joined_at: string;
  role?: "commissioner" | "member";
  profiles: { id: string; display_name: string; avatar_url: string | null } | null;
}

interface Props {
  leagueId: string;
  members: Member[];
  isCommissioner: boolean;
}

export function MembersList({ leagueId, members, isCommissioner }: Props) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    const result = await removeMember(leagueId, userId);
    if (result?.error) toast.error(result.error);
    else toast.success("Member removed");
    setConfirmRemove(null);
    setRemovingId(null);
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {(m.profiles?.display_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{m.profiles?.display_name ?? "Unknown"}</p>
                {m.role === "commissioner" && (
                  <Badge variant="secondary" className="text-xs">Commissioner</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Joined {new Date(m.joined_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {isCommissioner && m.role !== "commissioner" && (
            <Dialog open={confirmRemove === m.user_id} onOpenChange={(open) => !open && setConfirmRemove(null)}>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmRemove(m.user_id)}
                disabled={!!removingId}
              >
                Remove
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove member</DialogTitle>
                  <DialogDescription>
                    Remove {m.profiles?.display_name ?? "this member"} from the league? They will need a new invite to rejoin.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRemove(m.user_id)}
                    disabled={removingId === m.user_id}
                  >
                    {removingId === m.user_id ? "Removing..." : "Remove"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      ))}
    </div>
  );
}
