"use client";

import { useState } from "react";
import { inviteToLeague, cancelInvite } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface PendingInvite {
  id: string;
  invited_email: string;
  created_at: string;
}

interface Props {
  leagueId: string;
  inviteCode: string;
  inviteSlug: string;
  pendingInvites: PendingInvite[];
  isCommissioner: boolean;
}

export function InviteSection({ leagueId, inviteCode, inviteSlug, pendingInvites, isCommissioner }: Props) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/join/${inviteSlug}`
    : `${inviteCode}`;

  async function handleCopyCode() {
    await navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied!");
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!");
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await inviteToLeague(leagueId, email);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Invite added for ${email}`);
      setEmail("");
    }
    setPending(false);
  }

  async function handleCancelInvite(inviteId: string) {
    const result = await cancelInvite(inviteId);
    if (result?.error) toast.error(result.error);
    else toast.success("Invite cancelled");
  }

  const canInvite = isCommissioner || true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite Friends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Invite link</Label>
          <div className="flex gap-2">
            <Input value={`/join/${inviteSlug}`} readOnly className="font-mono text-sm" />
            <Button variant="outline" onClick={handleCopyLink}>
              Copy link
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Invite code</Label>
          <div className="flex gap-2">
            <Input value={inviteCode} readOnly className="font-mono" />
            <Button variant="outline" onClick={handleCopyCode}>
              Copy code
            </Button>
          </div>
        </div>

        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <Label>Pending invites</Label>
            <ul className="space-y-1 text-sm">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                  <span className="text-muted-foreground">{inv.invited_email}</span>
                  {isCommissioner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7"
                      onClick={() => handleCancelInvite(inv.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
        {canInvite && (
          <form onSubmit={handleInvite} className="space-y-2">
            <Label>Invite by email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={pending}>
                {pending ? "..." : "Add invite"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
