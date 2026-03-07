import { Card, CardContent } from "@/components/ui/card";

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-36 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-7 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="py-8">
          <div className="h-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
