import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X, Loader2, CheckCircle, AlertCircle, Camera, Clipboard } from 'lucide-react';
import { geminiService, ExtractedTradeData } from '../../services/geminiService';
import toast from 'react-hot-toast';

interface ImageUploadZoneProps {
  onDataExtracted: (data: ExtractedTradeData) => void;
  className?: string;
}

const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({ onDataExtracted, className = '' }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Handle paste events for clipboard images
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleFile(file);
            toast.success('Image pasted from clipboard!');
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, JPEG)');
      setExtractionStatus('error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      setExtractionStatus('error');
      return;
    }

    setFileName(file.name);
    setExtractionStatus('idle');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsProcessing(true);
      const base64 = await convertFileToBase64(file);
      const extractedData = await geminiService.extractTradeDataFromImage(base64);
      
      setExtractionStatus('success');
      onDataExtracted(extractedData);
      toast.success('Trade data extracted successfully!');
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionStatus('error');
      toast.error(error instanceof Error ? error.message : 'Failed to extract trade data');
    } finally {
      setIsProcessing(false);
    }
  }, [onDataExtracted]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const clearUpload = () => {
    setPreview(null);
    setFileName('');
    setExtractionStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      <motion.div
        className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10 scale-105'
            : extractionStatus === 'success'
            ? 'border-green-500 bg-green-500/10'
            : extractionStatus === 'error'
            ? 'border-red-500 bg-red-500/10'
            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700/70'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        whileHover={{ scale: preview ? 1 : 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6"
            >
              <div className="relative">
                <img
                  src={preview}
                  alt="Trade screenshot preview"
                  className="w-full h-64 object-contain rounded-lg bg-slate-800"
                />
                <button
                  onClick={clearUpload}
                  className="absolute top-2 right-2 p-2 bg-slate-800/90 text-white rounded-full hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-300 truncate">{fileName}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isProcessing && (
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Extracting...</span>
                    </div>
                  )}
                  {extractionStatus === 'success' && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Extracted</span>
                    </div>
                  )}
                  {extractionStatus === 'error' && (
                    <div className="flex items-center space-x-2 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Failed</span>
                    </div>
                  )}
                </div>
              </div>

              {!isProcessing && extractionStatus === 'idle' && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleFile(fileInputRef.current?.files?.[0]!)}
                  className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Extract Trade Information
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center cursor-pointer"
              onClick={openFileDialog}
            >
              <motion.div
                animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                className="mb-6"
              >
                <Upload className={`w-16 h-16 mx-auto mb-4 ${
                  isDragOver ? 'text-blue-400' : 'text-slate-400'
                }`} />
              </motion.div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                {isDragOver ? 'Drop your trading screenshot here' : 'Upload Trading Screenshot'}
              </h3>
              
              <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                Drag and drop your trading screenshot here, click to browse, or paste from clipboard (Ctrl+V)
              </p>

              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="flex items-center text-slate-500 text-sm">
                  <Upload className="w-4 h-4 mr-1" />
                  Upload
                </div>
                <div className="flex items-center text-slate-500 text-sm">
                  <Clipboard className="w-4 h-4 mr-1" />
                  Paste
                </div>
              </div>
              
              <div className="text-xs text-slate-500">
                Supports PNG, JPG, JPEG • Max 10MB
              </div>
              
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center justify-center space-x-2 text-blue-400"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Analyzing screenshot with AI...</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center"
            >
              <div className="text-center">
                <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-400 font-medium">Drop to analyze screenshot</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ImageUploadZone;