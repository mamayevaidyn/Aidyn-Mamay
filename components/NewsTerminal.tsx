import React, { useState, useEffect, useMemo } from 'react';
import { getGlobalNewsWire, NewsItem, getDetailedNewsAnalysis } from '../services/geminiService';
import { AreaChart, Area, ResponsiveContainer, YAxis, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { 
  RefreshCw, Globe, ExternalLink, MessageSquareQuote, TrendingUp, TrendingDown, Activity, Zap, Clock, Search, CheckCircle2, LayoutGrid, List, Image as ImageIcon, Compass, MapPin, Loader2, ShieldCheck, Newspaper,
  Gauge, AlertCircle, TrendingUpDown, X, BrainCircuit, Target, Info, Sparkles, ArrowRight, Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NewsTerminal: React.FC = () => {
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  const [filterRegion, setFilterRegion] = useState<'ALL' | 'WEST' | 'EAST' | 'GLOBAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<any | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const fetchNews = async (force = false) => {
    setLoading(true);
    const newsData = await getGlobalNewsWire(force);
    setAllNews(newsData);
    setLoading(false);
    setLastRefreshed(new Date());
  };

  const handleDeepDive = async (item: NewsItem) => {
    setSelectedNews(item);
    setLoadingAnalysis(true);
    setDetailedAnalysis(null);
    const analysis = await getDetailedNewsAnalysis(item);
    setDetailedAnalysis(analysis);
    setLoadingAnalysis(false);
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => fetchNews(true), 300000); // Auto refresh cache in background
    return () => clearInterval(interval);
  }, []);

  const filteredNews = useMemo(() => {
    return allNews.filter(n => {
      const matchesRegion = filterRegion === 'ALL' || n.region === filterRegion;
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRegion && matchesSearch;
    });
  }, [allNews, filterRegion, searchQuery]);

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'QUANT': return 'bg-orange-600 text-white';
      case 'MACRO': return 'bg-violet-600 text-white';
      case 'GEOPOLITICS': return 'bg-rose-600 text-white';
      case 'BAIDU_SYNTHESIS': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24 max-w-7xl mx-auto">
      {/* Omni-Header */}
      <div className="bg-[#0b0f1a] rounded-[40px] border border-white/5 p-8 lg:p-10 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-orange-600 rounded-[24px] flex items-center justify-center shadow-xl shadow-orange-600/20">
             <Newspaper className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Omni Terminal</h2>
          </div>
        </div>

        <div className="flex flex-col items-end">
           <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Clock size={12} className="text-orange-400" /> Pulse Synchronized
           </div>
           <button 
            onClick={() => fetchNews(true)}
            disabled={loading}
            className="px-8 py-3.5 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-orange-600/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            {loading ? 'Resyncing Markets...' : 'Refresh Hub'}
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-[#0b0f1a] border border-white/5 rounded-[32px] p-4 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input 
            type="text" 
            placeholder="SEARCH_SIGNAL_DATABASE..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#020617] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-bold text-white uppercase outline-none focus:border-orange-500/50 transition-all"
          />
        </div>
        
        <div className="flex bg-[#020617] rounded-2xl border border-white/10 p-1">
          {['ALL', 'GLOBAL', 'WEST', 'EAST'].map(r => (
            <button 
              key={r} 
              onClick={() => setFilterRegion(r as any)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterRegion === r ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {r === 'EAST' ? '🇨🇳 EAST' : r === 'WEST' ? '🇺🇸 WEST' : r}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed */}
      {loading && allNews.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="h-64 bg-[#0b0f1a] border border-white/5 rounded-[32px] animate-pulse" />
           ))}
        </div>
      ) : allNews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
            <ShieldCheck size={40} className="text-gray-600" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">System Locked</h3>
          <p className="text-sm text-gray-500 max-w-md mb-8">
            To access the Global News Wire and Neural Intelligence, you must configure your Neural Bridge (API Key).
          </p>
          <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Go to System Config → Enter Key
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleDeepDive(item)}
              className="standard-card flex flex-col bg-[#0b0f1a] group overflow-hidden border-white/5 hover:border-orange-500/40 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="p-6 flex flex-col flex-1">
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                       <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${getSourceColor(item.sourceType)}`}>
                         {item.sourceType.replace('_', ' ')}
                       </span>
                       {item.isMock && (
                         <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase bg-amber-500 text-black">
                           SIMULATED
                         </span>
                       )}
                    </div>
                 </div>
                 
                 <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{item.source}</span>
                 </div>
                 
                 <h3 className="text-sm lg:text-base font-bold text-white leading-tight mb-4 group-hover:text-orange-400 transition-colors line-clamp-3">
                    {item.title}
                 </h3>
                 
                 <p className="text-[11px] text-gray-500 leading-relaxed mb-6 line-clamp-4 italic">
                    {item.impactExplanation}
                 </p>
                 
                 <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black text-orange-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      <BrainCircuit size={12} /> Deep Intelligence
                    </div>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all"
                    >
                       <ExternalLink size={14} />
                    </a>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Deep Intelligence Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-[#05070a] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
                    <BrainCircuit className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Neural Intelligence Report</h3>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Source: {selectedNews.source} • {new Date(selectedNews.publishedAt).toLocaleString()}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-10 no-scrollbar">
                {loadingAnalysis ? (
                  <div className="h-96 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
                      <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-600 animate-pulse" size={32} />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-white uppercase tracking-tighter animate-pulse">Synchronizing Neural Bridge...</div>
                      <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-2">Synthesizing Market Impact & Sentiment Data</div>
                    </div>
                  </div>
                ) : detailedAnalysis ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column: Summary & Context */}
                    <div className="lg:col-span-7 space-y-10">
                      <section>
                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4">
                          <Fingerprint size={14} /> Executive Summary
                        </div>
                        <h4 className="text-2xl font-bold text-white leading-tight mb-6">{selectedNews.title}</h4>
                        <div className="text-gray-400 leading-relaxed text-sm space-y-4">
                          {detailedAnalysis.summary.split('\n\n').map((p: string, i: number) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                      </section>

                      <section className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px]">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                          <Globe size={14} /> Macro Contextualization
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed italic">
                          {detailedAnalysis.macroContext}
                        </p>
                      </section>

                      <section>
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">
                          <Target size={14} /> Actionable Intelligence
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {detailedAnalysis.actionableInsights.map((insight: string, i: number) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl group hover:border-emerald-500/30 transition-all">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle2 className="text-emerald-500" size={14} />
                              </div>
                              <p className="text-sm text-emerald-100/80 font-medium leading-snug">{insight}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    {/* Right Column: Metrics & Impact */}
                    <div className="lg:col-span-5 space-y-8">
                      {/* Sentiment Widget */}
                      <div className="p-8 bg-gradient-to-br from-orange-600/10 to-transparent border border-orange-500/20 rounded-[40px] relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-600/10 blur-3xl rounded-full" />
                        <div className="relative z-10 text-center">
                          <div className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-4">Event Sentiment Index</div>
                          <div className={`text-6xl font-black font-mono tracking-tighter mb-2 ${
                            detailedAnalysis.marketSentiment.value <= 25 ? 'text-rose-500' : 
                            detailedAnalysis.marketSentiment.value <= 45 ? 'text-orange-500' : 
                            detailedAnalysis.marketSentiment.value <= 55 ? 'text-gray-400' : 
                            detailedAnalysis.marketSentiment.value <= 75 ? 'text-emerald-400' : 'text-emerald-500'
                          }`}>
                            {detailedAnalysis.marketSentiment.value}
                          </div>
                          <div className="text-lg font-black text-white uppercase tracking-tighter mb-4">{detailedAnalysis.marketSentiment.label}</div>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                            {detailedAnalysis.marketSentiment.explanation}
                          </p>
                        </div>
                      </div>

                      {/* Impact Matrix */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          <Activity size={14} /> Impact Matrix
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-600 uppercase">Volatility Risk</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                              detailedAnalysis.impactAnalysis.volatilityImpact === 'HIGH' ? 'bg-rose-500/20 text-rose-400' :
                              detailedAnalysis.impactAnalysis.volatilityImpact === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {detailedAnalysis.impactAnalysis.volatilityImpact}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                             <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Short-Term Outlook</div>
                             <div className="p-3 bg-white/5 rounded-xl text-[11px] text-gray-300 font-medium leading-relaxed border border-white/5">
                               {detailedAnalysis.impactAnalysis.shortTerm}
                             </div>
                          </div>

                          <div className="space-y-2">
                             <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Long-Term Trajectory</div>
                             <div className="p-3 bg-white/5 rounded-xl text-[11px] text-gray-300 font-medium leading-relaxed border border-white/5">
                               {detailedAnalysis.impactAnalysis.longTerm}
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Related Tickers */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
                          <Zap size={14} /> Exposure Nodes
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {detailedAnalysis.relatedTickers.map((t: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-orange-500/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-600/10 flex items-center justify-center text-[10px] font-black text-orange-400 border border-orange-500/20">
                                  {t.ticker}
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 line-clamp-1">{t.reason}</div>
                              </div>
                              <ArrowRight size={12} className="text-gray-700 group-hover:text-orange-400 transition-colors" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-96 flex flex-col items-center justify-center text-center p-10 bg-rose-500/5 border border-rose-500/10 rounded-[40px]">
                    <AlertCircle className="text-rose-500 mb-4" size={48} />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Neural Link Severed</h3>
                    <p className="text-sm text-gray-500 max-w-md">The intelligence synthesis failed. This could be due to high neural load or restricted access to the grounding source.</p>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-2 text-[9px] font-black text-gray-700 uppercase tracking-[0.2em]">
                  <ShieldCheck size={12} /> Encrypted Intelligence Feed • LUMIA_OS_v3.0
                </div>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewsTerminal;
