#!/usr/bin/env python3
"""
Income Dashboard — FastAPI server (multi-user)
Run: uv run uvicorn app:app --host 0.0.0.0 --port 5050 --reload
"""

import json
import os
import shutil
import datetime
import pytz
import yfinance as yf
from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import Any

from income_calc import IncomeCalc, get_schedule, CONFIG_PATH, Payment

# Internal API key — must match INTERNAL_API_KEY in the Next.js env
_INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY", "")

app = FastAPI(title="Income Dashboard API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "PUT"],
    allow_headers=["*"],
)

# ── Auth dependency ────────────────────────────────────────────────────────────

def verify_key(x_internal_key: str = Header(default="")):
    if _INTERNAL_KEY and x_internal_key != _INTERNAL_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")


# Per-user configs live here; default template is config.json
CONFIG_DIR = CONFIG_PATH.parent / "configs"
CONFIG_DIR.mkdir(exist_ok=True)


# ── Per-user config helpers ────────────────────────────────────────────────────

def _user_config_path(email: str) -> Path:
    safe = email.replace("@", "__").replace(".", "_").replace("+", "_")
    return CONFIG_DIR / f"{safe}.json"


def _load_user_config(email: str) -> dict:
    path = _user_config_path(email)
    if not path.exists():
        shutil.copy(CONFIG_PATH, path)
    return json.loads(path.read_text())


def _get_calc(email: str) -> IncomeCalc:
    return IncomeCalc(_load_user_config(email))


# ── Response models ────────────────────────────────────────────────────────────

class PaymentOut(BaseModel):
    date: str
    type: str
    gross: float
    stock_deduct: float
    tax: float
    net: float
    take_home: float

class PaymentsSummary(BaseModel):
    total_gross: float
    total_stock: float
    total_tax: float
    total_net: float
    total_take_home: float
    payment_count: int

class PaymentsResponse(BaseModel):
    year: int
    payments: list[PaymentOut]
    summary: PaymentsSummary

class LtiScheduleEntry(BaseModel):
    date: str
    amount: float
    stock: float
    net: float

class LtiGrantOut(BaseModel):
    name: str
    grant_date: str | None
    total: float
    first_vest_pct: float | None
    quarterly_pct: float | None
    schedule: list[LtiScheduleEntry]
    schedule_total: float

class LtiGrantsResponse(BaseModel):
    grants: list[LtiGrantOut]

class StockPeriodPayment(BaseModel):
    date: str
    type: str
    stock_deduct: float

class StockPeriod(BaseModel):
    period: str
    buy_date: str
    thb_invested: float
    payments: list[StockPeriodPayment]

class StockPurchasesResponse(BaseModel):
    purchases: list[StockPeriod]
    total_invested: float

class StockPriceResponse(BaseModel):
    ticker: str
    price_usd: float
    prev_close: float
    day_change_usd: float
    day_change_pct: float
    usd_thb_rate: float
    fetched_at: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/api/payments", response_model=PaymentsResponse, dependencies=[Depends(verify_key)])
def api_payments(x_user_email: str = Header(default="")):
    calc     = _get_calc(x_user_email)
    payments = calc.generate_payments(calc.year)
    return {
        "year": calc.year,
        "payments": [
            {
                "date": p.date.isoformat(), "type": p.type,
                "gross": p.gross, "stock_deduct": p.stock_deduct,
                "tax": p.tax, "net": p.net, "take_home": p.take_home,
            }
            for p in payments
        ],
        "summary": {
            "total_gross":     sum(p.gross        for p in payments),
            "total_stock":     sum(p.stock_deduct for p in payments),
            "total_tax":       sum(p.tax          for p in payments),
            "total_net":       sum(p.net          for p in payments),
            "total_take_home": sum(p.take_home    for p in payments),
            "payment_count":   len(payments),
        },
    }


