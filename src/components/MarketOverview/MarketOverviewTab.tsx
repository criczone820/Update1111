import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, Globe, DollarSign, Coins } from 'lucide-react';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

const MarketOverviewTab: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchMarketData();
    // Update every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      
      // Fetch BTC/USD from CoinGecko
      const btcResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
      );
      const btcData = await btcResponse.json();
      
      // Fetch ETH/USD from CoinGecko
      const ethResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true'
      );
      const ethData = await ethResponse.json();
      
      // Fetch Gold price (XAU/USD) - using a free API
      const goldResponse = await fetch(
        'https://api.metals.live/v1/spot/gold'
      );
      const goldData = await goldResponse.json();
      
      const formattedData: MarketData[] = [
        {
          symbol: 'BTC/USD',
          name: 'Bitcoin',
          price: btcData.bitcoin?.usd || 0,
          change: 0, // CoinGecko doesn't provide absolute change
          changePercent: btcData.bitcoin?.usd_24h_change || 0,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'ETH/USD',
          name: 'Ethereum',
          price: ethData.ethereum?.usd || 0,
          change: 0,
          changePercent: ethData.ethereum?.usd_24h_change || 0,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'XAU/USD',
          name: 'Gold',
          price: goldData[0]?.price || 2000, // Fallback price
          change: 0,
          changePercent: Math.random() * 2 - 1, // Random change for demo
          lastUpdated: new Date().toISOString()
        }
      ];
      
      setMarketData(formattedData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      // Fallback data
      setMarketData([
        {
          symbol: 'BTC/USD',
          name: 'Bitcoin',
          price: 43250.00,
          change: 1250.00,
          changePercent: 2.98,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'ETH/USD',
          name: 'Ethereum',
          price: 2650.00,
          change: -45.00,
          changePercent: -1.67,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'XAU/USD',
          name: 'Gold',
          price: 2045.50,
          change: 12.30,
          changePercent: 0.61,
          lastUpdated: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('BTC') || symbol.includes('ETH')) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number, changePercent: number) => {
    const isPositive = changePercent >= 0;
    const sign = isPositive ? '+' : '';
    return {
      percent: `${sign}${changePercent.toFixed(2)}%`,
      absolute: change !== 0 ? `${sign}$${Math.abs(change).toFixed(2)}` : '',
      isPositive
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-xl p-6 border border-slate-700"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Market Overview
        </h3>
        
        <div className="flex items-center space-x-4">
          <span className="text-xs text-slate-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchMarketData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {marketData.map((asset, index) => {
          const changeData = formatChange(asset.change, asset.changePercent);
          
          return (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-slate-600 rounded-lg">
                  {asset.symbol.includes('BTC') && <Coins className="w-5 h-5 text-orange-400" />}
                  {asset.symbol.includes('ETH') && <Coins className="w-5 h-5 text-blue-400" />}
                  {asset.symbol.includes('XAU') && <DollarSign className="w-5 h-5 text-yellow-400" />}
                </div>
                
                <div>
                  <h4 className="text-white font-medium">{asset.symbol}</h4>
                  <p className="text-slate-400 text-sm">{asset.name}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-white font-semibold text-lg">
                  {formatPrice(asset.price, asset.symbol)}
                </p>
                
                <div className={`flex items-center justify-end space-x-1 text-sm ${
                  changeData.isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {changeData.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{changeData.percent}</span>
                  {changeData.absolute && (
                    <span className="text-slate-400">({changeData.absolute})</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Market Status Indicator */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Market Status</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400">Live</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-slate-400 text-xs">24h Volume</p>
          <p className="text-white text-sm font-medium">$45.2B</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Market Cap</p>
          <p className="text-white text-sm font-medium">$1.65T</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Dominance</p>
          <p className="text-white text-sm font-medium">52.3%</p>
        </div>
      </div>
    </motion.div>
  );
};

export default MarketOverviewTab;