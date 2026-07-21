# Data Lake Backend API (Local-First)

Backend API phục vụ truy vấn dữ liệu OHLCV (nến chứng khoán) từ Data Lake. Xây dựng bằng **FastAPI** và **DuckDB**.

## Cấu trúc thư mục
- `config.py`: Quản lý cấu hình, biến môi trường.
- `database.py`: Quản lý kết nối DuckDB (Đọc Parquet).
- `routers/`: Chứa các endpoint xử lý logic.
- `schemas/`: Định nghĩa Pydantic Models (Data Contract).
- `tests/`: Kịch bản Unit Test tự động.

## Hướng dẫn cài đặt & Chạy Local

**1. Cài đặt thư viện:**
```bash
pip install -r requirements.txt
```

**2. Khởi động Server API:**
```bash
uvicorn src.api.main:app --reload
```

**3. Xem tài liệu (Swagger UI):**
Mở trình duyệt: [http://localhost:8000/docs](http://localhost:8000/docs)

## Hướng dẫn Test (Unit Testing)
Dự án áp dụng Test-Driven, mọi API phải pass Unit Test trước khi Merge.
```bash
# Chạy bộ test
pytest src/api/tests/ -v
```

## Chạy bằng Docker 
```bash
# 1. Build image Docker cho Backend API (Chỉ định đúng thư mục chứa code)
docker build -t data-lake-api src/api

# 2. Chạy container ở cổng 8000
docker run -d -p 8000:8000 --name api_server data-lake-api
```
