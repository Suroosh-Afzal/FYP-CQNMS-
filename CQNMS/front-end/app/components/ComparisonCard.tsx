"use client";

interface ComparisonCardProps {
  data: {
    active_algo: string;
    latency: number;
    throughput: number;
    prediction: number;
    traffic: number;
  };
}

export default function ComparisonCard({ data }: ComparisonCardProps) {
  // Best performer highlight logic
  const isBest = data.active_algo === "Least Loaded";

  return (
    <div className={`p-8 rounded-2xl border-2 transition-all duration-500 ${
      isBest ? 'border-black bg-white shadow-xl' : 'border-slate-100 bg-white'
    }`}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-xl font-black text-black uppercase tracking-tight">{data.active_algo}</h2>
          <div className="mt-2">
            <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${
              isBest ? 'bg-black text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {isBest ? "Top Efficiency" : "Standard Model"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-black tabular-nums">{data.latency}ms</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Latency</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Throughput Bar */}
        <div>
          <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-tighter">
            <span>Throughput Rate</span>
            <span>{data.throughput}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-black h-full transition-all duration-1000 ease-out" 
              style={{ width: `${data.throughput}%` }}
            ></div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Health Score</p>
              <p className="text-xs font-bold text-black uppercase tracking-tighter">
                {data.prediction < 0.6 ? "Stable" : "High Stress"}
              </p>
           </div>
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Flow Rate</p>
              <p className="text-xs font-bold text-black tabular-nums">
                {(data.traffic / 120).toFixed(1)} req/s
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}