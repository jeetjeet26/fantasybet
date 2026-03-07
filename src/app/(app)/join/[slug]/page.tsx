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
    .from("leagues")
    .select("id, name")
    .or(`invite_slug.eq.${key},invite_code.eq.${key}`)
    .maybeSingle();

  if (!league) notFound();

  return <JoinBySlugForm slug={slug} leagueName={league.name} />;
}
