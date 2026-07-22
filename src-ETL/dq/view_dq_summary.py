import json
import pandas as pd
from pathlib import Path

# Dùng Path.cwd() để luôn lấy chuẩn thư mục gốc đang mở Terminal
BASE_DIR = Path.cwd()

def summarize_dq_reports():
    dq_dir = BASE_DIR / "src" / "dq"
    report_files = list(dq_dir.glob("dq_report.json"))
    
    if not report_files:
        print(f"\n❌ Không tìm thấy file DQ Report nào trong thư mục: {dq_dir}\n")
        return

    summary_data = []
    
    for file in sorted(report_files):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                batch_name = file.stem.replace("dq_report_", "")
                
                # 1. Lấy thông tin tổng quan
                total = data.get('total_records', 0)
                
                # 2. Lấy thông tin cách ly (Quarantine)
                quarantine = data.get('quarantine_summary', {})
                passed = quarantine.get('valid_records', 0)
                failed = quarantine.get('quarantined_records', 0)
                
                # 3. Lấy thông số chất lượng (Metrics)
                metrics = data.get('metrics', {})
                completeness = metrics.get('completeness_pct', 'N/A')
                uniqueness = metrics.get('uniqueness_pct', 'N/A')
                
                # Freshness tính theo số ngày trễ (days_delayed)
                freshness_days = metrics.get('freshness', {}).get('days_delayed', 'N/A')
                
                summary_data.append({
                    "Batch": batch_name,
                    "Total": total,
                    "Pass": passed,
                    "Fail": failed,
                    "Completeness (%)": completeness,
                    "Uniqueness (%)": uniqueness,
                    "Delay (Days)": freshness_days
                })
        except Exception as e:
            print(f"⚠️ Lỗi đọc file {file.name}: {e}")
            
    if summary_data:
        df_summary = pd.DataFrame(summary_data)
        print("\n📊 BẢNG TỔNG KẾT DATA QUALITY (5 BATCHES)\n" + "="*80)
        print(df_summary.to_markdown(index=False))
        print("="*80 + "\n")

if __name__ == "__main__":
    summarize_dq_reports()