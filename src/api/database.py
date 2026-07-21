import duckdb
import logging

logger = logging.getLogger(__name__)

try:
    con = duckdb.connect(database=':memory:', read_only=False)
    con.execute("INSTALL httpfs;")
    con.execute("LOAD httpfs;")
    con.execute("SET s3_endpoint='localhost:9000'; SET s3_use_ssl=false; SET s3_access_key_id='minioadmin'; SET s3_secret_access_key='minioadmin';")
    logger.info("Khởi tạo kết nối DuckDB thành công!")
except Exception as e:
    logger.error(f"Lỗi khởi tạo DuckDB: {str(e)}")
    con = None

def get_db_connection():
    """Dependency Injection cho FastAPI để gọi DB"""
    return con
