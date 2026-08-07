# Tài Liệu Thiết Kế & Mô Tả Frontend (React.js Frontend Specifications)
## Financial Research Platform - Web Application

---

## 1. TỔNG QUAN FRONTEND & STACK CÔNG NGHỆ

### 1.1. Mục Tiêu
Xây dựng giao diện Web Application cho ứng dụng Phân tích & Nghiên cứu Tài chính sử dụng **React.js**. Giao diện hướng tới phong cách hiện đại, chuyên nghiệp (Dark Mode / TradingView / Bloomberg style) tối ưu cho các Nhà phân tích dữ liệu và Nhà đầu tư chứng khoán.

### 1.2. Công Nghệ Sử Dụng (Tech Stack)
* **Core Framework**: React 18+ (sử dụng Vite hoặc Next.js App Router).
* **Styling**: Vanilla CSS / TailwindCSS / Styled-components (Dark Mode chủ đạo, Glassmorphism UI).
* **Thư viện Biểu đồ (Charting)**: 
  * `Lightweight-charts` (TradingView Canvas Chart - siêu mượt cho Candlestick).
  * `Plotly.js` / `Recharts` (Biểu đồ tương tác phụ RSI, Volume, Distribution).
* **State Management & Data Fetching**: 
  * TanStack Query (`React Query`): Quản lý Caching, Fetching API & Auto-refetching.
  * `Axios` / Native `Fetch API` kết nối với FastAPI Backend.
* **UI Components Library**: Lucide React Icons, Radix UI / Shadcn UI / Ant Design.

---

## 2. CẤU TRÚC SƠ ĐỒ GIAO DIỆN (FRONTEND ARCHITECTURE)

```text
React Web Application
 ├── Navigation Bar (Thanh Điều Hướng & Tìm Kiếm Mã Nhanh)
 ├── View 1: Data Explorer & Ingestion Trigger (Khám Phá & Cào Dữ Liệu)
 ├── View 2: Price & Tick Data Monitor (Bảng Giá & Dòng Tiền Khớp Lệnh Real-time)
 ├── View 3: Historical OHLCV Viewer (Tra Cứu Lịch Sử Nến Giá OHLCV)
 ├── View 4: Technical Stock Charts (Hệ Thống Biểu Đồ Kỹ Thuật Tương Tác)
 └── View 5: Dataset Export Center (Trung Tâm Xuất Dữ Liệu CSV / JSON / Parquet)
```

---

## 3. CHI TIẾT CÁC CHỨC NĂNG GIAO DIỆN (MODULE SPECIFICATIONS)

### 📌 Chức Năng 1: Data Explorer & Live Ingestion Trigger (Cào Dữ Liệu)
Giao diện cho phép người dùng chủ động chọn nguồn và kích hoạt tiến trình cào dữ liệu chứng khoán mới nhất đẩy vào AWS S3 Data Lake.

* **Thành phần Giao diện (UI Components)**:
  * **Selector Chọn Nguồn Dữ Liệu**: Dropdown chọn `Vnstock API`, `TCBS REST`, `SSI iBoard`.
  * **Mã Cổ Phiếu (Ticker Selector)**: Cho phép nhập từng mã (VD: `FPT`) hoặc chọn danh sách nhóm (`VN30`, `HNX30`).
  * **Khoảng Thời Gian (Date Range Picker)**: Chọn ngày bắt đầu (Start Date) và ngày kết thúc (End Date).
  * **Nút Kích Hoạt (`[🚀 Trigger Ingestion / Cào Dữ Liệu]`)**: Gửi request tới backend/AWS Step Functions.
  * **Khung Tiến Trình & Log Trực Tiếp (Real-time Status Bar & Logs)**:
    * Biểu đồ tiến trình (Progress Bar % thành công).
    * Bảng Console hiển thị log thực thi: *Status Code, Elapsed Time, S3 Key Destination*.

---

### 📌 Chức Năng 2: Bảng Giá Cổ Phiếu & Tick Data (Real-time Monitor)
Theo dõi biến động giá trong ngày và chi tiết từng lệnh khớp (Tick data / Time & Sales).

* **Thành phần Giao diện (UI Components)**:
  * **Thẻ Giá Tổng Quan (Price Summary Header)**: Hiển thị Giá hiện tại, Thay đổi `+/- (%)`, Giá Trần / Sàn / Tham Chiếu, Khối lượng giao dịch tổng.
  * **Bảng Lịch Sử Khớp Lệnh Chi Tiết (Tick Data / Time & Sales)**:
    * Bảng danh sách từng tick lệnh khớp gồm: *Thời gian (hh:mm:ss), Giá khớp, Khối lượng khớp, Phân loại Mua/Bán chủ động*.
    * Tô màu phân biệt: Màu xanh (Mua chủ động), Màu đỏ (Bán chủ động), Màu vàng (Tham chiếu).
  * **Biểu Đồ Phân Phối Dòng Tiền (Buy/Sell Pressure Gauge)**: Thanh tỷ lệ % tổng lượng Mua chủ động vs Bán chủ động trong phiên.

