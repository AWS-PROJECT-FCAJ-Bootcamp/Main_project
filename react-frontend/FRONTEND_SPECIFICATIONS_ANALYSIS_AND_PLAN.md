# KẾ HOẠCH PHÂN TÍCH & QUY HOẠCH REFACTORING FRONTEND
## Project: Financial Data Platform (AWS Serverless Data Lake Terminal)
### Tài liệu phân tích dựa trên: `frontend_specifications.md`, Thư mục Dữ liệu `data/` & Clean Architecture Standard

---

## 1. TỔNG QUAN DỰ ÁN & SO SÁNH SPEC VS CODEBASE THỰC TẾ

Dự án **Financial Data Platform** là hệ thống Terminal nghiên cứu & phân tích tài chính doanh nghiệp niêm yết Việt Nam. Ứng dụng được thiết kế theo phong cách **Bloomberg Terminal / TradingView**, tối ưu hóa trải nghiệm người dùng với Dark/Modern Glassmorphism UI, tốc độ phản hồi cao (<50ms từ cache), và tích hợp hoàn hảo với hệ thống backend FastAPI + DuckDB / AWS Data Lake.

### 1.1. Bảng Đối Chiếu Yêu Cầu Spec (`frontend_specifications.md`) vs Trạng Thái Codebase

| View theo Specification | Mô tả Chức năng | Trạng thái hiện tại | Kế hoạch Refactor / Bổ sung |
| :--- | :--- | :---: | :--- |
| **View 1: Data Explorer & Live Ingestion** | Cào dữ liệu từ Vnstock, TCBS, SSI; chọn Ticker/Group; Range date; xem progress bar & Console Log real-time | Đã có `DataExplorer.tsx` cơ bản | Refactor bổ sung Selector chọn nguồn (Vnstock/TCBS/SSI), chọn nhóm VN30/HNX30, Console Log hộp đen chuyên nghiệp. |
| **View 2: Price & Tick Data Monitor** | Bảng giá real-time, Time & Sales (Tick Data), tô màu Mua/Bán chủ động, thanh Buy/Sell Pressure Gauge | Thư mục `tick-monitor` đang rỗng | **Tạo mới `TickMonitorView.tsx`** đầy đủ Price Header, Bảng Tick Data realtime, Buy/Sell Gauge bar. |
| **View 3: Historical OHLCV Viewer** | Tra cứu lịch sử nến OHLCV, nút lọc nhanh (1W, 1M, 1Y...), phân trang, search, sort cột | Thư mục `historical-ohlcv` đang rỗng | **Tạo mới `HistoricalOhlcvView.tsx`** phân trang 20/50/100, nút quick range, sort & search cực mượt. |
| **View 4: Technical Stock Charts** | Biểu đồ nến Nhật tương tác, các đường MA20, MA50, MA200, Volume Bar, Sub-charts RSI14 & MACD/Histogram | Thư mục `technical-charts` đang rỗng | **Tạo mới `TechnicalChartsView.tsx`** sử dụng Recharts/Canvas chart mượt mà, hỗ trợ Crosshair, Zoom, Toggle chỉ số. |
| **View 5: Dataset Export Center** | Xuất dữ liệu đa định dạng (CSV, JSON, Parquet), xem trước 10-15 dòng, báo cáo chất lượng dữ liệu | Đã có `DatasetExportView.tsx` | Tối ưu thêm tùy chọn loại dữ liệu (Raw OHLCV, Processed Indicators, Tick Data), bổ sung xuất JSON/Parquet chuẩn. |
| **Platform Modules Tích Hợp** | Dashboard, Hồ sơ Công ty, BCTCH, Chỉ số TC, Gán nhãn Distress, AI Studio, Predict | Đã có sẵn trong `features/` | Giữ nguyên và nâng cấp UI/UX đồng bộ chuẩn Bloomberg Dark/Light UI. |

---

## 2. PHÂN TÍCH DỮ LIỆU THỰC TẾ (`/data`) & BACKEND API MAPPING

### 2.1. Cấu trúc dữ liệu thật trong hệ thống Backend (`data/` & DuckDB Parquet)

1. **Doanh nghiệp niêm yết (`data/listed_companies.csv` & API `/api/companies`)**:
   * Bao gồm ~1,600 doanh nghiệp trên 3 sàn: HOSE, HNX, UPCOM.
   * Cột dữ liệu: `ticker`, `com_group_code` (HOSE/HNX/UPCOM), `organ_name`, `organ_short_name`, `sector` (Chuẩn ICB: *Banks, Technology, Real Estate, Industrial Goods & Services...*).
2. **Dữ liệu Nến OHLCV (`data/curated/ohlcv/year=YYYY/*.parquet` & API `/api/prices`)**:
   * Định dạng lưu trữ: Apache Parquet nén cao.
   * Cột dữ liệu: `ticker`, `trading_date`, `open_price`, `high_price`, `low_price`, `close_price`, `volume`.
   * Các đường chỉ số kỹ thuật được tính toán động (Calculated On-The-Fly): `ma20`, `ma50`, `ma200`, `rsi_14`, `macd`, `macd_signal`, `macd_hist`.
