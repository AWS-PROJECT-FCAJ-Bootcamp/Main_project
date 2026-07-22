import pandas as pd
import numpy as np
import os
import json
import logging
from pathlib import Path
from src.dq.dq_processor import DataQualityProcessor

BASE_DIR = Path(__file__).resolve().parent.parent.parent
log_path = BASE_DIR / "src" / "etl" / "etl_run.log"
os.makedirs(log_path.parent, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_path, encoding='utf-8'),
        logging.StreamHandler()
    ]
)


def clean_and_type_data(df: pd.DataFrame) -> pd.DataFrame:
    """Ép kiểu dữ liệu và loại bỏ dòng trùng lặp."""
    df['trading_date'] = pd.to_datetime(df['trading_date'])
    df = df.drop_duplicates(subset=['ticker', 'trading_date'], keep='last')
    
    type_mapping = {
        'open_price': 'float32',
        'high_price': 'float32',
        'low_price': 'float32',
        'close_price': 'float32',
        'volume': 'int64'
    }
    df = df.astype(type_mapping)
    df = df.sort_values(by=['ticker', 'trading_date']).reset_index(drop=True)
    return df

def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Tính toán Return, MA20, và RSI 14 ngày."""
    df['return'] = df.groupby('ticker')['close_price'].pct_change() * 100
    df['ma20'] = df.groupby('ticker')['close_price'].transform(
        lambda x: x.rolling(window=20, min_periods=1).mean()
    )
    
    def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -1 * delta.clip(upper=0)
        
        ema_gain = gain.ewm(com=period-1, adjust=False).mean()
        ema_loss = loss.ewm(com=period-1, adjust=False).mean()
        
        rs = ema_gain / ema_loss
        return 100 - (100 / (1 + rs))

    df['rsi_14'] = df.groupby('ticker')['close_price'].transform(calculate_rsi)
    df[['return', 'ma20', 'rsi_14']] = df[['return', 'ma20', 'rsi_14']].round(2)
    
    return df

def run_batch_etl_pipeline(json_data_path: Path, output_dir: str, quarantine_dir: str, batch_size: int = 20):
    logging.info("BẮT ĐẦU LUỒNG ETL")
    
    if not json_data_path.exists():
        logging.error(f"Không tìm thấy tệp JSON dữ liệu tại {json_data_path}")
        return

    try:
        with open(json_data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        logging.error(f"Lỗi khi đọc tệp JSON: {e}")
        return

    all_dfs = []
    for item in data:
        if 'records' in item and item['records']:
            all_dfs.append(pd.DataFrame(item['records']))
            
    if not all_dfs:
         logging.error("Không tìm thấy dữ liệu 'records' bên trong tệp JSON.")
         return
         
    df_raw_all = pd.concat(all_dfs, ignore_index=True)
    logging.info(f"Đã nạp toàn bộ {len(df_raw_all)} dòng dữ liệu.")

    dq_report_path = str(BASE_DIR / "src" / "dq" / "dq_report.json")
    dq = DataQualityProcessor(df_raw_all, dq_report_path)
    valid_data, bad_data = dq.run_dq_checks()
    
    if not bad_data.empty:
        os.makedirs(quarantine_dir, exist_ok=True)
        bad_data.to_parquet(quarantine_dir, engine='pyarrow', partition_cols=['ticker'], index=False)
        logging.warning(f"Đã cách ly {len(bad_data)} dòng bẩn.")
        
    if valid_data.empty:
        logging.error("Không có dữ liệu sạch để tiếp tục ETL.")
        return

    valid_tickers = valid_data['ticker'].unique().tolist()
    logging.info(f"Kiểm dịch xong. Bắt đầu chia lô {len(valid_tickers)} mã sạch để Transform...")

    for i in range(0, len(valid_tickers), batch_size):
        current_batch = valid_tickers[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        
        logging.info(f"\n--- ĐANG XỬ LÝ BATCH {batch_num} ({len(current_batch)} mã) ---")
        
        df_batch = valid_data[valid_data['ticker'].isin(current_batch)]
        
        df_clean = clean_and_type_data(df_batch)
        df_curated = calculate_indicators(df_clean)
        
        os.makedirs(output_dir, exist_ok=True)
        df_curated.to_parquet(output_dir, engine='pyarrow', partition_cols=['ticker'], index=False)
        logging.info(f"Batch {batch_num}: Đã lưu Curated Parquet cho {len(df_curated)} dòng.")

    logging.info("\nĐÃ HOÀN TẤT XỬ LÝ TOÀN BỘ CÁC BATCH!")

if __name__ == "__main__":
    json_file = BASE_DIR / "src" / "etl" / "data_100_tickers.json"
    
    output_folder = BASE_DIR / "src" / "etl" / "curated_data" / "ohlcv"
    quarantine_folder = BASE_DIR / "src" / "etl" / "quarantine_data" / "ohlcv"
    
    run_batch_etl_pipeline(
        json_data_path=json_file,
        output_dir=str(output_folder),
        quarantine_dir=str(quarantine_folder),
        batch_size=20
    )