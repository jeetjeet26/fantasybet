import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function syncBetSettlement() {
  const supabase = await createClient();

  try {
    await supabase.functions.invoke("settle-bets");
  } catch {
    // Keep page loads resilient if the settlement worker is temporarily unavailable.
  }
}
