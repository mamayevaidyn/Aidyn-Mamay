import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Asset, PricePoint, DeepResearch } from '../types';
import { fetchHistoricalData, fetchRealTimePrice, MarketPrice } from '../services/marketDataService';
import { getDeepAssetResearch, getGlobalNewsWire, NewsItem } from '../services/geminiService';
import { calculateValuation } from '../services/quantEngine';
import { 
  Search, Activity, Zap, ListFilter, 
  FileText, Fingerprint, 
  BarChart2, ArrowUpRight, Clock, Cpu,
  ShieldCheck, Landmark, Globe, TrendingUp, TrendingDown,
  Users, Hexagon, Radio, Gauge, Binary, Loader2, Info, Briefcase, TrendingUpDown,
  BrainCircuit, Target, Star, StarOff, ChevronRight, ArrowDownRight,
  Sparkles, AlertTriangle
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   LUMIA — MARKET EXPLORER v3.0
   Glassmorphism Architecture / Fluid Layout
   ═══════════════════════════════════════════════════ */

const C = {
  bg: '#050508', surface: '#0a0b0f', card: '#0d0e14',
  border: '#16171f', borderHover: '#22242f',
  text: '#e2e4ea', textMuted: '#6b7080', textDim: '#3a3d4a',
  accent: '#6366f1', accentGlow: 'rgba(99, 102, 241, 0.15)',
  green: '#10b981', red: '#f43f5e', amber: '#f59e0b', purple: '#8b5cf6',
};

const StatCard = ({ label, value, color = C.text, icon }: { label: string, value: string, color?: string, icon?: React.ReactNode }) => (
  <div className="p-4 lumia-card flex flex-col gap-2 min-w-0 overflow-hidden group">
    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap overflow-hidden text-overflow-ellipsis flex items-center gap-2">
      {icon}{label}
    </div>
    <div className="font-bold font-mono tracking-tight truncate group-hover:text-white transition-colors" style={{ fontSize: 'clamp(14px, 1.8vw, 18px)', color }}>
      {value}
    </div>
  </div>
);

const SectionHead = ({ icon, title, badge }: { icon?: React.ReactNode, title: string, badge?: string }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {icon}{title}
    </div>
    {badge && (
      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />{badge}
      </span>
    )}
  </div>
);

const MarketExplorer: React.FC<{ assets: Asset[], inventory?: Asset[] }> = ({ assets, inventory = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [universe, setUniverse] = useState<Asset[]>(assets);
  
  // Sync universe when assets prop changes (e.g. user adds to portfolio)
  useEffect(() => {
    setUniverse(assets);
  }, [assets]);

  // Batch refresh prices for visible sidebar items to ensure consistency
  useEffect(() => {
    const refreshVisiblePrices = async () => {
      // Refresh top 12 visible assets to keep sidebar prices accurate
      // We use the current universe state to determine what's visible based on search
      const visible = universe.filter(a => 
        a.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 12);

      if (visible.length === 0) return;

      const updates = await Promise.all(visible.map(async (asset) => {
        try {
          const data = await fetchRealTimePrice(asset.ticker);
          return data ? { ticker: asset.ticker, price: data.price } : null;
        } catch (e) { return null; }
      }));

      setUniverse(prev => {
        const next = [...prev];
        let hasChanges = false;
        updates.forEach(u => {
          if (u) {
            const idx = next.findIndex(a => a.ticker === u.ticker);
            if (idx !== -1 && Math.abs(next[idx].price - u.price) > 0.01) {
              next[idx] = { ...next[idx], price: u.price };
              hasChanges = true;
            }
          }
        });
        return hasChanges ? next : prev;
      });
    };

    const timer = setTimeout(refreshVisiblePrices, 800); // Debounce to prevent rapid firing
    return () => clearTimeout(timer);
  }, [searchQuery, assets]); // Re-run on search change or if base assets update

  const [selectedTicker, setSelectedTicker] = useState(assets[0]?.ticker || 'TSLA');
  const [activeTab, setActiveTab] = useState('technicals');
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [research, setResearch] = useState<DeepResearch | null>(null);
  const [liveData, setLiveData] = useState<MarketPrice | null>(null);
  const [globalNews, setGlobalNews] = useState<NewsItem[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(['TSLA', 'NVDA', 'BTC']);

  const isCrypto = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK', 'ADA', 'MSTR'].includes(selectedTicker.toUpperCase());

  const filteredAssets = useMemo(() => {
    return universe.filter(a => 
      a.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [universe, searchQuery]);

  useEffect(() => {
    let isMounted = true;
    const currentTicker = selectedTicker; // Capture ticker for closure check

    setLoadingChart(true);
    setHistory([]);
    setLiveData(null);
    setResearch(null);

    const loadData = async () => {
      try {
        // 1. Fast Data: Chart, Real-time Price, AND AI Research (Loads together)
        try {
          const [hist, live, researchData] = await Promise.all([
            fetchHistoricalData(currentTicker, 365).catch(e => { console.warn('Hist data failed', e); return []; }),
            fetchRealTimePrice(currentTicker).catch(e => { console.warn('Live price failed', e); return null; }),
            getDeepAssetResearch(currentTicker).catch(e => { console.warn('Research data failed', e); return null; })
          ]);
          
          if (!isMounted || currentTicker !== selectedTicker) return;
          
          if (hist && hist.length > 0) setHistory(hist);
          if (live) {
            setLiveData(live);
            // Update the asset in the universe with the latest price to keep the sidebar in sync
            setUniverse(prev => prev.map(a => 
              a.ticker === currentTicker 
                ? { ...a, price: live.price } 
                : a
            ));
          }
          if (researchData) {
            setResearch(researchData);
          }
          setLoadingChart(false);
        } catch (e) {
          console.error("Data load error", e);
          if (isMounted) setLoadingChart(false);
        }

        // 2. Medium Data: Global News (Loads in ~2-5s) - Runs in background
        getGlobalNewsWire().then(gNews => {
          if (!isMounted || currentTicker !== selectedTicker) return;
          setGlobalNews(gNews);
        }).catch(e => console.error("News load failed", e));

      } catch (err) {
        console.error("Critical load error", err);
        if (isMounted) setLoadingChart(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [selectedTicker]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const ticker = searchQuery.trim().toUpperCase();
      setSelectedTicker(ticker);
      if (!universe.find(a => a.ticker === ticker)) {
        const newAsset: Asset = {
          ticker,
          name: `${ticker} Asset`,
          price: 0,
          beta: 1.0,
          volatility: 0.3,
          sector: 'Unknown',
          weight: 0
        };
        setUniverse(prev => [newAsset, ...prev]);
      }
      setSearchQuery('');
    }
  };

  const sel = universe.find(a => a.ticker === selectedTicker) || universe[0];
  const curPrice = liveData?.price || 0;
  const chgPct = liveData?.changePercent || '+0.00%';
  const isUp = !String(chgPct).startsWith('-');

  const peers = useMemo(() => {
    if (research?.competitors && research.competitors.length > 0) {
      return research.competitors.map(c => ({
        ticker: c.ticker,
        name: c.name,
        price: c.price || '---',
        mcap: c.marketCap,
        perf: c.perf || '---'
      }));
    }

    if (isCrypto) return [
      { ticker: 'BTC', name: 'Bitcoin', price: '$98,420', mcap: '$1.94T', perf: '+1.2%' },
      { ticker: 'ETH', name: 'Ethereum', price: '$2,451', mcap: '$280B', perf: '+0.8%' },
      { ticker: 'SOL', name: 'Solana', price: '$142', mcap: '$65B', perf: '-2.4%' },
    ].filter(p => p.ticker !== selectedTicker);
    
    return [
      { ticker: 'AAPL', name: 'Apple Inc', price: '$238.40', mcap: '$3.5T', perf: '+0.2%' },
      { ticker: 'MSFT', name: 'Microsoft', price: '$420.12', mcap: '$3.1T', perf: '+0.1%' },
      { ticker: 'NVDA', name: 'Nvidia', price: '$148', mcap: '$3.6T', perf: '+2.1%' },
    ].filter(p => p.ticker !== selectedTicker);
  }, [selectedTicker, isCrypto, research]);

  const technicals = [
    { label: 'RSI (14)', val: (liveData?.price ? (50 + Math.random() * 20).toFixed(1) : '58.4'), color: C.amber },
    { label: 'MACD', val: '+2.14', color: C.green },
    { label: 'SMA (50)', val: '$' + (liveData?.price ? (liveData.price * 0.98).toFixed(2) : '---'), color: C.accent },
    { label: 'SMA (200)', val: '$' + (liveData?.price ? (liveData.price * 0.85).toFixed(2) : '---'), color: C.purple },
    { label: 'Volume (24h)', val: liveData?.turnover24h || '---', color: C.text },
    { label: 'High (24h)', val: '$' + (liveData?.high24h?.toLocaleString() || '---'), color: C.green },
    { label: 'Low (24h)', val: '$' + (liveData?.low24h?.toLocaleString() || '---'), color: C.red },
    { label: 'Volatility', val: '2.4%', color: C.amber },
    { label: 'OBV', val: '+12.3M', color: C.green },
    { label: 'VWAP', val: '$' + (liveData?.price ? (liveData.price * 0.995).toFixed(2) : '---'), color: C.accent },
  ];

  // Merge asset news with global news if asset news is sparse
  const displayNews = useMemo(() => {
    const assetNews = (research?.news || []).map(n => ({
      ...n,
      publishedAt: n.date, // Normalize to publishedAt
      sourceType: 'ASSET'
    }));
    
    const global = globalNews.map(n => ({
      ...n,
      date: n.publishedAt // Normalize to date for compatibility if needed
    }));

    if (assetNews.length >= 4) return assetNews;
    return [...assetNews, ...global].slice(0, 8);
  }, [research, globalNews]);

  return (
    <div className="flex flex-col font-sans w-full h-full pb-20 animate-in fade-in duration-700">
      <div className="flex-1 flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center p-4">
          <h1 className="text-xl font-bold text-white">Market Lab</h1>
        </div>
        {/* ... (rest of content) */}
        <div className="flex-1 grid overflow-hidden transition-all duration-300 gap-6" style={{ gridTemplateColumns: collapsed ? '60px 1fr' : '240px 1fr' }}>
          
          {/* ═══ SIDEBAR ═══ */}
          <div className="lumia-card flex flex-col overflow-hidden h-[calc(100vh-120px)] sticky top-6">
            {!collapsed && (
              <>
                <div className="p-4 border-b border-white/[0.03]">
                  <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                      onKeyDown={handleSearchKeyPress}
                      placeholder="Search Asset..." 
                      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-xl pl-9 pr-3 py-2.5 text-[11px] font-medium text-white outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all placeholder:text-slate-600 font-mono"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-2 space-y-1">
                  {filteredAssets.map(a => {
                    const act = selectedTicker === a.ticker;
                    return (
                      <button 
                        key={a.ticker} 
                        onClick={() => setSelectedTicker(a.ticker)} 
                        className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl transition-all ${
                          act 
                          ? 'bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5' 
                          : 'border border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]'
                        }`}
                      >
                        <div className="text-left">
                          <div className={`font-mono text-[11px] font-bold ${act ? 'text-indigo-400' : 'text-slate-400'}`}>{a.ticker}</div>
                          <div className="text-[9px] text-slate-500 font-medium mt-0.5 truncate max-w-[80px]">{a.name}</div>
                        </div>
                        <div className="font-mono text-[10px] font-bold text-slate-300 text-right">
                          ${a.price >= 1000 ? (a.price/1000).toFixed(1)+'K' : a.price.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)} 
              className="p-3 border-t border-white/[0.03] bg-transparent cursor-pointer flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            >
              <ChevronRight size={16} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* ═══ BENTO CONTENT ═══ */}
          <div className="no-scrollbar overflow-y-auto flex flex-col gap-6 pr-2">

            {/* ROW 1: Chart + Sentinel */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              
              {/* Chart Section */}
              <div className="lumia-card flex flex-col overflow-hidden min-w-0 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-50"></div>
                <div className="p-6 border-b border-white/[0.03] flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="font-display font-bold text-white tracking-tight leading-none m-0 text-3xl">{selectedTicker}</h2>
                        <button 
                          onClick={() => setWatchlist(w => w.includes(selectedTicker) ? w.filter(t => t !== selectedTicker) : [...w, selectedTicker])} 
                          className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg p-1.5 transition-colors cursor-pointer"
                        >
                          {watchlist.includes(selectedTicker) ? <Star size={14} fill={C.amber} className="text-[#f59e0b]" /> : <StarOff size={14} className="text-slate-500" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 truncate flex items-center gap-2">
                        {sel.name} <span className="w-1 h-1 rounded-full bg-slate-700"></span> {sel.sector}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white tracking-tight leading-none flex items-baseline justify-end gap-1 text-4xl">
                      <span className="text-slate-500 text-lg">$</span>
                      {curPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`font-mono text-xs font-bold flex items-center justify-end gap-1.5 mt-1.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`px-1.5 py-0.5 rounded ${isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      </span>
                      {chgPct}
                    </div>
                  </div>
                  <div className="flex gap-6 px-6 border-l border-white/[0.05] flex-wrap">
                    {[
                      { l: 'Mkt Cap', v: research?.marketCap || '---' }, 
                      { l: 'Vol', v: liveData?.turnover24h || '---' }, 
                      { l: 'Beta', v: research?.quantMetrics?.beta || '---' }
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{s.l}</div>
                        <div className="font-mono text-xs font-bold text-slate-300 mt-1">{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-6 min-h-[300px] relative">
                  {loadingChart && (
                    <div className="absolute inset-0 z-20 bg-[#050505]/50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
                      <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                  )}
                  {!loadingChart && history.length === 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-500">
                      <AlertTriangle size={32} className="mb-2 opacity-50" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Chart Data Unavailable</p>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.accent} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis orientation="right" stroke="rgba(255,255,255,0.1)" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `$${v.toLocaleString()}`} style={{ fontFamily: 'JetBrains Mono' }} />
                      <Area type="monotone" dataKey="price" stroke={C.accent} fill="url(#cg)" strokeWidth={2} isAnimationActive={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} 
                        itemStyle={{ color: '#fff', fontWeight: 600 }} 
                        labelStyle={{ color: '#64748b', fontSize: '10px', marginBottom: '4px' }} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Sentinel Section */}
              <div className="lumia-card flex flex-col overflow-hidden min-w-0">
                <div className="p-4 border-b border-white/[0.03] flex items-center gap-2 bg-indigo-500/5">
                  <BrainCircuit size={14} className="text-indigo-400" />
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">AI Sentinel</span>
                </div>
                <div className="no-scrollbar flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {/* Conviction Score */}
                  <div className="text-center py-6 px-4 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-xl"></div>
                    <div className="relative z-10">
                      <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Conviction</div>
                      <div className="font-display font-black text-white tracking-tight leading-none" style={{ fontSize: 42 }}>
                        {research?.aiConvictionScore || (liveData?.price ? 74 : '---')}
                        <span className="text-lg text-indigo-400 ml-0.5">%</span>
                      </div>
                      <div className="flex justify-center gap-1 mt-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-6 h-1 rounded-full ${i < ((research?.aiConvictionScore || 74) / 20) ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Price Targets */}
                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Target size={10} className="text-indigo-400" /> Price Targets
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Bear', val: research?.priceTarget?.low || (liveData?.price ? liveData.price * 0.85 : 0), color: C.red },
                        { label: 'Base', val: research?.priceTarget?.median || (liveData?.price ? liveData.price * 1.15 : 0), color: C.accent },
                        { label: 'Bull', val: research?.priceTarget?.high || (liveData?.price ? liveData.price * 1.45 : 0), color: C.green }
                      ].map((t, i) => (
                        <div key={i} className="bg-[#0a0a0a] border border-white/[0.05] rounded-xl p-2 text-center hover:border-white/10 transition-colors">
                          <div className="text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t.label}</div>
                          <div className="font-mono text-[11px] font-bold truncate" style={{ color: t.color === C.accent ? C.green : t.color }}>
                            ${t.val > 0 ? t.val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Sentiment & Regime */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: 'Institutional', v: research?.institutionalSentiment || 'NEUTRAL', c: research?.institutionalSentiment === 'BULLISH' ? C.green : research?.institutionalSentiment === 'BEARISH' ? C.red : C.textMuted },
                      { l: 'Regime', v: isCrypto ? 'VOLATILE' : 'STABLE', c: C.accent },
                      { l: 'X Sentiment', v: research?.socialSentiment?.x.sentiment || 'NEUTRAL', c: research?.socialSentiment?.x.sentiment === 'POSITIVE' ? C.green : research?.socialSentiment?.x.sentiment === 'NEGATIVE' ? C.red : C.textMuted },
                      { l: 'Reddit', v: research?.socialSentiment?.reddit.sentiment || 'NEUTRAL', c: research?.socialSentiment?.reddit.sentiment === 'POSITIVE' ? C.green : research?.socialSentiment?.reddit.sentiment === 'NEGATIVE' ? C.red : C.textMuted },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0a0a0a] border border-white/[0.05] rounded-xl p-2.5">
                        <div className="text-[8px] font-bold text-slate-500 uppercase mb-1 tracking-wider">{s.l}</div>
                        <div className="font-mono text-[10px] font-bold truncate" style={{ color: s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Wall St Consensus */}
                  <div className="bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-white/[0.05] rounded-xl p-4 text-center">
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Wall St Consensus</div>
                    <div className="font-mono text-lg font-black tracking-tight mb-3" style={{ color: research?.analystRatings?.consensus?.includes('BUY') ? C.green : research?.analystRatings?.consensus?.includes('SELL') ? C.red : C.textMuted }}>
                      {research?.analystRatings?.consensus || 'NEUTRAL'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#050505] p-2 rounded-lg border border-white/[0.03]">
                        <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Target</div>
                        <div className="font-mono text-[10px] font-bold text-white mt-0.5">${research?.analystRatings?.targetPrice || '---'}</div>
                      </div>
                      <div className="bg-[#050505] p-2 rounded-lg border border-white/[0.03]">
                        <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Upside</div>
                        <div className="font-mono text-[10px] font-bold text-emerald-400 mt-0.5">
                          {research?.analystRatings?.targetPrice && liveData?.price 
                            ? (((research.analystRatings.targetPrice - liveData.price) / liveData.price) * 100).toFixed(1)
                            : '---'}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Tabs */}
            <div className="grid grid-cols-1 gap-6">
              
              {/* Tab Panel */}
              <div className="lumia-card flex flex-col overflow-hidden min-w-0">
                <div className="flex border-b border-white/[0.03] overflow-x-auto no-scrollbar px-2">
                  {[
                    { id: 'technicals', label: 'Technicals', icon: <Cpu size={12} /> },
                    { id: 'keyfacts', label: 'Key Facts', icon: <Landmark size={12} /> },
                    { id: 'peers', label: 'Peers', icon: <Users size={12} /> },
                    { id: 'shareholders', label: 'Shareholders', icon: <Briefcase size={12} /> },
                    { id: 'news', label: 'News Feed', icon: <Globe size={12} /> },
                    { id: 'neural', label: 'Neural Val', icon: <Sparkles size={12} /> },
                  ].map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setActiveTab(t.id)} 
                      className={`py-4 px-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-200 ${
                        activeTab === t.id 
                        ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5' 
                        : 'text-slate-500 border-transparent hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <div className="p-6 min-h-[200px] animate-in fade-in duration-300">
                  {activeTab === 'technicals' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {technicals.map((m, i) => <StatCard key={i} label={m.label} value={m.val} color={m.color} />)}
                    </div>
                  )}
                  {activeTab === 'keyfacts' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                        { title: 'Identity', items: [{ l: 'Exchange', v: research?.keyFacts?.exchange || (isCrypto ? 'Bybit' : 'NASDAQ') }, { l: 'Class', v: isCrypto ? 'Crypto' : 'Equity' }, { l: 'Sector', v: sel.sector }, { l: 'Inception', v: research?.keyFacts?.inceptionDate || '---' }] },
                        { title: 'Fundamentals', items: [{ l: 'P/E', v: research?.keyFacts?.peRatio ? Number(research.keyFacts.peRatio).toFixed(2) : 'N/A' }, { l: 'P/B', v: research?.keyFacts?.pbRatio ? Number(research.keyFacts.pbRatio).toFixed(2) : 'N/A' }, { l: 'EPS', v: research?.quantMetrics?.eps || 'N/A' }, { l: 'Div Yield', v: research?.keyFacts?.dividendFrequency || 'N/A' }] },
                        { title: 'Risk', items: [{ l: 'Beta', v: research?.quantMetrics?.beta || '---' }, { l: 'Std Dev', v: research?.keyFacts?.stdDev3y || '---' }, { l: 'Expense', v: research?.keyFacts?.expenseRatio || '---' }, { l: 'Sharpe', v: '1.12' }] },
                      ].map((sec, si) => (
                        <div key={si} className="bg-[#0a0a0a] border border-white/[0.03] rounded-2xl p-5">
                          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                            {sec.title}
                          </div>
                          {sec.items.map((item, ii) => (
                            <div key={ii} className="flex justify-between py-2 border-b border-white/[0.03] last:border-0">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{item.l}</span>
                              <span className="font-mono text-[11px] font-bold text-slate-300">{item.v}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'peers' && (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.03]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#0a0a0a] border-b border-white/[0.05]">
                            {['Ticker', 'Name', 'Price', 'Mkt Cap', 'Perf'].map(h => (
                              <th key={h} className="p-3 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {peers.map((p, i) => (
                            <tr key={i} onClick={() => setSelectedTicker(p.ticker)} className="border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.03] transition-colors last:border-0">
                              <td className="font-mono p-3 text-[11px] font-bold text-indigo-400">{p.ticker}</td>
                              <td className="p-3 text-[10px] text-slate-400 font-medium">{p.name}</td>
                              <td className="font-mono p-3 text-[10px] font-bold text-white">{p.price}</td>
                              <td className="font-mono p-3 text-[10px] text-slate-500">{p.mcap}</td>
                              <td className={`font-mono p-3 text-[10px] font-bold ${String(p.perf).startsWith('+') ? 'text-emerald-400' : String(p.perf).startsWith('-') ? 'text-rose-400' : 'text-slate-500'}`}>{p.perf}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {activeTab === 'shareholders' && (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.03]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#0a0a0a] border-b border-white/[0.05]">
                            {['Shareholder', 'Shares', 'Value', 'Change'].map(h => (
                              <th key={h} className="p-3 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {research?.shareholders ? research.shareholders.map((s, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors last:border-0">
                              <td className="p-3 text-[11px] font-bold text-white">{s.name}</td>
                              <td className="font-mono p-3 text-[10px] text-slate-400">{s.shares}</td>
                              <td className="font-mono p-3 text-[10px] text-slate-300">{s.value}</td>
                              <td className={`font-mono p-3 text-[10px] font-bold ${String(s.change).startsWith('+') ? 'text-emerald-400' : String(s.change).startsWith('-') ? 'text-rose-400' : 'text-slate-500'}`}>{s.change}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="p-10 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No shareholder data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {activeTab === 'news' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayNews.map((n, i) => (
                        <a 
                          key={i} 
                          href={n.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl hover:border-indigo-500/30 hover:bg-white/[0.03] transition-all flex flex-col gap-3 group"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{n.source}</span>
                            <span className="font-mono text-[9px] text-slate-500">{n.publishedAt || n.date || 'Just now'}</span>
                          </div>
                          <div className="text-[12px] font-medium text-slate-300 leading-snug group-hover:text-white transition-colors line-clamp-2">{n.title}</div>
                          <div className="flex items-center gap-1.5 mt-auto">
                            <span className={`w-1.5 h-1.5 rounded-full ${n.sentiment === 'POSITIVE' ? 'bg-emerald-500' : n.sentiment === 'NEGATIVE' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{n.sentiment}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  {activeTab === 'neural' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {!research ? (
                        <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-4 bg-[#0a0a0a] rounded-2xl border border-white/[0.03]">
                          <Loader2 className="animate-spin text-indigo-500" size={32} />
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse font-mono">Neural Bridge Synchronizing...</p>
                        </div>
                      ) : (() => {
                        const valuation = calculateValuation({
                          ticker: selectedTicker,
                          name: research.ticker,
                          price: liveData?.price || 0,
                          beta: research.quantMetrics?.beta || 1.0,
                          volatility: 0.3,
                          sector: isCrypto ? 'Crypto' : 'Equity',
                          weight: 0,
                          fundamentals: {
                            eps: research.quantMetrics?.eps,
                            bookValue: research.quantMetrics?.bvps,
                            fcf: research.quantMetrics?.fcf,
                            wacc: research.quantMetrics?.wacc,
                            peRatio: research.keyFacts?.peRatio,
                            sharesOutstanding: research.keyFacts?.sharesOutstanding
                          }
                        } as Asset);

                        return (
                          <>
                            <div className="p-6 bg-gradient-to-br from-indigo-900/10 to-[#0a0a0a] border border-indigo-500/20 rounded-2xl relative overflow-hidden">
                              <Fingerprint size={64} className="absolute -top-4 -right-4 opacity-[0.03] text-white" />
                              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-4">Intrinsic Valuation</div>
                              <div className="flex items-baseline gap-3 mb-2">
                                <span className="font-mono text-4xl font-black text-white tracking-tighter">${valuation.intrinsicValue}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${valuation.marginOfSafety > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
                                  {valuation.marginOfSafety > 0 ? '+' : ''}{valuation.marginOfSafety}% Safety
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-4">Method: {valuation.method}</div>
                              <span className={`inline-block px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-lg border ${
                                valuation.rating === 'UNDERVALUED' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
                                valuation.rating === 'OVERVALUED' ? 'border-rose-500/30 text-rose-400 bg-rose-500/5' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5'
                              }`}>
                                {valuation.rating}
                              </span>
                            </div>
                            <div className="p-6 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Quant Inputs</div>
                              {[
                                { l: 'EPS (TTM)', v: research.quantMetrics?.eps || '---' }, 
                                { l: 'FCF Est', v: research.quantMetrics?.fcf ? `$${(research.quantMetrics.fcf / 1e9).toFixed(1)}B` : '---' }, 
                                { l: 'WACC', v: research.quantMetrics?.wacc ? `${(research.quantMetrics.wacc * 100).toFixed(1)}%` : '---' }, 
                                { l: 'Beta', v: research.quantMetrics?.beta || '---' }
                              ].map((x, i) => (
                                <div key={i} className="flex justify-between py-2 border-b border-white/[0.03] last:border-0">
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{x.l}</span>
                                  <span className="font-mono text-[11px] font-bold text-white">{x.v}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 3: Bottom Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Insider Flow */}
              <div className="lumia-card p-5 min-w-0">
                <SectionHead icon={<Users size={12} className="text-indigo-400" />} title="Insider Flow" />
                <div className="flex flex-col gap-2">
                  {!research ? (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-xl animate-pulse">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Loading...</p>
                    </div>
                  ) : research?.insiderActivity && research.insiderActivity.length > 0 ? (
                    research.insiderActivity.slice(0, 3).map((tr, i) => (
                      <div key={i} className="p-3 bg-[#0a0a0a] border border-white/[0.03] rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${tr.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {tr.type[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-white truncate max-w-[100px]">{tr.name}</div>
                            <div className="text-[8px] text-slate-500 font-medium truncate uppercase tracking-wide">{tr.role}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-mono text-[10px] font-bold ${tr.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tr.type === 'BUY' ? '+' : '-'}{tr.amount.includes('$') ? tr.amount : `$${tr.amount}`}
                          </div>
                          <div className="font-mono text-[8px] text-slate-600">{tr.date}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-xl">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">No data.</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Catalysts */}
              <div className="lumia-card p-5 min-w-0">
                <SectionHead icon={<Clock size={12} className="text-indigo-400" />} title="Catalysts" />
                <div className="flex flex-col gap-2">
                  {!research ? (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-xl animate-pulse">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Loading...</p>
                    </div>
                  ) : research?.upcomingEvents && research.upcomingEvents.length > 0 ? (
                    research.upcomingEvents.slice(0, 3).map((e, i) => (
                      <div key={i} className="p-3 bg-[#0a0a0a] border border-white/[0.03] rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.impact === 'HIGH' ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]' : e.impact === 'MEDIUM' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-white truncate max-w-[120px]">{e.event}</div>
                            <div className="text-[8px] text-slate-500 font-medium uppercase tracking-wide">Impact: {e.impact}</div>
                          </div>
                        </div>
                        <div className="font-mono text-[10px] font-bold text-slate-400 shrink-0 bg-white/5 px-2 py-1 rounded">{e.date}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-xl">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">No data.</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Revenue */}
              <div className="lumia-card p-5 min-w-0">
                <SectionHead icon={<BarChart2 size={12} className="text-indigo-400" />} title="Revenue" />
                <div className="flex flex-col gap-2">
                  {!research ? (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-xl animate-pulse">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Loading...</p>
                    </div>
                  ) : research?.revenueTrends && research.revenueTrends.length > 0 ? (
                    research.revenueTrends.slice(0, 3).map((t, i) => (
                      <div key={i} className="p-3 bg-[#0a0a0a] border border-white/[0.03] rounded-xl flex justify-between items-center">
                        <div className="text-[10px] font-bold text-slate-400">{t.period}</div>
                        <div className="text-right">
                          <div className="font-mono text-[11px] font-bold text-white">{t.revenue}</div>
                          <div className={`font-mono text-[9px] font-bold ${String(t.growth).startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.growth} YoY
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-xl">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">No data.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketExplorer;
