"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PiggyBank, ShieldCheck, Landmark } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import type { PaymentsResponse, Config } from "@/lib/types"

const CHART_CONFIG = {
  remaining: { label: "Remaining", color: "#4ade80" },
} satisfies ChartConfig

const fmt      = (n: number) => "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtK     = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`
const fmtD     = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
const fmtShort = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
const TODAY    = new Date().toISOString().split("T")[0]

export function BalanceSection() {
  const { data, isLoading: paymentsLoading } = useQuery<PaymentsResponse>({
    queryKey: ["payments"],
    queryFn: () => fetch("/api/payments").then(r => r.json()),
  })
  const { data: config, isLoading: configLoading } = useQuery<Config>({
    queryKey: ["config"],
    queryFn: () => fetch("/api/config").then(r => r.json()),
  })

  const isLoading = paymentsLoading || configLoading

  if (isLoading || !data || !config) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  const { provident_fund_pct: PROVIDENT_FUND_PCT, social_fund_thb: SOCIAL_FUND_THB } = config.balance
  const { pay_dates: PAY_DATES, items } = config.fixed_costs
  const MONTHLY_FIXED_COSTS = items.reduce((s, c) => s + c.monthly, 0)
  const FIXED_PER_PAY       = MONTHLY_FIXED_COSTS / PAY_DATES

  const payments = data.payments

  // Group all payments by date
  const byDate = new Map<string, typeof payments>()
  for (const p of payments) {
    const list = byDate.get(p.date) ?? []
    list.push(p)
    byDate.set(p.date, list)
  }

  const rows = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ps]) => {
      const salary     = ps.find(p => p.type === "Salary")
      const totalGross = ps.reduce((s, p) => s + p.gross, 0)
      const totalStock = ps.reduce((s, p) => s + p.stock_deduct, 0)
      const totalNet   = ps.reduce((s, p) => s + p.net, 0)
      const extras     = ps.filter(p => p.type !== "Salary").map(p => p.type).join(", ")
      const pf         = salary ? Math.round(salary.gross * PROVIDENT_FUND_PCT) : 0
      const isFirst    = new Date(date).getDate() === config.salary.pay_days[0]
      const social     = salary && isFirst ? SOCIAL_FUND_THB : 0
      const fixed      = salary ? FIXED_PER_PAY : 0
      const remaining  = totalNet - fixed - pf - social
      return { date, totalGross, totalStock, totalNet, pf, social, fixed, remaining, extras, hasSalary: !!salary }
    })

  const salaryRows   = rows.filter(r => r.hasSalary)
  const avgRemaining = salaryRows.length
    ? salaryRows.reduce((s, r) => s + r.remaining, 0) / salaryRows.length
    : 0
  const avgPF = salaryRows.length
    ? salaryRows.reduce((s, r) => s + r.pf, 0) / salaryRows.length
    : 0

  const chartData = rows.map(r => ({ date: fmtShort(r.date), remaining: r.remaining }))

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Provident Fund
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-amber-400">{fmt(avgPF)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(PROVIDENT_FUND_PCT * 100).toFixed(0)}% of gross · avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              Social Fund
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-400">{fmt(SOCIAL_FUND_THB)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{config.salary.pay_days[0] && `${config.salary.pay_days[0]}th`} only · fixed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PiggyBank className="w-3.5 h-3.5" />
              Avg Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-xl font-bold", avgRemaining >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {fmt(avgRemaining)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">after all deductions</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Remaining per Pay Date</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CHART_CONFIG} className="h-56 w-full">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
              <Bar dataKey="remaining" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.remaining >= 0 ? "#4ade80" : "#f87171"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-white/[0.04]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Pay Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Gross</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Fixed Costs</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Prov. Fund</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Social Fund</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isPast = r.date <= TODAY
                  return (
                    <tr key={i} className={cn("border-b last:border-0 hover:bg-white/[0.04] transition-colors", isPast && "opacity-50")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap font-medium">
                          {fmtD(r.date)}
                          {isPast && (
                            <Badge className="text-[10px] bg-muted text-muted-foreground hover:bg-muted border-0 px-1 py-0 h-auto">
                              paid
                            </Badge>
                          )}
                        </div>
                        {r.extras && <div className="text-[11px] text-muted-foreground mt-0.5">+ {r.extras}</div>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.totalGross)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-400 whitespace-nowrap">
                        {r.totalStock ? `-${fmt(r.totalStock)}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-400 whitespace-nowrap">
                        {r.fixed ? `-${fmt(r.fixed)}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-400 whitespace-nowrap">
                        {r.pf ? `-${fmt(r.pf)}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-orange-400 whitespace-nowrap">
                        {r.social ? `-${fmt(r.social)}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", r.remaining >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {fmt(r.remaining)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
