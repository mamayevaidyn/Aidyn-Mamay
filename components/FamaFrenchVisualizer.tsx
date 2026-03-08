import React from 'react';

interface FamaFrenchVisualizerProps {
  betas: number[]; // [alpha, beta_mkt, beta_smb, beta_hml]
}

const FamaFrenchVisualizer: React.FC<FamaFrenchVisualizerProps> = ({ betas }) => {
  const factorNames = ['Market (MKT)', 'Size (SMB)', 'Value (HML)'];
  const factorBetas = betas.slice(1); // Exclude alpha (intercept)

  return (
    <div className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/10">
      <h3 className="text-md font-semibold text-white mb-4">Factor Loadings (Betas)</h3>
      <div className="space-y-3">
        {factorBetas.map((beta, i) => (
          <div key={i} className="flex items-center justify-between bg-[#020617] p-3 rounded-lg">
            <span className="text-sm text-gray-300">{factorNames[i]}</span>
            <div className="flex items-center space-x-2">
              <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`${beta > 0 ? 'bg-green-500' : 'bg-red-500'} h-full rounded-full`}
                  style={{ width: `${Math.abs(beta) * 50}%` }} // Scale for visualization
                ></div>
              </div>
              <span className={`text-sm font-mono ${beta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {beta.toFixed(3)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">Alpha (Intercept): {betas[0].toFixed(3)}</p>
    </div>
  );
};

export default FamaFrenchVisualizer;
