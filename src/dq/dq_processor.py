import pandas as pd
import json
import os
from datetime import datetime
from pathlib import Path

class DataQualityProcessor:
    def __init__(self, df: pd.DataFrame, report_path: str = "dq_report.json"):
        self.df = df
        self.report_path = report_path
        self.total_records = len(df)
        self.report = {
            "execution_time": datetime.now().isoformat(),
            "total_records": self.total_records,
            "metrics": {},
            "quarantine_summary": {}
        }

    def run_dq_checks(self):
        df = self.df.copy()
        
        if self.total_records == 0:
            print("Warning: DataFrame trống, không có dữ liệu để kiểm tra!")
            return df, df

        df['trading_date'] = pd.to_datetime(df['trading_date'], errors='coerce')

        critical_cols = ['trading_date', 'close_price', 'volume']
        existing_critical_cols = [c for c in critical_cols if c in df.columns]
        null_mask = df[existing_critical_cols].isnull().any(axis=1)
        completeness_score = 100 * (1 - null_mask.sum() / self.total_records)
        
        dup_mask = df.duplicated(subset=['ticker', 'trading_date'], keep=False)
        uniqueness_score = 100 * (1 - dup_mask.sum() / self.total_records)
        
        range_mask = (
            (df['open_price'] <= 0) | (df['close_price'] <= 0) | 
            (df['high_price'] <= 0) | (df['low_price'] <= 0) |
            (df['volume'] < 0) |
            (df['high_price'] < df['low_price'])
        )
        range_score = 100 * (1 - range_mask.sum() / self.total_records)
        
        latest_date = df['trading_date'].max()
        days_delayed = (datetime.now() - latest_date).days if pd.notnull(latest_date) else None

        self.report["metrics"] = {
            "completeness_pct": round(completeness_score, 2),
            "uniqueness_pct": round(uniqueness_score, 2),
            "range_validity_pct": round(range_score, 2),
            "freshness": {
                "latest_date": latest_date.isoformat() if pd.notnull(latest_date) else None,
                "days_delayed": days_delayed
            }
        }
        
        invalid_mask = null_mask | dup_mask | range_mask
        
        valid_df = df[~invalid_mask].copy()
        quarantine_df = df[invalid_mask].copy()
        
        self.report["quarantine_summary"] = {
            "valid_records": len(valid_df),
            "quarantined_records": len(quarantine_df),
            "reasons": {
                "null_values": int(null_mask.sum()),
                "duplicates": int(dup_mask.sum()),
                "logic_violations": int(range_mask.sum())
            }
        }
        
        self._save_report()
        return valid_df, quarantine_df

    def _save_report(self):
        dir_name = os.path.dirname(os.path.abspath(self.report_path))
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
            
        with open(self.report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, indent=4, ensure_ascii=False)
        print(f"✅ Đã xuất DQ Report tại: {self.report_path}")

if __name__ == "__main__":
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    input_csv = BASE_DIR / "src" / "tests" / "ohlcv_samples_10_tickers_K07.csv"
    report_out = BASE_DIR / "src" / "dq" / "dq_report.json"
    
    if input_csv.exists():
        print(f"Đang đọc dữ liệu từ: {input_csv.name}...")
        df_raw = pd.read_csv(input_csv)
        
        dq = DataQualityProcessor(df_raw, str(report_out))
        valid_data, bad_data = dq.run_dq_checks()
        
        print("\n=== KẾT QUẢ DATA QUALITY ===")
        print(f"Tổng số dòng ban đầu: {len(df_raw)}")
        print(f"Số dòng sạch (Valid): {len(valid_data)}")
        print(f"Số dòng bẩn (Quarantined): {len(bad_data)}")
    else:
        print(f"Lỗi: Không tìm thấy file data tại {input_csv}")