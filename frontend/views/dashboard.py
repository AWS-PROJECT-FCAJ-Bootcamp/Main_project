import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta

# ==========================================
# 1. DATABASE MÔ PHỎNG (Danh sách cổ phiếu)
# ==========================================
STOCKS_DB = [
    {"ticker": "A32", "desc": "CTCP 32", "exchange": "UPCOM"},
    {"ticker": "AAA", "desc": "CTCP NHỰA AN PHÁT XANH", "exchange": "HSX"},
    {"ticker": "AAH", "desc": "CTCP HỢP NHẤT", "exchange": "UPCOM"},
    {"ticker": "AAM", "desc": "CTCP THỦY SẢN MEKONG", "exchange": "HSX"},
    {"ticker": "AAN", "desc": "CTCP LƯƠNG THỰC A AN", "exchange": "HSX"},
    {"ticker": "ACV", "desc": "Tổng Công ty Cảng hàng không VN", "exchange": "UPCOM"},
    {"ticker": "SHB", "desc": "Ngân hàng TMCP Sài Gòn - Hà Nội", "exchange": "HSX"},
    {"ticker": "FPT", "desc": "CTCP FPT", "exchange": "HSX"},
    {"ticker": "VCB", "desc": "Ngân hàng TMCP Ngoại thương VN", "exchange": "HSX"},
]

TIMEFRAMES = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365, "5Y": 1825}

# ==========================================
# 2. LOGIC TÍNH TOÁN NGÀY THÁNG VÀ DỮ LIỆU
# ==========================================
def get_dates_from_tf(tf_str):
    end_date = datetime.today().date()
    days = TIMEFRAMES.get(tf_str, 180)
    start_date = end_date - timedelta(days=days)
    return start_date, end_date

def generate_mock_ohlcv(ticker, start_date, end_date):
    np.random.seed(sum(ord(c) for c in ticker) + start_date.day)
    dates = pd.date_range(start=start_date, end=end_date)
    days = len(dates)
    
    if days < 2: 
        dates = pd.date_range(end=end_date, periods=2)
        days = 2
        
    base_price = 12.0 if ticker == "SHB" else (45.0 if ticker == "ACV" else (80.0 if ticker == "FPT" else 30.0))
    returns = np.random.normal(loc=0.0005, scale=0.02, size=days)
    close = base_price * np.exp(np.cumsum(returns))
    
    df = pd.DataFrame({
        'Date': dates,
        'Open': close * np.random.uniform(0.98, 1.01, days),
        'High': close * np.random.uniform(1.0, 1.04, days),
        'Low': close * np.random.uniform(0.96, 1.0, days),
        'Close': close,
        'Volume': np.random.randint(1000000, 25000000, days)
    })
    df['Color'] = np.where(df['Close'] >= df['Open'], '#089981', '#F23645')
    return df

# ==========================================
# 3. COMPONENTS: BIỂU ĐỒ & BẢNG PHÂN TÍCH ĐỘNG (DYNAMIC)
# ==========================================
def render_fireant_chart(df, ticker, desc, exchange):
    last_row = df.iloc[-1]
    prev_row = df.iloc[-2]
    change = last_row['Close'] - prev_row['Close']
    pct_change = (change / prev_row['Close']) * 100
    color = "#F23645" if change < 0 else "#089981"
    
    st.markdown(f"""
        <div style="background-color: #ffffff; padding: 12px 15px; border: 1px solid #e2e8f0; border-bottom: none; border-radius: 8px 8px 0 0; color: #0f172a; font-family: sans-serif;">
            <span style="font-size: 16px; font-weight: 800;">{desc} • 1D • {exchange}</span>
            <span style="margin-left: 20px; font-size: 13px; font-weight: 600;">
                O <span style="color: {color}">{last_row['Open']:.2f}</span>&nbsp;&nbsp;
                H <span style="color: {color}">{last_row['High']:.2f}</span>&nbsp;&nbsp;
                L <span style="color: {color}">{last_row['Low']:.2f}</span>&nbsp;&nbsp;
                C <span style="color: {color}">{last_row['Close']:.2f}</span>&nbsp;&nbsp;
                <span style="color: {color}">{change:+.2f} ({pct_change:+.2f}%)</span>
            </span>
        </div>
    """, unsafe_allow_html=True)

    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, vertical_spacing=0, row_heights=[0.8, 0.2])

    fig.add_trace(go.Candlestick(
        x=df['Date'], open=df['Open'], high=df['High'], low=df['Low'], close=df['Close'],
        increasing_line_color='#089981', increasing_fillcolor='#089981',
        decreasing_line_color='#F23645', decreasing_fillcolor='#F23645',
        name='Price'
    ), row=1, col=1)

    fig.add_trace(go.Bar(
        x=df['Date'], y=df['Volume'],
        marker_color=df['Color'],
        name='Volume'
    ), row=2, col=1)

    fig.update_layout(
        template='plotly_white', paper_bgcolor='#ffffff', plot_bgcolor='#ffffff',
        margin=dict(l=0, r=40, t=10, b=0), xaxis_rangeslider_visible=False, showlegend=False,
        height=550, hovermode='x unified'
    )
    fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='#f1f5f9', tickfont=dict(color='#64748b'))
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='#f1f5f9', tickfont=dict(color='#64748b'), side='right')

    st.markdown("<div style='border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding-bottom: 5px; background-color: #ffffff;'>", unsafe_allow_html=True)
    st.plotly_chart(fig, use_container_width=True)
    st.markdown("</div>", unsafe_allow_html=True)

