import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const SimulationPulse = React.memo(() => {
  const [data, setData] = useState<{ v: number }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const next = [...prev, { v: 40 + Math.random() * 20 + (Math.sin(Date.now() / 1000) * 10) }];
        if (next.length > 20) return next.slice(1);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey="v" 
          stroke="#6366f1" 
          strokeWidth={3} 
          dot={false} 
          isAnimationActive={false} 
        />
        <XAxis dataKey="v" hide />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
          labelStyle={{ display: 'none' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

export default SimulationPulse;
