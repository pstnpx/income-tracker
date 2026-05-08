"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PaymentsResponse, IncomeView, Payment } from "@/lib/types"

const PROVIDENT_FUND_PCT = 0.03  // 3% of monthly salary per pay period
const SOCIAL_FUND_THB    = 875   // ~875/month deducted on the 7th

const BADGE_VARIANT: Record<string, string> = {
  Salary: "bg-blue-500/15 text-blue-300 hover:bg-blue-500/15 border-0",
  LTI:    "bg-green-500/15 text-green-300 hover:bg-green-500/15 border-0",
  LTI2:   "bg-purple-500/15 text-purple-300 hover:bg-purple-500/15 border-0",
  LTI3:   "bg-red-500/15 text-red-300 hover:bg-red-500/15 border-0",
  STI:    "bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/15 border-0",
  Bonus:  "bg-teal-500/15 text-teal-300 hover:bg-teal-500/15 border-0",
}

const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 })
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
const TODAY = new Date().toISOString().split("T")[0]

function getDeductions(p: Payment) {
  const stock    = p.stock_deduct
  const tax      = p.tax
  const pf       = p.type === "Salary" ? Math.round(p.gross * PROVIDENT_FUND_PCT) : 0
  const isFirst  = new Date(p.date).getDate() === 7
  const social   = p.type === "Salary" && isFirst ? SOCIAL_FUND_THB : 0
  const takeHome = p.take_home - pf - social
  return { stock, tax, pf, social, takeHome }
}

interface GroupedPayment {
  date: string
  types: string[]
  gross: number
  stock: number
  tax: number
  pf: number
  social: number
  net: number
  takeHome: number
}

function groupPaymentsByDate(payments: Payment[]): GroupedPayment[] {
  const map = new Map<string, GroupedPayment>()
  for (const p of payments) {
    const d = getDeductions(p)
    if (!map.has(p.date)) {
      map.set(p.date, { date: p.date, types: [], gross: 0, stock: 0, tax: 0, pf: 0, social: 0, net: 0, takeHome: 0 })
    }
    const g = map.get(p.date)!
    g.types.push(p.type)
    g.gross    += p.gross
    g.stock    += d.stock
    g.tax      += d.tax
    g.pf       += d.pf
    g.social   += d.social
    g.net      += p.net
    g.takeHome += d.takeHome
  }
  return [...map.values()]
}

