import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Dashboard from '../components/Dashboard';
import RiskEngine from '../components/RiskEngine';
import MarketExplorer from '../components/MarketExplorer';
import PortfolioBuilder from '../components/PortfolioBuilder';
import AIAdvisor from '../components/AIAdvisor';
import IntelligenceHub from '../components/IntelligenceHub';
import NewsTerminal from '../components/NewsTerminal';
import AnalysisTerminal from '../components/AnalysisTerminal';
import QuantLab from '../components/QuantLab';
import PerformanceReport from '../components/PerformanceReport';
import EngineTerminal from '../components/EngineTerminal';
import LaunchPad from '../components/LaunchPad';
import CommandPalette from '../components/CommandPalette';
import LegalModal from '../components/LegalModal';
import LegalDisclosures from '../components/LegalDisclosures';
import { PortfolioState, Asset, SimulationData, PricePoint } from '../types';
import { 
  calculatePortfolioMetrics, 
  getMarketSnapshot,
  getMarketRegime,
  calculateFactorExposures,
  calculateValuation,
  projectPrice,
  calculateRiskContributions,
  calculateCorrelationMatrix,
  cacheHistoricalReturns,
  MARKET_UNIVERSE
} from '../services/quantEngine';
import { fetchRealTimePrice, fetchHistoricalData } from '../services/marketDataService';

