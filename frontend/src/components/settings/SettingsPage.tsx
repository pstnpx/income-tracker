"use client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Trash2, Save, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import type { Config } from "@/lib/types"

// ── Helpers ──────────────────────────────────────────────────────────────────

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="w-44">{children}</div>
    </div>
  )
}

function NumInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        className={suffix ? "pr-8" : ""}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

// ── Salary tab ────────────────────────────────────────────────────────────────

function SalaryTab({ draft, update }: { draft: Config; update: (fn: (d: Config) => void) => void }) {
  const payDaysStr = draft.salary.pay_days.join(", ")

  function setPayDays(raw: string) {
    const days = raw
      .split(/[,\s]+/)
      .map(s => parseInt(s))
      .filter(n => !isNaN(n) && n >= 1 && n <= 31)
    update(d => { d.salary.pay_days = days })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Salary & Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Year" hint="The fiscal year for calculations">
            <NumInput value={draft.year} min={2020} onChange={v => update(d => { d.year = v })} />
          </FieldRow>
          <Separator />
          <FieldRow label="Monthly salary" hint="Gross salary per month (THB)">
            <NumInput value={draft.salary.monthly} step={500} min={0} suffix="฿" onChange={v => update(d => { d.salary.monthly = v })} />
          </FieldRow>
          <Separator />
          <FieldRow label="Pay days" hint="Day-of-month numbers, comma-separated (e.g. 7, 22)">
            <Input
              value={payDaysStr}
              onChange={e => setPayDays(e.target.value)}
              placeholder="7, 22"
            />
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">One-time Payments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <PaymentList
            label="STI"
            items={draft.sti_payments}
            onChange={items => update(d => { d.sti_payments = items })}
          />
          <Separator />
          <PaymentList
            label="Bonus"
            items={draft.bonus_payments}
            onChange={items => update(d => { d.bonus_payments = items })}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function PaymentList({
  label,
  items,
  onChange,
}: {
  label: string
  items: Config["sti_payments"]
  onChange: (items: Config["sti_payments"]) => void
}) {
  function add() {
    onChange([...items, { date: new Date().toISOString().split("T")[0], amount: 0 }])
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  function set(i: number, field: "date" | "amount", val: string | number) {
    const next = items.map((item, idx) => idx === i ? { ...item, [field]: val } : item)
    onChange(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={add}>
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No {label} payments</p>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="date"
              value={item.date}
              onChange={e => set(i, "date", e.target.value)}
              className="flex-1 text-xs"
            />
            <div className="relative w-36">
              <Input
                type="number"
                value={item.amount}
                step={100}
                min={0}
                onChange={e => set(i, "amount", Number(e.target.value))}
                className="pr-6 text-xs"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">฿</span>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(i)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── LTI tab ───────────────────────────────────────────────────────────────────

function LtiTab({ draft, update }: { draft: Config; update: (fn: (d: Config) => void) => void }) {
  function addGrant() {
    update(d => {
      d.lti_grants.push({
        name: `LTI${d.lti_grants.length + 1}`,
        grant_date: new Date().toISOString().split("T")[0],
        total: 0,
        first_vest_pct: 0.25,
        quarterly_pct: 0.0625,
        pay_day: 7,
      })
    })
  }

  function removeGrant(i: number) {
    update(d => { d.lti_grants.splice(i, 1) })
  }

  function setField(i: number, field: keyof Config["lti_grants"][0], val: string | number) {
    update(d => { (d.lti_grants[i] as Record<string, unknown>)[field] = val })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addGrant}>
          <Plus className="w-3 h-3" /> Add Grant
        </Button>
      </div>

      {draft.lti_grants.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No LTI grants configured.</p>
      )}

      {draft.lti_grants.map((grant, i) => (
        <Card key={i}>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <Input
              value={grant.name}
              onChange={e => setField(i, "name", e.target.value)}
              className="w-32 h-7 text-sm font-semibold"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeGrant(i)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Grant date</p>
                <Input type="date" value={grant.grant_date} onChange={e => setField(i, "grant_date", e.target.value)} className="text-xs" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total (THB)</p>
                <div className="relative">
                  <Input type="number" value={grant.total} step={1000} min={0} onChange={e => setField(i, "total", Number(e.target.value))} className="pr-6 text-xs" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">฿</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">First vest %</p>
                <div className="relative">
                  <Input type="number" value={Math.round(grant.first_vest_pct * 10000) / 100} step={0.01} min={0} max={100} onChange={e => setField(i, "first_vest_pct", Number(e.target.value) / 100)} className="pr-6 text-xs" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quarterly vest %</p>
                <div className="relative">
                  <Input type="number" value={Math.round(grant.quarterly_pct * 10000) / 100} step={0.01} min={0} max={100} onChange={e => setField(i, "quarterly_pct", Number(e.target.value) / 100)} className="pr-6 text-xs" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pay day (of month)</p>
                <Input type="number" value={grant.pay_day} min={1} max={31} onChange={e => setField(i, "pay_day", Number(e.target.value))} className="text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Fixed Costs tab ───────────────────────────────────────────────────────────

function CostsTab({ draft, update }: { draft: Config; update: (fn: (d: Config) => void) => void }) {
  function addItem() {
    update(d => { d.fixed_costs.items.push({ label: "New item", monthly: 0 }) })
  }
  function removeItem(i: number) {
    update(d => { d.fixed_costs.items.splice(i, 1) })
  }
  function setItem(i: number, field: "label" | "monthly", val: string | number) {
    update(d => { (d.fixed_costs.items[i] as Record<string, unknown>)[field] = val })
  }

  const total = draft.fixed_costs.items.reduce((s, c) => s + c.monthly, 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Fixed Costs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <FieldRow label="Pay dates per month" hint="How many salary pay dates to split costs across">
            <NumInput value={draft.fixed_costs.pay_dates} min={1} onChange={v => update(d => { d.fixed_costs.pay_dates = v })} />
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Expense Items</CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addItem}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Category</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Monthly (฿)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {draft.fixed_costs.items.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={item.label}
                      onChange={e => setItem(i, "label", e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      value={item.monthly}
                      step={100}
                      min={0}
                      onChange={e => setItem(i, "monthly", Number(e.target.value))}
                      className="h-7 text-xs text-right"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-semibold">
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-sm">Total</td>
                <td className="px-4 py-2 text-right text-sm tabular-nums">
                  ฿{total.toLocaleString("en-US")}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Rates & Tax tab ───────────────────────────────────────────────────────────

function RatesTab({ draft, update }: { draft: Config; update: (fn: (d: Config) => void) => void }) {
  function setBracket(i: number, field: 0 | 1, val: string) {
    update(d => {
      const row = [...d.tax.brackets[i]] as [number | null, number]
      if (field === 0) {
        row[0] = val === "" || val === "∞" ? null : Number(val)
      } else {
        row[1] = Number(val) / 100
      }
      d.tax.brackets[i] = row
    })
  }

  function addBracket() {
    update(d => {
      // Insert before the last (∞) row if it exists
      const last = d.tax.brackets[d.tax.brackets.length - 1]
      if (last && last[0] === null) {
        d.tax.brackets.splice(d.tax.brackets.length - 1, 0, [0, 0])
      } else {
        d.tax.brackets.push([0, 0])
      }
    })
  }

  function removeBracket(i: number) {
    update(d => { d.tax.brackets.splice(i, 1) })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Deduction Rates</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Stock purchase deduction" hint="Withheld each pay period for stock purchase plan">
            <NumInput value={Math.round(draft.stock_deduct_rate * 10000) / 100} step={0.5} min={0} max={100} suffix="%" onChange={v => update(d => { d.stock_deduct_rate = v / 100 })} />
          </FieldRow>
          <Separator />
          <FieldRow label="Provident fund rate" hint="% of gross salary deducted for provident fund">
            <NumInput value={Math.round(draft.balance.provident_fund_pct * 10000) / 100} step={0.5} min={0} max={100} suffix="%" onChange={v => update(d => { d.balance.provident_fund_pct = v / 100 })} />
          </FieldRow>
          <Separator />
          <FieldRow label="Social fund (monthly)" hint="Fixed THB amount on 7th pay date">
            <NumInput value={draft.balance.social_fund_thb} step={50} min={0} suffix="฿" onChange={v => update(d => { d.balance.social_fund_thb = v })} />
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Thai Income Tax</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Personal allowance" hint="Annual personal deduction (THB)">
            <NumInput value={draft.tax.personal_allowance} step={1000} min={0} suffix="฿" onChange={v => update(d => { d.tax.personal_allowance = v })} />
          </FieldRow>
          <Separator />
          <FieldRow label="SSF annual deduction" hint="Annual SSF max deductible (THB)">
            <NumInput value={draft.tax.ssf_annual} step={500} min={0} suffix="฿" onChange={v => update(d => { d.tax.ssf_annual = v })} />
          </FieldRow>
          <Separator />
          <FieldRow label="Provident fund rate (tax)" hint="PF rate used for tax deduction calculation">
            <NumInput value={Math.round(draft.tax.pf_rate * 10000) / 100} step={0.5} min={0} max={100} suffix="%" onChange={v => update(d => { d.tax.pf_rate = v / 100 })} />
          </FieldRow>

          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progressive tax brackets</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addBracket}>
                <Plus className="w-3 h-3" /> Add bracket
              </Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Band (THB)</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Rate</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {draft.tax.brackets.map((bracket, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-2 py-1.5">
                        <Input
                          value={bracket[0] === null ? "∞" : bracket[0]}
                          onChange={e => setBracket(i, 0, e.target.value)}
                          className="h-7 text-xs w-32"
                          placeholder="∞"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="relative w-24 ml-auto">
                          <Input
                            type="number"
                            value={Math.round(bracket[1] * 10000) / 100}
                            step={1}
                            min={0}
                            max={100}
                            onChange={e => setBracket(i, 1, e.target.value)}
                            className="h-7 text-xs pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeBracket(i)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Use ∞ in the Band column for the top bracket (no cap).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Stock tab ─────────────────────────────────────────────────────────────────

function StockTab({ draft, update }: { draft: Config; update: (fn: (d: Config) => void) => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Stock Ticker</CardTitle></CardHeader>
        <CardContent>
          <FieldRow label="Ticker symbol" hint="Yahoo Finance ticker for the stock price feed">
            <Input
              value={draft.stock_ticker}
              onChange={e => update(d => { d.stock_ticker = e.target.value.toUpperCase() })}
              className="font-mono"
              placeholder="WDC"
            />
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Purchase Prices</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">The price and exchange rate at the time shares were purchased each half.</p>
          {(["H1", "H2"] as const).map(half => (
            <div key={half}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{half} ({half === "H1" ? "Jun 30" : "Dec 30"})</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Buy price (USD)</p>
                  <div className="relative">
                    <Input
                      type="number"
                      value={draft.stock_purchases[half].buy_price_usd}
                      step={0.01}
                      min={0}
                      onChange={e => update(d => { d.stock_purchases[half].buy_price_usd = Number(e.target.value) })}
                      className="pr-8 text-xs font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Exchange rate (THB/USD)</p>
                  <div className="relative">
                    <Input
                      type="number"
                      value={draft.stock_purchases[half].buy_rate_thb}
                      step={0.1}
                      min={0}
                      onChange={e => update(d => { d.stock_purchases[half].buy_rate_thb = Number(e.target.value) })}
                      className="pr-10 text-xs font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">฿/$</span>
                  </div>
                </div>
              </div>
              {half === "H1" && <div className="h-px bg-border mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: config, isLoading } = useQuery<Config>({
    queryKey: ["config"],
    queryFn: () => fetch("/api/config").then(r => r.json()),
  })

  const [draft, setDraft] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config && !draft) setDraft(deepClone(config))
  }, [config, draft])

  function update(fn: (d: Config) => void) {
    setDraft(prev => {
      if (!prev) return prev
      const next = deepClone(prev)
      fn(next)
      return next
    })
  }

  function reset() {
    if (config) setDraft(deepClone(config))
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail ?? `HTTP ${res.status}`)
      }
      toast.success("Settings saved")
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["lti-grants"] })
      queryClient.invalidateQueries({ queryKey: ["stock-purchases"] })
    } catch (e: unknown) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !draft) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Tabs defaultValue="salary">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="lti">LTI Grants</TabsTrigger>
          <TabsTrigger value="costs">Fixed Costs</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="rates">Rates & Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="salary" className="mt-4">
          <SalaryTab draft={draft} update={update} />
        </TabsContent>
        <TabsContent value="lti" className="mt-4">
          <LtiTab draft={draft} update={update} />
        </TabsContent>
        <TabsContent value="costs" className="mt-4">
          <CostsTab draft={draft} update={update} />
        </TabsContent>
        <TabsContent value="stock" className="mt-4">
          <StockTab draft={draft} update={update} />
        </TabsContent>
        <TabsContent value="rates" className="mt-4">
          <RatesTab draft={draft} update={update} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-2 pb-8">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={reset} disabled={saving}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
        <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  )
}
