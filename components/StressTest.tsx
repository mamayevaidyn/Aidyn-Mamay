import React, { useState } from 'react';
import { PortfolioState } from '../types';
import { Flame, Waves, TrendingDown, ThermometerSnowflake, Wind, Info, AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';

interface StressTestProps {
  portfolio: PortfolioState;
}

interface Scenario {
  id: string;
  name: string;
  icon: React.ReactNode;
  impact: number;
  desc: string;
  isCustom?: boolean;
  params?: {
    rates: number;
    vol: number;
    techShock: number;
  };
}

const StressTest: React.FC<StressTestProps> = ({ portfolio }) => {
  const [rates, setRates] = useState(0);
  const [vol, setVol] = useState(0);
  const [techShock, setTechShock] = useState(0);
  const [customName, setCustomName] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);

  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: '2008', name: 'Global Financial Crisis', icon: <TrendingDown className="text-red-400" />, impact: -24.5, desc: 'Housing market collapse and credit freeze.' },
    { id: '2020', name: 'Covid Liquidity Shock', icon: <Waves className="text-blue-400" />, impact: -18.2, desc: 'Sudden economic halt and rapid vol spike.' },
    { id: 'rate', name: 'Yield Curve Spike', icon: <Flame className="text-orange-400" />, impact: -9.4, desc: 'Long end yields surge +150bps.' },
    { id: 'ai', name: 'Tech Bubble Burst', icon: <ThermometerSnowflake className="text-indigo-400" />, impact: -32.1, desc: 'Multi-factor growth deleveraging.' },
  ]);

  const calculateCustomImpact = (r: number, v: number, t: number) => {
    // Sector-specific elasticities
    return portfolio.assets.reduce((total, asset) => {
      let elasticity = 1.0;
      if (asset.sector === 'Technology') elasticity = 1.5 + (t * 0.01); // Tech shock impact
      if (asset.sector === 'Financials') elasticity = 1.2;
      if (asset.sector === 'Energy') elasticity = 0.8;
      
      const assetImpact = (r * -0.015 * elasticity) + (v * -0.01 * asset.beta);
      return total + (assetImpact * asset.weight);
    }, 0) * 100;
  };

  const currentImpact = calculateCustomImpact(rates, vol, techShock);

  const handleSaveScenario = () => {
    if (!customName) return;
    const newScenario: Scenario = {
      id: `custom-${Date.now()}`,
      name: customName,
      icon: <Wind className="text-emerald-400" />,
      impact: Number(currentImpact.toFixed(2)),
      desc: `Custom: Rates +${rates}bps, Vol +${vol}%, Tech Shock ${techShock}%`,
      isCustom: true,
      params: { rates, vol, techShock }
    };
    setScenarios([...scenarios, newScenario]);
    setCustomName('');
    setShowBuilder(false);
  };

  const loadScenario = (s: Scenario) => {
    if (s.params) {
      setRates(s.params.rates);
      setVol(s.params.vol);
      setTechShock(s.params.techShock);
    }
  };

  const deleteScenario = (id: string) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  const getThesis = () => {
    if (rates > 300) return "High interest rates are compressing P/E multiples, specifically targeting Tech growth stocks where future cash flows are discounted more heavily.";
    if (vol > 100) return "Extreme volatility cluster detected. Cross-asset correlations are converging to 1.0, neutralizing diversification benefits.";
    if (techShock > 20) return "Idiosyncratic shock to the Technology sector is driving significant drawdown due to high beta exposure.";
    return "System is currently identifying specific sector vulnerabilities based on custom drift parameters.";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Scenario Analysis</h2>
          <p className="text-gray-500 mt-1">Stress test your portfolio against historical and custom shocks.</p>
        </div>
        <div className="bg-[#0b0f1a] border border-indigo-500/20 rounded-2xl px-8 py-6 shadow-2xl">
          <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1 tracking-widest">Est. Portfolio Delta</span>
          <span className={`text-3xl font-bold mono ${currentImpact < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {currentImpact.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-[#0b0f1a] p-8 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-white uppercase text-xs tracking-widest">Custom Macro Drift</h3>
              <button 
                onClick={() => setShowBuilder(!showBuilder)}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2"
              >
                {showBuilder ? 'Hide Builder' : 'Save Scenario'} <Plus size={14} />
              </button>
            </div>

            {showBuilder && (
              <div className="mb-8 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Scenario Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Taiwan Strait Crisis"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                  />
                  <button 
                    onClick={handleSaveScenario}
                    disabled={!customName}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-gray-400 font-bold">Interest Rate Shock (bps)</label>
                  <span className="mono text-indigo-400 font-bold">+{rates} bps</span>
                </div>
                <input 
                  type="range" min="0" max="1000" step="10" 
                  value={rates} onChange={(e) => setRates(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-gray-400 font-bold">Volatility Expansion (VIX %)</label>
                  <span className="mono text-indigo-400 font-bold">+{vol}%</span>
                </div>
                <input 
                  type="range" min="0" max="500" step="5" 
                  value={vol} onChange={(e) => setVol(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-gray-400 font-bold">Tech Sector Shock (%)</label>
                  <span className="mono text-indigo-400 font-bold">+{techShock}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1" 
                  value={techShock} onChange={(e) => setTechShock(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg"><Info size={20} className="text-indigo-400" /></div>
            <div>
              <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-tight">Scenario Impact</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-mono italic">
                {getThesis()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Historical & Custom Scenarios</h3>
          {scenarios.map(s => (
            <div 
              key={s.id} 
              onClick={() => loadScenario(s)}
              className="bg-[#0b0f1a] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all cursor-pointer group relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">{s.icon}</div>
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      {s.name}
                      {s.isCustom && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Custom</span>}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-500 mono">{s.impact}%</div>
                  <div className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Likely Alpha Decay</div>
                </div>
              </div>
              {s.isCustom && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteScenario(s.id); }}
                  className="absolute top-2 right-2 text-gray-600 hover:text-red-500 p-2"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StressTest;
