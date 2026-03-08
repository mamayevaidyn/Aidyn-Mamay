import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, Gavel, Info } from 'lucide-react';

interface LegalModalProps {
  isOpen?: boolean;
  onAccept: () => void;
  onDecline?: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen = true, onAccept, onDecline }) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-2xl bg-[#0a0d12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <ShieldAlert className="text-amber-500" size={24} />
          </div>
          <div>
            <h2 className="syne text-xl font-black text-white tracking-widest uppercase">Legal Compliance & Risk Disclosure</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">LUMIA QUANTUM TERMINAL v2.5.0</p>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar"
        >
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">1. High-Risk Investment Warning</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Trading and investing in financial instruments, including but not limited to stocks, options, futures, and cryptocurrencies, involves substantial risk of loss and is not suitable for every investor. The valuation of financial instruments may fluctuate, and as a result, clients may lose more than their original investment.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-500">
              <Info size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">2. No Financial Advice</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              The Lumia Quantum Terminal, including its AI Advisor and Quant Lab features, provides automated analysis and data visualization for informational purposes only. <span className="text-white font-bold underline decoration-blue-500/50">Nothing contained in this application constitutes investment, legal, tax, or other advice.</span> You should not rely on any information contained herein as a substitute for professional financial advice.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <Scale size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">3. Accuracy of Information</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              While we strive to provide accurate and up-to-date information, Lumia Quantum does not guarantee the accuracy, completeness, or timeliness of the data provided. Market data is subject to delays and errors beyond our control. Past performance is not indicative of future results.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-purple-500">
              <Gavel size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">4. Limitation of Liability</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Under no circumstances shall Lumia Quantum or its developers be liable for any direct, indirect, incidental, or consequential damages arising out of the use of or inability to use this terminal. You assume full responsibility for your trading decisions and any resulting financial outcomes.
            </p>
          </section>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 border-dashed">
            <p className="text-[10px] text-slate-500 uppercase leading-loose text-center">
              By clicking "Accept & Initialize Terminal", you acknowledge that you have read, understood, and agreed to be bound by these terms and the full Risk Disclosure Agreement.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-white/[0.01] flex flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div 
              className={`mt-0.5 w-5 h-5 rounded border transition-all flex items-center justify-center ${agreed ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 group-hover:border-white/40'}`}
              onClick={() => setAgreed(!agreed)}
            >
              {agreed && <CheckCircle2 size={14} className="text-black" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={agreed} 
              onChange={() => setAgreed(!agreed)} 
            />
            <span className="text-xs text-slate-400 select-none">
              I confirm that I am over 18 years of age and I accept the <span className="text-white font-bold">Terms of Service</span> and <span className="text-white font-bold">Risk Disclosure</span>.
            </span>
          </label>

          <div className="flex gap-4">
            {onDecline && (
              <button
                onClick={onDecline}
                className="flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-sm transition-all bg-white/5 text-slate-400 hover:bg-white/10"
              >
                Decline
              </button>
            )}
            <button
              disabled={!agreed}
              onClick={onAccept}
              className={`
                flex-[2] py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-sm transition-all
                ${agreed 
                  ? 'bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'}
              `}
            >
              Accept & Initialize Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
