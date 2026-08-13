# Compatibility shim — re-exports settings from the canonical location.
# main.py imports `from src.api.config import settings`; this file satisfies that import.
from src.settings import get_settings, Settings  # noqa: F401

settings = get_settings()
