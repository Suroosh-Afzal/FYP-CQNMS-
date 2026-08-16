"use client";

interface ComparisonCardProps {
  data: {
    active_algo: string;
    latency: number;
    throughput: number;
    prediction: number;
    traffic: number;
  };
  isBest: boolean;
}

export default function ComparisonCard({ data, isBest }: ComparisonCardProps) {
  return (
    <div className={`h-full p-6 rounded-2xl border transition-all duration-500 bg-surface flex flex-col justify-between ${
      isBest ? 'border-accent shadow-md' : 'border-border'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text">{data.active_algo}</h2>
          <div className="mt-2">
            <span className={`text-[10px] font-medium px-2 py-1 rounded ${
              isBest ? 'bg-accent text-accent-foreground' : 'bg-surface-2 text-text-muted'
            }`}>
              {isBest ? "Top Efficiency" : "Standard Model"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-text tabular-nums">{data.latency}ms</p>
          <p className="text-[10px] font-medium text-text-muted">Avg Latency</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between text-[11px] font-medium mb-2 text-text-muted">
            <span>Throughput Rate</span>
            <span className="text-text">{data.throughput}%</span>
          </div>
          <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-1000 ease-out"
              style={{ width: `${data.throughput}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-border">
           <div>
              <p className="text-[10px] font-medium text-text-muted mb-1">Health Score</p>
              <p className="text-xs font-semibold text-text">
                {data.prediction < 0.6 ? "Stable" : "High Stress"}
              </p>
           </div>
           <div>
              <p className="text-[10px] font-medium text-text-muted mb-1">Flow Rate</p>
              <p className="text-xs font-semibold text-text tabular-nums">
                {(data.traffic / 120).toFixed(1)} req/s
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
