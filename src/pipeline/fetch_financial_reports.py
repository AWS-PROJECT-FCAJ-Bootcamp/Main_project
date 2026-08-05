"""
===============================================================================
Module: fetch_financial_reports.py
Description: Pipeline thu thập toàn bộ dữ liệu Báo cáo Tài chính (Bảng Cân đối 
             Kế toán, Kết quả Kinh doanh, Lưu chuyển Tiền tệ & Chỉ số Tài chính) 
             từ vnstock cho toàn bộ các doanh nghiệp niêm yết tại Việt Nam.
             Tích hợp phục vụ lưu trữ thô (Raw Data S3/Local) và Backend (BE).
===============================================================================
"""

import sys
import os
import json
import time
import argparse
import logging
from datetime import datetime
from typing import List, Dict, Optional, Union
import pandas as pd

try:
    from vnstock import Finance, Listing
except ImportError:
    print("❌ Thư viện 'vnstock' chưa được cài đặt. Vui lòng cài đặt qua: pip install vnstock")
    sys.exit(1)

# Cấu hình Logging chuyên nghiệp cho Backend Pipeline
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("BackendFinancialPipeline")


def sanitize_df_for_parquet(df: pd.DataFrame) -> pd.DataFrame:
    """
    Chuẩn hóa kiểu dữ liệu DataFrame trước khi ghi file Parquet,
    tránh lỗi PyArrow Type Mismatch do kiểu dữ liệu hỗn hợp (mixed object types).
    """
    if df is None or df.empty:
        return df
    df = df.copy()
    df.columns = [str(c) for c in df.columns]
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].fillna("").astype(str)
    return df


