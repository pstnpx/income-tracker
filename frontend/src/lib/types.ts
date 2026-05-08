export type IncomeView = "gross" | "deductions"

export interface Config {
  year: number
  salary: {
    monthly: number
    pay_days: number[]
  }
  stock_deduct_rate: number
  lti_grants: Array<{
    name: string
    grant_date: string
    total: number
    first_vest_pct: number
    quarterly_pct: number
    pay_day: number
  }>
  sti_payments: Array<{ date: string; amount: number }>
  bonus_payments: Array<{ date: string; amount: number }>
  tax: {
    personal_allowance: number
    ssf_annual: number
    pf_rate: number
    brackets: Array<[number | null, number]>
  }
  fixed_costs: {
    pay_dates: number
    items: Array<{ label: string; monthly: number }>
  }
  balance: {
    provident_fund_pct: number
    social_fund_thb: number
  }
  stock_ticker: string
  stock_purchases: {
    H1: { buy_price_usd: number; buy_rate_thb: number }
    H2: { buy_price_usd: number; buy_rate_thb: number }
  }
}

export interface Payment {
  date: string
  type: "Salary" | "LTI" | "LTI2" | "LTI3" | "STI" | "Bonus"
  gross: number
  stock_deduct: number
  tax: number
  net: number
  take_home: number
}

export interface PaymentsResponse {
  year: number
  payments: Payment[]
  summary: {
    total_gross: number
    total_stock: number
    total_tax: number
    total_net: number
    total_take_home: number
    payment_count: number
  }
}

export interface LtiScheduleEntry {
  date: string
  amount: number
  stock: number
  net: number
}

export interface LtiGrant {
  name: string
  grant_date: string | null
  total: number
  first_vest_pct: number | null
  quarterly_pct: number | null
  schedule: LtiScheduleEntry[]
  schedule_total: number
}

export interface LtiGrantsResponse {
  grants: LtiGrant[]
}

export interface StockPeriod {
  period: "H1" | "H2"
  buy_date: string
  thb_invested: number
  payments: { date: string; type: string; stock_deduct: number }[]
}

export interface StockPurchasesResponse {
  purchases: StockPeriod[]
  total_invested: number
}

export interface StockPriceResponse {
  ticker: string
  price_usd: number
  prev_close: number
  day_change_usd: number
  day_change_pct: number
  usd_thb_rate: number
  fetched_at: string
  error?: string
}
