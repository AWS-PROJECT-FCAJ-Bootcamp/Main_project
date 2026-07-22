from fastapi import Depends, HTTPException
from src.api.database import get_db_connection
from src.api.services.data_service import DataService

def get_data_service(db=Depends(get_db_connection)) -> DataService:
    """Dependency Injection: Cung cấp instance DataService cho các router API"""
    if db is None:
        raise HTTPException(status_code=500, detail="Lỗi kết nối DuckDB")
    return DataService(db)
