"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeInviteToken(input: string) {
  let key = input.trim().toLowerCase();

  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      const url = new URL(key);
      key = url.pathname.toLowerCase();
    } catch {
      // Fall through to string-based cleanup.
    }
  }

  key = key.split("?")[0]?.split("#")[0] ?? key;
  key = key.replace(/^\/+/, "");

  if (key.startsWith("join/")) key = key.slice("join/".length);
  if (key.startsWith("leagues/join/")) key = key.slice("leagues/join/".length);

  return key.trim();
}

interface JoinLeagueInviteResult {
  league_id: string | null;
  error: string | null;
}

export async function createLeague(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;

  const { data, error } = await supabase
    .from("leagues")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  // Backfill today's open games for newly-created leagues if available.
  // This handles leagues created after the scheduled daily snapshot.
  try {
    await supabase.functions.invoke("snapshot-odds");
  } catch {
    // Non-fatal: league still exists even if odds pull fails.
  }

  redirect(`/leagues/${data.id}`);
}

export async function joinLeague(slugOrCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = normalizeInviteToken(slugOrCode);
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  const key = normalizeInviteToken(slugOrCode);

  const { data: joinResult, error: joinError } = await supabase
    .rpc("join_league_by_invite", { invite_token: key })
    .maybeSingle<JoinLeagueInviteResult>();

  if (joinError) return { error: joinError.message };
  if (!joinResult) return { error: "League not found" };
  if (joinResult.error) return { error: joinResult.error };
  if (!joinResult.league_id) return { error: "League not found" };

  redirect(`/leagues/${joinResult.league_id}`);
}

export async function inviteToLeague(leagueId: string, email: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "Not a member" };

  const { data: league } = await supabase
    .from("leagues")
    .select("invite_mode")
    .eq("id", leagueId)
    .maybeSingle();

  if (league?.invite_mode === "commissioner_only" && membership.role !== "commissioner") {
    return { error: "Only the commissioner can invite" };
  }

  const { error } = await supabase
    .from("league_invites")
    .insert({ league_id: leagueId, invited_email: email, invited_by: user.id });

  if (error) return { error: error.message };
  return { success: true };
}

export async function cancelInvite(inviteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: invite } = await supabase
    .from("league_invites")
    .select("league_id")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) return { error: "Invite not found" };

  const { data: membership } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", invite.league_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "commissioner") return { error: "Only commissioner can cancel invites" };

  const { error } = await supabase.from("league_invites").delete().eq("id", inviteId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateLeagueSettings(leagueId: string, updates: { name?: string; description?: string | null; max_members?: number | null; invite_mode?: "any_member" | "commissioner_only"; logo_url?: string | null }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "commissioner") return { error: "Only commissioner can update settings" };

  const { error } = await supabase.from("leagues").update(updates).eq("id", leagueId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function removeMember(leagueId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "commissioner") return { error: "Only commissioner can remove members" };
  if (userId === user.id) return { error: "Commissioner cannot remove themselves" };

  const { error } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteLeague(leagueId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "commissioner") return { error: "Only commissioner can delete the league" };

  const { error } = await supabase.from("leagues").delete().eq("id", leagueId);
  if (error) return { error: error.message };
  redirect("/leagues");
}
