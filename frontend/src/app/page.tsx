"use client"
import { useState } from "react"
import { AppSidebar, type Page } from "@/components/layout/AppSidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import { SummaryCards } from "@/components/income/SummaryCards"
import { IncomeChart } from "@/components/income/IncomeChart"
import { PaymentsTable } from "@/components/income/PaymentsTable"
import { LtiGrantCards } from "@/components/lti/LtiGrantCard"
import { StockSection } from "@/components/stock/StockSection"
import { FixedCostsSection } from "@/components/costs/FixedCostsSection"
import { BalanceSection } from "@/components/costs/BalanceSection"
import { SettingsPage } from "@/components/settings/SettingsPage"
import { Button } from "@/components/ui/button"
import type { IncomeView } from "@/lib/types"

export default function Home() {
  const [page, setPage] = useState<Page>("income")
  const [incomeView, setIncomeView] = useState<IncomeView>("gross")
  const [groupByDate, setGroupByDate] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden relative bg-black">
      {/* Purple gradient — mirrors the login page */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 via-purple-900/15 to-transparent pointer-events-none" />

      <AppSidebar activePage={page} onNavigate={setPage} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader page={page} onNavigate={setPage} />

        <main className="flex-1 min-h-0 overflow-auto p-3 md:p-6">
          {page === "income" && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <SummaryCards />
              </div>
              <div className="flex justify-end gap-2 flex-wrap">
                <Button size="sm" variant={incomeView === "gross" ? "default" : "outline"} className="h-8 text-xs" onClick={() => setIncomeView("gross")}>
                  Gross
                </Button>
                <Button size="sm" variant={incomeView === "deductions" ? "default" : "outline"} className="h-8 text-xs" onClick={() => setIncomeView("deductions")}>
                  After Deductions
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button size="sm" variant={groupByDate ? "default" : "outline"} className="h-8 text-xs" onClick={() => setGroupByDate(g => !g)}>
                  By Pay Date
                </Button>
              </div>
              <IncomeChart viewMode={incomeView} />
              <PaymentsTable viewMode={incomeView} groupByDate={groupByDate} />
            </div>
          )}

          {page === "lti" && (
            <div className="max-w-6xl mx-auto">
              <LtiGrantCards />
            </div>
          )}

          {page === "stock" && (
            <div className="max-w-4xl mx-auto">
              <StockSection />
            </div>
          )}

          {page === "costs" && (
            <div className="max-w-2xl mx-auto">
              <FixedCostsSection />
            </div>
          )}

          {page === "balance" && (
            <div className="max-w-3xl mx-auto">
              <BalanceSection />
            </div>
          )}

          {page === "settings" && (
            <div className="max-w-2xl mx-auto">
              <SettingsPage />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
