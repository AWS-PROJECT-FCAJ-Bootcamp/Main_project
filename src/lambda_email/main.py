"""
Lambda Email — SES sender (theo sơ đồ kiến trúc)
==================================================
Vai trò trong kiến trúc:
  Athena query results / pipeline events
      → Lambda Email   ← file này
          → gửi email qua Amazon SES

Được invoke bởi:
  - API Gateway (khi user request gửi report qua email)
  - EventBridge (sau khi pipeline hoàn thành, gửi summary)
  - Step Functions (notification step)

Environment variables cần thiết:
  SES_FROM_EMAIL        email đã verify trong SES (bắt buộc)
  SES_REGION            region của SES (mặc định: ap-southeast-1)
  AWS_DEFAULT_REGION    region chung
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ---------------------------------------------------------------------------
# SES helper
# ---------------------------------------------------------------------------

def _send_email(
    to_addresses: list[str],
    subject: str,
    body_text: str,
    body_html: str | None = None,
    from_email: str | None = None,
    region: str = "ap-southeast-1",
) -> dict:
    """Send an email via Amazon SES. Returns SES response dict."""
    ses = boto3.client("ses", region_name=region)
    source = from_email or os.environ["SES_FROM_EMAIL"]

    body: dict = {"Text": {"Data": body_text, "Charset": "UTF-8"}}
    if body_html:
        body["Html"] = {"Data": body_html, "Charset": "UTF-8"}

    response = ses.send_email(
        Source=source,
        Destination={"ToAddresses": to_addresses},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": body,
        },
    )
    return response


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

def _pipeline_summary_email(event: dict) -> tuple[str, str, str]:
    """Build subject + text + HTML for pipeline completion notification."""
    passed = event.get("passed", 0)
    failed = event.get("failed", 0)
    tickers = event.get("tickers", [])
    date_range = event.get("date_range", {})
    ticker_details = event.get("ticker_details", [])

    subject = f"[Financial Data Lake] Pipeline Complete — {passed} tickers updated"
    
    # Text fallback
    text = (
        f"Pipeline run completed.\n\n"
        f"Tickers requested : {len(tickers)}\n"
        f"Succeeded         : {passed}\n"
        f"Failed            : {failed}\n"
        f"Date range        : {date_range.get('start')} → {date_range.get('end')}\n\n"
    )
    for t in ticker_details:
        text += f"- {t.get('ticker')}: {t.get('status')} | {t.get('rows')} rows | {t.get('completed_at')}\n"

    # Xây dựng bảng chi tiết cho từng mã cổ phiếu
    rows_html = ""
    for idx, t in enumerate(ticker_details):
        ticker_name = t.get("ticker", "N/A")
        status = t.get("status", "FAIL")
        rows = t.get("rows", 0)
        
        # Format time to be readable
        raw_time = t.get("completed_at", "")
        time_display = raw_time.split(".")[0].replace("T", " ") if raw_time else "N/A"
        
        # Color coding
        bg_color = "#ffffff" if idx % 2 == 0 else "#f8f9fa"
        status_color = "#2ecc71" if status == "PASS" else "#e74c3c"
        status_badge = f'<span style="background-color: {status_color}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">{status}</span>'
        
        rows_html += f"""
        <tr style="background-color: {bg_color}; text-align: center; border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #34495e;">{ticker_name}</td>
            <td style="padding: 10px;">{status_badge}</td>
            <td style="padding: 10px; color: #7f8c8d;">{rows:,}</td>
            <td style="padding: 10px; font-size: 12px; color: #95a5a6;">{time_display}</td>
        </tr>
        """

    # Giao diện HTML siêu đẹp (Premium Template)
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
            <!-- Header -->
            <tr>
                <td style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center;">
                    <h2 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px;">Financial Data Lake</h2>
                    <p style="margin: 10px 0 0 0; color: #a9c2f0; font-size: 14px;">Daily Data Ingestion Report</p>
                </td>
            </tr>
            
            <!-- Summary Stats -->
            <tr>
                <td style="padding: 30px 30px 10px 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td width="33%" style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #3498db;">
                                <p style="margin: 0; font-size: 12px; color: #7f8c8d; text-transform: uppercase;">Total</p>
                                <h3 style="margin: 5px 0 0 0; color: #2c3e50; font-size: 22px;">{len(tickers)}</h3>
                            </td>
                            <td width="2%"></td>
                            <td width="31%" style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #2ecc71;">
                                <p style="margin: 0; font-size: 12px; color: #7f8c8d; text-transform: uppercase;">Success</p>
                                <h3 style="margin: 5px 0 0 0; color: #27ae60; font-size: 22px;">{passed}</h3>
                            </td>
                            <td width="2%"></td>
                            <td width="32%" style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #e74c3c;">
                                <p style="margin: 0; font-size: 12px; color: #7f8c8d; text-transform: uppercase;">Failed</p>
                                <h3 style="margin: 5px 0 0 0; color: #c0392b; font-size: 22px;">{failed}</h3>
                            </td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; color: #7f8c8d; font-size: 14px; text-align: center;">
                        Date Range: <b>{date_range.get('start')}</b> to <b>{date_range.get('end')}</b>
                    </p>
                </td>
            </tr>
            
            <!-- Detailed Table -->
            <tr>
                <td style="padding: 10px 30px 30px 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #ecf0f1; border-radius: 6px; overflow: hidden;">
                        <tr style="background-color: #ecf0f1;">
                            <th style="padding: 12px 10px; font-size: 13px; color: #34495e; text-transform: uppercase;">Ticker</th>
                            <th style="padding: 12px 10px; font-size: 13px; color: #34495e; text-transform: uppercase;">Status</th>
                            <th style="padding: 12px 10px; font-size: 13px; color: #34495e; text-transform: uppercase;">Rows</th>
                            <th style="padding: 12px 10px; font-size: 13px; color: #34495e; text-transform: uppercase;">Time (UTC)</th>
                        </tr>
                        {rows_html}
                    </table>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; font-size: 12px; color: #95a5a6;">Data is successfully saved in Athena: <code>financial_data_lake.ohlcv</code></p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #bdc3c7;">Automated by AWS EventBridge & Lambda</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return subject, text, html


def _report_email(event: dict) -> tuple[str, str, str]:
    """Build subject + text + HTML for user-requested data report."""
    ticker = event.get("ticker", "N/A")
    user_email = event.get("user_email", "")
    row_count = event.get("row_count", 0)
    download_url = event.get("download_url", "")

    subject = f"[Financial Data Lake] Report for {ticker} is ready"
    text = (
        f"Your data report for {ticker} is ready.\n\n"
        f"Rows: {row_count}\n"
        f"Download: {download_url}\n"
    )
    html = f"""
    <html><body>
    <h2>Your report for <b>{ticker}</b> is ready</h2>
    <p>Total rows: <b>{row_count}</b></p>
    {'<p><a href="' + download_url + '">Click here to download</a></p>' if download_url else ''}
    <p>Thank you for using Financial Data Lake.</p>
    </body></html>
    """
    return subject, text, html


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def handler(event: dict, context: Any) -> dict:
    """
    Lambda Email handler — routes to correct template based on event type.

    Event types:
    1. Pipeline summary (from EventBridge or Step Functions):
       {
         "email_type": "pipeline_summary",
         "to_email": "user@example.com",
         "passed": 28,
         "failed": 2,
         "tickers": [...],
         "date_range": {"start": "2024-01-01", "end": "2024-12-31"}
       }

    2. Data report ready (from API Gateway via /pipeline/trigger):
       {
         "email_type": "data_report",
         "to_email": "user@example.com",
         "ticker": "FPT",
         "row_count": 1250,
         "download_url": "https://..."
       }

    3. Generic (direct invoke / test):
       {
         "email_type": "generic",
         "to_email": "user@example.com",
         "subject": "Hello",
         "message": "Body text"
       }
    """
    logger.info("Lambda Email triggered. Event type: %s", event.get("email_type"))

    region = os.environ.get("SES_REGION") or os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1")
    to_email = event.get("to_email", "")

    if not to_email:
        logger.error("Missing 'to_email' in event")
        return {"statusCode": 400, "message": "Missing to_email"}

    email_type = event.get("email_type", "generic")

    try:
        if email_type == "pipeline_summary":
            subject, text, html = _pipeline_summary_email(event)
        elif email_type == "data_report":
            subject, text, html = _report_email(event)
        else:
            # Generic fallback
            subject = event.get("subject", "Notification from Financial Data Lake")
            text = event.get("message", "")
            html = None

        response = _send_email(
            to_addresses=[to_email],
            subject=subject,
            body_text=text,
            body_html=html,
            region=region,
        )
        message_id = response.get("MessageId", "unknown")
        logger.info("Email sent. MessageId=%s to=%s", message_id, to_email)

        return {
            "statusCode": 200,
            "message": "Email sent successfully",
            "message_id": message_id,
            "to": to_email,
        }

    except ClientError as exc:
        error_code = exc.response["Error"]["Code"]
        error_msg = exc.response["Error"]["Message"]
        logger.error("SES error %s: %s", error_code, error_msg)

        # Common SES errors with helpful messages
        if error_code == "MessageRejected":
            detail = "Email address not verified in SES sandbox mode"
        elif error_code == "MailFromDomainNotVerified":
            detail = "Sender domain not verified in SES"
        else:
            detail = error_msg

        return {
            "statusCode": 500,
            "message": f"Failed to send email: {detail}",
            "error_code": error_code,
        }
    except KeyError as exc:
        logger.error("Missing required env var: %s", exc)
        return {
            "statusCode": 500,
            "message": f"Missing environment variable: {exc}",
        }
