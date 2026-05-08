"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LtiGrantsResponse } from "@/lib/types"

const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 })
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
const TODAY = new Date().toISOString().split("T")[0]

const GRANT_BORDER: Record<string, string> = {
  LTI: "border-l-4 border-l-green-400",
  LTI2: "border-l-4 border-l-purple-400",
  LTI3: "border-l-4 border-l-red-400",
}

const GRANT_BADGE: Record<string, string> = {
  LTI: "bg-green-500/15 text-green-300 hover:bg-green-500/15 border-0",
  LTI2: "bg-purple-500/15 text-purple-300 hover:bg-purple-500/15 border-0",
  LTI3: "bg-red-500/15 text-red-300 hover:bg-red-500/15 border-0",
}

export function LtiGrantCards() {
  const { data, isLoading } = useQuery<LtiGrantsResponse>({
    queryKey: ["lti-grants"],
    queryFn: () => fetch("/api/lti-grants").then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-48 mt-1" />
              <div className="flex gap-3 mt-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {[0, 1, 2, 3].map(j => <Skeleton key={j} className="h-8 w-full" />)}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {data.grants.map(grant => {
        const paid = grant.schedule.filter(s => s.date <= TODAY)
        const upcoming = grant.schedule.filter(s => s.date > TODAY)
        const paidTotal = paid.reduce((s, r) => s + r.net, 0)
        const upcomingTotal = upcoming.reduce((s, r) => s + r.net, 0)
        const nextVestDate = grant.schedule.find(s => s.date > TODAY)?.date

        return (
          <Card key={grant.name} className={GRANT_BORDER[grant.name] ?? "border-l-4 border-l-white/20"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className={GRANT_BADGE[grant.name] ?? "border-0"}>
                    {grant.name}
                  </Badge>
                </CardTitle>
                <Badge variant="outline" className="text-xs shrink-0">{fmt(grant.total)} THB</Badge>
              </div>
              {grant.grant_date && (
                <CardDescription>
                  Granted {fmtDate(grant.grant_date)}
                  {grant.first_vest_pct
                    ? ` · ${(grant.first_vest_pct * 100).toFixed(2)}% / ${(grant.quarterly_pct! * 100).toFixed(2)}%`
                    : " · explicit schedule"}
                </CardDescription>
              )}
              <div className="flex gap-3 text-xs mt-1">
                <span className="text-muted-foreground">
                  Paid: <span className="font-semibold text-emerald-400">{fmt(paidTotal)}</span>
                </span>
                <span className="text-muted-foreground">
                  Upcoming: <span className="font-semibold text-blue-400">{fmt(upcomingTotal)}</span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-right text-xs">Amount</TableHead>
                      <TableHead className="text-right text-xs">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grant.schedule.map((row, i) => {
                      const isPast = row.date <= TODAY
                      const isNext = row.date === nextVestDate
                      return (
                        <TableRow key={i} className={isPast ? "opacity-50" : ""}>
                          <TableCell className="text-xs py-2">
                            {fmtDate(row.date)}
                            {isNext && (
                              <Badge className="ml-1 text-[10px] bg-blue-500/15 text-blue-300 hover:bg-blue-500/15 border-0 px-1 py-0 h-auto">
                                next
                              </Badge>
                            )}
                            {isPast && (
                              <Badge className="ml-1 text-[10px] bg-muted text-muted-foreground hover:bg-muted border-0 px-1 py-0 h-auto">
                                paid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums py-2">{fmt(row.amount)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums py-2 font-medium text-emerald-700">{fmt(row.net)}</TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="bg-white/[0.05] font-bold">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt(grant.schedule_total)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-emerald-700">
                        {fmt(grant.schedule.reduce((s, r) => s + r.net, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
