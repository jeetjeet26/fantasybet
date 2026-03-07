"use client";

import { useState } from "react";
import { updateLeagueSettings, deleteLeague } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface LeagueRow {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  description?: string | null;
  max_members?: number | null;
  invite_mode?: "any_member" | "commissioner_only";
  logo_url?: string | null;
}

interface Props {
  leagueId: string;
  league: LeagueRow;
}

export function CommissionerSection({ leagueId, league }: Props) {
  const [name, setName] = useState(league.name);
  const [description, setDescription] = useState(league.description ?? "");
  const [maxMembers, setMaxMembers] = useState(league.max_members?.toString() ?? "");
  const [inviteMode, setInviteMode] = useState<"any_member" | "commissioner_only">(league.invite_mode ?? "any_member");
  const [pending, setPending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  async function handleSave() {
    setPending(true);
    const result = await updateLeagueSettings(leagueId, {
      name: name || undefined,
      description: description || null,
      max_members: maxMembers ? parseInt(maxMembers, 10) : null,
      invite_mode: inviteMode,
    });
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Settings saved");
    }
    setPending(false);
  }

  async function handleDelete() {
    if (deleteConfirm !== league.name) return;
    setDeletePending(true);
    await deleteLeague(leagueId);
    setDeletePending(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">League settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">League name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of your league"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_members">Max members (leave empty for unlimited)</Label>
            <Input
              id="max_members"
              type="number"
              min={2}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <div className="space-y-2">
            <Label>Who can invite</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invite_mode"
                  checked={inviteMode === "any_member"}
                  onChange={() => setInviteMode("any_member")}
                />
                Any member
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invite_mode"
                  checked={inviteMode === "commissioner_only"}
                  onChange={() => setInviteMode("commissioner_only")}
                />
                Commissioner only
              </label>
            </div>
          </div>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger render={<Button variant="destructive" />}>
              Delete league
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete league</DialogTitle>
                <DialogDescription>
                  This cannot be undone. All members, slates, and bets for this league will be removed.
                  Type the league name to confirm.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={league.name}
                className="mt-2"
              />
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConfirm !== league.name || deletePending}
                >
                  {deletePending ? "Deleting..." : "Delete league"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