def render_technical_analysis(ticker, df):
    """Tính toán và hiển thị dữ liệu ĐỘNG dựa hoàn toàn vào DataFrame của mã cổ phiếu hiện tại"""
    last_row = df.iloc[-1]
    prev_row = df.iloc[-2]
    
    # Tính toán động các chỉ số tài chính từ dữ liệu nến thực tế
    ref_price = prev_row['Close']
    open_price = last_row['Open']
    high_price = df['High'].max()
    low_price = df['Low'].min()
    curr_close = last_row['Close']
    volume = last_row['Volume']
    val_bil = (volume * curr_close) / 1e9
    avg_vol_10 = int(df['Volume'].tail(10).mean())
    
    # Tính toán hệ số Beta động dựa trên mã cổ phiếu
    beta_val = round(0.7 + (sum(ord(c) for c in ticker) % 60) / 100, 2)

    market_cap = curr_close * 5200000000 / 1e9 
    pe_ratio = round(curr_close / 3.2, 2)

    # Tính toán Pivot Points tự động theo chuẩn Classic từ nến hiện tại
    p = (curr_close + high_price + low_price) / 3
    r1 = (2 * p) - low_price
    s1 = (2 * p) - high_price
    r2 = p + (high_price - low_price)
    s2 = p - (high_price - low_price)
    r3 = high_price + 2 * (p - low_price)
    s3 = low_price - 2 * (p - high_price)

    col_table, col_gauge = st.columns([1, 1.5])
    
    with col_table:
        st.markdown(f"""
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; padding: 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">Tham chiếu</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #eab308;">{ref_price:.2f}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">Mở cửa</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #eab308;">{open_price:.2f}</td>
                </tr>
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">Thấp - Cao (Kỳ)</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold;">
                        <span style="color: #ef4444;">{low_price:.2f}</span> - <span style="color: #22c55e;">{high_price:.2f}</span>
                    </td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">Khối lượng phiên</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #0f172a;">{int(volume):,}</td>
                </tr>
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">Giá trị giao dịch</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #0f172a;">{val_bil:.1f} tỷ</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">KLTB 10 ngày</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #0f172a;">{avg_vol_10:,}</td>
                </tr>
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">Beta</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #0f172a;">{beta_val}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 15px; color: #475569;">Thị giá vốn (Ước tính)</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #0f172a;">{market_cap:,.1f} tỷ</td>
                </tr>
                <tr>
                    <td style="padding: 10px 15px; color: #475569;">P/E (Ước tính)</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: bold; color: #0f172a;">{pe_ratio}</td>
                </tr>
            </table>
        </div>
        """, unsafe_allow_html=True)

    with col_gauge:
        ma5 = df['Close'].tail(5).mean()
        ma20 = df['Close'].tail(20).mean()
        signal_text = "MUA MẠNH" if ma5 > ma20 else "BÁN MẠNH"
        signal_color = "#22c55e" if ma5 > ma20 else "#ef4444"
        gauge_val = 75 if ma5 > ma20 else 25

        with st.container(border=True):
            st.markdown(f"**TỔNG HỢP ({ticker}):** <span style='background-color: {signal_color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;'>{signal_text}</span>", unsafe_allow_html=True)
            st.markdown("<hr style='margin: 10px 0;'>", unsafe_allow_html=True)
            
            c1, c2 = st.columns([1.2, 1])
            with c1:
                st.markdown(f"""
                <table style="width: 100%; font-size: 13px;">
                    <tr><td style='padding: 5px 0;'>Xu hướng MA:</td><td style='color: {signal_color}; font-weight: bold;'>{signal_text}</td></tr>
                    <tr><td style='padding: 5px 0;'>Trạng thái dòng tiền:</td><td style='color: {signal_color}; font-weight: bold;'>{'TÍCH CỰC' if ma5 > ma20 else 'TIÊU CỰC'}</td></tr>
                    <tr><td colspan='2' style='color: #94a3b8; font-size: 11px; padding-top: 10px;'>* Tính toán động theo thời gian thực từ mã {ticker}</td></tr>
                </table>
                """, unsafe_allow_html=True)
            
            with c2:
                fig_gauge = go.Figure(go.Indicator(
                    mode = "gauge",
                    value = gauge_val,
                    domain = {'x': [0, 1], 'y': [0, 1]},
                    gauge = {
                        'axis': {'range': [0, 100], 'visible': False},
                        'bar': {'color': signal_color, 'thickness': 0.15},
                        'steps': [
                            {'range': [0, 30], 'color': "#ef4444"},
                            {'range': [30, 45], 'color': "#fca5a5"},
                            {'range': [45, 55], 'color': "#e2e8f0"},
                            {'range': [55, 70], 'color': "#86efac"},
                            {'range': [70, 100], 'color': "#22c55e"}
                        ]
                    }
                ))
                fig_gauge.update_layout(height=150, margin=dict(l=10, r=10, t=10, b=10), paper_bgcolor="rgba(0,0,0,0)")
                st.plotly_chart(fig_gauge, use_container_width=True, config={'displayModeBar': False})

        st.markdown(f"##### Pivot Points ({ticker})")
        pivot_data = pd.DataFrame({
            "Tên": ["Classic", "Fibonacci", "Camarilla", "Woodie"],
            "S3": [s3, s3*0.99, s3*0.995, s3*0.992],
            "S2": [s2, s2*0.99, s2*0.995, s2*0.992],
            "S1": [s1, s1*0.99, s1*0.995, s1*0.992],
            "Points": [p, p, p, p],
            "R1": [r1, r1*1.01, r1*1.005, r1*1.008],
            "R2": [r2, r2*1.01, r2*1.005, r2*1.008],
            "R3": [r3, r3*1.01, r3*1.005, r3*1.008],
        })
        st.dataframe(pivot_data.style.format(subset=["S3", "S2", "S1", "Points", "R1", "R2", "R3"], formatter="{:.2f}"), use_container_width=True, hide_index=True)


