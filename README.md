# Financial Data Platform PoC

PoC local-first ghép hoàn chỉnh nguồn dữ liệu chứng khoán, ingestion, Raw/Curated Data Lake, FastAPI và Streamlit. Dự án dùng **`uv`** để quản lý dependency, **`uvicorn`** để chạy backend và **`.env`** chỉ để chứa cấu hình/secrets cục bộ.

## 1. Luồng dữ liệu

```text
vnstock / VCI
      │
      ▼
Ingestion + retry + schema validation
      │
      ▼
data/raw/ohlcv/year=YYYY/month=MM/day=DD/batch_*.json
      │
      ▼
Clean + deduplicate + Return/MA20/RSI14
      │
      ▼
data/curated/ohlcv/ticker=<TICKER>/part-000.parquet
      │
      ▼
DuckDB → FastAPI → Streamlit
```

`vnstock` là thư viện truy cập; `VCI` là provider. VCI hiện không yêu cầu API key. `DATA_PROVIDER_API_KEY` được để trống trong `.env.example` để sẵn sàng cho provider khác, không được hard-code vào source.

Docker Compose bootstrap từ raw evidence đã commit để lần chạy đầu không phụ thuộc mạng/provider. Sau khi hệ thống lên, trang **Data Explorer** có thể gọi ingestion thật tới VCI.

## 2. Cấu trúc chính

```text
.
├── frontend/                 # Streamlit consumption UI
│   ├── app.py
│   ├── utils/api_client.py   # HTTP client duy nhất nối FE → BE
│   └── views/
├── src/
│   ├── api/                  # FastAPI, DuckDB, routers, schemas, services
│   ├── pipeline/             # Source adapter, ingestion, validation, transform, CLI
│   └── settings.py           # Cấu hình chung từ environment/.env
├── data/
│   ├── raw/                  # Runtime output, không commit
│   └── curated/              # Runtime output, không commit
├── reports/raw/              # Evidence raw dùng để bootstrap PoC
├── universe/                 # Universe và company metadata
├── tests/                    # Pipeline và API integration tests
├── docs/                     # Requirements, architecture và data contract
├── pyproject.toml            # Nguồn dependency duy nhất
├── uv.lock                   # Phiên bản dependency đã khóa
├── Dockerfile
└── docker-compose.yml
```

Các script cũ trong `src/` được giữ tạm tại `src/legacy/` chỉ để tham khảo lịch sử; runtime mới không phụ thuộc vào chúng.

## 3. Chạy nhanh bằng Docker Compose

Yêu cầu: Docker Desktop/Docker Engine có Compose.

```bash
copy .env.example .env
docker compose up --build
```

Trên macOS/Linux dùng `cp .env.example .env`.

Các địa chỉ:

- Frontend: <http://localhost:8501>
- Backend health: <http://localhost:8000/health>
- Swagger UI: <http://localhost:8000/docs>

Compose chạy theo thứ tự:

1. `pipeline` bootstrap Curated Parquet từ raw evidence nếu curated đang trống.
2. `backend` chỉ khởi động sau khi bootstrap thành công.
3. `frontend` chỉ khởi động sau khi backend healthcheck thành công.

Dừng hệ thống:

```bash
docker compose down
```

Xóa dữ liệu runtime để bootstrap lại:

```powershell
Remove-Item -Recurse -Force data\raw\ohlcv, data\curated\ohlcv
docker compose up --build
```

Chỉ xóa đúng hai thư mục runtime trên; raw evidence trong `reports/raw/` vẫn được giữ.

## 4. Chạy local bằng uv

Yêu cầu: cài `uv`. Repo cố định Python 3.12 bằng `.python-version`.

```bash
copy .env.example .env
uv sync --frozen
uv run python -m src.pipeline.cli bootstrap
```

Mở hai terminal:

```bash
uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
uv run streamlit run frontend/app.py --server.port 8501
```

Không dùng `pip install -r requirements.txt`; `pyproject.toml` và `uv.lock` là nguồn dependency duy nhất.

## 5. Chạy pipeline

Bootstrap deterministic từ raw evidence:

```bash
uv run python -m src.pipeline.cli bootstrap
```

Ingest dữ liệu thật và tự cập nhật curated:

```bash
uv run python -m src.pipeline.cli ingest --tickers FPT VCB --start 2025-01-01 --end 2025-12-31 --interval 1D
```

Chỉ transform dữ liệu hiện có trong `data/raw/ohlcv`:

```bash
uv run python -m src.pipeline.cli transform
```

Mỗi request nguồn có tối đa 3 lần thử với exponential backoff. Record vi phạm data contract bị đánh dấu lỗi và không đi vào curated.

## 6. API contract chính

- `GET /health`: trạng thái backend và curated layer.
- `GET /companies?page=1&limit=100`: ticker có dữ liệu curated, được làm giàu từ universe.
- `GET /prices?ticker=TLH&start_date=2025-01-01&end_date=2025-12-31`: OHLCV và chỉ báo.
- `GET /prices/export?ticker=TLH&format=csv`: ZIP chứa dữ liệu và manifest.
- `POST /pipeline/run`: ingestion thật quy mô nhỏ từ VCI, sau đó transform curated.

Ví dụ body cho endpoint pipeline:

```json
{
  "tickers": ["FPT", "VCB"],
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "interval": "1D"
}
```

Schema OHLCV thống nhất: `ticker`, `trading_date`, `open_price`, `high_price`, `low_price`, `close_price`, `volume`. Curated bổ sung `return_pct`, `ma20`, `rsi_14`.

## 7. Kiểm thử

```bash
uv run pytest -q
docker compose config
```

Bootstrap hiện được xác minh với raw evidence gồm 25.703 record của 100 ticker. Con số có thể thay đổi khi raw runtime mới được ingest.

## 8. Cấu hình và bảo mật

- Commit `.env.example`, không commit `.env`.
- Không đưa API key vào frontend, source, Dockerfile hoặc Compose.
- Compose đọc `.env` nếu file tồn tại; các giá trị không bí mật có default an toàn.
- `data/raw/` và `data/curated/` là runtime data và bị ignore; `reports/raw/` là evidence PoC đã có trong lịch sử repo.
- CORS local mặc định chỉ cho `http://localhost:8501`; thay đổi bằng `CORS_ORIGINS`.

## 9. Phạm vi PoC

PoC chứng minh tích hợp và khả năng của nhóm trên local. Authentication hiện chỉ là UI demo; ingestion chạy đồng bộ và giới hạn cho batch nhỏ; chưa có scheduler, distributed queue, object storage, Glue Catalog hay production IAM. Các thành phần AWS/Terraform trong repo là tài liệu hướng phát triển, không thuộc runtime Compose hiện tại.

Chi tiết yêu cầu và quyết định kiến trúc xem tại [docs/requirements.md](docs/requirements.md) và [docs/architecture.md](docs/architecture.md).
