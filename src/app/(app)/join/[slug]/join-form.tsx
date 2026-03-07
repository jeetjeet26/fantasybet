"use client";

import { useState } from "react";
import { joinLeague } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function JoinBySlugForm({ slug, leagueName }: { slug: string; leagueName: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setPending(true);
    setError(null);
    const result = await joinLeague(slug);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Join {leagueName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You were invited to join this league. Click below to join.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleJoin} disabled={pending}>
            {pending ? "Joining..." : "Join league"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
