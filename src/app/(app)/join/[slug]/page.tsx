import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { JoinBySlugForm } from "./join-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function JoinBySlugPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const key = slug.toLowerCase().trim();
  const { data: league } = await supabase
    .rpc("resolve_league_invite", { invite_token: key })
    .maybeSingle<{ league_id: string; league_name: string; max_members: number | null }>();

  if (!league) notFound();

  return <JoinBySlugForm slug={slug} leagueName={league.league_name} />;
}
