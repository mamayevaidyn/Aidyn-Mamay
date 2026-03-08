import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VarVisualizerProps {
  series: number[][];
  forecasts: number[][];
}

const VarVisualizer: React.FC<VarVisualizerProps> = ({ series, forecasts }) => {
  const originalLength = series.length > 0 && series[0] ? series[0].length : 0;
  const forecastLength = forecasts.length > 0 && forecasts[0] ? forecasts[0].length : 0;

  if (originalLength === 0) {
    return (
      <div className="w-full h-[400px] bg-[#0b0f1a] p-4 rounded-2xl border border-white/10 flex items-center justify-center">
        <p className="text-gray-500 text-xs uppercase tracking-widest animate-pulse">Initializing VAR Engine...</p>
      </div>
    );
  }

  const data = Array.from({ length: originalLength + forecastLength }, (_, i) => {
    const point: { index: number, [key: string]: number | undefined } = { index: i };
    series.forEach((s, sIndex) => {
      point[`series${sIndex}`] = i < originalLength ? s[i] : undefined;
    });
    forecasts.forEach((f, fIndex) => {
        point[`forecast${fIndex}`] = i >= originalLength ? f[i - originalLength] : undefined;
    });
    return point;
  });

  const colors = ['#8884d8', '#82ca9d', '#ffc658'];

  return (
    <div className="w-full h-[400px] bg-[#0b0f1a] p-4 rounded-2xl border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis dataKey="index" tick={{ fill: '#888' }} />
          <YAxis tick={{ fill: '#888' }} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.8)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          <Legend />
          {series.map((_, i) => (
            <Line key={`series-${i}`} type="monotone" dataKey={`series${i}`} stroke={colors[i]} dot={false} name={`Series ${i+1}`} />
          ))}
          {forecasts.map((_, i) => (
            <Line key={`forecast-${i}`} type="monotone" dataKey={`forecast${i}`} stroke={colors[i]} strokeDasharray="5 5" dot={false} name={`Forecast ${i+1}`} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VarVisualizer;
