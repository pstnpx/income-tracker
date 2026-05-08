#!/usr/bin/env python3
"""
Income Calculator — per-user IncomeCalc class + CLI helpers.

Usage:
  python3 income_calc.py               # Full year view
  python3 income_calc.py --from-today  # Past vs upcoming split
  python3 income_calc.py --all-lti     # Show full LTI vesting schedules
  python3 income_calc.py --graph       # Show monthly bar chart + cumulative line
"""

import argparse
import json
from datetime import date
from pathlib import Path
from typing import NamedTuple
import calendar

CONFIG_PATH = Path(__file__).parent / "config.json"


# ── Data types ─────────────────────────────────────────────────────────────────

class Payment(NamedTuple):
    date: date
    type: str
    gross: float
    stock_deduct: float
    tax: float = 0.0

    @property
    def net(self):
        return self.gross - self.stock_deduct

    @property
    def take_home(self):
        return self.gross - self.stock_deduct - self.tax


# ── Helpers ────────────────────────────────────────────────────────────────────

def add_months(d: date, months: int) -> date:
    m     = d.month - 1 + months
    year  = d.year + m // 12
    month = m % 12 + 1
    day   = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def compute_vesting_schedule(grant: dict) -> list[tuple[date, float]]:
    grant_date       = grant["grant_date"]
    total            = grant["total"]
    first_pct        = grant["first_vest_pct"]
    quarterly_pct    = grant["quarterly_pct"]
    pay_day          = grant.get("pay_day", 7)

    first_amount     = round(total * first_pct)
    quarterly_amount = round(total * quarterly_pct)
    num_quarters     = round((1 - first_pct) / quarterly_pct)

    def pay_date_after(vest: date) -> date:
        pay_month = vest.month % 12 + 1
        pay_year  = vest.year + (1 if vest.month == 12 else 0)
        return date(pay_year, pay_month, pay_day)

    schedule = []
    vest = add_months(grant_date, 12)
    schedule.append((pay_date_after(vest), first_amount))
    for i in range(1, num_quarters + 1):
        vest = add_months(grant_date, 12 + i * 3)
        schedule.append((pay_date_after(vest), quarterly_amount))
    return schedule


def get_schedule(grant: dict) -> list[tuple[date, float]]:
    if "grant_date" in grant:
        return compute_vesting_schedule(grant)
    return grant["schedule"]


# ── IncomeCalc class ───────────────────────────────────────────────────────────

class IncomeCalc:
    """Thread-safe per-request income calculator. Instantiate with a config dict."""

    def __init__(self, cfg: dict):
        self.year           = cfg["year"]
        self.salary_monthly = cfg["salary"]["monthly"]
        self.salary_days    = cfg["salary"]["pay_days"]
        self.stock_deduct_rate = cfg["stock_deduct_rate"]
        self.stock_ticker   = cfg.get("stock_ticker", "WDC")
        self.stock_purchases = cfg.get("stock_purchases", {})

        self.lti_grants = [
            {**g, "grant_date": date.fromisoformat(g["grant_date"])}
            for g in cfg.get("lti_grants", [])
        ]
        self.sti_payments   = [(date.fromisoformat(p["date"]), p["amount"]) for p in cfg.get("sti_payments", [])]
        self.bonus_payments = [(date.fromisoformat(p["date"]), p["amount"]) for p in cfg.get("bonus_payments", [])]

        tax = cfg["tax"]
        self.personal_allowance = tax["personal_allowance"]
        self.ssf_annual         = tax["ssf_annual"]
        self.pf_rate            = tax["pf_rate"]
        self.tax_brackets       = [
            (float("inf") if b[0] is None else float(b[0]), float(b[1]))
            for b in tax["brackets"]
        ]

        self._salary_annual     = self.salary_monthly * 12
        self._salary_annual_tax = self._annual_tax(self._salary_annual)
        self._salary_periods    = len(self.salary_days) * 12
        self._salary_tax_period = self._salary_annual_tax / self._salary_periods

    # ── Tax helpers ─────────────────────────────────────────────────────────────

    def _thai_progressive_tax(self, taxable: float) -> float:
        tax, rem = 0.0, max(0.0, taxable)
        for band, rate in self.tax_brackets:
            if rem <= 0:
                break
            tax += min(rem, band) * rate
            rem -= band
        return tax

    def _annual_tax(self, annual_gross: float) -> float:
        pf_annual         = self.salary_monthly * self.pf_rate * len(self.salary_days) * 12
        employment_deduct = min(annual_gross * 0.50, 100_000)
        taxable           = annual_gross - employment_deduct - self.personal_allowance - self.ssf_annual - pf_annual
        return self._thai_progressive_tax(taxable)

    def _one_time_tax(self, amount: float) -> float:
        return self._annual_tax(self._salary_annual + amount) - self._salary_annual_tax

    # ── Payment generation ──────────────────────────────────────────────────────

    def generate_payments(self, year: int) -> list[Payment]:
        payments = []

        salary_each = self.salary_monthly / len(self.salary_days)
        for month in range(1, 13):
            for day in self.salary_days:
                try:
                    d = date(year, month, day)
                except ValueError:
                    continue
                payments.append(Payment(
                    d, "Salary",
                    salary_each,
                    round(salary_each * self.stock_deduct_rate),
                    round(self._salary_tax_period),
                ))

        for grant in self.lti_grants:
            for d, amount in get_schedule(grant):
                if d.year == year:
                    payments.append(Payment(
                        d, grant["name"],
                        amount,
                        round(amount * self.stock_deduct_rate),
                        round(self._one_time_tax(amount)),
                    ))

        for d, amount in self.sti_payments:
            if d.year == year:
                payments.append(Payment(
                    d, "STI",
                    amount,
                    round(amount * self.stock_deduct_rate),
                    round(self._one_time_tax(amount)),
                ))

        for d, amount in self.bonus_payments:
            if d.year == year:
                payments.append(Payment(
                    d, "Bonus",
                    amount,
                    round(amount * self.stock_deduct_rate),
                    round(self._one_time_tax(amount)),
                ))

        return sorted(payments, key=lambda p: p.date)


