import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight">FantasyLines</span>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Fantasy betting
            <br />
            <span className="text-muted-foreground">with friends</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Get 100 credits every day. Bet on 5 real game lines. Compete on daily
            and weekly leaderboards. No real money — just bragging rights.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Start Playing
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid max-w-3xl gap-8 sm:grid-cols-3">
          <Feature
            title="Daily Lines"
            description="5 games pulled from real odds each morning across NFL, NBA, MLB, NHL, and more."
          />
          <Feature
            title="100 Daily Credits"
            description="Fresh bankroll every day. Spread it across spreads, moneylines, and totals."
          />
          <Feature
            title="Compete Weekly"
            description="Your daily banked credits roll into a weekly leaderboard to crown the champion."
          />
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        FantasyLines — No real money involved. Play responsibly.
      </footer>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
