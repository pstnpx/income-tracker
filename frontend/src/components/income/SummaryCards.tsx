"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Wallet, PiggyBank, CalendarDays, Landmark } from "lucide-react"
import type { PaymentsResponse } from "@/lib/types"

const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 })

export function SummaryCards() {
  const { data, isLoading } = useQuery<PaymentsResponse>({
    queryKey: ["payments"],
    queryFn: () => fetch("/api/payments").then(r => r.json()),
  })
  const s = data?.summary

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        {[0, 1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-3 md:p-5 flex items-center gap-3 md:gap-4">
              <Skeleton className="h-9 w-9 md:h-11 md:w-11 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 md:w-20" />
                <Skeleton className="h-5 md:h-6 w-20 md:w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )

  }

  const cards = [
    { label: "Gross Income",    value: s?.total_gross,   icon: TrendingUp,   raw: false },
    { label: "Stock (ESPP)",    value: s?.total_stock,   icon: PiggyBank,    raw: false },
    { label: "Est. Tax",        value: s?.total_tax,     icon: Landmark,     raw: false },
    { label: "Net After Stock", value: s?.total_net,     icon: Wallet,       raw: false },
    { label: "Payments",        value: s?.payment_count, icon: CalendarDays, raw: true  },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 w-full">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-3 md:p-5 flex items-center gap-3 md:gap-4">
            <Badge className="bg-white/10 text-foreground hover:bg-white/10 rounded-xl p-2 md:p-3 h-auto border-0 shrink-0">
              <c.icon className="w-4 h-4 md:w-5 md:h-5" />
            </Badge>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide truncate">{c.label}</p>
              <p className="text-base md:text-xl font-bold text-foreground truncate">
                {c.raw ? s?.payment_count ?? "—" : s ? fmt(c.value ?? 0) : "—"}
                {!c.raw && s && <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-1">THB</span>}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
