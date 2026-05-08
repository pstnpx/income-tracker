"use client"
import { BarChart3, TrendingUp, LineChart, Wallet, Receipt, PiggyBank, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export type Page = "income" | "lti" | "stock" | "costs" | "balance" | "settings"

export const NAV_ITEMS = [
  { id: "income"   as Page, label: "Income",       icon: BarChart3,  desc: "Overview & payments" },
  { id: "lti"      as Page, label: "LTI Grants",   icon: TrendingUp, desc: "Vesting schedules" },
  { id: "stock"    as Page, label: "Stock",         icon: LineChart,  desc: "WDC tracker" },
  { id: "costs"    as Page, label: "Fixed Costs",   icon: Receipt,    desc: "Monthly expenses" },
  { id: "balance"  as Page, label: "Salary Left",   icon: PiggyBank,  desc: "After fixed costs" },
]

export const SETTINGS_ITEM = { id: "settings" as Page, label: "Settings", icon: Settings, desc: "Configure values" }

interface SidebarContentProps {
  activePage: Page
  onNavigate: (p: Page) => void
}

export function SidebarContent({ activePage, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">Income Tracker</p>
            <p className="text-xs text-muted-foreground font-medium">2026</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Menu
        </p>
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className={cn(
                  "text-[11px] leading-tight mt-0.5 truncate",
                  active ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {item.desc}
                </p>
              </div>
            </button>
          )
        })}

        <div className="pt-2">
          <div className="h-px bg-border mx-3 mb-2" />
          {(() => {
            const item = SETTINGS_ITEM
            const active = activePage === item.id
            return (
              <button
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p className={cn("text-[11px] leading-tight mt-0.5 truncate", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {item.desc}
                  </p>
                </div>
              </button>
            )
          })()}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t shrink-0">
        <p className="text-[11px] text-muted-foreground">Personal dashboard · private</p>
      </div>
    </div>
  )
}

export function AppSidebar({ activePage, onNavigate }: SidebarContentProps) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-black/30 backdrop-blur-xl border-r border-white/[0.06] h-full">
      <SidebarContent activePage={activePage} onNavigate={onNavigate} />
    </aside>
  )
}
