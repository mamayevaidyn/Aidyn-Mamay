import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Wallet, Zap, Radio, ShieldAlert, Cpu, Search, 
  MessageSquareCode, Terminal, Activity, Globe, ShieldCheck, Box,
  Menu, X, Trash2, Atom, BarChart3, UserCircle, LogOut, Gavel
} from 'lucide-react';
import { PortfolioState } from '../types';
import { fetchRealTimePrice } from '../services/marketDataService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  portfolio: PortfolioState | null;
  syncInfo?: { lastSync: Date; isSyncing: boolean };
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, portfolio }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navSections = [
    { title: 'Market Terminal', items: [
      { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { id: 'builder', label: 'Portfolio', icon: <Wallet size={18} />, badge: portfolio?.assets.length },
      { id: 'wire', label: 'News Wire', icon: <Radio size={18} />, badge: 'LIVE' },
      { id: 'explorer', label: 'Scanner', icon: <Search size={18} /> },
    ]},
    { title: 'Analysis', items: [
      { id: 'lab', label: 'Quant Lab', icon: <Cpu size={18} /> },
      { id: 'performance', label: 'Performance', icon: <BarChart3 size={18} /> },
      { id: 'engine', label: 'Simulation', icon: <Atom size={18} /> },
      { id: 'strategy', label: 'Strategy', icon: <Terminal size={18} /> },
      { id: 'risk', label: 'Risk Engine', icon: <ShieldAlert size={18} /> },
      { id: 'intel', label: 'Intelligence', icon: <Zap size={18} /> },
    ]},
    { title: 'Legal', items: [
      { id: 'legal', label: 'Disclosures', icon: <Gavel size={18} /> },
    ]},
    { title: 'Assistant', items: [
      { id: 'advisor', label: 'AI Advisor', icon: <MessageSquareCode size={18} /> },
    ]}
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#020408] text-slate-400 relative">
      <div className="scanline"></div>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-64 flex flex-col border-r border-white/5 bg-[#05070a] z-[70] transition-transform duration-300 lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <Box size={20} className="text-emerald-500" />
            <span className="syne text-sm font-black text-slate-100 tracking-[0.2em] uppercase">LUMIA <span className="text-emerald-500">QUANTUM</span></span>
          </div>
          <button className="lg:hidden text-slate-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 py-8 overflow-y-auto no-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="mb-8">
              <div className="px-8 mb-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{section.title}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-8 py-3.5 text-xs transition-all border-l-2 ${
                    activeTab === item.id 
                      ? 'text-slate-100 border-emerald-500 bg-emerald-500/5'
                      : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <span className={`${activeTab === item.id ? 'text-emerald-500' : 'opacity-40'}`}>{item.icon}</span>
                  <span className="font-bold uppercase tracking-wider">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-sm font-black ${item.id === 'wire' ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        
        <div className="p-8 border-t border-white/5 bg-white/[0.01]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Verified Secure</span>
            </div>
            <p className="text-[9px] text-slate-700 leading-relaxed uppercase tracking-tighter">
              LUMIA QUANTUM IS NOT A FINANCIAL ADVISOR. TRADING INVOLVES RISK. PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/5 bg-[#05070a]/80 backdrop-blur-xl flex items-center justify-between z-40">
          <div className="flex items-center gap-4 px-4 lg:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto no-scrollbar bg-[#020408] relative ${activeTab === 'explorer' ? 'p-0' : 'p-6 lg:p-10'}`}>
          <div className={`mx-auto grid ${activeTab === 'dashboard' ? 'max-w-[1600px] gap-10 grid-cols-1 xl:grid-cols-[1fr_320px]' : 'w-full grid-cols-1'}`}>
            <div className={`${activeTab === 'dashboard' ? 'space-y-10' : ''} min-w-0`}>
              {children}
            </div>
            {activeTab === 'dashboard' && (
              <aside className="space-y-8 hidden xl:block">
                <RightPanel portfolio={portfolio} />
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const RightPanel: React.FC<{ portfolio: PortfolioState | null }> = ({ portfolio }) => {
  if (!portfolio) return null;
  return (
    <div className="sticky top-0 space-y-8">
      <div className="terminal-card p-8 bg-[#0a0d12]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Risk Analysis</h3>
          <ShieldCheck size={16} className="text-blue-500" />
        </div>
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Sharpe Ratio</span>
            <span className="text-emerald-500 mono font-bold text-lg">{portfolio.metrics.alpha.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Max Drawdown</span>
            <span className="text-rose-500 mono font-bold text-lg">-{portfolio.metrics.systemicRisk.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <div className="terminal-card p-8 border-emerald-500/20 bg-emerald-500/[0.02]">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Portfolio Beta</h3>
        <div className="text-center py-6 border border-emerald-500/10 rounded-2xl bg-emerald-500/5">
          <div className="text-2xl font-black text-emerald-500 tracking-[0.2em] syne">{portfolio.metrics.beta.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
