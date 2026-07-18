import random
import time

class CQNMSEngine:
    def __init__(self):
        # Initializing servers with live state
        self.servers = [{"id": i, "name": f"SRV-{i}", "load": 0, "status": "Healthy"} for i in range(1, 5)]
        self.logs = []
        self.history = [] # For Trend Analysis (Innovation Feature)

    def get_stats(self, algo: str, intensity: int):
        # 1. LIVE PREDICTION LOGIC (Innovation: Proactive Management)
        # Trend-aware: rising traffic pushes the score above the plain average,
        # falling traffic pulls it below - not just a flat mean of recent samples.
        self.history.append(intensity)
        if len(self.history) > 10: self.history.pop(0)
        prediction_score = self._predict_stress()

        # 2. ALGO-SPECIFIC LIVE METRICS
        latency = self._calc_live_latency(algo, intensity)
        throughput = self._calc_live_throughput(intensity, latency)

        # 3. LIVE SERVER LOAD DISTRIBUTION
        self._update_server_loads(intensity, algo)

        # 4. DYNAMIC LOGGING
        self._add_log(algo, f"Routed via {algo}. AI Predictor: {int(prediction_score * 100)}% Stress Trend.")

        return {
            "active_algo": algo,
            "traffic": intensity,
            "latency": latency,
            "throughput": throughput,
            "prediction": prediction_score,
            "servers": self.servers,
            "logs": self.logs[::-1],
            "system_health": "Optimal" if prediction_score < 0.7 else "Degraded"
        }

    def _predict_stress(self):
        n = len(self.history)
        avg = sum(self.history) / n
        mid = n // 2
        # Not enough samples yet to gauge a trend - fall back to the plain average
        if mid == 0:
            return round(max(0.0, min(1.0, avg / 5000)), 2)
        older_avg = sum(self.history[:mid]) / mid
        recent_avg = sum(self.history[mid:]) / (n - mid)
        trend = recent_avg - older_avg  # positive = traffic accelerating
        score = (avg + trend) / 5000
        return round(max(0.0, min(1.0, score)), 2)

    def _calc_live_latency(self, algo, intensity):
        base = {"SJF": 8, "Least Loaded": 12, "Round Robin": 20, "Priority": 18}.get(algo, 25)
        return round(base + (intensity / 140) + random.uniform(0.1, 0.9), 2)

    def _calc_live_throughput(self, intensity, latency):
        return max(65, min(100, int(100 - (intensity / 380) - (latency / 4))))

    def _update_server_loads(self, intensity, algo):
        base = intensity / 50

        if algo == "Round Robin":
            # Traffic is spread evenly across every server - low variance
            for s in self.servers:
                variation = random.randint(-3, 3)
                s["load"] = min(100, max(5, int(base + variation)))

        elif algo == "Least Loaded":
            # New traffic is routed toward whichever server is currently least
            # loaded, so load self-corrects toward the average over time.
            for s in self.servers:
                target = base + random.randint(-2, 2)
                s["load"] = min(100, max(5, int(s["load"] + (target - s["load"]) * 0.5)))

        elif algo == "Priority":
            # SRV-1 is reserved as a high-priority node and kept under-loaded;
            # the remaining servers absorb the rest of the traffic.
            for i, s in enumerate(self.servers):
                weight = 0.5 if i == 0 else 1.17
                variation = random.randint(-3, 4)
                s["load"] = min(100, max(5, int(base * weight + variation)))

        else:  # SJF - shortest jobs race to the fastest server, piling extra load there
            for i, s in enumerate(self.servers):
                weight = 1.6 if i == 0 else 0.8
                variation = random.randint(-3, 5)
                s["load"] = min(100, max(5, int(base * weight + variation)))

        for s in self.servers:
            s["status"] = "Overloaded" if s["load"] > 85 else "Healthy"

    def _add_log(self, algo, msg):
        self.logs.append({"timestamp": time.strftime('%H:%M:%S'), "algo": algo, "message": msg})
        if len(self.logs) > 15: self.logs.pop(0)


class SessionManager:
    """Keeps a separate CQNMSEngine per browser tab/session so concurrent
    clients viewing different algorithms/intensities don't stomp on each
    other's trend history and logs."""

    def __init__(self):
        self._engines: dict[str, CQNMSEngine] = {}

    def get(self, session_id: str) -> CQNMSEngine:
        if session_id not in self._engines:
            self._engines[session_id] = CQNMSEngine()
        return self._engines[session_id]


session_manager = SessionManager()