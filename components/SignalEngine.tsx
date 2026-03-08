import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PricePoint } from '../types';

interface SignalEngineProps {
  rawData?: PricePoint[];
  filteredData?: PricePoint[];
  simulationData?: PricePoint[][];
  title: string;
}

const SignalEngine: React.FC<SignalEngineProps> = ({ rawData, filteredData, simulationData, title }) => {
  const chartData = rawData ? rawData.map((rawPoint, index) => ({
    date: rawPoint.date,
    'Raw Price': rawPoint.price,
    'Filtered': filteredData ? filteredData[index]?.price : undefined,
  })) : simulationData ? simulationData[0].map((point, index) => {
    const dataPoint: {[key: string]: any} = { date: point.date };
    simulationData.forEach((sim, i) => {
      dataPoint[`Sim ${i + 1}`] = sim[index]?.price;
    });
    return dataPoint;
  }) : [];

  return (
    <div className="w-full h-[400px] bg-[#0b0f1a] p-4 rounded-2xl border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis dataKey="date" stroke="#888" fontSize={12} tick={{ fill: '#888' }} />
          <YAxis stroke="#888" fontSize={12} tick={{ fill: '#888' }} domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(2, 6, 23, 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: '#fff'
            }}
          />
          {(!simulationData || simulationData.length <= 10) && <Legend wrapperStyle={{ color: '#fff', fontSize: '12px' }} />}
          {rawData && <Line type="monotone" dataKey="Raw Price" stroke="#8884d8" strokeWidth={2} dot={false} />}
          {filteredData && <Line type="monotone" dataKey="Filtered" stroke="#82ca9d" strokeWidth={2} dot={false} />}
          {simulationData && simulationData.map((_, i) => (
            <Line key={i} type="monotone" dataKey={`Sim ${i + 1}`} stroke={`rgba(136, 132, 216, ${1 - i*0.15})`} strokeWidth={1} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SignalEngine;
