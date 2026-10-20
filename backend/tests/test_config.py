import pytest

from backend.core.config import AppSettings, NATIVE_MOBILE_CORS_ORIGINS


@pytest.fixture
def required_settings_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    monkeypatch.setenv("PLAID_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("PLAID_SECRET", "test-secret")


def test_cors_origins_include_native_mobile_origins(required_settings_env: None, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FRONTEND_URL", "https://app.jualuma.com")
    monkeypatch.delenv("BACKEND_CORS_ORIGINS", raising=False)
    settings = AppSettings(
        _env_file=None,
    )

    assert settings.cors_origins == [
        "https://app.jualuma.com",
        *NATIVE_MOBILE_CORS_ORIGINS,
    ]


def test_cors_origins_merge_configured_and_native_origins_without_duplicates(
    required_settings_env: None,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setenv("FRONTEND_URL", "https://app.jualuma.com")
    monkeypatch.setenv(
        "BACKEND_CORS_ORIGINS",
        "https://app.jualuma.com,https://support.jualuma.com,"
        "https://localhost,capacitor://localhost",
    )
    settings = AppSettings(
        _env_file=None,
    )

    assert settings.cors_origins == [
        "https://app.jualuma.com",
        "https://support.jualuma.com",
        *NATIVE_MOBILE_CORS_ORIGINS,
    ]