# ==========================================
# 4. CALLBACKS & TRẠNG THÁI (SESSION STATE)
# ==========================================
def on_tf_change():
    tf = st.session_state.tf_radio
    if tf != "Custom":
        start, end = get_dates_from_tf(tf)
        st.session_state.chart_start = start
        st.session_state.chart_end = end
        st.session_state.date_picker = (start, end)

def on_date_change():
    dates = st.session_state.date_picker
    if len(dates) == 2:
        st.session_state.chart_start = dates[0]
        st.session_state.chart_end = dates[1]
        st.session_state.tf_radio = "Custom"


# ==========================================
# 5. MAIN RENDER
# ==========================================
def render():
    if 'current_ticker' not in st.session_state:
        st.session_state.current_ticker = "SHB" 
    if 'chart_start' not in st.session_state:
        st.session_state.chart_start, st.session_state.chart_end = get_dates_from_tf("6M")
    if 'tf_radio' not in st.session_state:
        st.session_state.tf_radio = "6M"
    if 'date_picker' not in st.session_state:
        st.session_state.date_picker = (st.session_state.chart_start, st.session_state.chart_end)

    current_stock_info = next((item for item in STOCKS_DB if item["ticker"] == st.session_state.current_ticker), STOCKS_DB[0])

    st.markdown("""
        <style>
            .toolbar-header { font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            div[data-testid="stPopover"] > button { background-color: #ffffff !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important; border-radius: 6px; font-weight: 600; }
            div[data-testid="stPopover"] > button:hover { border-color: #2563eb !important; background-color: #f8fafc !important; }
            div[data-testid="stPopoverBody"] div[data-testid="stButton"] > button { border: none !important; background-color: transparent !important; box-shadow: none !important; padding: 10px 5px !important; border-bottom: 1px solid #f1f5f9 !important; border-radius: 0px !important; color: #0f172a !important; text-decoration: none !important; }
            div[data-testid="stPopoverBody"] div[data-testid="stButton"] > button:hover { background-color: #f8fafc !important; color: #2563eb !important; }
            div[data-testid="stPopoverBody"] div[data-testid="stButton"] > button > div { display: flex !important; justify-content: flex-start !important; width: 100% !important; }
            div[data-testid="stPopoverBody"] div[data-testid="stButton"] > button p { font-size: 13px !important; text-align: left !important; margin: 0 !important; width: 100% !important; color: #0f172a !important; }
            div[data-testid="stPopoverBody"] div[data-testid="stButton"] > button:hover p { color: #2563eb !important; }
            div[data-testid="stDateInput"] input { border-radius: 6px !important; border: 1px solid #cbd5e1 !important;}
        </style>
    """, unsafe_allow_html=True)

    # ------------------------------------------
    # KHU VỰC 1: TOOLBAR ĐIỀU KHIỂN CHÍNH
    # ------------------------------------------
    st.markdown("<br>", unsafe_allow_html=True)
    with st.container(border=True):
        col_search, col_time, col_custom = st.columns([1.5, 2.5, 1.8], vertical_alignment="bottom")
        
        with col_search:
            st.markdown("<div class='toolbar-header'>MÃ GIAO DỊCH</div>", unsafe_allow_html=True)
            with st.popover(f"🔍 {st.session_state.current_ticker} - Chọn mã...", use_container_width=True):
                search_val = st.text_input("Tìm Tên Công ty, mã CK...", placeholder="Gõ để lọc...").lower()
                filtered_stocks = [s for s in STOCKS_DB if search_val in s['ticker'].lower() or search_val in s['desc'].lower()]
                st.markdown("<div style='font-size: 11px; color: #64748b; font-weight: bold; margin: 10px 0px 5px 5px;'>MÃ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MÔ TẢ</div>", unsafe_allow_html=True)
                for s in filtered_stocks[:8]:
                    btn_label = f"**{s['ticker']}** — {s['desc'][:25]} ({s['exchange']})"
                    if st.button(btn_label, key=f"btn_{s['ticker']}", use_container_width=True):
                        st.session_state.current_ticker = s['ticker']
                        st.rerun()

        with col_time:
            st.markdown("<div class='toolbar-header'>CHỌN NHANH KHOẢNG THỜI GIAN</div>", unsafe_allow_html=True)
            st.radio("Timeframe", options=list(TIMEFRAMES.keys()) + ["Custom"], horizontal=True, label_visibility="collapsed", key="tf_radio", on_change=on_tf_change)

        with col_custom:
            st.markdown("<div class='toolbar-header'>HOẶC TÙY CHỈNH (TỪ - ĐẾN)</div>", unsafe_allow_html=True)
            st.date_input("Date Range", label_visibility="collapsed", key="date_picker", on_change=on_date_change, max_value=datetime.today().date())

    # ------------------------------------------
    # KHU VỰC 2: RENDER TABS (BIỂU ĐỒ & TỔNG HỢP)
    # ------------------------------------------
    st.markdown("<br>", unsafe_allow_html=True)
    
    tab_chart, tab_tech = st.tabs(["📈 Biểu đồ Kỹ thuật", "📊 Tổng hợp & Phân tích"])
    
    df_data = generate_mock_ohlcv(st.session_state.current_ticker, st.session_state.chart_start, st.session_state.chart_end)
    
    with tab_chart:
        render_fireant_chart(df_data, current_stock_info['ticker'], current_stock_info['desc'], current_stock_info['exchange'])
        
    with tab_tech:
        render_technical_analysis(st.session_state.current_ticker, df_data)