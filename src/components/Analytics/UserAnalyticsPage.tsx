import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Award,
  Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { tradingService } from '../../services/tradingService';
import { TradingSession, Trade } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/calculations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface UserAnalytics {
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownAmount: number;
  profitFactor: number;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  longTrades: number;
  shortTrades: number;
  avgHoldTime: string;
  bestTime: string;
  avgRiskPerTrade: number;
  maxRisk: number;
  bestStreak: number;
  worstStreak: number;
  riskLevel: 'Low' | 'Moderate' | 'High';
  activeCapital: number;
}

const UserAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load all sessions
      const sessionsData = await tradingService.getSessions(user!.id);
      setSessions(sessionsData);
      
      // Load all trades across all sessions
      const allTradesPromises = sessionsData.map(session => 
        tradingService.getTrades(session.id)
      );
      const tradesArrays = await Promise.all(allTradesPromises);
      const flatTrades = tradesArrays.flat();
      setAllTrades(flatTrades);
      
      // Calculate analytics
      const calculatedAnalytics = calculateUserAnalytics(sessionsData, flatTrades);
      setAnalytics(calculatedAnalytics);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserAnalytics = (sessions: TradingSession[], trades: Trade[]): UserAnalytics => {
    if (trades.length === 0) {
      return {
        sharpeRatio: 0,
        maxDrawdown: 0,
        maxDrawdownAmount: 0,
        profitFactor: 0,
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        longTrades: 0,
        shortTrades: 0,
        avgHoldTime: '0h',
        bestTime: 'N/A',
        avgRiskPerTrade: 0,
        maxRisk: 0,
        bestStreak: 0,
        worstStreak: 0,
        riskLevel: 'Low',
        activeCapital: sessions.reduce((sum, s) => sum + s.current_capital, 0)
      };
    }

    const totalPnL = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const winningTrades = trades.filter(trade => trade.profit_loss > 0);
    const losingTrades = trades.filter(trade => trade.profit_loss < 0);
    
    const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit_loss, 0));
    
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    const winRate = (winningTrades.length / trades.length) * 100;
    
    // Calculate drawdown
    let runningPnL = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownAmount = 0;
    
    trades.forEach(trade => {
      runningPnL += trade.profit_loss;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdownAmount) {
        maxDrawdownAmount = drawdown;
        maxDrawdown = peak > 0 ? (drawdown / peak) * 100 : 0;
      }
    });

    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(trade => trade.roi);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let worstStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    trades.forEach(trade => {
      if (trade.profit_loss > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        bestStreak = Math.max(bestStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        worstStreak = Math.max(worstStreak, currentLossStreak);
      }
    });

    // Risk assessment
    const avgRiskPerTrade = trades.reduce((sum, trade) => sum + Math.abs(trade.profit_loss), 0) / trades.length;
    const maxRisk = Math.max(...trades.map(trade => Math.abs(trade.profit_loss)));
    
    let riskLevel: 'Low' | 'Moderate' | 'High' = 'Low';
    if (maxDrawdown > 20) riskLevel = 'High';
    else if (maxDrawdown > 10) riskLevel = 'Moderate';

    return {
      sharpeRatio,
      maxDrawdown,
      maxDrawdownAmount,
      profitFactor,
      totalTrades: trades.length,
      winRate,
      totalPnL,
      longTrades: trades.filter(t => t.entry_side === 'Long').length,
      shortTrades: trades.filter(t => t.entry_side === 'Short').length,
      avgHoldTime: '2.5h', // Placeholder
      bestTime: 'Morning', // Placeholder
      avgRiskPerTrade,
      maxRisk,
      bestStreak,
      worstStreak,
      riskLevel,
      activeCapital: sessions.reduce((sum, s) => sum + s.current_capital, 0)
    };
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.username) {
      return user.user_metadata.username;
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Prepare chart data
  const performanceData = allTrades.reduce((acc, trade, index) => {
    const runningPnL = acc.length > 0 ? acc[acc.length - 1].cumulative + trade.profit_loss : trade.profit_loss;
    acc.push({
      trade: index + 1,
      cumulative: runningPnL,
      daily: trade.profit_loss,
      date: new Date(trade.created_at).toLocaleDateString()
    });
    return acc;
  }, [] as any[]);

  const distributionData = analytics ? [
    { name: 'Long Trades', value: analytics.longTrades, color: '#10B981' },
    { name: 'Short Trades', value: analytics.shortTrades, color: '#EF4444' }
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-400 mb-2">No Trading Data</h2>
          <p className="text-slate-500">Start trading to see your analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {getUserDisplayName()}'s Analytics
          </h1>
          <p className="text-slate-400">
            Comprehensive analysis of your trading performance across all sessions
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Sharpe Ratio</h3>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {analytics.sharpeRatio.toFixed(2)}
            </p>
            <p className="text-sm text-slate-400">
              {analytics.sharpeRatio > 1 ? 'Excellent' : analytics.sharpeRatio > 0.5 ? 'Above average' : 'Below average'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Max Drawdown</h3>
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              -{analytics.maxDrawdown.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-400">
              {formatCurrency(analytics.maxDrawdownAmount)} loss period
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Profit Factor</h3>
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {analytics.profitFactor.toFixed(2)}
            </p>
            <p className="text-sm text-slate-400">
              {analytics.profitFactor > 2 ? 'Strong performance' : analytics.profitFactor > 1 ? 'Profitable' : 'Needs improvement'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Active Capital</h3>
              <DollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {formatCurrency(analytics.activeCapital)}
            </p>
            <p className="text-sm text-slate-400">
              Across {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </p>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Daily Performance
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="trade" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Trade Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Win/Loss Ratio
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Detailed Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Detailed Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Trade Distribution */}
            <div>
              <h4 className="text-slate-400 text-sm font-medium mb-3">Trade Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Long Trades:</span>
                  <span className="text-green-400">{analytics.longTrades} ({((analytics.longTrades / analytics.totalTrades) * 100).toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Short Trades:</span>
                  <span className="text-red-400">{analytics.shortTrades} ({((analytics.shortTrades / analytics.totalTrades) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* Time Analysis */}
            <div>
              <h4 className="text-slate-400 text-sm font-medium mb-3">Time Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Avg Hold Time:</span>
                  <span className="text-white">{analytics.avgHoldTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Best Time:</span>
                  <span className="text-white">{analytics.bestTime}</span>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div>
              <h4 className="text-slate-400 text-sm font-medium mb-3">Risk Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Avg Risk/Trade:</span>
                  <span className="text-white">{formatCurrency(analytics.avgRiskPerTrade)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Max Risk:</span>
                  <span className="text-white">{formatCurrency(analytics.maxRisk)}</span>
                </div>
              </div>
            </div>

            {/* Streaks */}
            <div>
              <h4 className="text-slate-400 text-sm font-medium mb-3">Streaks</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Best Streak:</span>
                  <span className="text-green-400">{analytics.bestStreak} wins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Worst Streak:</span>
                  <span className="text-red-400">{analytics.worstStreak} losses</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overall Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Overall Performance</h3>
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
            <p className={`text-2xl font-bold mb-1 ${analytics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(analytics.totalPnL)}
            </p>
            <p className="text-sm text-slate-400">Total P&L</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Success Rate</h3>
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {analytics.winRate.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-400">Win rate</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Risk Level</h3>
              <div className="flex items-center">
                <AlertTriangle className={`w-5 h-5 ${
                  analytics.riskLevel === 'High' ? 'text-red-400' :
                  analytics.riskLevel === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
                }`} />
              </div>
            </div>
            <p className={`text-2xl font-bold mb-1 ${
              analytics.riskLevel === 'High' ? 'text-red-400' :
              analytics.riskLevel === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {analytics.riskLevel}
            </p>
            <p className="text-sm text-slate-400">Risk assessment</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserAnalyticsPage;