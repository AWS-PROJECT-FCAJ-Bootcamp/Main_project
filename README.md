# Main_project
### Cấu trúc file 

pip install virtualenv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

```text
frontend/
├── app.py                  # File chính: Quản lý Auth (Login/Register/Logout) và Routing
├── requirements.txt        # Các thư viện: streamlit, pandas, plotly, requests, streamlit-authenticator
├── pages/                  # Các trang chức năng (Chỉ hiện khi đã login)
│   ├── 1_📊_Dashboard.py    # FR03: Xem dữ liệu thị trường (Chart, Giá, Khối lượng)
│   ├── 2_📈_Indicators.py   # FR04: Phân tích chỉ báo kỹ thuật
│   ├── 3_🔮_Prediction.py   # FR07: Dự báo rủi ro phá sản (Altman Z-Score / ML)
│   └── 4_💼_Portfolio.py    # FR05, FR06: Quản lý danh mục & Watchlist
└── utils/
    ├── api_client.py       # Helper kết nối với AWS API Gateway
    └── auth.py             # Hàm giả lập/kết nối Cognito xử lý đăng nhập
```