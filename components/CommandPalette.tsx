import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, Zap, Activity, Globe, Shield, Cpu, BarChart2, Rocket, MessageSquareCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNavigate: (tab: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, setIsOpen, onNavigate }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const commands = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: Activity, action: () => onNavigate('dashboard') },
    { id: 'builder', label: 'Portfolio Builder', icon: Zap, action: () => onNavigate('builder') },
    { id: 'intel', label: 'Intelligence Hub', icon: Cpu, action: () => onNavigate('intel') },
    { id: 'wire', label: 'News Terminal', icon: Globe, action: () => onNavigate('wire') },
    { id: 'risk', label: 'Risk Engine', icon: Shield, action: () => onNavigate('risk') },
    { id: 'lab', label: 'Quant Lab', icon: BarChart2, action: () => onNavigate('lab') },
    { id: 'performance', label: 'Performance Report', icon: BarChart2, action: () => onNavigate('performance') },
    { id: 'engine', label: 'Simulation Engine', icon: Zap, action: () => onNavigate('engine') },
    { id: 'launch', label: 'Launch Readiness', icon: Rocket, action: () => onNavigate('launch') },
    { id: 'strategy', label: 'Strategy Analysis', icon: Activity, action: () => onNavigate('strategy') },
    { id: 'explorer', label: 'Market Explorer', icon: Search, action: () => onNavigate('explorer') },
    { id: 'advisor', label: 'AI Advisor', icon: MessageSquareCode, action: () => onNavigate('advisor') },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-[#333]">
              <Search className="w-5 h-5 text-gray-500 mr-3" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg font-mono"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 font-mono border border-[#333] px-2 py-1 rounded">
                <span>ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {filteredCommands.length > 0 ? (
                <div className="px-2">
                  <div className="text-xs font-mono text-gray-500 px-2 py-1 mb-1">NAVIGATION</div>
                  {filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg group transition-colors ${index === 0 ? 'bg-white/5' : 'hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md bg-[#111] text-gray-400 group-hover:text-white group-hover:bg-[#222] transition-colors`}>
                          <cmd.icon className="w-4 h-4" />
                        </div>
                        <span className="text-gray-300 group-hover:text-white font-medium">{cmd.label}</span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500">
                  <p>No commands found for "{query}"</p>
                </div>
              )}
            </div>
            
            <div className="bg-[#111] px-4 py-2 border-t border-[#333] flex justify-between items-center text-xs text-gray-500 font-mono">
              <div className="flex gap-4">
                <span><span className="text-white">↑↓</span> to navigate</span>
                <span><span className="text-white">↵</span> to select</span>
              </div>
              <div>LUMIA QUANT TERMINAL v1.0</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
