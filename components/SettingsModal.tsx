import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('lumia_gemini_key');
    if (key) setApiKey(key);
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('lumia_gemini_key', apiKey.trim());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } else {
      localStorage.removeItem('lumia_gemini_key');
      setSaved(true); // Technically saved "empty"
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="text-indigo-500" size={20} /> System Configuration
              </h3>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                <p className="text-xs text-indigo-200 leading-relaxed">
                  <strong>Open Source Mode:</strong> To use the AI features (Advisor, News, Research), you need your own API key.
                  It's free for personal use.
                </p>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <ShieldAlert size={12} /> Quota Exceeded? (Error 429)
                </h4>
                <p className="text-[10px] text-rose-200/70 leading-relaxed mb-3">
                  If you see "Quota Exceeded", your free key has hit its limit (15 requests/min).
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-[9px] text-rose-200/60">
                    <div className="w-4 h-4 rounded bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-400 font-bold">1</div>
                    <span>Go to your API Provider</span>
                  </div>
                  <div className="flex items-start gap-2 text-[9px] text-rose-200/60">
                    <div className="w-4 h-4 rounded bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-400 font-bold">2</div>
                    <span>Create a <b>New Project</b></span>
                  </div>
                  <div className="flex items-start gap-2 text-[9px] text-rose-200/60">
                    <div className="w-4 h-4 rounded bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-400 font-bold">3</div>
                    <span>Generate a <b>New API Key</b> in that project and paste it below.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">LUMIA API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none font-mono placeholder:text-gray-700 transition-colors"
                />
              </div>

              <button 
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  saved 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle2 size={18} /> Saved Successfully
                  </>
                ) : (
                  "Save Configuration"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
