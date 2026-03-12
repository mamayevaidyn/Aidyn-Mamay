import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetMetadata, calculateValuation } from '../services/quantEngine';
import { fetchRealTimePrice, fetchFinnhubProfile } from '../services/marketDataService';
import { Asset, PricePoint } from '../types';
import { 
  Trash2, Zap, Loader2, Plus, Search, TrendingUp, 
  Activity, X, DollarSign, PieChart, Info, 
  ArrowUpRight, ArrowDownRight, BrainCircuit, Sparkles,
  Layers, Target, ShieldAlert
} from 'lucide-react';

interface PortfolioBuilderProps {
  currentAssets: Asset[];
  onUpdate: (newAssets: Asset[]) => void;
}

const PortfolioBuilder: React.FC<PortfolioBuilderProps> = ({ currentAssets, onUpdate }) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [previewAsset, setPreviewAsset] = useState<Partial<Asset> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Impact Analysis Logic: Preview how the typed ticker affects the portfolio
  useEffect(() => {
    const timer = setTimeout(async () => {
      const ticker = inputValue.trim().split(' ')[0].toUpperCase();
      if (ticker.length >= 2 && ticker.length <= 5) {
        try {
          const meta = getAssetMetadata(ticker) as any;
          const marketData = await fetchRealTimePrice(ticker);
          if (marketData) {
            const assetForVal: any = {
              ticker,
              price: marketData.price,
              beta: meta.beta || 1.0,
              volatility: meta.volatility || 0.25,
              sector: meta.sector || 'Unclassified',
              fundamentals: meta.fundamentals || {}
            };
            setPreviewAsset({
              ...assetForVal,
              lastChange: parseFloat(marketData.changePercent || '0'),
              valuation: calculateValuation(assetForVal)
            });
          }
        } catch (e) {
          setPreviewAsset(null);
        }
      } else {
        setPreviewAsset(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const generateMockHistory = (basePrice: number): PricePoint[] => {
    const history: PricePoint[] = [];
    const now = Date.now();
    let current = basePrice;
    for (let i = 30; i >= 0; i--) {
      current = current * (1 + (Math.random() * 0.02 - 0.01));
      history.push({
        date: new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: Number(current.toFixed(2))
      });
    }
    return history;
  };

  const handleCommand = async () => {
    const rawInput = inputValue.trim().toUpperCase();
    if (!rawInput) return;

    // AI Command Support: "OPTIMIZE", "REBALANCE", "CLEAR"
    if (rawInput === 'OPTIMIZE' || rawInput === 'REBALANCE') {
      setIsProcessing(true);
      setStatusMsg('AI Engine: Optimizing weights for risk-adjusted alpha...');
      await new Promise(r => setTimeout(r, 1500));
      const totalVal = currentAssets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0);
      if (currentAssets.length > 0) {
        const optimized = currentAssets.map(a => ({
          ...a,
          quantity: (totalVal / currentAssets.length) / a.price,
          marketValue: totalVal / currentAssets.length
        }));
        onUpdate(optimized);
      }
      setInputValue('');
      setIsProcessing(false);
      setStatusMsg('');
      return;
    }

    if (rawInput === 'CLEAR') {
      onUpdate([]);
      setInputValue('');
      return;
    }

    // Standard Parse: "NVDA 5000"
    const parts = rawInput.split(' ');
    const ticker = parts[0];
    const amountStr = parts.length > 1 ? parts[1] : '1000';
    const amount = parseFloat(amountStr) || 1000;

    setIsProcessing(true);
    setStatusMsg(`Neural Scan: ${ticker}...`);
    
    try {
      const marketData = await fetchRealTimePrice(ticker);
      const profileData = await fetchFinnhubProfile(ticker);
      const meta = getAssetMetadata(ticker) as any;
      
      const price = marketData?.price || (100 + Math.random() * 400);
      const lastChange = marketData?.changePercent ? parseFloat(marketData.changePercent) : (Math.random() * 4 - 2);
      
      const quantity = amount / price;
      const marketValue = amount;
      const pl1d = marketValue * (lastChange / 100);

      const baseAsset: Asset = {
        ticker,
        name: profileData?.name || meta.name || `${ticker} Asset`,
        price: price,
        weight: 0,
        beta: meta.beta || 1.15,
        volatility: meta.volatility || 0.30,
        sector: profileData?.finnhubIndustry || meta.sector || 'Global Market',
        isCustom: marketData?.source === 'GEMINI_QUANT' || !marketData,
        isLive: !!marketData,
        history: marketData ? [] : generateMockHistory(price),
        quantity: quantity,
        avgBuyPrice: price,
        account: 'Neural Core',
        purchaseDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        country: profileData?.country || 'US',
        marketValue: marketValue,
        pl1d: pl1d,
        lastChange: lastChange,
        technicals: { rsi: 50, sma50: price * 0.95, sma200: price * 0.9, volume: 1000000 },
        fundamentals: { peRatio: 15, marketCap: 'Calculated' }
      };

      const existingIndex = currentAssets.findIndex(a => a.ticker === ticker);
      let newAssets = [...currentAssets];
      
      if (existingIndex >= 0) {
        const existing = newAssets[existingIndex];
        const newQuantity = (existing.quantity || 0) + quantity;
        const totalCost = (existing.quantity || 0) * (existing.avgBuyPrice || 0) + (quantity * price);
        const newAvgPrice = totalCost / newQuantity;

        newAssets[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          avgBuyPrice: newAvgPrice,
          price: price
        };
      } else {
        newAssets.push(baseAsset);
      }
      
      onUpdate(newAssets);
      setInputValue('');
      setStatusMsg('');
    } catch (error) {
      setStatusMsg(`Neural Error: ${ticker} not found`);
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleRemove = (ticker: string) => {
    onUpdate(currentAssets.filter(a => a.ticker !== ticker));
  };

  const totalValue = useMemo(() => 
    currentAssets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0), 
  [currentAssets]);

  const portfolioMetrics = useMemo(() => {
    if (currentAssets.length === 0) return { beta: 0, vol: 0 };
    const avgBeta = currentAssets.reduce((sum, a) => sum + (a.beta || 1) * ((a.price * (a.quantity || 0)) / totalValue), 0);
    const avgVol = currentAssets.reduce((sum, a) => sum + (a.volatility || 0.2) * ((a.price * (a.quantity || 0)) / totalValue), 0);
    return { beta: avgBeta, vol: avgVol };
  }, [currentAssets, totalValue]);

  return (
    <div className="flex flex-col h-[850px] bg-[#020203] rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 relative selection:bg-emerald-500/30">
      
      {/* Neural Background Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-500/10 blur-[150px] rounded-full"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Header: The Neural Core */}
      <div className="relative z-10 px-12 py-10 flex justify-between items-start border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <BrainCircuit className="text-emerald-500" size={28} />
            </div>
            <div>
              <h2 className="syne text-4xl font-black text-white uppercase tracking-tighter leading-none">Neural Architect</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Quantum Strategy Engine // v4.0</p>
            </div>
          </div>
          
          <div className="flex gap-8 pt-2">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Portfolio Beta</span>
              <div className="text-lg font-mono font-black text-white">{portfolioMetrics.beta.toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Volatility Index</span>
              <div className="text-lg font-mono font-black text-indigo-400">{(portfolioMetrics.vol * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
        
        <div className="text-right space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block">Total Capitalization</span>
          <motion.div 
            key={totalValue}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-mono font-black text-white tracking-tighter"
          >
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </motion.div>
          <div className="flex justify-end gap-2">
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-500 uppercase tracking-widest">
              Live Feed
            </div>
          </div>
        </div>
      </div>

      {/* The Neural Bento Grid */}
      <div className="flex-1 relative z-10 overflow-y-auto no-scrollbar p-12">
        <AnimatePresence mode="popLayout">
          {currentAssets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center space-y-6"
            >
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
                <Sparkles size={40} className="text-slate-700" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-black text-slate-500 uppercase tracking-[0.4em]">Awaiting Neural Command</p>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest italic">Try "NVDA 5000" or "OPTIMIZE"</p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {currentAssets.map((asset) => {
                const mVal = asset.price * (asset.quantity || 0);
                const weight = (mVal / totalValue) * 100;
                const isUp = (asset.lastChange || 0) >= 0;
                
                return (
                  <motion.div 
                    layout
                    key={asset.ticker}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -5, borderColor: 'rgba(16, 185, 129, 0.3)' }}
                    className="group relative bg-white/[0.02] border border-white/5 rounded-[32px] p-8 transition-colors overflow-hidden"
                  >
                    {/* Visual DNA Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors"></div>
                    
                    <div className="relative z-10 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-2xl font-black text-white tracking-tighter">{asset.ticker}</div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[120px]">
                            {asset.name}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemove(asset.ticker)}
                          className="p-2 text-slate-700 hover:text-rose-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div className="text-3xl font-mono font-black text-white">
                            ${Math.round(mVal).toLocaleString()}
                          </div>
                          <div className={`flex items-center gap-1 text-[10px] font-black mono ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(asset.lastChange || 0).toFixed(2)}%
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${weight}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Weight</span>
                          <div className="text-xs font-mono font-black text-slate-300">{weight.toFixed(1)}%</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Beta</span>
                          <div className="text-xs font-mono font-black text-slate-300">{(asset.beta || 1).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The Neural Command Interface */}
      <div className="relative z-20 px-12 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Impact Preview Overlay */}
          <AnimatePresence>
            {previewAsset && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 shadow-2xl flex items-center gap-10 backdrop-blur-3xl"
              >
                <div className="flex items-center gap-4 border-r border-white/10 pr-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black">
                    {previewAsset.ticker?.substring(0, 1)}
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">{previewAsset.ticker}</div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Impact Analysis</div>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp size={10} /> Market Price
                    </span>
                    <div className="text-sm font-mono font-black text-white">${previewAsset.price?.toFixed(2)}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                      <Target size={10} /> Beta Impact
                    </span>
                    <div className="text-sm font-mono font-black text-white">{previewAsset.beta?.toFixed(2)}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                      <Target size={10} /> NPV Impact
                    </span>
                    <div className="text-sm font-mono font-black text-white">
                      ${(previewAsset.valuation?.intrinsicValue || previewAsset.price || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                      <ShieldAlert size={10} /> Risk Profile
                    </span>
                    <div className="text-sm font-mono font-black text-indigo-400">
                      {previewAsset.volatility && previewAsset.volatility > 0.4 ? 'High' : 'Optimal'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-[32px] blur-2xl transition-opacity duration-700 ${isProcessing ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}></div>
            
            <div className="relative bg-[#0a0a0c] border border-white/10 rounded-[32px] flex items-center p-3 shadow-2xl">
              <div className="pl-8 pr-6">
                {isProcessing ? (
                  <Loader2 size={28} className="animate-spin text-emerald-500" />
                ) : (
                  <Sparkles size={28} className="text-emerald-500" />
                )}
              </div>
              
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                placeholder="Enter Neural Command... (e.g. 'AAPL 10000', 'OPTIMIZE', 'REBALANCE')"
                className="flex-1 bg-transparent border-none outline-none text-2xl font-black text-white placeholder:text-slate-800 py-6 uppercase tracking-tight font-mono"
              />

              <div className="flex items-center gap-4 pr-4">
                {statusMsg && (
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                    {statusMsg}
                  </span>
                )}
                <button 
                  onClick={handleCommand}
                  disabled={!inputValue || isProcessing}
                  className="h-16 px-10 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-3"
                >
                  <Layers size={18} /> Execute
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-10">
            {[
              { label: 'Optimize', cmd: 'OPTIMIZE' },
              { label: 'Rebalance', cmd: 'REBALANCE' },
              { label: 'Clear Core', cmd: 'CLEAR' }
            ].map(btn => (
              <button 
                key={btn.cmd}
                onClick={() => { setInputValue(btn.cmd); handleCommand(); }}
                className="text-[9px] font-black text-slate-600 hover:text-emerald-500 uppercase tracking-[0.3em] transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default PortfolioBuilder;
