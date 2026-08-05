"""Financial Ratio Engine — tính toàn bộ chỉ số tài chính.

Nhóm:
  1. Thanh khoản (Liquidity)
  2. Sinh lời (Profitability)
  3. Đòn bẩy (Leverage)
  4. Quy mô & Tăng trưởng (Size & Growth)
  5. Thị trường / Kỹ thuật (Technical) — MACD, RSI, ADX, CCI, Sharpe
  6. Altman Z-Score (Emerging Market variant)

Distress Engine:
  - Rule-based labeling
  - Z-Score labeling
  - Combined distress score (0–100)
"""
from __future__ import annotations

import logging
import math
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe(value: Any, decimals: int = 4) -> float | None:
    """Trả về float được làm tròn, None nếu NaN/Inf."""
    try:
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return None
        return round(v, decimals)
    except (TypeError, ValueError):
        return None


def _pct(num: float | None, den: float | None) -> float | None:
    if num is None or den is None or den == 0:
        return None
    return _safe(num / den * 100)


def _div(num: float | None, den: float | None) -> float | None:
    if num is None or den is None or den == 0:
        return None
    return _safe(num / den)


# ─── Ratio Engine ─────────────────────────────────────────────────────────────

def compute_financial_ratios(
    balance_sheet: list[dict],
    income_statement: list[dict],
    cash_flow: list[dict],
    prices: list[dict] | None = None,
) -> dict:
    """Tính toàn bộ chỉ số tài chính từ 3 bảng BCTC.

    Returns dict với các nhóm chỉ số theo kỳ báo cáo.
    """
    if not balance_sheet and not income_statement:
        return {"error": "Không có dữ liệu BCTC để tính toán"}

    bs_df = pd.DataFrame(balance_sheet) if balance_sheet else pd.DataFrame()
    is_df = pd.DataFrame(income_statement) if income_statement else pd.DataFrame()
    cf_df = pd.DataFrame(cash_flow) if cash_flow else pd.DataFrame()

    # Normalize column names to lowercase
    for df in (bs_df, is_df, cf_df):
        df.columns = [c.lower().strip() for c in df.columns]

    results: list[dict] = []

    # Use balance sheet periods as anchor
    period_col = _detect_period_col(bs_df)
    periods = bs_df[period_col].unique() if not bs_df.empty and period_col else []

    for period in periods:
        row: dict = {"period": str(period)}

        bs_row = _get_row(bs_df, period_col, period)
        is_row = _get_row(is_df, period_col, period)
        cf_row = _get_row(cf_df, period_col, period)

        # ── Liquidity ──
        ca = _get(bs_row, "current_assets", "tai_san_ngan_han", "short_term_assets")
        cl = _get(bs_row, "current_liabilities", "no_ngan_han", "short_term_liabilities")
        inv = _get(bs_row, "inventory", "hang_ton_kho", "inventories")
        ocf = _get(cf_row, "operating_cash_flow", "tien_tu_hoat_dong_kinh_doanh", "net_cash_from_operations")

        row["current_ratio"] = _div(ca, cl)
        row["quick_ratio"] = _div((ca or 0) - (inv or 0), cl) if ca is not None and cl is not None else None
        row["ocf_to_cl"] = _div(ocf, cl)

        # ── Profitability ──
        ta = _get(bs_row, "total_assets", "tong_tai_san", "total_asset")
        equity = _get(bs_row, "equity", "von_chu_so_huu", "stockholders_equity")
        net_income = _get(is_row, "net_income", "loi_nhuan_sau_thue", "profit_after_tax")
        revenue = _get(is_row, "revenue", "doanh_thu_thuan", "net_revenue")
        ebit = _get(is_row, "ebit", "loi_nhuan_truoc_lai_va_thue")
        if ebit is None:
            op_profit = _get(is_row, "operating_profit", "loi_nhuan_hoat_dong")
            interest_exp = _get(is_row, "interest_expense", "chi_phi_lai_vay")
            if op_profit is not None:
                ebit = op_profit

        row["roa"] = _pct(net_income, ta)
        row["roe"] = _pct(net_income, equity)
        row["ebit_margin"] = _pct(ebit, revenue)
        row["net_margin"] = _pct(net_income, revenue)
        row["asset_turnover"] = _div(revenue, ta)
        row["ocf_margin"] = _pct(ocf, revenue)

        # ── Leverage ──
        total_debt = _get(bs_row, "total_liabilities", "tong_no_phai_tra", "total_debt")
        long_debt = _get(bs_row, "long_term_liabilities", "no_dai_han", "long_term_debt")
        interest_exp = _get(is_row, "interest_expense", "chi_phi_lai_vay")

        row["debt_ratio"] = _div(total_debt, ta)
        row["debt_to_equity"] = _div(total_debt, equity)
        row["short_term_debt_ratio"] = _div(cl, ta)
        row["long_term_debt_ratio"] = _div(long_debt, ta)
        row["interest_coverage"] = _div(ebit, interest_exp) if interest_exp and interest_exp != 0 else None

        # ── Size & Growth ──
        row["log_total_assets"] = _safe(math.log10(ta)) if ta and ta > 0 else None

        # ── Retained earnings ──
        retained = _get(bs_row, "retained_earnings", "loi_nhuan_chua_phan_phoi")
        row["retained_earnings_to_ta"] = _div(retained, ta)

        # ── Working capital ──
        wc = (ca or 0) - (cl or 0) if ca is not None and cl is not None else None
        row["working_capital_to_ta"] = _div(wc, ta)

        # ── Altman Z-Score (Emerging Market) ──
        x1 = _div(wc, ta)
        x2 = _div(retained, ta)
        x3 = _div(ebit, ta)
        # x4: market equity / total debt — skip if no price data
        x4 = None
        x5 = _div(revenue, ta)

        if all(v is not None for v in [x1, x2, x3, x5]):
            z = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + (1.05 * x4 if x4 is not None else 0) + 1.05 * x5
            row["z_score"] = _safe(z)
            row["z_score_zone"] = _z_zone(z)
        else:
            row["z_score"] = None
            row["z_score_zone"] = "Không đủ dữ liệu"

        row["z_x1_wc_ta"] = x1
        row["z_x2_re_ta"] = x2
        row["z_x3_ebit_ta"] = x3
        row["z_x5_rev_ta"] = x5

        results.append(row)

    # Technical indicators from prices
    tech = {}
    if prices:
        tech = _compute_technical(prices)

    return {
        "periods": results,
        "technical": tech,
        "total_periods": len(results),
    }


