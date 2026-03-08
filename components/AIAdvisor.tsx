import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Sparkles, User, Bot, 
  TrendingUp, Shield, BookOpen, BrainCircuit, 
  ChevronRight, Loader2, StopCircle, Zap, Command,
  Hexagon, Layers, Activity, FileDown, Volume2, VolumeX, AlertTriangle
} from 'lucide-react';
import { PortfolioState, SimulationData } from '../types';
import { getAIAdvisorStream } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { generatePortfolioPDF } from '../services/pdfService';

interface LumiaAdvisorProps {
  portfolio: PortfolioState;
  simulationData?: SimulationData;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const AIAdvisor: React.FC<LumiaAdvisorProps> = ({ portfolio, simulationData }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome. I've calibrated the risk models and run the Monte Carlo simulations for your current allocation. The volatility surface is showing some unique opportunities. What is your strategic focus today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history from Firestore
  useEffect(() => {
    const loadHistory = async () => {
      if (!user || !db) return;
      try {
        const q = query(
          collection(db, 'users', user.uid, 'chats'),
          orderBy('timestamp', 'asc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        const loadedMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({
            id: doc.id,
            role: data.role,
            content: data.content,
            timestamp: data.timestamp?.toDate() || new Date()
          });
        });
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        }
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };
    loadHistory();
  }, [user]);

  const saveMessageToDb = async (msg: Message) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        role: msg.role,
        content: msg.content,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to save message", err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean markdown formatting for speech
    const cleanText = text.replace(/[*#_`]/g, '').replace(/\[.*?\]\(.*?\)/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a good English voice (preferably female/professional)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.lang === 'en-US');
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    saveMessageToDb(userMsg);
    setInput('');
    setIsGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const stream = getAIAdvisorStream(userMsg.content, portfolio, history, simulationData);
      
      let fullResponse = "";
      
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId 
            ? { ...m, content: fullResponse } 
            : m
        ));
      }
      
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId 
          ? { ...m, isStreaming: false } 
          : m
      ));

      saveMessageToDb({
        id: assistantMsgId,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      });

      // Speak the final response if voice is enabled
      speakText(fullResponse);

    } catch (err) {
      const errorMsg = "Secure connection interrupted. Re-establishing neural link...";
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date()
      }]);
      speakText(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestions = [
    "Analyze tail risk scenarios",
    "Interpret the volatility surface",
    "Optimize for Sharpe ratio",
    "Stress test against inflation"
  ];

  return (
    <div className="h-[calc(100vh-140px)] max-h-[800px] grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 font-sans">
      {/* Chat Interface */}
      <div className="lg:col-span-8 flex flex-col bg-[#080808] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/5 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.01] backdrop-blur-xl flex justify-between items-center z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Hexagon className="text-white fill-white/20" size={24} strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#080808] rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Lumia Intelligence</h2>
              <p className="text-xs font-medium text-indigo-300/60 tracking-wide">Institutional Grade Advisor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleVoice}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 border rounded-full transition-colors ${voiceEnabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
            >
              {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="text-[10px] font-bold uppercase tracking-widest">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>
            <button 
              onClick={() => generatePortfolioPDF(portfolio)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-full transition-colors text-indigo-400"
            >
              <FileDown size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Export PDF</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
              <Sparkles size={12} className="text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">LUMIA Core v4</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-white text-black' 
                  : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white'
              }`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              
              <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-6 rounded-3xl text-[15px] leading-7 font-medium shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-white text-black rounded-tr-sm' 
                    : 'bg-[#111] border border-white/10 text-gray-200 rounded-tl-sm shadow-inner'
                }`}>
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className="mb-3 last:mb-0">{line}</p>
                  ))}
                  {msg.isStreaming && (
                    <div className="flex gap-1 mt-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-gray-600 px-2">
                  {msg.role === 'assistant' ? 'Lumia Core' : 'You'} • {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white/[0.01] backdrop-blur-md border-t border-white/5 z-10">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            <div className="relative flex items-center bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-xl">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask complex questions about your portfolio..."
                className="w-full bg-transparent border-none py-4 pl-6 pr-16 text-sm font-medium text-white focus:ring-0 placeholder:text-gray-600"
                disabled={isGenerating}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className="absolute right-2 p-2.5 bg-white text-black rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:hover:bg-white shadow-lg shadow-white/10"
              >
                {isGenerating ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} className="ml-0.5" />}
              </button>
            </div>
          </div>
          
          <div className="flex gap-3 mt-5 overflow-x-auto no-scrollbar pb-2">
            {suggestions.map((s, i) => (
              <button 
                key={i}
                onClick={() => setInput(s)}
                className="px-4 py-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 rounded-full text-xs font-medium text-gray-400 hover:text-white whitespace-nowrap transition-all shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Context */}
      <div className="lg:col-span-4 space-y-6">
        {/* System Status Card */}
        <div className="bg-[#080808] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] group-hover:bg-indigo-500/20 transition-all duration-700" />
          
          <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" /> 
            <span className="tracking-wide">LIVE TELEMETRY</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${simulationData?.mcPaths.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs font-medium text-gray-400">Monte Carlo Engine</span>
              </div>
              <span className="text-xs font-bold text-white">{simulationData?.mcPaths.length ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${simulationData?.garchData.conditionalVolatility.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs font-medium text-gray-400">GARCH Volatility</span>
              </div>
              <span className="text-xs font-bold text-white">{simulationData?.garchData.conditionalVolatility.length ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${simulationData?.famaFrenchData.betas.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs font-medium text-gray-400">Factor Models</span>
              </div>
              <span className="text-xs font-bold text-white">{simulationData?.famaFrenchData.betas.length ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Latency</span>
              <span className="font-mono text-indigo-400">12ms</span>
            </div>
          </div>
        </div>

        {/* Knowledge Card */}
        <div className="bg-gradient-to-b from-[#0f0f0f] to-[#050505] border border-white/5 rounded-[32px] p-8 shadow-2xl">
           <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Layers size={16} className="text-purple-400" /> 
            <span className="tracking-wide">CAPABILITIES</span>
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            Lumia Intelligence is connected directly to the firm's quantitative core. It can perform real-time stress tests, analyze factor exposure, and project future price paths using stochastic calculus.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
              <div className="text-lg font-bold text-white mb-1">10k+</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sim Paths</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
              <div className="text-lg font-bold text-white mb-1">4</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Risk Models</div>
            </div>
          </div>
        </div>
        <div className="p-10 border-t border-white/5 bg-white/[0.01]">
          <div className="flex items-start gap-4 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
            <AlertTriangle className="text-amber-500 mt-1 shrink-0" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">AI Risk Disclosure</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-bold">
                AI ANALYSIS IS EXPERIMENTAL AND MAY CONTAIN ERRORS. ALL SUGGESTIONS ARE FOR INFORMATIONAL PURPOSES ONLY. LUMIA QUANTUM IS NOT A FINANCIAL ADVISOR. CONSULT A PROFESSIONAL BEFORE TRADING.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
