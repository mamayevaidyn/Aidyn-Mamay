import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

interface GarchVisualizerProps {
  returns: number[];
  conditionalVolatility: number[];
}

const GarchVisualizer: React.FC<GarchVisualizerProps> = ({ returns, conditionalVolatility }) => {
  if (returns.length === 0) {
    return (
      <div className="w-full h-[400px] bg-[#0b0f1a] p-4 rounded-2xl border border-white/10 flex items-center justify-center">
        <p className="text-gray-500 text-xs uppercase tracking-widest animate-pulse">Initializing GARCH Engine...</p>
      </div>
    );
  }

  const data = returns.map((ret, i) => ({
    index: i,
    return: ret,
    volatility: conditionalVolatility[i]
  }));

  return (
    <div className="w-full h-[400px] bg-[#0b0f1a] p-4 rounded-2xl border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis dataKey="index" tick={{ fill: '#888' }} />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fill: '#8884d8' }} />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fill: '#82ca9d' }} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.8)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          <Bar yAxisId="left" dataKey="return" barSize={2} fill="#8884d8" name="Returns" />
          <Line yAxisId="right" type="monotone" dataKey="volatility" stroke="#82ca9d" dot={false} name="Conditional Volatility" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GarchVisualizer;
