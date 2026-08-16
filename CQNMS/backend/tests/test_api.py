import pytest
from fastapi.testclient import TestClient

from api.main import app
from database import db

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "optimized"


def test_stats_defaults():
    res = client.get("/api/stats")
    assert res.status_code == 200
    body = res.json()
    assert body["active_algo"] == "Round Robin"
    assert body["traffic"] == 1000


@pytest.mark.parametrize("algo", ["Round Robin", "SJF", "Priority", "Least Loaded"])
def test_stats_accepts_all_algorithms(algo):
    res = client.get("/api/stats", params={"algo": algo, "intensity": 1000})
    assert res.status_code == 200
    assert res.json()["active_algo"] == algo


def test_stats_rejects_unknown_algorithm():
    res = client.get("/api/stats", params={"algo": "Bogus", "intensity": 1000})
    assert res.status_code == 422


@pytest.mark.parametrize("intensity", [-1, 5001, 100000])
def test_stats_rejects_out_of_range_intensity(intensity):
    res = client.get("/api/stats", params={"algo": "Round Robin", "intensity": intensity})
    assert res.status_code == 422


def test_stats_sessions_are_isolated():
    res_a = client.get("/api/stats", params={"algo": "Round Robin", "intensity": 1000, "session_id": "test-a"})
    res_b = client.get("/api/stats", params={"algo": "Round Robin", "intensity": 1000, "session_id": "test-b"})
    assert res_a.status_code == 200
    assert res_b.status_code == 200


def test_reports_return_503_when_db_unavailable(monkeypatch):
    monkeypatch.setattr(db, "is_available", lambda: False)

    for path in (
        "/api/reports/server-load",
        "/api/reports/algorithm-comparison",
        "/api/reports/overload-incidents",
    ):
        res = client.get(path)
        assert res.status_code == 503


def test_reports_reject_non_positive_since_minutes(monkeypatch):
    monkeypatch.setattr(db, "is_available", lambda: True)
    res = client.get("/api/reports/server-load", params={"since_minutes": 0})
    assert res.status_code == 422
