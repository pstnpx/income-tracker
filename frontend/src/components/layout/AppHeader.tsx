"use client"
import { Menu, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"
import { signOut } from "next-auth/react"
import { SidebarContent, type Page } from "./AppSidebar"

const PAGE_META: Record<Page, { title: string; subtitle: string }> = {
  income: {
    title: "Income Overview",
    subtitle: "Salary, LTI, STI, and bonus payments for 2026",
  },
  lti: {
    title: "LTI Grants",
    subtitle: "All 3 grants · 10% stock deduction per payment · Paid on 7th after vesting",
  },
  stock: {
    title: "Stock Tracker",
    subtitle: "10% deductions accumulate and purchase WDC shares on Jun 30 & Dec 30",
  },
  costs: {
    title: "Fixed Costs",
    subtitle: "Monthly fixed expenses · split across 2 pay dates (7th & 22nd)",
  },
  balance: {
    title: "Salary Left",
    subtitle: "Net salary after fixed costs are deducted per pay date",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure salary, LTI grants, fixed costs, and tax rates",
  },
}

interface AppHeaderProps {
  page: Page
  onNavigate: (p: Page) => void
}

export function AppHeader({ page, onNavigate }: AppHeaderProps) {
  const [open, setOpen] = useState(false)
  const meta = PAGE_META[page]
  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })

  function handleNavigate(p: Page) {
    onNavigate(p)
    setOpen(false)
  }

  return (
    <header className="shrink-0 bg-black/30 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={() => setOpen(true)}
        >
          <Menu className="w-4 h-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm md:text-lg font-bold tracking-tight">{meta.title}</h1>
            <Badge variant="secondary" className="text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2">
              {monthLabel}
            </Badge>
          </div>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 hidden sm:block">{meta.subtitle}</p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Separator />

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-black/80 backdrop-blur-xl border-white/[0.06]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent activePage={page} onNavigate={handleNavigate} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
