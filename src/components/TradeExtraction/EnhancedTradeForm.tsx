import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calculator, Sparkles, TrendingUp, TrendingDown, CheckCircle, Camera, Zap } from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { ExtractedTradeData } from '../../services/geminiService';
import ImageUploadZone from './ImageUploadZone';
import toast from 'react-hot-toast';

interface EnhancedTradeFormProps {
  onAddTrade: (trade: Omit<Trade, 'id' | 'created_at'>) => void;
  sessionId: string;
}

const EnhancedTradeForm: React.FC<EnhancedTradeFormProps> = ({ onAddTrade, sessionId }) => {
  // Form state
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('');
  const [volumeLot, setVolumeLot] = useState('');
  const [openPrice, setOpenPrice] = useState('');
  const [closePrice, setClosePrice] = useState('');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [position, setPosition] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [reason, setReason] = useState('Other');
  const [pnlUsd, setPnlUsd] = useState('');
  const [comments, setComments] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTradeData | null>(null);

  // Auto-populate form when data is extracted
  const handleDataExtracted = (data: ExtractedTradeData) => {
    setSymbol(data.symbol || '');
    setType(data.type || '');
    setVolumeLot(data.volumeLot?.toString() || '');
    setOpenPrice(data.openPrice?.toString() || '');
    setClosePrice(data.closePrice?.toString() || '');
    setTp(data.tp?.toString() || '');
    setSl(data.sl?.toString() || '');
    setPosition(data.position || '');
    setOpenTime(data.openTime || '');
    setCloseTime(data.closeTime || '');
    setReason(data.reason || 'Other');
    setPnlUsd(data.pnlUsd?.toString() || '');
    
    // Add extraction info to comments
    setComments(`Auto-extracted from screenshot:\n${JSON.stringify(data, null, 2)}`);
    setExtractedData(data);
    setShowImageUpload(false);
    
    toast.success('Form auto-populated with extracted data!');
  };

  // Calculate margin from volume and open price
  const calculatedMargin = volumeLot && openPrice ? 
    Number(volumeLot) * Number(openPrice) : 0;

  // Calculate ROI percentage from P&L and margin
  const calculatedROI = calculatedMargin && pnlUsd ? 
    (Number(pnlUsd) / calculatedMargin) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol || !type || !volumeLot || !openPrice || !pnlUsd) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const trade: Omit<Trade, 'id' | 'created_at'> = {
        session_id: sessionId,
        margin: calculatedMargin,
        roi: calculatedROI,
        entry_side: type === 'Buy' ? 'Long' : 'Short',
        profit_loss: Number(pnlUsd),
        comments: comments.trim() || undefined,
      };

      await onAddTrade(trade);
      
      // Reset form
      clearForm();
      
      toast.success('Trade added successfully');
    } catch (error) {
      toast.error('Failed to add trade');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setSymbol('');
    setType('');
    setVolumeLot('');
    setOpenPrice('');
    setClosePrice('');
    setTp('');
    setSl('');
    setPosition('');
    setOpenTime('');
    setCloseTime('');
    setReason('Other');
    setPnlUsd('');
    setComments('');
    setExtractedData(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-xl p-6 border border-slate-700"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add New Trade
        </h3>
        
        <div className="flex items-center space-x-2">
          {extractedData && (
            <div className="flex items-center text-purple-400 text-sm">
              <Sparkles className="w-4 h-4 mr-1" />
              AI Extracted
            </div>
          )}
          
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className={`p-2 rounded-lg transition-colors ${
              showImageUpload 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Extract from screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Upload Section */}
      {showImageUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <ImageUploadZone onDataExtracted={handleDataExtracted} />
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Symbol and Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Symbol *
            </label>
            <input
              id="tradeSymbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., XAUUSD, EURUSD"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Type *
            </label>
            <select
              id="tradeType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            >
              <option value="">Select type</option>
              <option value="Buy">Buy (Long)</option>
              <option value="Sell">Sell (Short)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Volume and Open Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Volume, lot *
            </label>
            <input
              id="tradeVolumeLot"
              type="number"
              value={volumeLot}
              onChange={(e) => setVolumeLot(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., 0.01, 1.0"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Open price *
            </label>
            <input
              id="tradeOpenPrice"
              type="number"
              value={openPrice}
              onChange={(e) => setOpenPrice(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., 2050.50"
              step="0.00001"
              min="0"
              required
            />
          </div>
        </div>

        {/* Row 3: Close Price and P&L */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Close price
            </label>
            <input
              id="tradeClosePrice"
              type="number"
              value={closePrice}
              onChange={(e) => setClosePrice(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., 2055.20"
              step="0.00001"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              P&L (USD) *
            </label>
            <input
              id="tradePnL"
              type="number"
              value={pnlUsd}
              onChange={(e) => setPnlUsd(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., 10.21, -5.50"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Row 4: TP and SL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              TP (Take Profit)
            </label>
            <input
              id="tradeTP"
              type="number"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., 2060.00"
              step="0.00001"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              SL (Stop Loss)
            </label>
            <input
              id="tradeSL"
              type="number"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., 2045.00"
              step="0.00001"
              min="0"
            />
          </div>
        </div>

        {/* Row 5: Position and Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Position
            </label>
            <select
              id="tradePosition"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">Select position</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reason
            </label>
            <select
              id="tradeReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="TP">TP (Take Profit)</option>
              <option value="SL">SL (Stop Loss)</option>
              <option value="Early Close">Early Close</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Row 6: Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Open time
            </label>
            <input
              id="tradeOpenTime"
              type="text"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., Jan 15 12:35:10 PM"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Close time
            </label>
            <input
              id="tradeCloseTime"
              type="text"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., Jan 15 01:50:41 PM"
            />
          </div>
        </div>

        {/* Calculated Metrics */}
        {calculatedMargin > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-700 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center text-slate-300 mb-3">
              <Calculator className="w-4 h-4 mr-2" />
              Calculated Metrics
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Margin (Volume × Open Price)</p>
                <p className="text-lg font-bold text-blue-400">
                  {formatCurrency(calculatedMargin)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">ROI Percentage</p>
                <p className={`text-lg font-bold ${calculatedROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculatedROI.toFixed(2)}%
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Comments (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            placeholder="Add notes about this trade..."
            rows={extractedData ? 6 : 3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Add Trade
              </>
            )}
          </motion.button>
          
          {extractedData && (
            <button
              type="button"
              onClick={clearForm}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default EnhancedTradeForm;