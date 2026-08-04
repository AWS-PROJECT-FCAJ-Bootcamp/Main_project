"""
===============================================================================
Module: fetch_financial_reports.py (Data Source Ingestion Entrypoint)
Description: Thư mục Data Source Ingestion cho luồng cào dữ liệu Báo cáo tài chính.
             Module này gọi trực tiếp đến src.pipeline.fetch_financial_reports
             hoặc tự chạy độc lập để lưu dữ liệu thô vào data/raw/financial_reports.
===============================================================================
"""

import sys
import os

# Đảm bảo đường dẫn root dự án có trong sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.pipeline.fetch_financial_reports import FinancialReportFetcher, main

if __name__ == "__main__":
    main()
