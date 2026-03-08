import React from 'react';
import { ShieldAlert, AlertTriangle, Info, Scale, Gavel, FileText, ShieldCheck } from 'lucide-react';

const LegalDisclosures: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <ShieldAlert className="text-amber-500" size={32} />
        </div>
        <h1 className="syne text-4xl font-black text-white tracking-[0.2em] uppercase">Legal Disclosures</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Regulatory Compliance & Risk Management Framework</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8">
        {/* Risk Disclosure */}
        <section className="terminal-card p-10 bg-[#0a0d12] border-amber-500/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="text-amber-500" size={20} />
            </div>
            <h2 className="syne text-xl font-black text-white tracking-widest uppercase">Risk Disclosure Statement</h2>
          </div>
          <div className="space-y-6 text-slate-400 leading-relaxed">
            <p>
              Trading in financial markets involves a significant risk of loss. The Lumia Quantum Terminal is a quantitative analysis tool designed to assist in data visualization and statistical modeling. It does not guarantee profits or protection against losses.
            </p>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Key Risk Factors:</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs uppercase tracking-widest font-bold">
                <li className="flex items-center gap-3 text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Market Volatility Risk
                </li>
                <li className="flex items-center gap-3 text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Algorithmic Model Risk
                </li>
                <li className="flex items-center gap-3 text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Data Latency Risk
                </li>
                <li className="flex items-center gap-3 text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Liquidity Risk
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* No Financial Advice */}
        <section className="terminal-card p-10 bg-[#0a0d12] border-blue-500/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Info className="text-blue-500" size={20} />
            </div>
            <h2 className="syne text-xl font-black text-white tracking-widest uppercase">No Financial Advice</h2>
          </div>
          <div className="space-y-6 text-slate-400 leading-relaxed">
            <p>
              Lumia Quantum is not a registered investment advisor, broker-dealer, or financial analyst. All content provided within the terminal is for educational and informational purposes only. 
            </p>
            <p className="border-l-4 border-blue-500/50 pl-6 py-2 italic text-blue-400/80">
              "Users should consult with a qualified financial professional before making any investment decisions. Any reliance on the models or AI-generated insights provided by this terminal is at the user's own risk."
            </p>
          </div>
        </section>

        {/* Terms of Service */}
        <section className="terminal-card p-10 bg-[#0a0d12] border-purple-500/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Gavel className="text-purple-500" size={20} />
            </div>
            <h2 className="syne text-xl font-black text-white tracking-widest uppercase">Terms of Service</h2>
          </div>
          <div className="space-y-6 text-slate-400 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-white font-bold uppercase tracking-wider text-xs">Usage Policy</h3>
                <p className="text-xs leading-loose">
                  The terminal is provided "as is" without warranties of any kind. Users are prohibited from reverse-engineering the quantitative models or using the data for unauthorized commercial purposes.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-white font-bold uppercase tracking-wider text-xs">Data Privacy</h3>
                <p className="text-xs leading-loose">
                  Portfolio data is stored locally within your browser's secure storage. Lumia Quantum does not transmit your private financial data to external servers, except for necessary API calls for market data and AI analysis.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance Badge */}
        <div className="flex flex-col items-center gap-6 py-12 border border-white/5 rounded-3xl bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <ShieldCheck size={48} className="text-emerald-500 opacity-50" />
            <div className="h-12 w-px bg-white/10" />
            <div className="text-left">
              <div className="text-xs font-black text-white uppercase tracking-[0.3em]">System Integrity Verified</div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Lumia Quantum Compliance Engine v2.5</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] max-w-md text-center leading-loose">
            Last updated: March 2026. This document is subject to change without notice to reflect evolving regulatory requirements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalDisclosures;
