from core.engine import CQNMSEngine, SessionManager


def test_get_stats_shape():
    engine = CQNMSEngine()
    stats = engine.get_stats("Round Robin", 1000)

    assert stats["active_algo"] == "Round Robin"
    assert stats["traffic"] == 1000
    assert isinstance(stats["latency"], float)
    assert isinstance(stats["throughput"], int)
    assert 0.0 <= stats["prediction"] <= 1.0
    assert stats["system_health"] in ("Optimal", "Degraded")
    assert len(stats["servers"]) == 4
    for server in stats["servers"]:
        assert set(server.keys()) == {"id", "name", "load", "status"}
        assert 0 <= server["load"] <= 100
        assert server["status"] in ("Healthy", "Overloaded")


def test_round_robin_spreads_load_evenly():
    engine = CQNMSEngine()
    for _ in range(10):
        stats = engine.get_stats("Round Robin", 2000)
    loads = [s["load"] for s in stats["servers"]]
    assert max(loads) - min(loads) <= 15  # low variance, not concentrated on one server


def test_sjf_concentrates_load_on_first_server():
    engine = CQNMSEngine()
    srv1_loads, other_loads = [], []
    for _ in range(20):
        stats = engine.get_stats("SJF", 3000)
        srv1_loads.append(stats["servers"][0]["load"])
        other_loads.extend(s["load"] for s in stats["servers"][1:])

    avg_srv1 = sum(srv1_loads) / len(srv1_loads)
    avg_others = sum(other_loads) / len(other_loads)
    assert avg_srv1 > avg_others


def test_priority_keeps_first_server_underloaded():
    engine = CQNMSEngine()
    srv1_loads, other_loads = [], []
    for _ in range(20):
        stats = engine.get_stats("Priority", 3000)
        srv1_loads.append(stats["servers"][0]["load"])
        other_loads.extend(s["load"] for s in stats["servers"][1:])

    avg_srv1 = sum(srv1_loads) / len(srv1_loads)
    avg_others = sum(other_loads) / len(other_loads)
    assert avg_srv1 < avg_others


def test_prediction_score_stays_in_bounds_across_intensity_range():
    engine = CQNMSEngine()
    for intensity in (0, 1, 500, 2500, 5000):
        stats = engine.get_stats("Least Loaded", intensity)
        assert 0.0 <= stats["prediction"] <= 1.0


def test_overload_status_matches_threshold():
    engine = CQNMSEngine()
    stats = engine.get_stats("SJF", 5000)
    for server in stats["servers"]:
        expected = "Overloaded" if server["load"] > 85 else "Healthy"
        assert server["status"] == expected


def test_logs_capped_at_15():
    engine = CQNMSEngine()
    for _ in range(25):
        engine.get_stats("Round Robin", 1000)
    assert len(engine.logs) <= 15


def test_history_capped_at_10():
    engine = CQNMSEngine()
    for _ in range(20):
        engine.get_stats("Round Robin", 1000)
    assert len(engine.history) <= 10


def test_session_manager_returns_same_engine_for_same_session():
    manager = SessionManager()
    a1 = manager.get("session-a")
    a2 = manager.get("session-a")
    assert a1 is a2


def test_session_manager_isolates_sessions():
    manager = SessionManager()
    engine_a = manager.get("session-a")
    engine_b = manager.get("session-b")
    assert engine_a is not engine_b

    engine_a.get_stats("Round Robin", 1000)
    assert engine_a.history == [1000]
    assert engine_b.history == []  # untouched by session-a's traffic
