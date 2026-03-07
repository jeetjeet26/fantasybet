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
  const { data: league, error } = await supabase
    .rpc("find_league_by_invite", { input_token: key })
    .maybeSingle();

  if (error || !league) notFound();

  return <JoinBySlugForm slug={slug} leagueName={league.name} />;
}
