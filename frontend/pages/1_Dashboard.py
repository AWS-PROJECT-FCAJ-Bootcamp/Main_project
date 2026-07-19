import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta

# -------------------------------------------------------------------
# 1. CẤU HÌNH TRANG & HÀM TIÊM SIDEBAR (CUSTOM UI)
# -------------------------------------------------------------------
st.set_page_config(page_title="FSD - Dashboard", layout="wide", initial_sidebar_state="expanded")

# -------------------------------------------------------------------
# 2. CSS TÙY CHỈNH CHO GIAO DIỆN CHÍNH (DARK/NEON THEME)
# -------------------------------------------------------------------
custom_css = """
<style>
    /* Nền đen đậm / xám than chì */
    .stApp {
        background-color: #0A0E17;
        color: #E0E6ED;
    }
    
    /* Hiệu ứng kính mờ (Glassmorphism) */
    .st-emotion-cache-1y4p8pa, .st-emotion-cache-16txtl3, div[data-testid="metric-container"] {
        background: rgba(20, 26, 38, 0.6) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 4px !important;
        padding: 15px !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important;
    }

    /* Kiểu chữ siêu sắc nét, số đơn khoảng cách (monospace) */
    h1, h2, h3, p, span, div {
        font-family: 'Inter', 'Segoe UI', sans-serif !important;
    }
    div[data-testid="stMetricValue"], div[data-testid="stMetricDelta"] {
        font-family: 'Fira Code', 'Courier New', monospace !important;
        letter-spacing: -0.5px;
    }

    /* Điểm nhấn màu sắc Delta */
    div[data-testid="stMetricDelta"] > div:nth-child(1) > span {
        color: #00FF88 !important; /* Lợi nhuận: Xanh lá plasma */
    }
    div[data-testid="stMetricDelta"] > div:nth-child(2) > span {
        color: #FF3366 !important; /* Thua lỗ: Đỏ neon */
    }
    
    /* Tùy chỉnh thanh tìm kiếm và Date Picker */
    div[data-baseweb="input"], div[data-baseweb="base-input"] {
        background-color: #121826 !important;
        border: 1px solid #1F2937 !important;
        border-radius: 4px !important;
    }
    div[data-baseweb="input"]:focus-within {
        border-color: #00E5FF !important;
        box-shadow: 0 0 8px rgba(0, 229, 255, 0.3) !important;
    }
    input {
        color: #00E5FF !important; /* Text nhập vào màu Xanh lam điện */
    }

    /* Tùy chỉnh DataFrame */
    .stDataFrame {
        font-family: 'Fira Code', monospace !important;
    }
    
    header {visibility: hidden;}
    footer {visibility: hidden;}
</style>
"""
st.markdown(custom_css, unsafe_allow_html=True)


# -------------------------------------------------------------------
# 3. HÀM TRUY XUẤT DỮ LIỆU (TÍCH HỢP BỘ LỌC THỜI GIAN)
# -------------------------------------------------------------------
@st.cache_data(ttl=60)
def fetch_market_indices():
    """Mô phỏng dữ liệu cho thanh tổng quan thị trường"""
    return [
        {"name": "NIFTY 50", "value": "24,853.15", "delta": "1.24%"},
        {"name": "BANK NIFTY", "value": "53,241.80", "delta": "-0.38%"},
        {"name": "SENSEX", "value": "81,920.35", "delta": "0.87%"},
        {"name": "S&P 500", "value": "5,841.30", "delta": "0.53%"},
        {"name": "FTSE 100", "value": "8,451.75", "delta": "-0.12%"},
        {"name": "DAX", "value": "18,872.20", "delta": "0.21%"},
    ]

@st.cache_data(ttl=300)
def fetch_ohlcv_data(ticker, start_date, end_date):
    """
    Thực tế: Gửi query params -> API Gateway -> Athena.
    """
    if start_date > end_date:
        return pd.DataFrame()

    dates = pd.date_range(start=start_date, end=end_date, freq='B')
    num_days = len(dates)
    
    if num_days == 0:
        return pd.DataFrame() 
    
    np.random.seed(42)
    close_prices = 2850 + np.cumsum(np.random.randn(num_days) * 20 + 5)
    
    df = pd.DataFrame({
        'DATE': dates.strftime('%Y-%m-%d'),
        'OPEN': close_prices - np.random.uniform(5, 20, num_days),
        'HIGH': close_prices + np.random.uniform(5, 30, num_days),
        'LOW': close_prices - np.random.uniform(10, 40, num_days),
        'CLOSE': close_prices,
        'VOLUME': np.random.uniform(1.1, 99.9, num_days).round(2),
        'VOL_UNIT': np.random.choice(['Cr', 'L'], num_days)
    })
    
    df = df.sort_values('DATE', ascending=False).reset_index(drop=True)
    df.index = df.index + 1
    
    df['CHG %'] = df['CLOSE'].pct_change(-1) * 100
    df['CHG %'] = df['CHG %'].fillna(0).map("{:+.2f}%".format)
    df['VOLUME_STR'] = df['VOLUME'].astype(str) + " " + df['VOL_UNIT']
    return df


