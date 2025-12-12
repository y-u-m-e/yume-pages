/**
 * AIDebug.tsx - Debug page for testing AI image scanning
 * 
 * This temporary page allows admins to:
 * - Upload test images
 * - Enter test keywords
 * - See the raw AI response (what text it extracts)
 * - See keyword matching results
 * - Auto-compress large images using Canvas API
 * 
 * Useful for tuning keywords before setting them on tiles
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { compressImage, MAX_AI_SIZE } from '../utils/imageCompression';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

interface ScanResult {
  success: boolean;
  ocrText: string | null;
  aiResult: string | null;
  aiConfidence: number | null;
  matchedKeywords: string[];
  allKeywords: string[];
  processingTime: number;
  imageSizeKB?: number;
  error?: string;
  suggestion?: string;
}

export default function AIDebug() {
  const { user, isAdmin } = useAuth();
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // State for compression
  const [autoCompress, setAutoCompress] = useState(true);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    wasCompressed: boolean;
  } | null>(null);
  
  // State for test keywords
  const [testKeywords, setTestKeywords] = useState('');
  
  // State for scan results
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Process a file - compress if needed and update state
   */
  const processFile = async (file: File) => {
    setOriginalFile(file);
    setResult(null);
    setError(null);
    setCompressionInfo(null);
    
    // Show preview of original immediately
    setPreviewUrl(URL.createObjectURL(file));
    
    if (autoCompress && file.size > MAX_AI_SIZE) {
      setCompressing(true);
      try {
        const result = await compressImage(file);
        setSelectedFile(result.file);
        setCompressionInfo({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          wasCompressed: result.wasCompressed
        });
        // Update preview with compressed version
        setPreviewUrl(URL.createObjectURL(result.file));
      } catch (err) {
        console.error('Compression failed:', err);
        setSelectedFile(file);
      } finally {
        setCompressing(false);
      }
    } else {
      setSelectedFile(file);
      setCompressionInfo({
        originalSize: file.size,
        compressedSize: file.size,
        wasCompressed: false
      });
    }
  };

  /**
   * Handle file selection - creates preview and stores file
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  /**
   * Submit image for AI analysis
   */
  const handleScan = async () => {
    if (!selectedFile) return;
    
    setScanning(true);
    setError(null);
    setResult(null);
    
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('keywords', testKeywords);
      
      const res = await fetch(`${API_BASE}/admin/ai-debug/scan`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Scan failed');
        // Store suggestion if provided
        if (data.suggestion) {
          setResult({ 
            success: false, 
            ocrText: null, 
            aiResult: null, 
            aiConfidence: null, 
            matchedKeywords: [], 
            allKeywords: [], 
            processingTime: 0,
            suggestion: data.suggestion 
          });
        }
        return;
      }
      
      setResult({
        ...data,
        processingTime: Date.now() - startTime
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  /**
   * Clear all state
   */
  const handleClear = () => {
    setSelectedFile(null);
    setOriginalFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setCompressionInfo(null);
  };
  
  /**
   * Re-process file when auto-compress toggle changes
   */
  const handleAutoCompressToggle = () => {
    const newValue = !autoCompress;
    setAutoCompress(newValue);
    
    // Re-process with original file if we have one
    if (originalFile) {
      if (newValue) {
        processFile(originalFile);
      } else {
        // Use original uncompressed
        setSelectedFile(originalFile);
        setPreviewUrl(URL.createObjectURL(originalFile));
        setCompressionInfo({
          originalSize: originalFile.size,
          compressedSize: originalFile.size,
          wasCompressed: false
        });
      }
    }
  };

  // Only allow admins
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-yume-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
          <p className="text-gray-400">This debug page is only available to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yume-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🤖 AI Scan Debug</h1>
          <p className="text-gray-400">
            Test AI image scanning to see what text is extracted and tune your keywords.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Upload & Keywords */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-yume-card rounded-xl border border-yume-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">📸 Test Image</h2>
                
                {/* Auto-compress toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-400">Auto-compress</span>
                  <button
                    onClick={handleAutoCompressToggle}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      autoCompress ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <span 
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        autoCompress ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </label>
              </div>
              
              {!previewUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-yume-border rounded-xl p-8 text-center hover:border-yume-accent transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <div className="text-4xl mb-3">📷</div>
                  <p className="text-gray-400 mb-2">Drop an OSRS screenshot here</p>
                  <p className="text-gray-500 text-sm">or click to browse</p>
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    {compressing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
                        <div className="text-center">
                          <div className="animate-spin text-2xl mb-2">⚙️</div>
                          <div className="text-white text-sm">Compressing...</div>
                        </div>
                      </div>
                    )}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full rounded-lg border border-yume-border"
                    />
                    <button
                      onClick={handleClear}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* File size info */}
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-500 truncate max-w-[60%]">
                      {selectedFile?.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {compressionInfo?.wasCompressed && (
                        <>
                          <span className="text-gray-500 line-through font-mono">
                            {Math.round(compressionInfo.originalSize / 1024)}KB
                          </span>
                          <span className="text-gray-500">→</span>
                        </>
                      )}
                      <span className={`font-mono px-2 py-0.5 rounded ${
                        (selectedFile?.size || 0) > MAX_AI_SIZE 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {Math.round((selectedFile?.size || 0) / 1024)}KB
                      </span>
                    </div>
                  </div>
                  
                  {/* Compression success message */}
                  {compressionInfo?.wasCompressed && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                      <div className="text-emerald-400 font-medium">
                        ✨ Auto-compressed: {Math.round((1 - compressionInfo.compressedSize / compressionInfo.originalSize) * 100)}% smaller
                      </div>
                    </div>
                  )}
                  
                  {/* Warning if still too large */}
                  {(selectedFile?.size || 0) > MAX_AI_SIZE && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
                      <div className="text-red-400 font-medium mb-1">⚠️ Still too large for AI</div>
                      <p className="text-gray-400">
                        Try using <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">squoosh.app</a> for more compression.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test Keywords */}
            <div className="bg-yume-card rounded-xl border border-yume-border p-5">
              <h2 className="text-lg font-semibold text-white mb-4">🔑 Test Keywords</h2>
              <textarea
                value={testKeywords}
                onChange={(e) => setTestKeywords(e.target.value)}
                placeholder="dragon, pet, barrows, dragon warhammer, abyssal whip..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter comma-separated keywords to test matching. Leave empty to just see raw AI output.
              </p>
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScan}
              disabled={!selectedFile || scanning}
              className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  Analyzing...
                </span>
              ) : (
                '🔍 Run AI Scan'
              )}
            </button>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                <div className="font-semibold mb-1 text-red-400">❌ Error</div>
                <div className="text-red-300">{error}</div>
                {result?.suggestion && (
                  <p className="text-gray-400 mt-2 text-sm">
                    💡 {result.suggestion}
                  </p>
                )}
              </div>
            )}

            {/* Results Display */}
            {result && (
              <>
                {/* Summary Card */}
                <div className={`rounded-xl border p-5 ${
                  result.matchedKeywords?.length > 0 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-white">
                      {result.matchedKeywords?.length > 0 ? '✅ Would Auto-Approve' : '⏳ Would Need Review'}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      {result.imageSizeKB && (
                        <span className="font-mono">{result.imageSizeKB}KB</span>
                      )}
                      <span>{result.processingTime}ms</span>
                    </div>
                  </div>
                  
                  {result.aiConfidence !== null && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-400 mb-1">Confidence</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-yume-bg rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              result.aiConfidence >= 0.8 ? 'bg-emerald-500' :
                              result.aiConfidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${result.aiConfidence * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-mono">
                          {Math.round(result.aiConfidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {result.matchedKeywords?.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Matched Keywords</div>
                      <div className="flex flex-wrap gap-2">
                        {result.matchedKeywords.map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw AI Output */}
                <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                  <h2 className="text-lg font-semibold text-white mb-3">🧠 AI Output</h2>
                  
                  {result.ocrText ? (
                    <div className="bg-yume-bg-light rounded-lg p-4 max-h-80 overflow-auto">
                      <pre className="text-gray-300 whitespace-pre-wrap text-sm font-mono">
                        {result.ocrText}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No text extracted from image</p>
                  )}
                  
                  {result.aiResult && (
                    <div className="mt-3 pt-3 border-t border-yume-border">
                      <div className="text-sm text-gray-400">AI Result Code</div>
                      <code className="text-yellow-400">{result.aiResult}</code>
                    </div>
                  )}
                </div>

                {/* Keywords Tested */}
                {result.allKeywords?.length > 0 && (
                  <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                    <h2 className="text-lg font-semibold text-white mb-3">📝 Keywords Tested</h2>
                    <div className="flex flex-wrap gap-2">
                      {result.allKeywords.map((kw, i) => (
                        <span 
                          key={i} 
                          className={`px-2 py-1 rounded text-sm ${
                            result.matchedKeywords?.includes(kw)
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-gray-700/50 text-gray-400'
                          }`}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!result && !error && (
              <div className="bg-yume-card rounded-xl border border-yume-border p-8 text-center">
                <div className="text-4xl mb-3 opacity-50">🤖</div>
                <p className="text-gray-500">
                  Upload an image and click "Run AI Scan" to see results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-yume-card rounded-xl border border-yume-border p-5">
          <h2 className="text-lg font-semibold text-white mb-3">💡 Tips for Keywords</h2>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>• Use <strong className="text-white">specific item names</strong> like "dragon warhammer", "abyssal whip", "dragon pickaxe"</li>
            <li>• Include <strong className="text-white">boss names</strong> like "vorkath", "zulrah", "hydra" for boss kill proof</li>
            <li>• For pets, use keywords like <strong className="text-white">"pet", "You have a funny feeling"</strong></li>
            <li>• The AI looks for these words in the text it extracts from the screenshot</li>
            <li>• If a keyword appears anywhere in the AI output, it counts as a match</li>
            <li>• Multiple keywords work as OR logic - any match triggers auto-approval</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

