"""
===============================================================================
Module: verify_parquet.py
Description: Script tiện ích đọc và kiểm tra dữ liệu trong các file .parquet
             (bao gồm file Checkpoint và file báo cáo chính thức).
===============================================================================
"""

import sys
import os
import glob
import pandas as pd

def inspect_parquet_file(file_path: str):
    """
    Đọc và hiển thị thông tin chi tiết của 1 file Parquet.
    """
    print("=" * 80)
    print(f"📄 ĐANG KIỂM TRA FILE: {file_path}")
    print("=" * 80)

    if not os.path.exists(file_path):
        print(f"❌ File không tồn tại: {file_path}")
        return

    try:
        df = pd.read_parquet(file_path)
        print(f"📊 Kích thước dữ liệu: {df.shape[0]:,} dòng × {df.shape[1]} cột")
        
        # Nhận diện cột mã cổ phiếu ('ticker' hoặc 'symbol')
        ticker_col = 'ticker' if 'ticker' in df.columns else ('symbol' if 'symbol' in df.columns else None)
        if ticker_col:
            unique_tickers = df[ticker_col].unique()
            print(f"🏢 Tổng số mã doanh nghiệp đã thu thập: {len(unique_tickers)} mã")
            print(f"📋 10 mã đầu tiên: {list(unique_tickers[:10])}")
        
        print("\n📌 Danh sách các cột chỉ tiêu:")
        print(list(df.columns[:15]), "..." if len(df.columns) > 15 else "")

        print("\n🔍 5 dòng dữ liệu mẫu đầu tiên:")
        print(df.head(5))
        print("\n")
    except Exception as e:
        print(f"❌ Lỗi khi đọc file {file_path}: {e}")


def main():
    base_dir = "data/raw/financial_reports"
    checkpoint_dir = os.path.join(base_dir, "checkpoints")

    print("\n🚀 QUÁ TRÌNH KIỂM TRA DỮ LIỆU BÁO CÁO TÀI CHÍNH (.PARQUET)\n")

    # 1. Kiểm tra các file Checkpoints
    checkpoint_files = glob.glob(os.path.join(checkpoint_dir, "*.parquet"))
    if checkpoint_files:
        print("--- [1] KIỂM TRA DỮ LIỆU TIẾN TRÌNH ĐANG CHẠY (CHECKPOINTS) ---")
        for f in checkpoint_files:
            inspect_parquet_file(f)
    else:
        print("⚠️ Chưa tìm thấy file Checkpoint trong data/raw/financial_reports/checkpoints/")

    # 2. Kiểm tra các file Parquet chính thức
    official_files = glob.glob(os.path.join(base_dir, "*.parquet"))
    if official_files:
        print("\n--- [2] KIỂM TRA DỮ LIỆU ĐÃ HOÀN THÀNH CHÍNH THỨC ---")
        for f in official_files:
            inspect_parquet_file(f)
    else:
        print("⚠️ Chưa có file Parquet chính thức hoàn tất.")


if __name__ == "__main__":
    main()