3. **Dữ liệu Tick Data (Time & Sales) (`API /api/prices/ticks` hoặc Mock Generator chuẩn giao dịch)**:
   * Cột dữ liệu: `time` (hh:mm:ss), `price` (VND), `volume` (cổ phiếu), `side` (`BUY` - Mua chủ động, `SELL` - Bán chủ động, `REF` - Tham chiếu).
4. **Báo cáo tài chính & Chỉ số Rủi ro (`API /api/financials`, `/api/ratios`, `/api/distress`)**:
   * Doanh thu, Lợi nhuận, ROA, ROE, Current Ratio, Debt Ratio, Log Assets, Altman Z-Score, Nhãn rủi ro Distress (`0: Safe`, `1: Distress`).

---

## 3. QUY HOẠCH KIẾN TRÚC FRONTEND (CLEAN ARCHITECTURE)

Hệ thống được tổ chức theo kiến trúc **Feature-Driven Modular Architecture**:

```text
react-frontend/src/
 ├── assets/                   # CSS global, fonts, images
 ├── components/               # UI components dùng chung (Button, Card, Input, Modal...)
 │    ├── layout/              # AppLayout, Sidebar, Navbar, ProtectedRoute
 │    └── ui/                  # Component nguyên tử (Shadcn/Radix primitives)
 ├── features/                 # Các Module chức năng theo Specification
 │    ├── auth/                # Login, Register, Auth State
 │    ├── company/             # Danh sách Công ty & Bộ lọc ICB
 │    ├── dashboard/           # Dashboard tổng quan thị trường
 │    ├── data-explorer/       # View 1: Live Ingestion Trigger & Console Logs
 │    ├── tick-monitor/        # View 2: Bảng giá real-time & Tick Data Time & Sales
 │    ├── historical-ohlcv/    # View 3: Lịch sử giá OHLCV & Phân trang
 │    ├── technical-charts/    # View 4: Biểu đồ nến kỹ thuật, MA, RSI, MACD
 │    ├── dataset-export/      # View 5: Trung tâm xuất dữ liệu CSV, JSON, Parquet
 │    ├── financial-statements/# Báo cáo tài chính chi tiết
 │    ├── financial-ratios/    # Chỉ số tài chính & Z-Score
 │    ├── distress-labeling/   # Gán nhãn tài chính rủi ro
 │    ├── ai-models/           # AI/ML Studio (Train LightGBM/XGBoost)
 │    ├── prediction/          # Dự báo rủi ro AI
 │    ├── profile/             # Hồ sơ cá nhân & Danh mục theo dõi Watchlist
 │    └── settings/            # Cài đặt hệ thống Terminal
 ├── services/                 # Axios HTTP client API bindings
 ├── store/                    # Zustand Store (Auth Session, Watchlist, Theme)
 ├── types/                    # TypeScript interfaces & DTO models
 └── App.tsx                   # Central React Router v6 & QueryClient Provider
```

---

## 4. CHI TIẾT THIẾT KẾ UI/UX CHO 5 VIEW CHÍNH THEO SPECIFICATION

### 📌 View 1: Data Explorer & Live Ingestion Trigger (`/explorer`)
* **UI Components**:
  * **Header**: Title + Live Status Badge.
  * **Ingestion Config Card**:
    * Dropdown chọn Nguồn dữ liệu (`Vnstock API (Miễn phí)`, `TCBS REST API`, `SSI iBoard`).
    * Ticker Selector: Ô nhập text (phân cách dấu phẩy `FPT, VNM, HPG`) + Nút chọn nhanh nhóm cổ phiếu (`[VN30]`, `[HNX30]`, `[VNALL]`).
    * Date Range Picker (`Start Date` -> `End Date`).
    * Large Action Button: `[🚀 Trigger Ingestion / Cào Dữ Liệu]`.
  * **Console Logs & Real-time Progress Panel**:
    * Hộp Console mô phỏng terminal đen chuyên nghiệp với timestamp, Status Code (`200 OK`), Elapsed Time (ms), và đường dẫn lưu file trên S3 (`s3://data-lake/raw/ohlcv/...`).
    * Progress bar động (0% - 100%) hiển thị tiến độ cào.
  * **Preview Grid**: Bảng preview 15 dòng dữ liệu vừa cào thành công.

### 📌 View 2: Price & Tick Data Monitor (`/tick-monitor`)
* **UI Components**:
  * **Price Summary Header Card**:
    * Hiển thị Ticker đang chọn (VD: `FPT`), Tên doanh nghiệp, Sàn.
    * Giá hiện tại (VD: `128,500 VND`), Mức tăng/giảm `+2.500 (+1.98%)` tô màu xanh neon/đỏ.
    * 3 chỉ số tham chiếu: `Trần (Ceiling - Tím)`, `Sàn (Floor - Xanh lơ)`, `Tham chiếu (Ref - Vàng)`.
    * Tổng khối lượng giao dịch trong phiên (VD: `4,850,200 CP`).
  * **Buy/Sell Pressure Gauge (Cán cân Dòng tiền)**:
    * Thanh gauge tỷ lệ % giữa Mua chủ động (Active Buy) vs Bán chủ động (Active Sell).
  * **Time & Sales (Tick Data Table)**:
    * Danh sách từng tick giao dịch gồm 4 cột: `Thời gian (hh:mm:ss)`, `Giá khớp (VND)`, `Khối lượng (CP)`, `Phân loại`.
    * Tự động tô màu dòng: Xanh (Mua chủ động), Đỏ (Bán chủ động), Vàng (Tham chiếu).

