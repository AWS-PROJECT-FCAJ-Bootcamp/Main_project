import streamlit as st
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta

# ==========================================
# 1. MOCK DATA GENERATOR (ETL PIPELINE MOCK)
# ==========================================
def generate_mock_extraction(ticker: str, start_date, end_date, interval: str) -> pd.DataFrame:
    """
    Hàm giả lập quá trình Extract & Transform dữ liệu từ nguồn 
    dành riêng cho UI/UX.
    """
    days = (end_date - start_date).days
    if days < 1:
        return pd.DataFrame()
    
    # Tạo mã seed độc lập dựa trên tên cổ phiếu để dữ liệu sinh ra có đặc trưng riêng
    seed_val = sum([ord(c) for c in ticker])
    np.random.seed(seed_val)
    
    dates = pd.date_range(start=start_date, end=end_date, freq='B') # Ngày làm việc (Business days)
    n_rows = len(dates)
    
    if n_rows == 0:
        dates = pd.date_range(start=end_date - timedelta(days=5), end=end_date, freq='B')
        n_rows = len(dates)

    # Thuật toán Random Walk mô phỏng biến động giá
    returns = np.random.normal(loc=0.0003, scale=0.015, size=n_rows)
    base_price = 45000 if ticker in ["FPT", "VCB"] else (15000 if ticker == "SHB" else 25000)
    close_prices = base_price * np.exp(np.cumsum(returns))
    
    df = pd.DataFrame({
        'Date': dates,
        'Ticker': ticker.upper(),
        'Open': close_prices * np.random.uniform(0.985, 1.01, n_rows),
        'High': close_prices * np.random.uniform(1.002, 1.02, n_rows),
        'Low': close_prices * np.random.uniform(0.98, 0.998, n_rows),
        'Close': close_prices,
        'Volume': np.random.randint(800000, 18000000, n_rows)
    })
    
    return df