const DEFAULT_SIMULATION_DATA: SimulationData = {
  kfData: {raw: [], filtered: []},
  ekfData: {raw: [], filtered: []},
  ukfData: {raw: [], filtered: []},
  pfData: {raw: [], filtered: []},
  gbmData: [],
  ouData: [],
  hestonData: [],
  capmData: {assetReturns: [], marketReturns: [], beta: 0},
  famaFrenchData: {betas: []},
  aptData: {explainedVariance: []},
  garchData: {returns: [], conditionalVolatility: []},
  varData: {series: [], forecasts: []},
  mcPaths: [],
  lastUpdated: 0
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  // Initialize with an empty portfolio as requested
  const [userAssets, setUserAssets] = useState<Asset[]>([
    { ticker: 'AAPL', name: 'Apple Inc', weight: 0.4, price: 150, quantity: 10, sector: 'Tech', beta: 1.1, volatility: 0.2, lastChange: 0.5, isLive: true },
    { ticker: 'MSFT', name: 'Microsoft Corp', weight: 0.3, price: 300, quantity: 5, sector: 'Tech', beta: 1.0, volatility: 0.15, lastChange: -0.2, isLive: true },
    { ticker: 'GOOGL', name: 'Alphabet Inc', weight: 0.3, price: 2800, quantity: 2, sector: 'Tech', beta: 1.05, volatility: 0.18, lastChange: 0.1, isLive: true }
  ]);
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationData>(DEFAULT_SIMULATION_DATA);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState<boolean>(() => {
    return localStorage.getItem('lumia_legal_accepted') === 'true';
  });

  // Background Price Refresher
  useEffect(() => {
    const refreshPortfolioPrices = async () => {
      if (userAssets.length === 0 || isSyncing) return;
      setIsSyncing(true);
      try {
        const updated = await Promise.all(userAssets.map(async (asset) => {
          try {
            const freshData = await fetchRealTimePrice(asset.ticker);
            if (freshData && freshData.price !== asset.price) {
              const change = ((freshData.price - asset.price) / asset.price) * 100;
              return { ...asset, price: freshData.price, lastChange: Number(change.toFixed(2)), isLive: true };
            }
          } catch (e) {
            console.warn(`Failed to fetch price for ${asset.ticker}`);
          }
          return asset;
        }));
        
        // Only update state if prices actually changed to avoid unnecessary re-renders
        const hasChanges = updated.some((a, i) => a.price !== userAssets[i].price);
        if (hasChanges) {
          setUserAssets(updated);
          setLastSync(new Date());
        }
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    const interval = setInterval(refreshPortfolioPrices, 60000);
    return () => clearInterval(interval);
  }, [userAssets, isSyncing]); // Added userAssets to dependencies for correct closure, but handled with isSyncing check

  // Historical Data Caching for Quant Engine
  useEffect(() => {
    const syncHistoricalData = async () => {
      if (userAssets.length === 0) return;
      
      const tickers = userAssets.map(a => a.ticker).join(',');
      // Use a simple ref-like check to avoid re-syncing if tickers haven't changed
      // (In a real app, we'd use a proper cache or useRef)
      
      await Promise.all(userAssets.map(async (asset) => {
        try {
          // Only fetch if not already in some form of cache or if it's a new asset
          const history = await fetchHistoricalData(asset.ticker, 250);
          if (history && history.length > 1) {
            cacheHistoricalReturns(asset.ticker, history.map(p => p.price));
          }
        } catch (e) {
          console.warn(`Failed to cache history for ${asset.ticker}`, e);
        }
      }));
    };
    syncHistoricalData();
    // Only run when the set of tickers changes, not when prices update
  }, [userAssets.map(a => a.ticker).join(',')]); 

  useEffect(() => {
    const updatePortfolio = () => {
      const market = getMarketSnapshot();
      const enhancedAssets = userAssets.map(asset => ({
        ...asset,
        valuation: calculateValuation(asset),
        projection: projectPrice(asset, market),
        metrics: {
          sharpeRatio: (asset.fundamentals?.historicalReturn1y || 0.1) / (asset.volatility || 1)
        }
      }));

      const metrics = calculatePortfolioMetrics(enhancedAssets);
      const totalValue = enhancedAssets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0);
      
      setPortfolio({
        assets: enhancedAssets.map(a => ({ ...a, weight: totalValue > 0 ? (a.price * (a.quantity || 0)) / totalValue : 0 })),
        totalValue,
        currency: 'USD',
        regime: getMarketRegime(),
        metrics,
        market,
        factors: calculateFactorExposures(enhancedAssets),
        pcaData: [],
        recommendations: [],
        riskContributions: calculateRiskContributions(enhancedAssets),
        correlationMatrix: calculateCorrelationMatrix(enhancedAssets)
      });
    };
    updatePortfolio();
  }, [userAssets]);

  const handleUpdateAssets = useCallback((newAssets: Asset[]) => {
    setUserAssets(newAssets);
  }, []);

  if (!portfolio) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#020617]">
        <div className="text-center animate-pulse">
          <h1 className="text-4xl font-black text-white tracking-[0.3em]">LUMIA</h1>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hasAcceptedLegal && (
        <LegalModal onAccept={() => {
          setHasAcceptedLegal(true);
          localStorage.setItem('lumia_legal_accepted', 'true');
        }} />
      )}
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} portfolio={portfolio} syncInfo={{ lastSync, isSyncing }}>
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        setIsOpen={setIsCommandPaletteOpen} 
        onNavigate={setActiveTab} 
      />
      {activeTab === 'dashboard' && <Dashboard portfolio={portfolio} setActiveTab={setActiveTab} />}
      {activeTab === 'builder' && <PortfolioBuilder currentAssets={userAssets} onUpdate={handleUpdateAssets} />}
      {activeTab === 'intel' && <IntelligenceHub portfolio={portfolio} />}
      {activeTab === 'wire' && <NewsTerminal />}
      {activeTab === 'risk' && <RiskEngine portfolio={portfolio} />}
      {activeTab === 'lab' && <QuantLab portfolio={portfolio} />}
      {activeTab === 'performance' && <PerformanceReport portfolio={portfolio} />}
      {activeTab === 'launch' && <LaunchPad />}
      {activeTab === 'strategy' && <AnalysisTerminal portfolio={portfolio} />}
      {activeTab === 'explorer' && (
        <MarketExplorer 
          assets={Array.from(new Map([...MARKET_UNIVERSE, ...userAssets].map(a => [a.ticker, a])).values())} 
          inventory={userAssets} 
        />
      )}
      {activeTab === 'advisor' && <AIAdvisor portfolio={portfolio} simulationData={simulationData} />}
      {activeTab === 'engine' && <EngineTerminal simulationData={simulationData} setSimulationData={setSimulationData} />}
      {activeTab === 'legal' && <LegalDisclosures />}
    </Layout>
    </>
  );
};

export default App;
