"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, SplitSquareHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Config } from "@/lib/types"

function thb(n: number) {
  return "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function FixedCostsSection() {
  const { data: config, isLoading } = useQuery<Config>({
    queryKey: ["config"],
    queryFn: () => fetch("/api/config").then(r => r.json()),
  })

  if (isLoading || !config) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const { items, pay_dates } = config.fixed_costs
  const totalMonthly = items.reduce((s, c) => s + c.monthly, 0)
  const perPayDate   = totalMonthly / pay_dates

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Total Monthly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{thb(totalMonthly)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fixed expenses / month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              Per Pay Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{thb(perPayDate)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ÷ {pay_dates} pay date{pay_dates !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost breakdown table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-white/[0.04]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Monthly</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Per Pay Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cost, i) => (
                  <tr key={i} className={cn("border-b last:border-0 transition-colors hover:bg-white/[0.04]", cost.monthly === 0 && "opacity-40")}>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{cost.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {cost.monthly === 0 ? <span className="text-muted-foreground text-xs">—</span> : thb(cost.monthly)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {cost.monthly === 0 ? <span className="text-xs">—</span> : thb(cost.monthly / pay_dates)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/[0.04] font-semibold border-t-2">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-sm">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm">{thb(totalMonthly)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm">{thb(perPayDate)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
