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

    subject = f"[Financial Data Lake] Pipeline Complete — {passed} tickers updated"
    text = (
        f"Pipeline run completed.\n\n"
        f"Tickers requested : {len(tickers)}\n"
        f"Succeeded         : {passed}\n"
        f"Failed            : {failed}\n"
        f"Date range        : {date_range.get('start')} → {date_range.get('end')}\n\n"
        f"Data is available in Athena: financial_data_lake.ohlcv\n"
    )
    html = f"""
    <html><body>
    <h2>Financial Data Lake — Pipeline Summary</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><td><b>Tickers requested</b></td><td>{len(tickers)}</td></tr>
      <tr><td><b>Succeeded</b></td><td style="color:green">{passed}</td></tr>
      <tr><td><b>Failed</b></td><td style="color:{'red' if failed else 'green'}">{failed}</td></tr>
      <tr><td><b>Date range</b></td><td>{date_range.get('start')} → {date_range.get('end')}</td></tr>
    </table>
    <p>Data is now available in Athena: <code>financial_data_lake.ohlcv</code></p>
    </body></html>
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
