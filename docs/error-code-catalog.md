# Error Code Catalog

Source of truth: `backend/core/error_codes.py`

## AI

| Code | User message |
| --- | --- |
| `AI-001` | Our AI service is currently at maximum capacity. Please try again in a few minutes. |
| `AI-002` | The AI assistant is temporarily unavailable. We are working to restore service. |
| `AI-003` | You have reached your AI usage limit for this period. |
| `AI-004` | We encountered an issue while processing your AI request. Please try again. |

## Auth

| Code | User message |
| --- | --- |
| `AUTH-001` | Unable to verify your access right now. Please sign in and try again. |
| `AUTH-002` | This email is already registered. |
| `AUTH-003` | Invalid or expired verification code. Please request a new code and try again. |
| `AUTH-004` | Multi-factor authentication is required to complete this action. |

## Files

| Code | User message |
| --- | --- |
| `FILE-001` | Unsupported file type. Upload a supported document, sheet, slide, image, or structured text file. |
| `FILE-002` | Uploaded file is too large. Maximum supported size is 20 MB. |
| `FILE-003` | The uploaded file could not be read. Please try a different file or upload again. |
| `FILE-004` | We couldn't process that image or PDF attachment. Please retry with a clearer or supported file. |

## Requests and System

| Code | User message |
| --- | --- |
| `REQ-001` | We could not process that request. Please review your input and try again. |
| `REQ-002` | Too many requests right now. Please wait a moment and try again. |
| `SYS-001` | Something went wrong on our side. Please try again. |

## Implementation Notes

- Backend responses return `code`, `message`, and `detail.code/detail.message`.
- Axios and fetch clients append codes into the user-facing message when present.
- AI streaming errors return `code` in SSE error events.
- Chat completion payloads expose `error_code` for downstream UI handling.
