"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import type { PaymentsResponse, IncomeView } from "@/lib/types"

const PROVIDENT_FUND_PCT = 0.06
const SOCIAL_FUND_THB    = 875

const CHART_CONFIG = {
  Salary:     { label: "Salary",     color: "#7CB3E8" },
  LTI:        { label: "LTI",        color: "#6CC97E" },
  LTI2:       { label: "LTI 2",      color: "#A693D0" },
  LTI3:       { label: "LTI 3",      color: "#E07A7E" },
  STI:        { label: "STI",        color: "#E8D090" },
  Bonus:      { label: "Bonus",      color: "#26C4D1" },
  cumulative: { label: "Cumulative", color: "#A78BFA" },
} satisfies ChartConfig

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const fmtK   = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`

function takeHome(p: PaymentsResponse["payments"][number]): number {
  const isSalary = p.type === "Salary"
  const pf       = isSalary ? Math.round(p.gross * PROVIDENT_FUND_PCT) : 0
  const social   = isSalary && new Date(p.date).getDate() === 7 ? SOCIAL_FUND_THB : 0
  return p.gross - p.stock_deduct - pf - social
}

export function IncomeChart({ viewMode }: { viewMode: IncomeView }) {
  const { data, isLoading } = useQuery<PaymentsResponse>({
    queryKey: ["payments"],
    queryFn: () => fetch("/api/payments").then(r => r.json()),
  })

  if (isLoading) {
    return (
      <Card className="">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const types = [...new Set(data.payments.map(p => p.type))]

  const monthly: Record<string, number | string>[] = MONTHS.map((m, i) => {
    const row: Record<string, number | string> = { month: m }
    types.forEach(t => { row[t] = 0 })
    data.payments
      .filter(p => new Date(p.date).getMonth() === i)
      .forEach(p => {
        const val = viewMode === "gross" ? p.gross : takeHome(p)
        row[p.type] = (row[p.type] as number) + val
      })
    return row
  })

  let cumulative = 0
  monthly.forEach(row => {
    cumulative += types.reduce((s, t) => s + (row[t] as number || 0), 0)
    row.cumulative = cumulative
  })

  return (
    <Card className="">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Monthly {viewMode === "gross" ? "Gross" : "After-Deduction"} Income
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {viewMode === "gross" ? "Gross income · THB" : "After stock · provident fund · social fund · THB"}
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer key={viewMode} config={CHART_CONFIG} className="h-96 w-full">
          <ComposedChart data={monthly} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={fmtK} tick={{ fontSize: 11 }} width={60} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `฿${Number(value).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {types.map(t => (
              <Bar
                key={t}
                yAxisId="left"
                dataKey={t}
                stackId="a"
                fill={CHART_CONFIG[t as keyof typeof CHART_CONFIG]?.color ?? "#888"}
                radius={t === types[types.length - 1] ? [3, 3, 0, 0] : undefined}
              />
            ))}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="Cumulative"
              stroke={CHART_CONFIG.cumulative.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: CHART_CONFIG.cumulative.color }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
