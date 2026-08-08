from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from src.settings import Settings

logger = logging.getLogger(__name__)


class DataService:
    def __init__(self, db_conn, config: Settings):
        self.db = db_conn
        self.config = config
        # Use athena_database / athena_table from settings — no more hardcoded values
        self.athena_db = config.athena_database
        self.athena_table = config.athena_table

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _has_data(self) -> bool:
        """Return True if data is available (S3 on cloud, local parquet otherwise)."""
        if self.config.is_cloud:
            return bool(self.config.curated_data_bucket)
        root = self.config.curated_path
        return root.exists() and any(root.rglob("*.parquet"))

    def _scan_expression(self) -> str:
        """DuckDB read_parquet glob for local mode."""
        glob = (
            self.config.curated_path / "**" / "*.parquet"
        ).as_posix().replace("'", "''")
        return f"read_parquet('{glob}', hive_partitioning=true, union_by_name=true)"

    def _athena_query(self, sql: str, params: dict | None = None) -> pd.DataFrame:
        """Run a query against Athena and return a DataFrame.
        Use %(name)s placeholders and pass params dict to avoid SQL injection.
        """
        import awswrangler as wr
        return wr.athena.read_sql_query(
            sql=sql,
            database=self.athena_db,
            s3_output=self.config.athena_output_location,
            params=params,          # awswrangler handles parameterization
            boto3_session=None,
        )

    @staticmethod
    def _sanitize_ticker(ticker: str) -> str:
        """Validate ticker to prevent SQL injection before string interpolation."""
        import re
        clean = ticker.strip().upper()
        if not re.fullmatch(r"[A-Z0-9._-]{1,20}", clean):
            raise ValueError(f"Invalid ticker: {ticker!r}")
        return clean

    @staticmethod
    def _records(frame: pd.DataFrame) -> list[dict]:
        clean = frame.astype(object).where(pd.notna(frame), None)
        return clean.to_dict(orient="records")

    # ------------------------------------------------------------------
    # Companies
    # ------------------------------------------------------------------

    def get_companies(
        self,
        page: int,
        limit: int,
        search: str | None = None,
        exchange: str | None = None,
        industry: str | None = None,
        exclude_financial: bool = False,
    ) -> dict:
        if not self._has_data():
            return {"data": [], "page": page, "limit": limit, "total_records": 0}

        if self.config.is_cloud:
            try:
                df = self._athena_query(
                    f"SELECT DISTINCT ticker FROM {self.athena_table}"
                )
                available: set[str] = set(df["ticker"].tolist())
            except Exception as exc:
                logger.error("Athena get_companies error: %s", exc)
                available = set()
        else:
            available = {
                row[0]
                for row in self.db.execute(
                    f"SELECT DISTINCT ticker FROM {self._scan_expression()}"
                ).fetchall()
            }

        # Load company metadata
        meta_df = pd.DataFrame()
        for candidate in (
            self.config.universe_file,
            self.config.resolve_path(Path("data/listed_companies.csv")),
        ):
            if candidate.exists():
                meta_df = pd.read_csv(candidate)
                break

        if not meta_df.empty:
            meta_df["ticker"] = meta_df["ticker"].astype(str).str.upper()
            if "market" not in meta_df.columns and "exchange" in meta_df.columns:
                meta_df = meta_df.rename(columns={"exchange": "market"})
            meta_df = (
                meta_df[["ticker", "name", "market", "sector"]]
                .drop_duplicates(subset=["ticker"])
            )
            companies = pd.DataFrame({"ticker": sorted(available)}).merge(
                meta_df, on="ticker", how="left"
            )
        else:
            companies = pd.DataFrame({"ticker": sorted(available)})
            for col in ("name", "market", "sector"):
                companies[col] = None

        companies = companies.sort_values("ticker").reset_index(drop=True)

        if search and search.strip():
            s = search.strip().lower()
            mask = companies["ticker"].astype(str).str.lower().str.contains(s, na=False) | \
                   companies["name"].fillna("").astype(str).str.lower().str.contains(s, na=False)
            companies = companies[mask]

        if exchange and exchange != "ALL":
            companies = companies[
                companies["market"].fillna("").astype(str).str.upper() == exchange.upper()
            ]

        if industry and industry != "ALL":
            companies = companies[
                companies["sector"].fillna("").astype(str).str.lower() == industry.lower()
            ]

        if exclude_financial:
            fin_keywords = [
                "ngân hàng", "chứng khoán", "bảo hiểm", "tài chính",
                "quỹ", "bank", "financial",
            ]
            pattern = "|".join(fin_keywords)
            is_fin = (
                companies["sector"]
                .fillna("").astype(str).str.lower()
                .str.contains(pattern, regex=True)
            )
            companies = companies[~is_fin]

        total_records = len(companies)
        offset = (page - 1) * limit
        page_frame = companies.iloc[offset: offset + limit]
        return {
            "data": self._records(page_frame),
            "page": page,
            "limit": limit,
            "total_records": total_records,
        }

    # ------------------------------------------------------------------
    # Prices
    # ------------------------------------------------------------------

    def get_prices(
        self,
        ticker: str,
        start_date: str | None,
        end_date: str | None,
        page: int,
        limit: int,
    ) -> dict:
        ticker = self._sanitize_ticker(ticker)
        if not self._has_data():
            return {"ticker": ticker, "data": [], "page": page, "limit": limit, "total_records": 0}

        offset = (page - 1) * limit

        if self.config.is_cloud:
            where_clauses = ["ticker = :ticker"]
            params: dict = {"ticker": ticker}
            if start_date:
                # trading_date stored as nanoseconds bigint → convert to compare
                where_clauses.append(
                    "trading_date >= to_unixtime(date_parse(:start_date, '%Y-%m-%d')) * 1000000000"
                )
                params["start_date"] = start_date
            if end_date:
                where_clauses.append(
                    "trading_date <= to_unixtime(date_parse(:end_date, '%Y-%m-%d')) * 1000000000"
                )
                params["end_date"] = end_date
            where_str = " AND ".join(where_clauses)

            try:
                count_df = self._athena_query(
                    f"SELECT COUNT(*) AS cnt FROM {self.athena_table} WHERE {where_str}",
                    params=params,
                )
                total_records = int(count_df["cnt"].iloc[0])

                frame = self._athena_query(f"""
                    SELECT ticker,
                           date_format(from_unixtime(trading_date / 1000000000), '%Y-%m-%d') AS trading_date,
                           open_price, high_price, low_price, close_price,
                           volume, return_pct, ma20, rsi_14
                    FROM {self.athena_table}
                    WHERE {where_str}
                    ORDER BY trading_date ASC
                    OFFSET {offset}
                    LIMIT {limit}
                """, params=params)
            except Exception as exc:
                logger.error("Athena get_prices error: %s", exc)
                total_records = 0
                frame = pd.DataFrame()
        else:
            params: list = [ticker]
            where_clauses = ["ticker = ?"]
            if start_date:
                where_clauses.append("trading_date >= CAST(? AS DATE)")
                params.append(start_date)
            if end_date:
                where_clauses.append("trading_date <= CAST(? AS DATE)")
                params.append(end_date)
            where_str = " AND ".join(where_clauses)

            total_records = self.db.execute(
                f"SELECT COUNT(*) FROM {self._scan_expression()} WHERE {where_str}",
                params,
            ).fetchone()[0]

            params.extend([limit, offset])
            frame = self.db.execute(
                f"""
                SELECT ticker, CAST(trading_date AS DATE) AS trading_date,
                       open_price, high_price, low_price, close_price,
                       volume, return_pct, ma20, rsi_14
                FROM {self._scan_expression()}
                WHERE {where_str}
                ORDER BY trading_date ASC
                LIMIT ? OFFSET ?
                """,
                params,
            ).df()

        return {
            "ticker": ticker,
            "data": self._records(frame),
            "page": page,
            "limit": limit,
            "total_records": total_records,
        }

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    def get_prices_for_export(self, ticker: str) -> pd.DataFrame | None:
        ticker = self._sanitize_ticker(ticker)
        if not self._has_data():
            return None

        if self.config.is_cloud:
            try:
                return self._athena_query(
                    f"SELECT ticker, "
                    f"date_format(from_unixtime(trading_date / 1000000000), '%Y-%m-%d') AS trading_date, "
                    f"open_price, high_price, low_price, close_price, volume, return_pct, ma20, rsi_14 "
                    f"FROM {self.athena_table} "
                    f"WHERE ticker = :ticker "
                    f"ORDER BY trading_date ASC",
                    params={"ticker": ticker},
                )
            except Exception as exc:
                logger.error("Athena export error: %s", exc)
                return pd.DataFrame()
        else:
            return self.db.execute(
                f"SELECT * FROM {self._scan_expression()} "
                f"WHERE ticker = ? ORDER BY trading_date ASC",
                [ticker],
            ).df()
