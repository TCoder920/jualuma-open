"""Regression coverage for webhook algorithm, body binding, and replay checks."""
import hashlib
import time

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from fastapi import HTTPException
from jose import jwk, jwt
from backend.services import plaid_webhooks as service


@pytest.fixture
def signing_key(monkeypatch):
    monkeypatch.setattr(service.settings, "plaid_webhook_secret", None)
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    public = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    public_jwk = jwk.construct(public, algorithm="ES256").to_dict()
    monkeypatch.setattr(service, "_fetch_plaid_webhook_key", lambda _: public_jwk)
    return private


def verify(key, claims, body=b"{}"):
    token = jwt.encode(claims, key, algorithm="ES256", headers={"kid": "synthetic"})
    return service.verify_plaid_webhook_signature(body, plaid_verification=token, plaid_signature=None)


def test_valid_signature_and_payload(signing_key):
    assert verify(signing_key, {"iat": int(time.time()), "request_body_sha256": hashlib.sha256(b"{}").hexdigest()})


@pytest.mark.parametrize("problem", ["missing_hash", "wrong_hash", "missing_iat", "expired", "future"])
def test_rejects_unbound_or_stale_tokens(signing_key, problem):
    claims = {"iat": int(time.time()), "request_body_sha256": hashlib.sha256(b"{}").hexdigest()}
    if problem == "missing_hash": claims.pop("request_body_sha256")
    elif problem == "wrong_hash": claims["request_body_sha256"] = "0" * 64
    elif problem == "missing_iat": claims.pop("iat")
    elif problem == "expired": claims["iat"] -= 600
    else: claims["iat"] += 600
    with pytest.raises(HTTPException) as error:
        verify(signing_key, claims)
    assert error.value.status_code == 400


def test_rejects_algorithm_confusion_before_key_fetch(monkeypatch):
    monkeypatch.setattr(service.settings, "plaid_webhook_secret", None)
    def unexpected_fetch(_):
        pytest.fail("Unsupported algorithms must not trigger external key retrieval")
    monkeypatch.setattr(service, "_fetch_plaid_webhook_key", unexpected_fetch)
    token = jwt.encode({}, "synthetic-fixture", algorithm="HS256", headers={"kid": "synthetic"})
    with pytest.raises(HTTPException) as error:
        service.verify_plaid_webhook_signature(b"{}", plaid_verification=token, plaid_signature=None)
    assert error.value.status_code == 400