def _z_zone(z: float) -> str:
    if z >= 2.6:
        return "SAFE"
    if z >= 1.1:
        return "GREY"
    return "DISTRESS"


def _detect_period_col(df: pd.DataFrame) -> str | None:
    for col in ("period", "quarter", "year", "nam", "quy", "yearquarter", "report_date"):
        if col in df.columns:
            return col
    return df.columns[0] if not df.empty else None


def _get_row(df: pd.DataFrame, period_col: str | None, period: Any) -> dict:
    if df.empty or period_col is None or period_col not in df.columns:
        return {}
    rows = df[df[period_col] == period]
    if rows.empty:
        return {}
    return rows.iloc[0].to_dict()


def _get(row: dict, *keys: str) -> float | None:
    for k in keys:
        v = row.get(k)
        if v is not None:
            return _safe(v)
    return None


def _compute_technical(prices: list[dict]) -> dict:
    """Tính MACD, RSI, ADX, CCI từ price series."""
    if len(prices) < 20:
        return {"note": "Cần ít nhất 20 phiên để tính chỉ số kỹ thuật"}

    df = pd.DataFrame(prices)
    df.columns = [c.lower() for c in df.columns]

    close_col = next((c for c in ("close_price", "close", "adj_close") if c in df.columns), None)
    high_col = next((c for c in ("high_price", "high") if c in df.columns), None)
    low_col = next((c for c in ("low_price", "low") if c in df.columns), None)

    if close_col is None:
        return {"note": "Không có cột giá đóng cửa"}

    close = pd.to_numeric(df[close_col], errors="coerce").dropna()

    result: dict = {}

    # RSI
    try:
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        result["rsi_14"] = _safe(rsi.iloc[-1])
    except Exception:
        result["rsi_14"] = None

    # MACD
    try:
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal = macd_line.ewm(span=9, adjust=False).mean()
        result["macd"] = _safe(macd_line.iloc[-1])
        result["macd_signal"] = _safe(signal.iloc[-1])
        result["macd_histogram"] = _safe((macd_line - signal).iloc[-1])
    except Exception:
        result["macd"] = None

    # CCI
    try:
        if high_col and low_col:
            high = pd.to_numeric(df[high_col], errors="coerce")
            low = pd.to_numeric(df[low_col], errors="coerce")
            tp = (high + low + close) / 3
            cci = (tp - tp.rolling(20).mean()) / (0.015 * tp.rolling(20).std())
            result["cci_20"] = _safe(cci.iloc[-1])
    except Exception:
        result["cci_20"] = None

    # Sharpe (annualized, 252 trading days, risk-free 4.5%)
    try:
        returns = close.pct_change().dropna()
        if len(returns) >= 60:
            rf = 0.045 / 252
            excess = returns - rf
            sharpe = excess.mean() / excess.std() * math.sqrt(252)
            result["sharpe_ratio"] = _safe(sharpe)
    except Exception:
        result["sharpe_ratio"] = None

    return result