# -------------------------------------------------------------------
# 4. BỐ CỤC GIAO DIỆN CHÍNH
# -------------------------------------------------------------------

# 4.1. Header & Thanh Tìm Kiếm + Bộ Lọc Thời Gian
col_logo, col_search, col_start, col_end, col_status = st.columns([1, 2.5, 1, 1, 2])

with col_logo:
    st.markdown("<h2 style='color: #00E5FF; margin-top: 0;'>FSD <span style='font-size: 14px; color: #8892B0;'>v2.0</span></h2>", unsafe_allow_html=True)

with col_search:
    search_query = st.text_input("Search Ticker", value="RELIANCE", placeholder="🔍 Tìm kiếm: Tên công ty, mã CP...", label_visibility="collapsed")

with col_start:
    default_start = datetime.today() - timedelta(days=90)
    start_date = st.date_input("Start Date", value=default_start, label_visibility="collapsed")

with col_end:
    end_date = st.date_input("End Date", value=datetime.today(), label_visibility="collapsed")


st.markdown("<hr style='border: 1px solid #1F2937; margin: 10px 0;'>", unsafe_allow_html=True)

# 4.2. Hàng Chỉ Số Thị Trường
indices = fetch_market_indices()
cols = st.columns(6)
for i, col in enumerate(cols):
    with col:
        st.metric(label=indices[i]["name"], value=indices[i]["value"], delta=indices[i]["delta"])

st.markdown("<br>", unsafe_allow_html=True)

# Lấy dữ liệu chứng khoán
current_ticker = search_query.upper() if search_query else "RELIANCE"
df_stock = fetch_ohlcv_data(current_ticker, start_date, end_date)

if df_stock.empty:
    st.warning("⚠️ Không có dữ liệu cho khoảng thời gian này. Vui lòng chọn lại ngày bắt đầu và kết thúc hợp lý.")
    st.stop()

latest = df_stock.iloc[0]

# 4.3. Tên Cổ Phiếu & Giá Trị Hiện Tại
st.markdown(f"""
    <div style='display: flex; align-items: baseline; gap: 15px;'>
        <h3 style='margin: 0; color: #FFFFFF;'>{current_ticker} <span style='font-size: 12px; color: #8892B0;'>NSE • Equity</span></h3>
        <h2 style='margin: 0; color: #FFFFFF; font-family: monospace;'>₹{latest['CLOSE']:.2f}</h2>
        <span style='color: #FF3366; font-family: monospace; font-weight: bold;'>-10.45 (-0.34%)</span>
        <span style='color: #8892B0; font-family: monospace; font-size: 12px;'>
            O <span style='color: #E0E6ED;'>{latest['OPEN']:.2f}</span> &nbsp;&nbsp; 
            H <span style='color: #00FF88;'>{latest['HIGH']:.2f}</span> &nbsp;&nbsp; 
            L <span style='color: #FF3366;'>{latest['LOW']:.2f}</span> &nbsp;&nbsp; 
            V <span style='color: #E0E6ED;'>{latest['VOLUME_STR']}</span>
        </span>
    </div>
""", unsafe_allow_html=True)

# 4.4. Biểu Đồ Kỹ Thuật (Chart)
df_plot = df_stock.sort_values('DATE') 

fig = make_subplots(rows=2, cols=1, shared_xaxes=True, 
                    vertical_spacing=0.03, subplot_titles=('', ''), 
                    row_width=[0.2, 0.7])

fig.add_trace(go.Scatter(x=df_plot['DATE'], y=df_plot['CLOSE'], 
                         mode='lines', name='Price',
                         line=dict(color='#00E5FF', width=2),
                         fill='tozeroy', fillcolor='rgba(0, 229, 255, 0.05)'), 
              row=1, col=1)

colors = ['#FF3366' if df_plot.iloc[i]['CLOSE'] < df_plot.iloc[i]['OPEN'] else '#00FF88' for i in range(len(df_plot))]
fig.add_trace(go.Bar(x=df_plot['DATE'], y=df_plot['VOLUME'], marker_color=colors, opacity=0.7, name='Volume'), row=2, col=1)

fig.update_layout(
    height=450,
    margin=dict(l=10, r=10, t=10, b=10),
    plot_bgcolor='#0A0E17',
    paper_bgcolor='#0A0E17',
    showlegend=False,
    hovermode='x unified'
)

fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='#1F2937', zeroline=False, tickfont=dict(color='#8892B0'))
fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='#1F2937', zeroline=False, tickfont=dict(color='#8892B0'))

st.plotly_chart(fig, use_container_width=True)


# 4.5. Dữ Liệu Thô (Raw Market Data)
st.markdown(f"<h4 style='color: #8892B0; margin-bottom: 10px; margin-top: 20px;'>⊞ RAW MARKET DATA &nbsp; <span style='font-size: 12px;'>{current_ticker} • NSE • OHLCV</span></h4>", unsafe_allow_html=True)

df_display = df_stock[['DATE', 'OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME_STR', 'CHG %']].copy()
df_display.columns = ['DATE', 'OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME', 'CHG %']

st.dataframe(df_display, use_container_width=True, height=300)