### 📌 View 3: Historical OHLCV Viewer (`/ohlcv`)
* **UI Components**:
  * **Top Controls Bar**:
    * Ticker Search Input + Dropdown chọn mã.
    * Quick Date Range buttons: `1W`, `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL`.
    * Custom Date Range Picker.
  * **Data Table (Phân trang)**:
    * Các cột: `Mã CK`, `Ngày GD`, `Mở Cửa`, `Cao Nhất`, `Thấp Nhất`, `Đóng Cửa`, `Khối Lượng`, `% Thay Đổi`.
    * Tích hợp Sorting (Sắp xếp tăng/giảm theo Ngày, Giá, Khối lượng).
    * Pagination Controls: Chọn 20, 50, 100 bản ghi/trang + Nút chuyển trang Trang đầu/Trang cuối.

### 📌 View 4: Technical Stock Charts (`/charts`)
* **UI Components**:
  * **Chart Toolbar**:
    * Chọn Ticker + Chọn Khung thời gian (Daily 1D).
    * Toggles Bật/Tắt các đường kỹ thuật: `[✓ MA20]` `[✓ MA50]` `[✓ MA200]` `[✓ RSI14]` `[✓ MACD]`.
  * **Main Candlestick & Volume Chart**:
    * Vẽ biểu đồ Nến xanh (Tăng) / Nến đỏ (Giảm).
    * Đè các đường Moving Averages (MA20 màu cam, MA50 màu xanh lá, MA200 màu tím).
    * Biểu đồ cột Volume đồng bộ trực tiếp ở đáy nến.
  * **Sub-charts Panel**:
    * **Sub-chart 1: RSI (14)**: Đường RSI dao động 0-100 với 2 đường giới hạn Quá mua (70) và Quá bán (30).
    * **Sub-chart 2: MACD & Histogram**: Đường MACD, Signal Line và Cột Histogram phân kỳ âm/dương.
  * **Tính năng Tương tác**: Rà chuột hiển thị tooltip Crosshair thông số chi tiết (OHLCV, RSI, MACD).

### 📌 View 5: Dataset Export Center (`/dataset`)
* **UI Components**:
  * **Export Configuration Card**:
    * Chọn Loại dữ liệu xuất: `Raw OHLCV`, `Processed Indicators (MA/RSI)`, `Tick Data`, `Financial Distress Dataset`.
    * Chọn Mã CK & Khoảng thời gian.
  * **3 Nút Tải Xuống Chuẩn Định Dạng**:
    * `[📥 Export CSV]` (kèm UTF-8 BOM cho Excel).
    * `[📥 Export JSON]` (Cấu trúc mảng đối tượng JSON).
    * `[📥 Export Parquet]` (File Parquet tối ưu nén cho Python/DuckDB).
  * **Báo Cáo Chất Lượng Dữ Liệu (Data Quality Summary Report)**:
    * Metric Cards: Total Rows, Label 0 Count, Label 1 Count, Imbalance Ratio, Missing Rate (0.0%).
  * **Matrix Preview Grid**: Hiển thị 15 dòng xem trước trước khi bấm Tải xuống.

---

## 5. LỘ TRÌNH THỰC THI (IMPLEMENTATION ROADMAP)

1. **Bước 1**: Tạo mới file Markdown Kế hoạch Phân tích (Hoàn thành tệp này).
2. **Bước 2**: Triển khai 3 View mới còn thiếu theo đúng Specification:
   * Tạo `src/features/tick-monitor/TickMonitorView.tsx` (View 2).
   * Tạo `src/features/historical-ohlcv/HistoricalOhlcvView.tsx` (View 3).
   * Tạo `src/features/technical-charts/TechnicalChartsView.tsx` (View 4).
3. **Bước 3**: Refactor & nâng cấp 2 View đã có:
   * Refactor `src/features/data-explorer/DataExplorer.tsx` (View 1) bổ sung Source Selector & Console Log.
   * Refactor `src/features/dataset-export/DatasetExportView.tsx` (View 5) hỗ trợ 3 định dạng CSV, JSON, Parquet.
4. **Bước 4**: Cập nhật Router (`App.tsx`) & Thanh Điều Hướng (`AppLayout.tsx`) để hiển thị đầy đủ 5 View chuẩn Spec.
5. **Bước 5**: Kiểm tra biên dịch TypeScript (`npm run build`), tối ưu performance và bàn giao sản phẩm.

---
*Tài liệu phân tích được lập cho hệ thống Financial Data Platform.*
