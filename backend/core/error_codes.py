from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ErrorDefinition:
    code: str
    user_message: str
    support_message: str


ERROR_DEFINITIONS: dict[str, ErrorDefinition] = {
    "AI-001": ErrorDefinition(
        code="AI-001",
        user_message="Our AI service is currently at maximum capacity. Please try again in a few minutes.",
        support_message="AI provider quota or rate-limit capacity was exhausted.",
    ),
    "AI-002": ErrorDefinition(
        code="AI-002",
        user_message="The AI assistant is temporarily unavailable. We are working to restore service.",
        support_message="AI provider or model endpoint was unavailable.",
    ),
    "AI-003": ErrorDefinition(
        code="AI-003",
        user_message="You have reached your AI usage limit for this period.",
        support_message="AI quota was exhausted for the current billing-cycle window.",
    ),
    "AI-004": ErrorDefinition(
        code="AI-004",
        user_message="We encountered an issue while processing your AI request. Please try again.",
        support_message="AI generation failed during prompt assembly, model invocation, or stream completion.",
    ),
    "AUTH-001": ErrorDefinition(
        code="AUTH-001",
        user_message="Unable to verify your access right now. Please sign in and try again.",
        support_message="Authentication token was missing, invalid, or expired.",
    ),
    "AUTH-002": ErrorDefinition(
        code="AUTH-002",
        user_message="This email is already registered.",
        support_message="Signup request used an email that already exists.",
    ),
    "AUTH-003": ErrorDefinition(
        code="AUTH-003",
        user_message="Invalid or expired verification code. Please request a new code and try again.",
        support_message="OTP, email verification code, or MFA code was invalid or expired.",
    ),
    "AUTH-004": ErrorDefinition(
        code="AUTH-004",
        user_message="Multi-factor authentication is required to complete this action.",
        support_message="Protected action requires a valid MFA or passkey challenge.",
    ),
    "FILE-001": ErrorDefinition(
        code="FILE-001",
        user_message="Unsupported file type. Upload a supported document, sheet, slide, image, or structured text file.",
        support_message="Rejected file extension or content type is outside the upload allowlist.",
    ),
    "FILE-002": ErrorDefinition(
        code="FILE-002",
        user_message="Uploaded file is too large. Maximum supported size is 20 MB.",
        support_message="Upload exceeded the configured file-size limit.",
    ),
    "FILE-003": ErrorDefinition(
        code="FILE-003",
        user_message="The uploaded file could not be read. Please try a different file or upload again.",
        support_message="Upload was empty, missing, unreadable, or failed server-side parsing.",
    ),
    "FILE-004": ErrorDefinition(
        code="FILE-004",
        user_message="We couldn't process that image or PDF attachment. Please retry with a clearer or supported file.",
        support_message="Multimodal attachment decode, conversion, or model ingestion failed.",
    ),
    "REQ-001": ErrorDefinition(
        code="REQ-001",
        user_message="We could not process that request. Please review your input and try again.",
        support_message="The request payload was invalid or missing required fields.",
    ),
    "REQ-002": ErrorDefinition(
        code="REQ-002",
        user_message="Too many requests right now. Please wait a moment and try again.",
        support_message="The request hit a request-rate limiter.",
    ),
    "SYS-001": ErrorDefinition(
        code="SYS-001",
        user_message="Something went wrong on our side. Please try again.",
        support_message="Unexpected internal server error.",
    ),
}

_ERROR_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"maximum capacity|provider quota exhausted|quota or rate-limit capacity", re.I), "AI-001"),
    (re.compile(r"temporarily unavailable|working to restore service|model endpoint was unavailable", re.I), "AI-002"),
    (re.compile(r"quota exceeded|reached your ai usage limit|ai usage limit", re.I), "AI-003"),
    (re.compile(r"ai request|ai response|processing your ai request|streaming your ai response", re.I), "AI-004"),
    (re.compile(r"email already|already registered|already exists", re.I), "AUTH-002"),
    (re.compile(r"mfa_required|mfa_passkey_required|multi-factor authentication", re.I), "AUTH-004"),
    (re.compile(r"verification code|invalid mfa code|invalid or expired code|expired code", re.I), "AUTH-003"),
    (re.compile(r"unsupported file|supported file format|supported document|supported image", re.I), "FILE-001"),
    (re.compile(r"too large|max(imum)? supported size", re.I), "FILE-002"),
    (re.compile(r"file is empty|file appears to be missing|document not found|file not found|could not be read", re.I), "FILE-003"),
    (re.compile(r"heic|image|pdf attachment|multimodal", re.I), "FILE-004"),
]


def resolve_error_code(*, status_code: int, message: str | None = None) -> str:
    normalized_message = (message or "").strip()

    for pattern, code in _ERROR_PATTERNS:
        if normalized_message and pattern.search(normalized_message):
            return code

    if status_code == 401:
        return "AUTH-001"
    if status_code == 403 and re.search(r"mfa_required|mfa_passkey_required", normalized_message, re.I):
        return "AUTH-004"
    if status_code == 403:
        return "AUTH-001"
    if status_code == 413:
        return "FILE-002"
    if status_code == 415:
        return "FILE-001"
    if status_code == 422:
        return "REQ-001"
    if status_code == 429:
        return "REQ-002"

    if status_code >= 500:
        return "SYS-001"
    return "REQ-001"


def resolve_error_definition(*, status_code: int, message: str | None = None) -> ErrorDefinition:
    code = resolve_error_code(status_code=status_code, message=message)
    return ERROR_DEFINITIONS[code]


def build_error_payload(
    *,
    status_code: int,
    message: str | None = None,
    code: str | None = None,
    detail: Any | None = None,
) -> dict[str, Any]:
    resolved = ERROR_DEFINITIONS[code] if code else resolve_error_definition(
        status_code=status_code,
        message=message,
    )
    final_message = (message or "").strip() or resolved.user_message
    payload: dict[str, Any] = {
        "code": resolved.code,
        "message": final_message,
        "detail": {
            "code": resolved.code,
            "message": final_message,
            "support_message": resolved.support_message,
        },
    }
    if detail is not None:
        payload["detail"]["meta"] = detail
    return payload
