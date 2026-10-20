from __future__ import annotations

from typing import Any


def detail_text(response_or_payload: Any) -> str:
    """Return a normalized detail message for assertions across error payload formats."""
    payload = response_or_payload
    if hasattr(response_or_payload, "json"):
        payload = response_or_payload.json()

    if isinstance(payload, dict):
        detail = payload.get("detail", payload)
    else:
        detail = payload

    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("support_message") or detail.get("code")
        return str(message or detail)
    if isinstance(detail, list):
        return " ".join(str(item) for item in detail)
    return str(detail)
