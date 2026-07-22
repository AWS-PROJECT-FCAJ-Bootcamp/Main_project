import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime

# Danh sách công ty mở rộng
COMPANIES = {
    "AAPL": {"name": "Apple Inc.", "sector": "Technology", "market_cap": "$2.8T", "pe_ratio": "28.5"},
    "MSFT": {"name": "Microsoft Corp.", "sector": "Technology", "market_cap": "$3.0T", "pe_ratio": "35.2"},
    "JPM": {"name": "JPMorgan Chase", "sector": "Financials", "market_cap": "$490B", "pe_ratio": "11.2"},
    "TSLA": {"name": "Tesla, Inc.", "sector": "Automotive", "market_cap": "$750B", "pe_ratio": "45.0"},
    "NVDA": {"name": "NVIDIA Corporation", "sector": "Technology", "market_cap": "$1.5T", "pe_ratio": "65.3"},
    "V": {"name": "Visa Inc.", "sector": "Financials", "market_cap": "$500B", "pe_ratio": "30.1"}
}

@st.cache_data
def get_all_companies() -> dict:
    return COMPANIES

@st.cache_data
def get_mock_company_info(ticker: str) -> dict:
    return COMPANIES.get(ticker, {"name": "Unknown", "sector": "N/A", "market_cap": "N/A", "pe_ratio": "N/A"})

@st.cache_data
def get_mock_price_data(ticker: str, start_year: int = 2020) -> pd.DataFrame:
    """Sinh dữ liệu giá cổ phiếu ngẫu nhiên từ năm được chỉ định đến hiện tại."""
    # Dùng ticker làm seed để mỗi mã cổ phiếu có một đường giá khác nhau
    seed_val = sum([ord(c) for c in ticker])
    np.random.seed(seed_val)
    
    start_date = datetime(start_year, 1, 1)
    end_date = datetime.today()
    days = (end_date - start_date).days
    
    dates = pd.date_range(start=start_date, periods=days)
    
    # Random walk
    returns = np.random.normal(loc=0.0005, scale=0.015, size=days)
    base_price = 100 * np.exp(np.cumsum(returns))
    
    df = pd.DataFrame({
        'Date': dates,
        'Open': base_price * np.random.uniform(0.99, 1.01, days),
        'High': base_price * np.random.uniform(1.01, 1.03, days),
        'Low': base_price * np.random.uniform(0.97, 0.99, days),
        'Close': base_price,
        'Volume': np.random.randint(1000000, 10000000, days)
    })
    return df