class FinancialReportFetcher:
    """
    Class quản lý Pipeline thu thập trọn bộ Báo cáo Tài chính & Chỉ số cho Backend:
    1. Bảng cân đối kế toán (Balance Sheet)
    2. Báo cáo kết quả kinh doanh (Income Statement)
    3. Báo cáo lưu chuyển tiền tệ (Cash Flow Statement)
    4. Chỉ số tài chính (Financial Ratios)
    """

    FINANCIAL_ICB_NAMES = [
        "Tài chính", "Ngân hàng", "Dịch vụ tài chính", "Bảo hiểm",
        "Môi giới chứng khoán", "Quỹ đầu tư"
    ]

    def __init__(
        self,
        source: str = "VCI",
        period: str = "quarter",
        lang: str = "vi",
        output_dir: str = "data/raw/financial_reports"
    ):
        """
        Khởi tạo Pipeline Fetcher.
        :param source: Nguồn dữ liệu ('VCI', 'KBS'). Mặc định 'VCI'.
        :param period: Kỳ báo cáo ('quarter' hoặc 'year'). Mặc định 'quarter'.
        :param lang: Ngôn ngữ tiêu đề ('vi' hoặc 'en'). Mặc định 'vi'.
        :param output_dir: Thư mục lưu trữ dữ liệu đầu ra cho Backend.
        """
        self.source = source.upper()
        self.period = period.lower()
        self.lang = lang.lower()
        self.output_dir = output_dir

        self.checkpoint_dir = os.path.join(self.output_dir, "checkpoints")
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.checkpoint_dir, exist_ok=True)

    def get_eligible_symbols(self, exclude_financial: bool = False) -> List[str]:
        """
        Lấy danh sách toàn bộ mã cổ phiếu niêm yết trên thị trường chứng khoán Việt Nam (HOSE, HNX, UPCOM).
        """
        logger.info("🔍 Đang truy xuất danh sách doanh nghiệp từ vnstock Listing...")
        try:
            listing = Listing()
            df_symbols = None
            if hasattr(listing, 'all_symbols'):
                df_symbols = listing.all_symbols()
            elif hasattr(listing, 'companies'):
                df_symbols = listing.companies()
            else:
                df_symbols = listing.symbols_by_industries()

            if df_symbols is None or df_symbols.empty:
                logger.warning("⚠️ Không lấy được danh sách cổ phiếu từ Listing.")
                return []

            ticker_col = 'ticker' if 'ticker' in df_symbols.columns else ('symbol' if 'symbol' in df_symbols.columns else None)
            if not ticker_col:
                logger.error("❌ Không tìm thấy cột mã cổ phiếu trong dữ liệu niêm yết.")
                return []

            if exclude_financial:
                cols_to_check = [c for c in ['icb_name1', 'icb_name2', 'icb_name3', 'sector_name', 'industry_name'] if c in df_symbols.columns]
                def is_financial(row):
                    for col in cols_to_check:
                        val = str(row[col])
                        if any(fin_keyword in val for fin_keyword in self.FINANCIAL_ICB_NAMES):
                            return True
                    return False

                fin_mask = df_symbols.apply(is_financial, axis=1)
                df_filtered = df_symbols[~fin_mask]
                logger.info(f"🛡️ Đã lọc bỏ {fin_mask.sum()} mã thuộc Ngành Tài chính/Ngân hàng/Chứng khoán.")
            else:
                df_filtered = df_symbols

            symbols = df_filtered[ticker_col].dropna().unique().tolist()
            logger.info(f"✅ Tìm thấy tổng cộng {len(symbols)} mã doanh nghiệp đủ điều kiện.")
            return symbols
        except Exception as e:
            logger.error(f"❌ Lỗi khi lấy danh sách mã cổ phiếu: {e}")
            return []

    def fetch_symbol_reports(self, symbol: str, retries: int = 2) -> Dict[str, Optional[pd.DataFrame]]:
        """
        Thu thập trọn bộ 4 loại báo cáo (Balance Sheet, Income Statement, Cash Flow, Ratio) cho 1 mã cổ phiếu.
        Tích hợp tự động xử lý Rate Limit (20 req/min) và retry đa nguồn.
        """
        results = {
            "balance_sheet": None,
            "income_statement": None,
            "cash_flow": None,
            "ratio": None
        }

        sources_to_try = [self.source]
        for alt_src in ["VCI", "KBS"]:
            if alt_src not in sources_to_try:
                sources_to_try.append(alt_src)

        for src in sources_to_try:
            for attempt in range(retries + 1):
                try:
                    fin = Finance(symbol=symbol, source=src)

                    # 1. Bảng Cân đối kế toán
                    if results["balance_sheet"] is None:
                        df_bs = fin.balance_sheet(period=self.period, lang=self.lang)
                        if df_bs is not None and not df_bs.empty:
                            df_bs = df_bs.copy()
                            if 'ticker' not in df_bs.columns and 'symbol' not in df_bs.columns:
                                df_bs['ticker'] = symbol
                            results["balance_sheet"] = df_bs

                    # 2. Báo cáo Kết quả Kinh doanh
                    if results["income_statement"] is None:
                        df_is = fin.income_statement(period=self.period, lang=self.lang)
                        if df_is is not None and not df_is.empty:
                            df_is = df_is.copy()
                            if 'ticker' not in df_is.columns and 'symbol' not in df_is.columns:
                                df_is['ticker'] = symbol
                            results["income_statement"] = df_is

                    # 3. Báo cáo Lưu chuyển Tiền tệ
                    if results["cash_flow"] is None:
                        df_cf = fin.cash_flow(period=self.period, lang=self.lang)
                        if df_cf is not None and not df_cf.empty:
                            df_cf = df_cf.copy()
                            if 'ticker' not in df_cf.columns and 'symbol' not in df_cf.columns:
                                df_cf['ticker'] = symbol
                            results["cash_flow"] = df_cf

                    # 4. Chỉ số Tài chính
                    if results["ratio"] is None:
                        try:
                            df_ratio = fin.ratio(period=self.period, lang=self.lang)
                            if df_ratio is not None and not df_ratio.empty:
                                df_ratio = df_ratio.copy()
                                if 'ticker' not in df_ratio.columns and 'symbol' not in df_ratio.columns:
                                    df_ratio['ticker'] = symbol
                                results["ratio"] = df_ratio
                        except Exception:
                            pass # Ratio là dữ liệu bổ sung

                    if any(v is not None for v in results.values()):
                        return results
                    break

                except BaseException as e:
                    err_msg = str(e)
                    if isinstance(e, SystemExit) or "Rate limit" in err_msg or "GIỚI HẠN API" in err_msg or "requests/phút" in err_msg or "terminated" in err_msg:
                        logger.warning(f"⏳ Mã {symbol}: Chạm giới hạn API Rate Limit (20 req/phút). Tự động tạm dừng 65 giây để reset quota...")
                        time.sleep(65)
                        continue
                    
                    if attempt < retries:
                        logger.warning(f"⚠️ [{symbol} - {src}] Thử lại ({attempt + 1}/{retries}) sau lỗi: {e}")
                        time.sleep(3)
                    else:
                        logger.warning(f"⚠️ [{symbol} - {src}] Bỏ qua nguồn {src} sau {retries} lần thử: {e}")

            if any(v is not None for v in results.values()):
                break

        return results

    def fetch_all(
        self,
        symbols: Optional[List[str]] = None,
        exclude_financial: bool = False,
        delay_seconds: float = 3.5,
        checkpoint_interval: int = 20,
        resume: bool = True
    ) -> Dict[str, pd.DataFrame]:
        """
        Chạy Pipeline thu thập dữ liệu BCTC cho toàn bộ doanh nghiệp với khả năng Resume và Checkpointing.
        """
        start_time = datetime.now()
        if symbols is None or len(symbols) == 0:
            symbols = self.get_eligible_symbols(exclude_financial=exclude_financial)

        logger.info(f"🚀 [Backend Pipeline] Bắt đầu thu thập dữ liệu BCTC cho {len(symbols)} mã doanh nghiệp...")
        logger.info(f"⚙️ Nguồn: {self.source} | Kỳ: {self.period} | Ngôn ngữ: {self.lang} | Delay: {delay_seconds}s")

        # Nạp dữ liệu từ Checkpoint cũ nếu chọn resume
        bs_list, is_list, cf_list, ratio_list = [], [], [], []
        fetched_tickers = set()

        if resume:
            ckpt_bs_path = os.path.join(self.checkpoint_dir, "bs_checkpoint.parquet")
            ckpt_is_path = os.path.join(self.checkpoint_dir, "is_checkpoint.parquet")
            ckpt_cf_path = os.path.join(self.checkpoint_dir, "cf_checkpoint.parquet")
            ckpt_ratio_path = os.path.join(self.checkpoint_dir, "ratio_checkpoint.parquet")

            if os.path.exists(ckpt_bs_path):
                df_old_bs = pd.read_parquet(ckpt_bs_path)
                bs_list.append(df_old_bs)
                if 'ticker' in df_old_bs.columns:
                    fetched_tickers.update(df_old_bs['ticker'].unique())
            if os.path.exists(ckpt_is_path):
                df_old_is = pd.read_parquet(ckpt_is_path)
                is_list.append(df_old_is)
                if 'ticker' in df_old_is.columns:
                    fetched_tickers.update(df_old_is['ticker'].unique())
            if os.path.exists(ckpt_cf_path):
                df_old_cf = pd.read_parquet(ckpt_cf_path)
                cf_list.append(df_old_cf)
                if 'ticker' in df_old_cf.columns:
                    fetched_tickers.update(df_old_cf['ticker'].unique())
            if os.path.exists(ckpt_ratio_path):
                df_old_ratio = pd.read_parquet(ckpt_ratio_path)
                ratio_list.append(df_old_ratio)

            if fetched_tickers:
                logger.info(f"🔄 Auto-Resume: Phát hiện {len(fetched_tickers)} mã đã tải trong Checkpoint. Đang bỏ qua các mã này...")

        remaining_symbols = [s for s in symbols if s not in fetched_tickers]
        total_symbols = len(symbols)
        failed_symbols = []

        for idx, sym in enumerate(remaining_symbols, len(fetched_tickers) + 1):
            logger.info(f"[{idx}/{total_symbols}] Đang kéo dữ liệu BCTC: {sym}")
            reports = self.fetch_symbol_reports(sym)

            has_any = False
            if reports["balance_sheet"] is not None and not reports["balance_sheet"].empty:
                bs_list.append(reports["balance_sheet"])
                has_any = True
            if reports["income_statement"] is not None and not reports["income_statement"].empty:
                is_list.append(reports["income_statement"])
                has_any = True
            if reports["cash_flow"] is not None and not reports["cash_flow"].empty:
                cf_list.append(reports["cash_flow"])
                has_any = True
            if reports["ratio"] is not None and not reports["ratio"].empty:
                ratio_list.append(reports["ratio"])

            if not has_any:
                failed_symbols.append(sym)

            if delay_seconds > 0:
                time.sleep(delay_seconds)

            # Ghi Checkpoint định kỳ
            if idx % checkpoint_interval == 0 or idx == total_symbols:
                logger.info(f"💾 Checkpoint [{idx}/{total_symbols}]: Đang cập nhật đệm dữ liệu Backend...")
                if bs_list:
                    sanitize_df_for_parquet(pd.concat(bs_list, ignore_index=True)).to_parquet(
                        os.path.join(self.checkpoint_dir, "bs_checkpoint.parquet"), index=False
                    )
                if is_list:
                    sanitize_df_for_parquet(pd.concat(is_list, ignore_index=True)).to_parquet(
                        os.path.join(self.checkpoint_dir, "is_checkpoint.parquet"), index=False
                    )
                if cf_list:
                    sanitize_df_for_parquet(pd.concat(cf_list, ignore_index=True)).to_parquet(
                        os.path.join(self.checkpoint_dir, "cf_checkpoint.parquet"), index=False
                    )
                if ratio_list:
                    sanitize_df_for_parquet(pd.concat(ratio_list, ignore_index=True)).to_parquet(
                        os.path.join(self.checkpoint_dir, "ratio_checkpoint.parquet"), index=False
                    )

        combined_bs = pd.concat(bs_list, ignore_index=True) if bs_list else pd.DataFrame()
        combined_is = pd.concat(is_list, ignore_index=True) if is_list else pd.DataFrame()
        combined_cf = pd.concat(cf_list, ignore_index=True) if cf_list else pd.DataFrame()
        combined_ratio = pd.concat(ratio_list, ignore_index=True) if ratio_list else pd.DataFrame()

        end_time = datetime.now()
        duration_str = str(end_time - start_time)

        logger.info("🎉 HOÀN THÀNH PIPELINE THU THẬP DỮ LIỆU TẤT CẢ DOANH NGHIỆP!")
        logger.info(f"📊 Báo cáo tổng kết Backend:")
        logger.info(f"   - Total Bảng Cân đối kế toán: {len(combined_bs):,} dòng")
        logger.info(f"   - Total Báo cáo Kết quả KD: {len(combined_is):,} dòng")
        logger.info(f"   - Total Báo cáo Lưu chuyển TT: {len(combined_cf):,} dòng")
        logger.info(f"   - Total Báo cáo Chỉ số Tài chính: {len(combined_ratio):,} dòng")

        # Ghi file metadata summary cho Backend
        summary_meta = {
            "execution_date": datetime.now().isoformat(),
            "duration": duration_str,
            "total_target_symbols": total_symbols,
            "successful_symbols_count": total_symbols - len(failed_symbols),
            "failed_symbols_count": len(failed_symbols),
            "failed_symbols_list": failed_symbols,
            "records": {
                "balance_sheet": len(combined_bs),
                "income_statement": len(combined_is),
                "cash_flow": len(combined_cf),
                "ratio": len(combined_ratio)
            }
        }
        with open(os.path.join(self.output_dir, "ingestion_summary.json"), "w", encoding="utf-8") as f:
            json.dump(summary_meta, f, ensure_ascii=False, indent=2)

        return {
            "balance_sheet": combined_bs,
            "income_statement": combined_is,
            "cash_flow": combined_cf,
            "ratio": combined_ratio
        }

    def save_data(
        self,
        data_dict: Dict[str, pd.DataFrame],
        file_format: str = "both"
    ) -> Dict[str, str]:
        """
        Lưu trữ bộ dữ liệu thu thập hoàn chỉnh cho Backend theo định dạng Parquet, CSV hoặc JSON.
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_paths = {}

        for report_name, df in data_dict.items():
            if df.empty:
                logger.warning(f"⚠️ Báo cáo '{report_name}' trống, bỏ qua việc lưu.")
                continue

            base_filename = f"{report_name}_{self.period}_{self.source.lower()}_{timestamp}"
            
            if file_format in ["parquet", "both"]:
                pq_path = os.path.join(self.output_dir, f"{base_filename}.parquet")
                sanitize_df_for_parquet(df).to_parquet(pq_path, index=False)
                saved_paths[f"{report_name}_parquet"] = pq_path
                logger.info(f"💾 [Backend Dataset Parquet]: {pq_path}")

            if file_format in ["csv", "both"]:
                csv_path = os.path.join(self.output_dir, f"{base_filename}.csv")
                df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                saved_paths[f"{report_name}_csv"] = csv_path
                logger.info(f"💾 [Backend Dataset CSV]: {csv_path}")

            if file_format == "json":
                json_path = os.path.join(self.output_dir, f"{base_filename}.json")
                df.to_json(json_path, orient="records", force_ascii=False, indent=2)
                saved_paths[f"{report_name}_json"] = json_path
                logger.info(f"💾 [Backend Dataset JSON]: {json_path}")

        return saved_paths


def main():
    parser = argparse.ArgumentParser(description="Pipeline thu thập trọn bộ dữ liệu Báo cáo Tài chính toàn bộ doanh nghiệp cho Backend.")
    parser.add_argument("--symbols", type=str, default=None, help="Mã cổ phiếu phân cách bằng dấu phẩy (VD: VNM,HPG). Để trống để lấy toàn bộ thị trường Việt Nam.")
    parser.add_argument("--source", type=str, default="VCI", choices=["VCI", "KBS"], help="Nguồn dữ liệu BCTC (Mặc định: VCI).")
    parser.add_argument("--period", type=str, default="quarter", choices=["quarter", "year"], help="Kỳ báo cáo ('quarter' hoặc 'year').")
    parser.add_argument("--lang", type=str, default="vi", choices=["vi", "en"], help="Ngôn ngữ tiêu đề ('vi' hoặc 'en').")
    parser.add_argument("--exclude-financial", action="store_true", help="Lọc bỏ doanh nghiệp thuộc Ngành Tài chính/Ngân hàng/Chứng khoán.")
    parser.add_argument("--delay", type=float, default=3.5, help="Thời gian nghỉ (giây) giữa các request để duy trì dưới ngưỡng Rate Limit 20 req/phút.")
    parser.add_argument("--format", type=str, default="both", choices=["parquet", "csv", "json", "both"], help="Định dạng file lưu (parquet, csv, json, both).")
    parser.add_argument("--output-dir", type=str, default="data/raw/financial_reports", help="Thư mục lưu trữ kết quả dữ liệu.")
    parser.add_argument("--no-resume", action="store_true", help="Không tự động khôi phục từ Checkpoint cũ, chạy mới hoàn toàn.")

    args = parser.parse_args()

    symbol_list = [s.strip().upper() for s in args.symbols.split(",")] if args.symbols else None

    fetcher = FinancialReportFetcher(
        source=args.source,
        period=args.period,
        lang=args.lang,
        output_dir=args.output_dir
    )

    data = fetcher.fetch_all(
        symbols=symbol_list,
        exclude_financial=args.exclude_financial,
        delay_seconds=args.delay,
        resume=not args.no_resume
    )
    fetcher.save_data(data, file_format=args.format)


if __name__ == "__main__":
    main()
