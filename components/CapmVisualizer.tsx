import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';

interface CapmVisualizerProps {
  assetReturns: number[];
  marketReturns: number[];
  beta: number;
}

const CapmVisualizer: React.FC<CapmVisualizerProps> = ({ assetReturns, marketReturns, beta }) => {
  const data = marketReturns.map((mr, i) => ({ x: mr, y: assetReturns[i] }));

  // Find min and max market returns to draw the regression line
  const minMarketReturn = Math.min(...marketReturns);
  const maxMarketReturn = Math.max(...marketReturns);
  const regressionLine = [
    { x: minMarketReturn, y: beta * minMarketReturn },
    { x: maxMarketReturn, y: beta * maxMarketReturn },
  ];

  return (
    <div className="w-full h-[400px] bg-[#0b0f1a] p-4 rounded-2xl border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis type="number" dataKey="x" name="Market Return" unit="%" tick={{ fill: '#888' }} label={{ value: 'Market Return', position: 'insideBottom', offset: -10, fill: '#888' }} />
          <YAxis type="number" dataKey="y" name="Asset Return" unit="%" tick={{ fill: '#888' }} label={{ value: 'Asset Return', angle: -90, position: 'insideLeft', fill: '#888' }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.8)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          <Scatter name="Returns" data={data} fill="#8884d8" />
          <Line type="monotone" dataKey="y" data={regressionLine} stroke="#82ca9d" dot={false} strokeWidth={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CapmVisualizer;
