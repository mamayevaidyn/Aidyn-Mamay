import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Cpu, 
  Globe, 
  Shield, 
  Zap, 
  ChevronRight, 
  Github, 
  Activity,
  Layers,
  Box,
  BarChart3,
  BrainCircuit
} from 'lucide-react';
import LegalModal from './LegalModal';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const handleInitialize = () => {
    setIsLegalModalOpen(true);
  };

  const handleAcceptLegal = () => {
    setIsLegalModalOpen(false);
    onEnter();
  };

  const handleDeclineLegal = () => {
    setIsLegalModalOpen(false);
    alert("You must accept the terms to use the application.");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30">
      <LegalModal 
        isOpen={isLegalModalOpen} 
        onAccept={handleAcceptLegal} 
        onDecline={handleDeclineLegal} 
      />

      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Terminal size={16} className="text-black" />
          </div>
          <span className="text-xl font-black tracking-tighter">LUMIA</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#" className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors hidden sm:block">Architecture</a>
          <a href="#" className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors hidden sm:block">Models</a>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
          >
            <Github size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">GitHub</span>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto space-y-6 md:space-y-10"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">LUMIA Core v4.2 is Live</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl lg:text-[120px] font-black tracking-tighter leading-[0.85] text-white">
            QUANTUM <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-gray-200 to-white">
              INTELLIGENCE
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-base md:text-xl text-gray-400 font-medium leading-relaxed">
            The open-source, institutional-grade financial terminal powered by generative AI. 
            Real-time Monte Carlo simulations, GARCH volatility modeling, and neural risk analysis.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4 md:pt-8">
            <button 
              onClick={handleInitialize}
              className="group relative px-8 py-4 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all duration-500 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              Initialize Terminal 
              <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRight size={14} />
              </div>
            </button>
            <button className="px-8 py-4 bg-transparent border border-white/20 rounded-full font-black text-sm uppercase tracking-widest hover:bg-white/5 transition-colors text-white w-full sm:w-auto">
              Read Manifesto
            </button>
          </div>
        </motion.div>

        {/* Bento Grid Features */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto mt-32 w-full px-4"
        >
          <div className="md:col-span-2 p-8 rounded-[32px] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <BrainCircuit className="text-indigo-400 mb-6" size={32} />
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Neural Core</h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Powered by Gemini 2.5 Flash. Processes 1M+ tokens of context for deep macroeconomic analysis and real-time sentiment scoring.
            </p>
          </div>
          
          <div className="md:col-span-2 p-8 rounded-[32px] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 relative overflow-hidden group">
             <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Activity className="text-emerald-400 mb-6" size={32} />
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Stochastic Engine</h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Real-time Monte Carlo & GARCH models running directly in your browser via WebAssembly. No backend required.
            </p>
          </div>

          <div className="md:col-span-1 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-white/[0.04] transition-colors">
            <Globe className="text-gray-400 mb-4 group-hover:text-white transition-colors" size={24} />
            <h4 className="text-sm font-bold text-white">Global Feeds</h4>
          </div>

          <div className="md:col-span-2 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-colors">
            <div>
              <h4 className="text-lg font-bold text-white mb-1">Open Source Architecture</h4>
              <p className="text-xs text-gray-500">Deploy your own instance in minutes.</p>
            </div>
            <Github className="text-gray-600 group-hover:text-white transition-colors" size={32} />
          </div>

          <div className="md:col-span-1 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-white/[0.04] transition-colors">
            <BarChart3 className="text-gray-400 mb-4 group-hover:text-white transition-colors" size={24} />
            <h4 className="text-sm font-bold text-white">BYOK Model</h4>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-32 py-12 text-center bg-black/50 backdrop-blur-xl">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
          Lumia Systems © 2026 • Open Source Financial Intelligence
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