export function PaymentsTable({ viewMode, groupByDate }: { viewMode: IncomeView; groupByDate: boolean }) {
  const [filter, setFilter] = useState<string>("All")
  const { data, isLoading } = useQuery<PaymentsResponse>({
    queryKey: ["payments"],
    queryFn: () => fetch("/api/payments").then(r => r.json()),
  })

  const payments = data?.payments ?? []
  const types = ["All", ...new Set(payments.map(p => p.type))]
  const filtered = filter === "All" ? payments : payments.filter(p => p.type === filter)
  const grouped = groupPaymentsByDate(filtered)

  if (isLoading) {
    return (
      <Card className="">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-16 rounded-md" />)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isDeductions = viewMode === "deductions"

  return (
    <Card className="">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">All Payments</CardTitle>
          {!groupByDate && (
            <div className="flex gap-1 flex-wrap">
              {types.map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={filter === t ? "default" : "outline"}
                  onClick={() => setFilter(t)}
                  className="h-7 text-xs px-3"
                >
                  {t}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[480px] overflow-y-auto">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  {isDeductions && <>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Prov. Fund</TableHead>
                    <TableHead className="text-right">Social Fund</TableHead>
                  </>}
                  <TableHead className="text-right">{isDeductions ? "Take-home" : "Net"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupByDate ? (
                  <>
                    {grouped.map((g, i) => {
                      const isPast = g.date <= TODAY
                      return (
                        <TableRow key={i} className={isPast ? "opacity-50" : ""}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              {fmtDate(g.date)}
                              {isPast && (
                                <Badge className="text-[10px] bg-muted text-muted-foreground hover:bg-muted border-0 px-1 py-0 h-auto">
                                  paid
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {g.types.map(t => (
                                <Badge key={t} className={BADGE_VARIANT[t] ?? "bg-gray-100 text-gray-800 border-0"}>
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{fmt(g.gross)}</TableCell>
                          {isDeductions && <>
                            <TableCell className="text-right text-sm tabular-nums text-rose-400 whitespace-nowrap">
                              {g.stock ? `-${fmt(g.stock)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-red-400 whitespace-nowrap">
                              {g.tax ? `-${fmt(g.tax)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-amber-400 whitespace-nowrap">
                              {g.pf ? `-${fmt(g.pf)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-orange-400 whitespace-nowrap">
                              {g.social ? `-${fmt(g.social)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </>}
                          <TableCell className="text-right text-sm tabular-nums font-semibold text-emerald-400">
                            {fmt(isDeductions ? g.takeHome : g.net)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {grouped.length > 0 && (
                      <TableRow className="bg-white/[0.05] font-bold">
                        <TableCell colSpan={2}>Total ({grouped.length} pay dates)</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(grouped.reduce((s, g) => s + g.gross, 0))}</TableCell>
                        {isDeductions && <>
                          <TableCell className="text-right tabular-nums text-rose-400 whitespace-nowrap">
                            -{fmt(grouped.reduce((s, g) => s + g.stock, 0))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-red-400 whitespace-nowrap">
                            -{fmt(grouped.reduce((s, g) => s + g.tax, 0))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-400 whitespace-nowrap">
                            -{fmt(grouped.reduce((s, g) => s + g.pf, 0))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-orange-400 whitespace-nowrap">
                            -{fmt(grouped.reduce((s, g) => s + g.social, 0))}
                          </TableCell>
                        </>}
                        <TableCell className="text-right tabular-nums text-emerald-400">
                          {fmt(grouped.reduce((s, g) => s + (isDeductions ? g.takeHome : g.net), 0))}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ) : (
                  <>
                    {filtered.map((p, i) => {
                      const isPast = p.date <= TODAY
                      const { stock, tax, pf, social, takeHome } = getDeductions(p)
                      return (
                        <TableRow key={i} className={isPast ? "opacity-50" : ""}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              {fmtDate(p.date)}
                              {isPast && (
                                <Badge className="text-[10px] bg-muted text-muted-foreground hover:bg-muted border-0 px-1 py-0 h-auto">
                                  paid
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={BADGE_VARIANT[p.type] ?? "bg-gray-100 text-gray-800 border-0"}>
                              {p.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{fmt(p.gross)}</TableCell>
                          {isDeductions && <>
                            <TableCell className="text-right text-sm tabular-nums text-rose-400 whitespace-nowrap">
                              {stock ? `-${fmt(stock)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-red-400 whitespace-nowrap">
                              {tax ? `-${fmt(tax)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-amber-400 whitespace-nowrap text-sm">
                              {pf ? `-${fmt(pf)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-orange-400 whitespace-nowrap">
                              {social ? `-${fmt(social)}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </>}
                          <TableCell className="text-right text-sm tabular-nums font-semibold text-emerald-400">
                            {fmt(isDeductions ? takeHome : p.net)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filtered.length > 0 && (
                      <TableRow className="bg-white/[0.05] font-bold">
                        <TableCell colSpan={2}>Total ({filtered.length})</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(filtered.reduce((s, p) => s + p.gross, 0))}</TableCell>
                        {isDeductions && <>
                          <TableCell className="text-right tabular-nums text-rose-400 whitespace-nowrap">
                            -{fmt(filtered.reduce((s, p) => s + getDeductions(p).stock, 0))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-red-400 whitespace-nowrap">
                            -{fmt(filtered.reduce((s, p) => s + getDeductions(p).tax, 0))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-400 whitespace-nowrap">
                            -{fmt(filtered.reduce((s, p) => s + getDeductions(p).pf, 0))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-orange-400 whitespace-nowrap">
                            -{fmt(filtered.reduce((s, p) => s + getDeductions(p).social, 0))}
                          </TableCell>
                        </>}
                        <TableCell className="text-right tabular-nums text-emerald-400">
                          {fmt(filtered.reduce((s, p) => s + (isDeductions ? getDeductions(p).takeHome : p.net), 0))}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
