"""Test fixtures.

Tests hit the configured DATABASE_URL with unique per-run emails — they don't
clean up after themselves, which is fine at hackathon scope. To run an isolated
test DB, point DATABASE_URL / DATABASE_URL_SYNC at a throwaway schema and run
`alembic upgrade head` against it first.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def unique_email() -> str:
    """Per-test unique email so reruns don't collide on the users.email unique index."""
    return f"test-{uuid.uuid4().hex[:12]}@skillshub.test"
