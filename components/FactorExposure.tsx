import React, { useState, useEffect, useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { PortfolioState } from '../types';
import { TrendingUp, Star, Zap, Shield, Activity } from 'lucide-react';

interface FactorExposureProps {
  portfolio: PortfolioState;
}

const BENCHMARK: Record<string, number> = {
  Growth: 55,
  Value: 45,
  Momentum: 50,
  Quality: 60,
  Volatility: 40
};

const FACTOR_META: Record<string, { desc: string, icon: React.ReactNode }> = {
  Growth: { desc: 'Duration-sensitive tech exposure. High rates hurt this factor.', icon: <TrendingUp size={14} /> },
  Value: { desc: 'Earnings yield vs price. Low PE assets score high here.', icon: <Star size={14} /> },
  Momentum: { desc: 'RSI-based trend strength. Captures price persistence.', icon: <Zap size={14} /> },
  Quality: { desc: 'Low-volatility consistency proxy. Defensive characteristic.', icon: <Shield size={14} /> },
  Volatility: { desc: 'Idiosyncratic risk loading. High = larger drawdown risk.', icon: <Activity size={14} /> },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const name = payload[0]?.payload?.name;
  const port = payload[0]?.value;
  const bench = payload[1]?.value;
  return (
    <div className="bg-[#0a0d12] border border-white/10 rounded-2xl p-4 shadow-2xl">
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{name}</p>
      <div className="flex gap-4">
        <div><p className="text-[10px] text-indigo-400 font-bold">PORTFOLIO</p><p className="text-lg font-black text-white mono">{port}</p></div>
        <div><p className="text-[10px] text-slate-500 font-bold">S&P 500</p><p className="text-lg font-black text-slate-400 mono">{bench}</p></div>
      </div>
    </div>
  );
};

const FactorExposure: React.FC<FactorExposureProps> = ({ portfolio }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const radarData = useMemo(() => {
    return portfolio.factors.map(f => ({
      ...f,
      benchmark: BENCHMARK[f.name] ?? 50
    }));
  }, [portfolio.factors]);

  const getBarColor = (value: number) => {
    if (value >= 70) return 'from-violet-500 to-indigo-400';
    if (value >= 40) return 'from-blue-600 to-blue-400';
    return 'from-slate-700 to-slate-600';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-gray-900/50 border border-white/5 p-8 rounded-[32px] shadow-2xl">
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Multi-Factor Fingerprint</h3>
        <div className="h-[400px] min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: '900' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name="Portfolio"
                dataKey="value"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.3}
                strokeWidth={3}
              />
              <Radar 
                name="S&P 500" 
                dataKey="benchmark" 
                stroke="#475569" 
                fill="transparent" 
                strokeDasharray="4 4" 
                strokeWidth={1.5} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Factor Attribution</h3>
        <div className="space-y-4">
          {portfolio.factors.map(f => {
            const delta = f.value - (BENCHMARK[f.name] || 50);
            const meta = FACTOR_META[f.name] || { desc: 'Standard systemic risk exposure.', icon: <Activity size={14} /> };
            
            return (
              <div key={f.name} className="bg-[#0b0f1a] p-6 rounded-[24px] border border-white/5 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-slate-400">
                      {meta.icon}
                    </div>
                    <div>
                      <span className="text-xs font-black text-white uppercase tracking-widest">{f.name} Factor</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black mono px-2 py-0.5 rounded-full ${
                          delta > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(0)} vs SPX
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-lg font-black text-white mono">
                    {f.value.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${getBarColor(f.value)} transition-all duration-1000 ease-out`} 
                    style={{ width: mounted ? `${f.value}%` : '0%' }} 
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-medium">
                  {meta.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FactorExposure;
