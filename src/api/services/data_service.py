import os
import duckdb
from src.api.config import settings

class DataService:
    """
    Service Layer: Tách biệt logic truy xuất cơ sở dữ liệu (DuckDB) ra khỏi Router API.
    Đây là chuẩn Clean Architecture giúp dễ mở rộng, bảo trì và viết Unit Test.
    """
    def __init__(self, db_conn):
        self.db = db_conn

    def _check_data_exists(self):
        return os.path.exists(settings.data_path)

    def get_companies(self, page: int, limit: int):
        if not self._check_data_exists():
            return {"data": [], "page": page, "limit": limit, "total_records": 0}

        count_query = f"SELECT COUNT(DISTINCT ticker) FROM read_parquet('{settings.data_path}')"
        total_records = self.db.execute(count_query).fetchone()[0]

        offset = (page - 1) * limit
        # Parameterized queries cho LIMIT và OFFSET
        query = f"SELECT DISTINCT ticker FROM read_parquet('{settings.data_path}') ORDER BY ticker LIMIT ? OFFSET ?"
        df = self.db.execute(query, [limit, offset]).df()
        
        return {"data": df.to_dict(orient="records"), "page": page, "limit": limit, "total_records": total_records}

    def get_prices(self, ticker: str, start_date: str, end_date: str, page: int, limit: int):
        if not self._check_data_exists():
            return {"ticker": ticker, "data": [], "page": page, "limit": limit, "total_records": 0}

        params = [ticker]
        where_clauses = ["ticker = ?"]
        
        if start_date:
            where_clauses.append("date >= ?")
            params.append(start_date)
        if end_date:
            where_clauses.append("date <= ?")
            params.append(end_date)
            
        where_str = " AND ".join(where_clauses)
        
        count_query = f"SELECT COUNT(*) FROM read_parquet('{settings.data_path}') WHERE {where_str}"
        total_records = self.db.execute(count_query, params).fetchone()[0]
        
        offset = (page - 1) * limit
        
        query = f"SELECT * FROM read_parquet('{settings.data_path}') WHERE {where_str} ORDER BY date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        df = self.db.execute(query, params).df()
        
        return {"ticker": ticker, "data": df.to_dict(orient="records"), "page": page, "limit": limit, "total_records": total_records}
        
    def get_prices_for_export(self, ticker: str):
        if not self._check_data_exists():
            return None
            
        # An toàn tuyệt đối với Parameterized query
        query = f"SELECT * FROM read_parquet('{settings.data_path}') WHERE ticker = ? ORDER BY date DESC"
        df = self.db.execute(query, [ticker]).df()
        return df
