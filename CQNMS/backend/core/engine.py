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
        # World standard features use trends, not just current load
        self.history.append(intensity)
        if len(self.history) > 10: self.history.pop(0)
        prediction_score = round(sum(self.history) / (len(self.history) * 5000), 2)
        
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

    def _calc_live_latency(self, algo, intensity):
        base = {"SJF": 8, "Least Loaded": 12, "Round Robin": 20, "Priority": 18}.get(algo, 25)
        return round(base + (intensity / 140) + random.uniform(0.1, 0.9), 2)

    def _calc_live_throughput(self, intensity, latency):
        return max(65, min(100, int(100 - (intensity / 380) - (latency / 4))))

    def _update_server_loads(self, intensity, algo):
        for s in self.servers:
            # Logic: Intensity translates to physical load percentage
            variation = random.randint(-4, 6)
            s["load"] = min(100, max(5, int((intensity / 50) + variation)))
            s["status"] = "Overloaded" if s["load"] > 85 else "Healthy"

    def _add_log(self, algo, msg):
        self.logs.append({"timestamp": time.strftime('%H:%M:%S'), "algo": algo, "message": msg})
        if len(self.logs) > 15: self.logs.pop(0)

# Global Instance
engine = CQNMSEngine()