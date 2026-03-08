import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket, AlertTriangle, CheckCircle2, XCircle, 
  Server, Shield, Database, Wifi, Code, 
  Construction, Lock, Zap, Github, Cpu, BookOpen
} from 'lucide-react';

const LaunchPad: React.FC = () => {
  const [userCount, setUserCount] = useState(100);
  
  const modules = [
    { 
      name: 'UI/UX Polish', 
      status: 100, 
      color: 'text-emerald-500', 
      bar: 'bg-emerald-500',
      icon: <Zap size={18} />,
      desc: 'Institutional-grade visuals. Ready to impress GitHub stars.'
    },
    { 
      name: 'Educational Value', 
      status: 90, 
      color: 'text-emerald-400', 
      bar: 'bg-emerald-400',
      icon: <BookOpen size={18} />,
      desc: 'Visualizes complex quant concepts (Greeks, Monte Carlo) better than textbooks.'
    },
    { 
      name: 'Open Source Docs', 
      status: 20, 
      color: 'text-rose-500', 
      bar: 'bg-rose-500',
      icon: <Github size={18} />,
      desc: 'Needs README, Contributing Guide, and License (MIT/Apache).'
    },
    { 
      name: 'Data Abstraction', 
      status: 60, 
      color: 'text-amber-500', 
      bar: 'bg-amber-500',
      icon: <Database size={18} />,
      desc: 'Need to separate "Mock Data" from "Real Data" adapters so devs can plug in their own feeds.'
    },
    { 
      name: 'Gemini Integration', 
      status: 80, 
      color: 'text-indigo-400', 
      bar: 'bg-indigo-400',
      icon: <Cpu size={18} />,
      desc: 'AI logic is solid. Needs "Bring Your Own Key" settings for open source users.'
    }
  ];

  const totalReadiness = Math.round(modules.reduce((acc, m) => acc + m.status, 0) / modules.length);

  // Gemini Token Math
  // Assumption: 1 Analysis = 1000 tokens (input + output)
  // 2 Million Tokens = 2,000 analyses
  const dailyAnalysesPerUser = 5;
  const tokensPerAnalysis = 1000;
  const dailyBurn = userCount * dailyAnalysesPerUser * tokensPerAnalysis;
  const runwayDays = 2000000 / dailyBurn;

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="syne text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
            <Rocket className="text-indigo-500" size={32} /> Open Source Launch
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Strategy: Free Core &rarr; Paid Pro</p>
        </div>
        <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-right">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GitHub Readiness</div>
          <div className={`text-3xl font-black mono tracking-tighter ${totalReadiness > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {totalReadiness}%
          </div>
        </div>
      </div>

      {/* Honest Assessment Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-indigo-500/10 border border-indigo-500/20 rounded-[32px] p-8 flex items-start gap-6"
      >
        <div className="p-4 bg-indigo-500/20 rounded-2xl shrink-0">
          <BookOpen size={32} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">The "Warren Buffett" Killer?</h3>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            You are absolutely right. This terminal <strong>visualizes</strong> what courses only <strong>describe</strong>. 
            <br/><br/>
            To replace a $2,000 course, the "Killer Feature" is <strong>Interactive Learning</strong>. 
            We need to make sure every chart (Monte Carlo, Greeks) explains <em>itself</em>. 
            If we launch Open Source, developers will build the data feeds for us. Your value is the <strong>UX & Educational Layer</strong>.
          </p>
        </div>
      </motion.div>

      {/* Gemini Token Estimator */}
      <div className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="syne text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Cpu size={20} className="text-indigo-500" /> Gemini API Economics
          </h3>
          <div className="px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            2,000,000 Token Limit
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              If you host this for users (SaaS), 2M tokens burns fast. 
              For Open Source, the best strategy is <strong>"Bring Your Own Key" (BYOK)</strong>. 
              Users input their own Gemini API key, and it costs you $0.
            </p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Users</label>
                  <span className="text-xs font-mono text-white">{userCount}</span>
                </div>
                <input 
                  type="range" min="10" max="1000" step="10" 
                  value={userCount} 
                  onChange={(e) => setUserCount(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Runway</span>
                  <span className={`text-xl font-black mono ${runwayDays < 1 ? 'text-rose-500' : 'text-white'}`}>
                    {runwayDays < 1 ? '< 1 Day' : `${runwayDays.toFixed(1)} Days`}
                  </span>
                </div>
                <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                  Assuming {dailyAnalysesPerUser} AI queries/user/day
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-full min-h-[200px] bg-indigo-900/10 rounded-2xl border border-indigo-500/10 flex items-center justify-center p-8 text-center">
            <div>
              <div className="text-3xl font-black text-white mb-2">BYOK Strategy</div>
              <p className="text-xs text-indigo-300 font-medium max-w-xs mx-auto">
                "Bring Your Own Key"
                <br/><br/>
                If you launch Open Source, add a Settings menu where users paste <em>their</em> Gemini Key. 
                This makes your operational cost <strong>$0</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-6 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white/5 ${m.color}`}>
                  {m.icon}
                </div>
                <span className="text-sm font-black text-white uppercase tracking-wider">{m.name}</span>
              </div>
              <span className={`text-xl font-black mono ${m.color}`}>{m.status}%</span>
            </div>
            
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${m.status}%` }}
                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                className={`h-full ${m.bar}`}
              />
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {m.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LaunchPad;
