import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Key, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState(1);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('lumia_gemini_key', apiKey.trim());
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative"
          >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative p-8 md:p-10">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 shadow-lg">
                <ShieldCheck size={32} className="text-emerald-500" />
              </div>

              <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                Lumia <span className="text-emerald-500">Quantum</span>
              </h2>
              
              <div className="space-y-6">
                <p className="text-gray-400 text-sm leading-relaxed">
                  Welcome to the next generation of financial intelligence. 
                  Lumia Quantum is an open-source terminal powered by advanced neural models.
                </p>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 mt-1">
                      <Key size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Bring Your Own Key (BYOK)</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        To ensure unlimited access and privacy, Lumia runs directly in your browser using your own API key.
                        It's free for personal use.
                      </p>
                    </div>
                  </div>
                </div>

                {step === 1 ? (
                  <div className="space-y-3 pt-2">
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      Enter API Key <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enter API Key</label>
                      <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-emerald-500 outline-none font-mono placeholder:text-gray-700 transition-colors"
                        autoFocus
                      />
                    </div>
                    <button 
                      onClick={handleSave}
                      disabled={!apiKey.trim()}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 size={18} /> Connect Terminal
                    </button>
                    <button 
                      onClick={() => setStep(1)}
                      className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