@app.get("/api/lti-grants", response_model=LtiGrantsResponse, dependencies=[Depends(verify_key)])
def api_lti_grants(x_user_email: str = Header(default="")):
    calc       = _get_calc(x_user_email)
    grants_out = []
    for grant in calc.lti_grants:
        schedule = get_schedule(grant)
        total    = sum(a for _, a in schedule)
        grants_out.append({
            "name":           grant["name"],
            "grant_date":     grant["grant_date"].isoformat() if "grant_date" in grant else None,
            "total":          grant.get("total", total),
            "first_vest_pct": grant.get("first_vest_pct"),
            "quarterly_pct":  grant.get("quarterly_pct"),
            "schedule": [
                {"date": d.isoformat(), "amount": a,
                 "stock": round(a * calc.stock_deduct_rate),
                 "net":   round(a * (1 - calc.stock_deduct_rate))}
                for d, a in schedule
            ],
            "schedule_total": total,
        })
    return {"grants": grants_out}


@app.get("/api/stock-purchases", response_model=StockPurchasesResponse, dependencies=[Depends(verify_key)])
def api_stock_purchases(x_user_email: str = Header(default="")):
    from datetime import date as dt
    calc     = _get_calc(x_user_email)
    payments = calc.generate_payments(calc.year)
    h1 = [p for p in payments if p.date <= dt(calc.year, 6, 30)]
    h2 = [p for p in payments if p.date >  dt(calc.year, 6, 30)]

    def period_data(period: str, buy_date: dt, ps: list[Payment]):
        return {
            "period":       period,
            "buy_date":     buy_date.isoformat(),
            "thb_invested": sum(p.stock_deduct for p in ps),
            "payments": [
                {"date": p.date.isoformat(), "type": p.type, "stock_deduct": p.stock_deduct}
                for p in ps
            ],
        }

    return {
        "purchases": [
            period_data("H1", dt(calc.year, 6, 30),  h1),
            period_data("H2", dt(calc.year, 12, 30), h2),
        ],
        "total_invested": sum(p.stock_deduct for p in payments),
    }


@app.get("/api/stock-price", response_model=StockPriceResponse, dependencies=[Depends(verify_key)])
def api_stock_price(x_user_email: str = Header(default="")):
    calc       = _get_calc(x_user_email)
    ticker_sym = calc.stock_ticker

    ticker   = yf.Ticker(ticker_sym)
    hist     = ticker.history(period="5d")
    price    = float(hist.iloc[-1]["Close"])
    prev     = float(hist.iloc[-2]["Close"]) if len(hist) > 1 else price

    thb_ticker = yf.Ticker("THBUSD=X")
    thb_hist   = thb_ticker.history(period="5d")
    usd_thb    = float(1 / thb_hist.iloc[-1]["Close"]) if not thb_hist.empty else 34.5

    bangkok = pytz.timezone("Asia/Bangkok")
    now_bkk = datetime.datetime.now(pytz.UTC).astimezone(bangkok)

    return {
        "ticker":         ticker_sym,
        "price_usd":      round(price, 2),
        "prev_close":     round(prev, 2),
        "day_change_usd": round(price - prev, 2),
        "day_change_pct": round((price - prev) / prev * 100, 2),
        "usd_thb_rate":   round(usd_thb, 2),
        "fetched_at":     now_bkk.isoformat(),
    }


# ── Config endpoints ────────────────────────────────────────────────────────────

@app.get("/api/config", dependencies=[Depends(verify_key)])
def api_get_config(x_user_email: str = Header(default="")) -> Any:
    return _load_user_config(x_user_email)


@app.put("/api/config", dependencies=[Depends(verify_key)])
async def api_put_config(request: Request, x_user_email: str = Header(default="")) -> dict:
    config = await request.json()
    path   = _user_config_path(x_user_email)
    path.write_text(json.dumps(config, indent=2, ensure_ascii=False))
    try:
        IncomeCalc(config)  # validate by instantiating
    except Exception as e:
        path.write_text(json.dumps(_load_user_config(x_user_email), indent=2))  # rollback
        raise HTTPException(status_code=422, detail=f"Invalid config: {e}")
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5050, reload=True)
