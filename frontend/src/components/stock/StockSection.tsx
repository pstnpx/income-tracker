"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, TrendingUp, TrendingDown, Info } from "lucide-react"
import { KpiCard } from "@/components/ui/kpi-card"
import type { StockPriceResponse, StockPurchasesResponse, Config } from "@/lib/types"

const fmt     = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 })
const fmtUSD  = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

function calcPosition(thbInvested: number, purchaseUsd: number, purchaseRate: number, currentUsd: number, currentRate: number) {
  const usdInvested = thbInvested / purchaseRate
  const shares      = Math.floor(usdInvested / purchaseUsd)   // whole shares only
  const costUsd     = shares * purchaseUsd
  const costThb     = costUsd * purchaseRate
  const leftoverThb = thbInvested - costThb                   // cash remaining at broker
  const valueUsd    = shares * currentUsd
  const valueThb    = valueUsd * currentRate
  const pnlThb      = valueThb - costThb
  const pnlPct      = costThb > 0 ? (pnlThb / costThb) * 100 : 0
  return { shares, costThb, leftoverThb, valueUsd, valueThb, pnlThb, pnlPct }
}

export function StockSection() {
  const [customPrice, setCustomPrice] = useState("")

  const { data: price, isFetching, isLoading: isPriceLoading, refetch } = useQuery<StockPriceResponse>({
    queryKey: ["stock-price"],
    queryFn: () => fetch("/api/stock-price").then(r => r.json()),
    refetchInterval: 5 * 60 * 1000,
  })

  const { data: purchases, isLoading: isPurchasesLoading } = useQuery<StockPurchasesResponse>({
    queryKey: ["stock-purchases"],
    queryFn: () => fetch("/api/stock-purchases").then(r => r.json()),
  })

  const { data: config } = useQuery<Config>({
    queryKey: ["config"],
    queryFn: () => fetch("/api/config").then(r => r.json()),
  })

  const evalPrice  = customPrice ? parseFloat(customPrice) : price?.price_usd ?? 0
  const evalRate   = price?.usd_thb_rate ?? 33
  const isCustom   = !!customPrice && !isNaN(parseFloat(customPrice))

  const PURCHASE_CONFIGS: Record<string, { usd: number; rate: number }> = {
    H1: { usd: config?.stock_purchases?.H1?.buy_price_usd ?? 37.80, rate: config?.stock_purchases?.H1?.buy_rate_thb ?? 32.5 },
    H2: { usd: config?.stock_purchases?.H2?.buy_price_usd ?? 37.80, rate: config?.stock_purchases?.H2?.buy_rate_thb ?? 32.5 },
  }

  const h1 = purchases?.purchases.find(p => p.period === "H1")
  const h2 = purchases?.purchases.find(p => p.period === "H2")
  const dayUp = (price?.day_change_usd ?? 0) >= 0

  return (
    <div className="space-y-6">

      {/* Live price — KPI cards */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">{config?.stock_ticker ?? "WDC"} Live Price</p>
        <div className="flex items-center gap-2">
          {price?.fetched_at && (
            <span className="text-xs text-muted-foreground">
              As of {new Date(price.fetched_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} BKK
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-7 text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isPriceLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            label={`${config?.stock_ticker ?? "WDC"} Price`}
            value={price ? fmtUSD(price.price_usd) : "—"}
            trend={dayUp ? "up" : "down"}
            tone={price ? (dayUp ? "success" : "danger") : "default"}
            caption="Current market price"
            size="sm"
          />
          <KpiCard
            label="Day Change"
            value={price ? `${dayUp ? "+" : ""}${fmtUSD(price.day_change_usd)}` : "—"}
            delta={price ? `${dayUp ? "+" : ""}${price.day_change_pct.toFixed(2)}%` : undefined}
            trend={dayUp ? "up" : "down"}
            tone={price ? (dayUp ? "success" : "danger") : "default"}
            caption="vs yesterday close"
            size="sm"
          />
          <KpiCard
            label="USD / THB"
            value={price ? price.usd_thb_rate.toFixed(2) : "—"}
            tone="default"
            caption={`H1 buy $${PURCHASE_CONFIGS.H1.usd.toFixed(2)} · H2 buy $${PURCHASE_CONFIGS.H2.usd.toFixed(2)}`}
            size="sm"
          />
        </div>
      )}

      <Separator />

      {/* Custom price projection */}
      <Card className="">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Price Projection</CardTitle>
          <p className="text-xs text-muted-foreground">Enter a target price to see projected value</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 max-w-xs">
            <span className="text-sm font-medium text-muted-foreground">{config?.stock_ticker ?? "WDC"}</span>
            <Input
              type="number"
              placeholder={`Current: ${price?.price_usd.toFixed(2) ?? "—"}`}
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
              className="font-mono"
            />
            <span className="text-sm text-muted-foreground">USD</span>
            {isCustom && (
              <Button variant="ghost" size="sm" onClick={() => setCustomPrice("")} className="h-8 text-xs">
                Clear
              </Button>
            )}
          </div>
          {isCustom && price && (
            <p className="mt-2 text-xs text-muted-foreground">
              vs current {fmtUSD(price.price_usd)}:&nbsp;
              <span className={evalPrice >= price.price_usd ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                {evalPrice >= price.price_usd ? "+" : ""}{fmtUSD(evalPrice - price.price_usd)} ({((evalPrice - price.price_usd) / price.price_usd * 100).toFixed(1)}%)
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Purchases table */}
      <Card className="">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Stock Purchases</CardTitle>
          <p className="text-xs text-muted-foreground">
            10% of each payment is accumulated and used to buy WDC on Jun 30 &amp; Dec 30.
            {isCustom && <span className="ml-1 text-blue-400 font-medium">Showing projection at {fmtUSD(evalPrice)}</span>}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isPurchasesLoading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Buy Date</TableHead>
                    <TableHead className="text-right">THB Invested</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Value (THB)</TableHead>
                    <TableHead className="text-right">P&amp;L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[h1, h2].filter(Boolean).map(period => {
                    const cfg = PURCHASE_CONFIGS[period!.period]
                    const pos = calcPosition(period!.thb_invested, cfg.usd, cfg.rate, evalPrice, evalRate)
                    const isH2future = period!.period === "H2" && new Date(period!.buy_date) > new Date()
                    const isPnlPos = pos.pnlThb >= 0

                    return (
                      <TableRow key={period!.period}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-1.5">
                            {period!.period === "H1" ? "H1 (Jan–Jun)" : "H2 (Jul–Dec)"}
                            {isH2future && (
                              <Tooltip>
                                <TooltipTrigger className="cursor-help">
                                  <Badge className="text-[10px] bg-blue-500/15 text-blue-300 hover:bg-blue-500/15 border-0 px-1.5 py-0 h-auto gap-1">
                                    <Info className="w-2.5 h-2.5" />
                                    estimated
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">H2 purchase date has not yet occurred — this is a projected value based on current accumulation.</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{fmtDate(period!.buy_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(period!.thb_invested)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {fmtUSD(cfg.usd)}
                          {isH2future && <span className="ml-1 text-xs text-muted-foreground">(fixed)</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {pos.shares}
                          {pos.leftoverThb > 0 && (
                            <p className="text-[11px] text-muted-foreground font-normal">+{fmt(pos.leftoverThb)} at broker</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{fmt(pos.valueThb)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className={`inline-flex flex-col items-end px-2 py-0.5 rounded-md ${isPnlPos ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                            <span className="font-semibold">{isPnlPos ? "+" : ""}{fmt(pos.pnlThb)}</span>
                            <span className="text-xs font-normal">{isPnlPos ? "+" : ""}{pos.pnlPct.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Total row */}
                  {h1 && h2 && price && (() => {
                    const p1 = calcPosition(h1.thb_invested, PURCHASE_CONFIGS.H1.usd, PURCHASE_CONFIGS.H1.rate, evalPrice, evalRate)
                    const p2 = calcPosition(h2.thb_invested, PURCHASE_CONFIGS.H2.usd, PURCHASE_CONFIGS.H2.rate, evalPrice, evalRate)
                    const totalInvested  = h1.thb_invested + h2.thb_invested
                    const totalCost      = p1.costThb + p2.costThb
                    const totalLeftover  = p1.leftoverThb + p2.leftoverThb
                    const totalShares    = p1.shares + p2.shares
                    const totalValue     = p1.valueThb + p2.valueThb
                    const totalPnl       = totalValue - totalCost
                    const totalPct       = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
                    const up             = totalPnl >= 0
                    return (
                      <TableRow className="bg-white/[0.05] font-bold">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(totalInvested)}</TableCell>
                        <TableCell />
                        <TableCell className="text-right tabular-nums">
                          {totalShares}
                          {totalLeftover > 0 && (
                            <p className="text-[11px] text-muted-foreground font-normal">+{fmt(totalLeftover)} at broker</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(totalValue)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className={`inline-flex flex-col items-end px-2 py-0.5 rounded-md ${up ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                            <span>{up ? "+" : ""}{fmt(totalPnl)}</span>
                            <span className="text-xs font-normal">{up ? "+" : ""}{totalPct.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