# ─── Distress Engine ──────────────────────────────────────────────────────────

def compute_distress_score(
    balance_sheet: list[dict],
    income_statement: list[dict],
    cash_flow: list[dict],
    period: str | None = None,
) -> dict:
    """Tính distress label và score cho kỳ gần nhất (hoặc kỳ chỉ định).

    Returns:
        {
          "distress_score": 0-100,
          "distress_label": 0|1,
          "distress_status": "SAFE"|"GREY"|"DISTRESS",
          "rules": [...],
          "z_score": float,
          "z_zone": str,
          "period": str,
        }
    """
    bs_df = pd.DataFrame(balance_sheet) if balance_sheet else pd.DataFrame()
    is_df = pd.DataFrame(income_statement) if income_statement else pd.DataFrame()
    cf_df = pd.DataFrame(cash_flow) if cash_flow else pd.DataFrame()

    for df in (bs_df, is_df, cf_df):
        df.columns = [c.lower().strip() for c in df.columns]

    period_col = _detect_period_col(bs_df)

    # Get latest or specified period
    if not bs_df.empty and period_col:
        available = sorted(bs_df[period_col].unique(), reverse=True)
        target = period if period in available else (available[0] if available else None)
    else:
        target = None

    if target is None:
        return {"error": "Không có dữ liệu BCTC"}

    bs = _get_row(bs_df, period_col, target)
    is_ = _get_row(is_df, period_col, target)
    cf = _get_row(cf_df, period_col, target)

    # Extract key financial figures
    net_income = _get(is_, "net_income", "loi_nhuan_sau_thue", "profit_after_tax")
    equity = _get(bs, "equity", "von_chu_so_huu", "stockholders_equity")
    retained = _get(bs, "retained_earnings", "loi_nhuan_chua_phan_phoi")
    ebit = _get(is_, "ebit", "loi_nhuan_truoc_lai_va_thue")
    interest = _get(is_, "interest_expense", "chi_phi_lai_vay")
    ocf = _get(cf, "operating_cash_flow", "tien_tu_hoat_dong_kinh_doanh")
    ca = _get(bs, "current_assets", "tai_san_ngan_han")
    cl = _get(bs, "current_liabilities", "no_ngan_han")
    ta = _get(bs, "total_assets", "tong_tai_san")
    revenue = _get(is_, "revenue", "doanh_thu_thuan")

    # ── Rule-based checks ──
    rules: list[dict] = []
    score = 0

    def check_rule(code: str, name: str, condition: bool | None, weight: int, details: str):
        nonlocal score
        triggered = bool(condition) if condition is not None else False
        if triggered:
            score += weight
        rules.append({
            "rule_code": code,
            "rule_name": name,
            "triggered": triggered,
            "weight": weight,
            "details": details,
        })

    # Get prior period net income (for consecutive loss check)
    prior_net_income = None
    if not is_df.empty and period_col and len(is_df) > 1:
        available_is = sorted(is_df[period_col].unique(), reverse=True)
        if len(available_is) > 1:
            prior_period = available_is[1]
            prior_row = _get_row(is_df, period_col, prior_period)
            prior_net_income = _get(prior_row, "net_income", "loi_nhuan_sau_thue")

    check_rule(
        "R1", "Lỗ 2 kỳ liên tiếp",
        (net_income is not None and net_income < 0) and
        (prior_net_income is not None and prior_net_income < 0),
        25,
        f"LNST kỳ này: {net_income:,.0f}" if net_income else "Không đủ dữ liệu"
    )
    check_rule(
        "R2", "Vốn chủ sở hữu âm",
        equity is not None and equity < 0,
        30,
        f"VCSH: {equity:,.0f}" if equity else "Không đủ dữ liệu"
    )
    check_rule(
        "R3", "Lợi nhuận chưa phân phối âm",
        retained is not None and retained < 0,
        15,
        f"LNPP: {retained:,.0f}" if retained else "Không đủ dữ liệu"
    )
    check_rule(
        "R4", "EBIT không đủ trả lãi vay",
        (ebit is not None and interest is not None and interest > 0 and ebit < interest),
        20,
        f"EBIT: {ebit:,.0f}, Lãi vay: {interest:,.0f}" if ebit and interest else "Không đủ dữ liệu"
    )
    check_rule(
        "R5", "OCF âm",
        ocf is not None and ocf < 0,
        15,
        f"OCF: {ocf:,.0f}" if ocf else "Không đủ dữ liệu"
    )
    check_rule(
        "R6", "Nợ ngắn hạn > Tài sản ngắn hạn",
        (ca is not None and cl is not None and cl > ca),
        20,
        f"CA: {ca:,.0f}, CL: {cl:,.0f}" if ca and cl else "Không đủ dữ liệu"
    )

    # ── Z-Score ──
    wc = (ca or 0) - (cl or 0) if ca and cl else None
    x1 = _div(wc, ta)
    x2 = _div(retained, ta)
    x3 = _div(ebit, ta)
    x5 = _div(revenue, ta)

    z_score = None
    if all(v is not None for v in [x1, x2, x3, x5]):
        z_score = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x5

    z_zone = _z_zone(z_score) if z_score is not None else "Không đủ dữ liệu"

    # ── Combine score ──
    # Rule-based max score = 125, normalize to 0-100
    rule_score = min(score / 125 * 50, 50)  # max 50% contribution

    # Z-Score contribution
    z_contrib = 0.0
    if z_score is not None:
        if z_score < 1.1:
            z_contrib = 50.0
        elif z_score < 2.6:
            z_contrib = 25.0 * (2.6 - z_score) / 1.5

    total_score = round(rule_score + z_contrib)

    if total_score >= 50:
        status = "DISTRESS"
        label = 1
    elif total_score >= 25:
        status = "GREY"
        label = 0
    else:
        status = "SAFE"
        label = 0

    return {
        "period": str(target),
        "distress_score": total_score,
        "distress_label": label,
        "distress_status": status,
        "rules": rules,
        "z_score": _safe(z_score) if z_score else None,
        "z_zone": z_zone,
        "z_components": {
            "x1_wc_ta": x1, "x2_re_ta": x2, "x3_ebit_ta": x3, "x5_rev_ta": x5
        },
    }
