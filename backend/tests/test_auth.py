"""Minimal coverage of the auth flows. Hits the real DB via DATABASE_URL.

Run from backend/:
    pytest tests/test_auth.py -v
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import settings

GOOD_PASSWORD = "Hunter2pass"  # letter + digit, ≥ 8 chars


# ── Employee signup ────────────────────────────────────────────────────────────


def test_employee_signup_success(client: TestClient, unique_email: str) -> None:
    res = client.post(
        "/auth/register/employee",
        json={
            "name": "Test Employee",
            "email": unique_email,
            "password": GOOD_PASSWORD,
            "confirm_password": GOOD_PASSWORD,
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == unique_email.lower()
    assert body["user"]["role"] == "USER"
    assert body["employee_id"] is not None
    assert body["next_action"] == "upload_resume"


def test_password_missing_digit_returns_422(client: TestClient, unique_email: str) -> None:
    res = client.post(
        "/auth/register/employee",
        json={
            "name": "Test Employee",
            "email": unique_email,
            "password": "lettersonly",
            "confirm_password": "lettersonly",
        },
    )
    assert res.status_code == 422
    assert any("number" in str(e).lower() for e in res.json().get("details", []))


def test_confirm_password_mismatch_returns_422(
    client: TestClient, unique_email: str
) -> None:
    res = client.post(
        "/auth/register/employee",
        json={
            "name": "Test Employee",
            "email": unique_email,
            "password": GOOD_PASSWORD,
            "confirm_password": GOOD_PASSWORD + "x",
        },
    )
    assert res.status_code == 422
    assert any("match" in str(e).lower() for e in res.json().get("details", []))


def test_duplicate_email_returns_409(client: TestClient, unique_email: str) -> None:
    payload = {
        "name": "Test Employee",
        "email": unique_email,
        "password": GOOD_PASSWORD,
        "confirm_password": GOOD_PASSWORD,
    }
    first = client.post("/auth/register/employee", json=payload)
    assert first.status_code == 201, first.text

    second = client.post("/auth/register/employee", json=payload)
    assert second.status_code == 409
    assert "already exists" in second.json()["message"].lower()


# ── HR signup ──────────────────────────────────────────────────────────────────


def test_hr_signup_success(client: TestClient, unique_email: str) -> None:
    res = client.post(
        "/auth/register/hr",
        json={
            "name": "Test HR",
            "email": unique_email,
            "password": GOOD_PASSWORD,
            "confirm_password": GOOD_PASSWORD,
            "invite_code": settings.HR_INVITE_CODE,
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["user"]["role"] == "ADMIN"
    assert body["employee_id"] is None
    assert body["next_action"] == "search"


def test_hr_signup_wrong_invite_returns_403(
    client: TestClient, unique_email: str
) -> None:
    res = client.post(
        "/auth/register/hr",
        json={
            "name": "Test HR",
            "email": unique_email,
            "password": GOOD_PASSWORD,
            "confirm_password": GOOD_PASSWORD,
            "invite_code": "definitely-wrong-code",
        },
    )
    assert res.status_code == 403
    assert "invalid invite code" in res.json()["message"].lower()


# ── Login + /me ────────────────────────────────────────────────────────────────


def test_login_success_after_signup(client: TestClient, unique_email: str) -> None:
    signup = client.post(
        "/auth/register/employee",
        json={
            "name": "Login Tester",
            "email": unique_email,
            "password": GOOD_PASSWORD,
            "confirm_password": GOOD_PASSWORD,
        },
    )
    assert signup.status_code == 201

    res = client.post(
        "/auth/login",
        json={"email": unique_email.upper(), "password": GOOD_PASSWORD},  # case-insensitive
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["access_token"]
    assert body["user"]["role"] == "USER"
    assert body["employee_id"] is not None


def test_login_wrong_password_returns_401(
    client: TestClient, unique_email: str
) -> None:
    client.post(
        "/auth/register/employee",
        json={
            "name": "Login Tester",
            "email": unique_email,
            "password": GOOD_PASSWORD,
            "confirm_password": GOOD_PASSWORD,
        },
    )
    res = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "WrongPass1"},
    )
    assert res.status_code == 401
    msg = res.json()["message"].lower()
    assert "invalid email or password" in msg


def test_me_returns_current_user(client: TestClient, unique_email: str) -> None:
    signup = client.post(
        "/auth/register/employee",
        json={
            "name": "Me Tester",
            "email": unique_email,
            "password": GOOD_PASSWORD,
            "confirm_password": GOOD_PASSWORD,
        },
    )
    token = signup.json()["access_token"]

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["user"]["email"] == unique_email.lower()
    assert body["employee_id"] is not None