# ==========================================
# 2. MAIN RENDER FUNCTION CHO DATA EXPLORER
# ==========================================
def render():
    # Tiêu đề module chuẩn Terminal Data Lake
    st.markdown("""
        <div style='border-left: 4px solid #2563eb; padding-left: 12px; margin-bottom: 20px;'>
            <span style='font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;'>Data Explorer</span>
            <span style='color: #64748b; font-weight: 600; margin-left: 8px;'></span>
        </div>
    """, unsafe_allow_html=True)

    # Khởi tạo kho lưu trữ tập trung trong Session State nếu chưa có
    if 'datalake_data' not in st.session_state:
        st.session_state['datalake_data'] = {}

    # Chia rõ các tính năng thành 3 Tab mạch lạc theo luồng ETL
    tab_extract, tab_preview, tab_inventory = st.tabs([
        "📡 1. Data Extraction ", 
        "🔍 2. Transform & Schema Preview", 
        "🗄️ 3. Datalake RAM Inventory"
    ])

    # ------------------------------------------
    # TAB 1: DATA EXTRACTION (GIAO DIỆN CÀO MOCK-DATA)
    # ------------------------------------------
    with tab_extract:
        with st.container(border=True):
            st.markdown("##### 📥 Cấu hình thông số trích xuất dữ liệu (ETL)")
            st.markdown("<p style='color: #64748b; font-size: 13px;'>Lựa chọn mã tài sản và khoảng thời gian lịch sử để hệ thống nạp dữ liệu vào Data Lake.</p>", unsafe_allow_html=True)
            
            col1, col2, col3, col4 = st.columns([1.5, 1.5, 1.5, 1])
            
            with col1:
                ticker_input = st.text_input("Ticker Symbol", value="FPT", placeholder="Ví dụ: FPT, SHB, VCB").upper()
            with col2:
                default_start = datetime.today().date() - timedelta(days=180)
                start_date = st.date_input("Start Date", value=default_start)
            with col3:
                end_date = st.date_input("End Date", value=datetime.today().date())
            with col4:
                interval = st.selectbox("Interval", options=["1D", "1H"], index=0)

            st.markdown("<br>", unsafe_allow_html=True)
            
            if st.button("CÀO DỮ LIỆU (Extract Data)", type="primary", use_container_width=True):
                if start_date >= end_date:
                    st.error("⚠️ Lỗi logic: 'Start Date' phải nhỏ hơn 'End Date'.")
                elif not ticker_input.strip():
                    st.error("⚠️ Vui lòng nhập mã Ticker hợp lệ.")
                else:
                    # Hiệu ứng Spinner giả lập quá trình gọi API ngầm
                    with st.spinner(f"Đang thiết lập kết nối đường ống ETL tới nguồn dữ liệu cho mã [{ticker_input}]..."):
                        time.sleep(1.0) # Tạo độ trễ chân thực khi demo
                        
                        # Sinh Mock-Data
                        df_mock = generate_mock_extraction(ticker_input, start_date, end_date, interval)
                        
                        if not df_mock.empty:
                            # Lưu vào Session State của Data Lake
                            st.session_state['datalake_data'][ticker_input] = df_mock
                            st.success(f"✅ Trích xuất thành công! Đã nạp {len(df_mock):,} dòng dữ liệu của mã **{ticker_input}** vào bộ nhớ phiên làm việc.")
                        else:
                            st.error("❌ Không thể sinh dữ liệu trong khoảng thời gian này.")

    # ------------------------------------------
    # TAB 2: TRANSFORM & SCHEMA PREVIEW
    # ------------------------------------------
    with tab_preview:
        with st.container(border=True):
            st.markdown("##### 🔬 Kiểm định cấu trúc dữ liệu thô (Raw Data)")
            
            if st.session_state['datalake_data']:
                # Dropdown chọn dataset đang có trong RAM để xem
                selected_dataset = st.selectbox("Chọn Dataset cần kiểm định", options=list(st.session_state['datalake_data'].keys()))
                df_current = st.session_state['datalake_data'][selected_dataset]
                
                # Hiển thị các thẻ chỉ số nhanh (Metrics Cards)
                c1, c2, c3, c4 = st.columns(4)
                c1.metric("Tổng số bản ghi", f"{len(df_current):,}")
                c2.metric("Số lượng thuộc tính (Columns)", f"{len(df_current.columns)}")
                c3.metric("Giá trị thiếu (Missing NaNs)", f"{df_current.isnull().sum().sum()}")
                c4.metric("Dung lượng RAM", f"{df_current.memory_usage(deep=True).sum() / 1024:.1f} KB")
                
                st.markdown("<br>", unsafe_allow_html=True)
                st.markdown("**Bảng xem trước dữ liệu (Top 10 bản ghi gần nhất):**")
                st.dataframe(df_current.tail(10), use_container_width=True, hide_index=True)
                
            else:
                st.info("💡 Kho dữ liệu Data Lake hiện đang trống. Vui lòng thực hiện thao tác cào dữ liệu ở Tab 1 trước.")

    # ------------------------------------------
    # TAB 3: DATALAKE RAM INVENTORY
    # ------------------------------------------
    with tab_inventory:
        with st.container(border=True):
            st.markdown("##### 🗄️ Quản lý lưu trữ phiên (Session Storage)")
            st.markdown("<p style='color: #64748b; font-size: 13px;'>Danh sách các tập dữ liệu đang được lưu trữ tạm thời trong RAM để phục vụ cho các module phân tích kỹ thuật.</p>", unsafe_allow_html=True)
            
            if st.session_state['datalake_data']:
                inventory_list = []
                for t, df in st.session_state['datalake_data'].items():
                    inventory_list.append({
                        "Mã Ticker": t,
                        "Số bản ghi": f"{len(df):,}",
                        "Thời gian bắt đầu": df['Date'].min().strftime('%Y-%m-%d'),
                        "Thời gian kết thúc": df['Date'].max().strftime('%Y-%m-%d'),
                        "Dung lượng": f"{df.memory_usage(deep=True).sum() / 1024:.1f} KB",
                        "Trạng thái": "🟢 Active in RAM"
                    })
                
                st.dataframe(pd.DataFrame(inventory_list), use_container_width=True, hide_index=True)
                
                st.markdown("<br>", unsafe_allow_html=True)
                if st.button("🗑️ DỌN DẸP TOÀN BỘ KHO DỮ LIỆU TẠM (PURGE)", type="secondary"):
                    st.session_state['datalake_data'] = {}
                    st.success("Đã làm sạch bộ nhớ phiên làm việc!")
                    st.rerun()
            else:
                st.info("💡 Chưa có dataset nào được ghi nhận trong kho lưu trữ phiên")