# ── Module-level helpers for CLI ───────────────────────────────────────────────

def _default_calc() -> IncomeCalc:
    return IncomeCalc(json.loads(CONFIG_PATH.read_text()))


def generate_payments(year: int) -> list[Payment]:
    return _default_calc().generate_payments(year)


# Keep these for backward compat / CLI use
def _get_globals():
    calc = _default_calc()
    return calc


def print_table(payments: list[Payment], label: str):
    col = 45
    print(f"\n{'='*col}")
    print(f" {label}")
    print(f"{'='*col}")
    print(f"{'Date':<12} {'Type':<8} {'Gross':>10} {'Stock':>10} {'Net':>10}")
    print(f"{'-'*col}")

    total_stock = 0
    prev_month  = None
    for p in payments:
        if prev_month and p.date.month != prev_month:
            print()
        prev_month   = p.date.month
        total_stock += p.stock_deduct
        print(f"{p.date.strftime('%d %b %Y'):<12} {p.type:<8} "
              f"{p.gross:>10,.0f} {p.stock_deduct:>10,.0f} {p.net:>10,.0f}")

    total_gross = sum(p.gross for p in payments)
    total_net   = sum(p.net   for p in payments)
    print(f"{'='*col}")
    print(f"{'TOTAL':<20} {total_gross:>10,.0f} {total_stock:>10,.0f} {total_net:>10,.0f}")
    print(f"{'(all THB)':<45}")
    print(f"{'='*col}")

    types = dict.fromkeys(p.type for p in payments)
    print(f"\nSUMMARY BREAKDOWN:")
    for t in types:
        group = [p for p in payments if p.type == t]
        print(f"  {t:<8} ({len(group):>2} payments)   "
              f"gross: {sum(p.gross for p in group):>10,.0f}   "
              f"net: {sum(p.net for p in group):>10,.0f}")

    print(f"\n  Total stock purchased:  {total_stock:>10,.0f} THB")
    print(f"  Total cash received:    {total_net:>10,.0f} THB")
    print(f"  Total gross income:     {total_gross:>10,.0f} THB")
    print(f"{'='*col}\n")


def print_all_lti(calc: IncomeCalc | None = None):
    if calc is None:
        calc = _default_calc()
    col = 50
    for grant in calc.lti_grants:
        schedule    = get_schedule(grant)
        total_grant = sum(a for _, a in schedule)
        print(f"\n{'='*col}")
        if "grant_date" in grant:
            print(f" {grant['name']} — granted {grant['grant_date'].strftime('%d %b %Y')} | total {grant['total']:,.0f} THB")
        else:
            print(f" {grant['name']} — explicit schedule | total {total_grant:,.0f} THB")
        print(f"{'='*col}")
        print(f"{'Pay Date':<14} {'Amount':>10} {'Stock':>10} {'Net':>10}")
        print(f"{'-'*col}")
        for d, amount in schedule:
            stock = round(amount * calc.stock_deduct_rate)
            print(f"{d.strftime('%d %b %Y'):<14} {amount:>10,.0f} {stock:>10,.0f} {amount - stock:>10,.0f}")
        print(f"{'-'*col}")
        print(f"{'TOTAL':<14} {total_grant:>10,.0f} {round(total_grant * calc.stock_deduct_rate):>10,.0f} {round(total_grant * (1 - calc.stock_deduct_rate)):>10,.0f}")


if __name__ == "__main__":
    calc = _default_calc()

    parser = argparse.ArgumentParser(description="Income Calculator")
    parser.add_argument("--year",       type=int,  default=calc.year, help=f"Year (default: {calc.year})")
    parser.add_argument("--from-today", action="store_true", help="Show past and upcoming split")
    parser.add_argument("--all-lti",    action="store_true", help="Show full LTI vesting schedules")
    args = parser.parse_args()

    if args.all_lti:
        print_all_lti(calc)
    else:
        payments = calc.generate_payments(args.year)
        if args.from_today:
            today    = date.today()
            past     = [p for p in payments if p.date <  today]
            upcoming = [p for p in payments if p.date >= today]
            if past:
                print_table(past, f"PAST PAYMENTS ({args.year})")
            print_table(upcoming, f"UPCOMING PAYMENTS — {today.strftime('%d %b %Y')} onwards")
        else:
            print_table(payments, f"FULL YEAR {args.year}")
