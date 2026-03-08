import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

interface AptVisualizerProps {
  explainedVariance: number[];
}

const AptVisualizer: React.FC<AptVisualizerProps> = ({ explainedVariance }) => {
  const data = explainedVariance.slice(0, 10).map((val, i) => ({
    name: `PC ${i + 1}`,
    variance: val * 100 // Convert to percentage
  }));

  return (
    <div className="w-full h-[400px] bg-[#0b0f1a] p-4 rounded-2xl border border-white/10">
      <h3 className="text-md font-semibold text-white mb-4">Explained Variance by Principal Component</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis dataKey="name" tick={{ fill: '#888' }}>
            <Label value="Principal Components" offset={-15} position="insideBottom" fill="#888" />
          </XAxis>
          <YAxis tick={{ fill: '#888' }} unit="%">
            <Label value="Variance Explained" angle={-90} position="insideLeft" fill="#888" style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip cursor={{ fill: 'rgba(136, 132, 216, 0.2)' }} contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.8)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          <Bar dataKey="variance" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AptVisualizer;
