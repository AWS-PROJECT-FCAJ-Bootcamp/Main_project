# Main_project
# Cấu trúc file 
frontend/
├── app.py                  # File chạy chính của giao diện Streamlit
├── requirements.txt        # Các thư viện cần thiết (streamlit, requests, pandas, plotly, v.v.)
├── Dockerfile              # Cấu hình đóng gói để deploy (nếu cần)
├── .env                    # Lưu trữ các biến môi trường (URL của Local API)
├── pages/                  # Chứa các trang chức năng phụ (Multi-page app)
│   ├── 01_dashboard.py     # Giao diện tổng quan và biểu đồ giá[cite: 7]
│   ├── 02_financials.py    # Bảng cân đối kế toán, KQKD[cite: 7]
│   └── 03_predictions.py   # Dự báo rủi ro (VD: Altman Z-Score)
├── services/               # Chịu trách nhiệm gọi API xuống BE
│   └── api_client.py       # Cấu hình axios/requests để gọi API
├── components/             # Các UI elements dùng chung (cards, metrics, charts)
│   └── charts.py           # Hàm vẽ biểu đồ nến (Candlestick)
└── utils/                  
    └── helpers.py          # Xử lý format số tiền, ngày tháng