---

### 📌 Chức Năng 3: Historical OHLCV Viewer (Tra Cứu Lịch Sử Nến Giá)
Tra cứu bảng lịch sử giá chi tiết qua các năm.

* **Thành phần Giao diện (UI Components)**:
  * **Bộ Lọc Khoảng Thời Gian Nhanh**: Các nút bấm chọn nhanh `1W`, `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL`.
  * **Bảng Dữ Liệu OHLCV Phân Trang (Interactive Data Table)**:
    * Các cột: `Mã CK`, `Ngày GD`, `Mở Cửa`, `Cao Nhất`, `Thấp Nhất`, `Đóng Cửa`, `Khối Lượng`, `% Thay Đổi`.
    * Tìm kiếm (Search Bar) và Sắp xếp cột (Sorting ascending/descending).
    * Phân trang (Pagination 20/50/100 bản ghi mỗi trang).

---

### 📌 Chức Năng 4: Technical Stock Charts (Hệ Thống Biểu Đồ Kỹ Thuật Tương Tác)
Hệ thống biểu đồ phân tích kỹ thuật chuẩn TradingView cho phép soi nến và các chỉ số.

* **Thành phần Giao diện (UI Components)**:
  * **Biểu Đồ Nến Nhật (Candlestick Chart)**:
    * Hiển thị biến động giá dạng nến xanh/đỏ mượt mà.
    * Tích hợp vẽ đè các đường trung bình động: **MA20** (Ngắn hạn), **MA50** (Trung hạn), **MA200** (Dài hạn).
  * **Biểu Đồ Khối Lượng (Volume Bar Chart)**: Khối lượng giao dịch đồng bộ theo trục thời gian của biểu đồ nến.
  * **Biểu Đồ Chỉ Số Kỹ Thuật (Technical Indicators Sub-charts)**:
    * **RSI14**: Đường dao động sức mạnh tương đối với 2 vạch ranh giới Quá mua (70) và Quá bán (30).
    * **MACD & Histogram**: Đường MACD, Signal line và Histogram phân kỳ.
  * **Tính năng Tương tác**: Crosshair (Rà chuột xem giá tại nến), Zoom in/out, Pan ngang thời gian, Bật/Tắt đường chỉ số.

---

### 📌 Chức Năng 5: Dataset Export Center (Trung Tâm Xuất Dữ Liệu)
Cho phép nhà phân tích dữ liệu dễ dàng tải xuống các bộ Dataset đã cào.

* **Thành phần Giao diện (UI Components)**:
  * **Bộ Lọc Dataset Cần Tải**: 
    * Loại dữ liệu: *Raw OHLCV*, *Processed Indicators (MA/RSI)*, *Tick Data*.
    * Chọn mã cổ phiếu & Khoảng thời gian xuất.
  * **Khung Xem Trước Dữ Liệu (Preview Data Matrix)**: Hiển thị 10 dòng dữ liệu đầu tiên trước khi bấm tải.
  * **Nút Tải Xuống Đa Định Dạng (Multi-format Export Buttons)**:
    * `[📥 Export CSV]` - Tải file dạng `.csv`
    * `[📥 Export JSON]` - Tải file dạng `.json`
    * `[📥 Export Parquet]` - Tải file dạng `.parquet` (tối ưu nén & đọc tốc độ cao cho Python/DuckDB).

---

## 4. LUỒNG TRẢI NGHIỆM NGUỜI DÙNG (USER FLOW EXAMPLE)

1. **Bước 1**: Người dùng truy cập trang **Data Explorer** ➔ Chọn danh sách `VN30` ➔ Bấm **Trigger Ingestion** để cào dữ liệu mới nhất vào S3.
2. **Bước 2**: Vào trang **Tick Data & Price Monitor** để xem bảng giá và biến động dòng tiền thời gian thực trong ngày.
3. **Bước 3**: Chuyển sang trang **Technical Charts** ➔ Chọn mã `FPT` để soi biểu đồ Nến Nhật, đường MA20/MA50 và chỉ số RSI14.
4. **Bước 4**: Vào trang **Export Dataset** ➔ Chọn định dạng **Parquet** hoặc **CSV** ➔ Bấm nút **Export** để tải dataset về máy phục vụ phân tích.
