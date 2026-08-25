import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Download, Package, ArrowLeft, Image as ImageIcon,
  Zap, Shield, Scale, ArrowRight, Minimize, CheckCircle2, MonitorPlay, Check
} from 'lucide-react';

const COMPRESS_LEVELS = [
  { id: 'low', name: 'Low Compression', icon: Shield, tag: 'Best Quality', tagColor: 'text-sky-400 bg-sky-500/20', desc: 'Maximum visual quality, smaller file size' },
  { id: 'balanced', name: 'Balanced', icon: Scale, tag: 'Recommended', tagColor: 'text-emerald-400 bg-emerald-500/20', desc: 'Best balance between quality and file size' },
  { id: 'high', name: 'High Compression', icon: Zap, tag: 'Smallest Size', tagColor: 'text-amber-400 bg-amber-500/20', desc: 'Maximum practical size reduction' }
];

// Utility: Format File Size Bytes
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const CompressImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [compressLevel, setCompressLevel] = useState('balanced');
  const [showOriginal, setShowOriginal] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // --- FILE HANDLING ---
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png|webp|bmp|tiff)/));
    if (validFiles.length === 0) return alert("No valid image files.");

    validFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Skipped file "${file.name}": Exceeds maximum 10MB size limit.`);
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setUploadedFiles(prev => {
          const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            size: file.size,
            dataUrl: url,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
            level: 'balanced',
            processedBlob: null,
            processedUrl: null,
            stats: null
          };
          const updated = [...prev, newItem];
          if (prev.length === 0) setActiveIndex(0);
          return updated;
        });
      };
      img.src = url;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files?.length > 0) processFiles(e.dataTransfer.files);
  };

  const removeFile = (e, index) => {
    e.stopPropagation();
    const item = uploadedFiles[index];
    URL.revokeObjectURL(item.dataUrl);
    if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);

    setUploadedFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });

    if (uploadedFiles.length - 1 === 0) setActiveIndex(-1);
    else if (activeIndex === index) setActiveIndex(Math.max(0, index - 1));
    else if (activeIndex > index) setActiveIndex(activeIndex - 1);
  };

  const activeFile = activeIndex !== -1 ? uploadedFiles[activeIndex] : null;

  // Sync state when active index changes
  useEffect(() => {
    if (activeFile) {
      setCompressLevel(activeFile.level);
      setShowOriginal(false);
    }
  }, [activeIndex]);

  // Sync settings back to active file
  useEffect(() => {
    if (activeFile && activeFile.level !== compressLevel) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].level = compressLevel;
          // Invalidate processed state if they change level
          if (up[activeIndex].processedBlob) {
            up[activeIndex].processedBlob = null;
            if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
            up[activeIndex].processedUrl = null;
            up[activeIndex].stats = null;
          }
        }
        return up;
      });
      setShowOriginal(false);
    }
  }, [compressLevel]);

  // --- ESTIMATION ---
  const getEstimation = () => {
    if (!activeFile) return { min: 0, max: 0, text: '' };
    const bytes = activeFile.size;
    let minR, maxR, text;
    
    if (compressLevel === 'low') {
      minR = 0.70; maxR = 0.88; text = '15%–30%';
    } else if (compressLevel === 'high') {
      minR = 0.20; maxR = 0.45; text = '55%–80%';
    } else {
      minR = 0.40; maxR = 0.65; text = '35%–60%';
    }
    
    return {
      minStr: formatBytes(Math.round(bytes * minR)),
      maxStr: formatBytes(Math.round(bytes * maxR)),
      text
    };
  };

  const est = getEstimation();


  // --- PROCESSING LOGIC ---
  const applyCompression = async () => {
    if (!activeFile || !canvasRef.current) return;
    setIsProcessing(true);
    
    try {
      // Simulate backend processing time
      await new Promise(r => setTimeout(r, 700));
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.src = activeFile.dataUrl;
      await new Promise(r => img.onload = r);
      
      canvas.width = activeFile.origW;
      canvas.height = activeFile.origH;
      ctx.drawImage(img, 0, 0);

      // Determine quality based on level
      let qualityScore = 0.8;
      if (compressLevel === 'low') qualityScore = 0.9;
      if (compressLevel === 'high') qualityScore = 0.4;
      
      // Use WEBP to preserve alpha while compressing
      canvas.toBlob((blob) => {
        const compressedSize = blob.size;
        const savingsPercent = Math.max(1, Math.round((1 - (compressedSize / activeFile.size)) * 100));

        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].processedBlob = blob;
          up[activeIndex].processedUrl = URL.createObjectURL(blob);
          up[activeIndex].stats = {
            orig_size_bytes: activeFile.size,
            compressed_size_bytes: compressedSize,
            savings_percent: savingsPercent
          };
          return up;
        });
        
        setIsProcessing(false);
        setShowOriginal(false);
      }, 'image/webp', qualityScore);
      
    } catch(err) {
      console.error("Compression Error:", err);
      setIsProcessing(false);
      alert("Failed to compress image.");
    }
  };

  const downloadFile = (blobOrUrl, name) => {
    const a = document.createElement("a");
    a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const saveAllImages = async () => {
    const processed = uploadedFiles.filter(f => f.processedBlob !== null);
    if (processed.length === 0) return alert("No compressed images available to save.");
    
    if (processed.length === 1) {
      const idx = uploadedFiles.findIndex(f => f.id === processed[0].id);
      setActiveIndex(idx);
      const nameWithoutExt = processed[0].name.replace(/\.[^/.]+$/, "");
      setTimeout(() => downloadFile(processed[0].processedBlob, `compressed_${nameWithoutExt}.webp`), 100);
      return;
    }
    
    alert("Batch ZIP saving requires the backend API which is currently simulated.");
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[360px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-5 space-y-6">
            
            {/* 1. Upload */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">1. Upload Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-500/5' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-500/5'}`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDraggingFile ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP, BMP up to 10MB</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300 bg-slate-100'} ${item.processedBlob ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}>
                        <img src={item.processedUrl || item.dataUrl} className="w-full h-full object-cover bg-slate-100" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-[#E57373] text-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:opacity-100 hover:scale-100 transition-all z-10 shadow-md"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Compression Level */}
            <div className={`flex flex-col gap-3 transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Compression Level</h3>
              
              <div className="flex flex-col gap-2">
                {COMPRESS_LEVELS.map(level => {
                  const Icon = level.icon;
                  const isActive = compressLevel === level.id;
                  
                  return (
                    <button
                      key={level.id}
                      onClick={() => setCompressLevel(level.id)}
                      className={`flex flex-col items-start text-left p-3 rounded-xl border transition-all ${isActive ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2 w-full mb-1">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                        <strong className={`text-sm flex-1 ${isActive ? 'text-blue-900 font-bold' : 'text-slate-700'}`}>{level.name}</strong>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>{level.tag}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 pl-6">{level.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Estimation Box */}
              {activeFile && (
                <div className="bg-white border border-slate-200 rounded-lg p-3 mt-1 shadow-sm space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Original File Size:</span>
                    <strong className="text-slate-700">{formatBytes(activeFile.size)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Estimated Size:</span>
                    <strong className="text-blue-600">~{est.minStr} – {est.maxStr} <span className="text-[9px] opacity-70">({est.text} smaller)</span></strong>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Actions */}
            <div className={`flex flex-col gap-2 mt-auto pt-4 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={applyCompression}
                disabled={!activeFile || isProcessing} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? <><Zap className="w-4 h-4 animate-bounce" /> Compressing...</> : <><MonitorPlay className="w-4 h-4" /> Apply Image Compression</>}
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative border-l border-slate-200">
          
          {/* Hidden Canvas for Processing */}
          <canvas ref={canvasRef} className="hidden" />

          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-500">No Image Uploaded</h3>
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload image(s) using the left panel to configure compression levels and preview estimated savings.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full p-4 sm:p-5 overflow-y-auto">
              
              {/* Stage Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 shrink-0 bg-slate-50 px-4 py-3 rounded-lg z-20">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Active Image</span>
                  <strong className="text-[#1e2a52] truncate max-w-[150px] sm:max-w-[250px]">{activeFile.name}</strong>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold hidden sm:inline-block">
                    Size: {activeFile.origW ? `${activeFile.origW}×${activeFile.origH} px` : 'Loading...'}
                  </span>
                </div>
                
                <button 
                  onClick={() => setShowOriginal(!showOriginal)}
                  disabled={!activeFile.processedBlob}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {showOriginal && activeFile.processedBlob ? 'Show Compressed Result' : 'Show Original Image'}
                </button>
              </div>

              {/* Viewport */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-100 relative z-10 min-h-[380px] shrink-0">
                <div className="shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-sm border border-slate-200 p-2 bg-white relative inline-block max-w-full">
                  <img 
                    src={activeFile.processedBlob && !showOriginal ? activeFile.processedUrl : activeFile.dataUrl} 
                    alt="Preview" 
                    className="block max-w-full max-h-[480px] object-contain rounded-sm"
                  />
                  
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase shadow-lg text-white ${activeFile.processedBlob && !showOriginal ? 'bg-emerald-600' : 'bg-red-500'}`}>
                    {activeFile.processedBlob && !showOriginal ? 'Compressed' : 'Original Image'}
                  </div>
                </div>
              </div>

              {/* Verified Stats Box */}
              {activeFile.stats && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shrink-0 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Verified Compression Results:
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex flex-col text-xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Original Size</span>
                      <span className="text-lg font-bold text-slate-700">{formatBytes(activeFile.stats.orig_size_bytes)}</span>
                    </div>
                    
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                    
                    <div className="flex flex-col text-xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Compressed Size</span>
                      <span className="text-lg font-bold text-emerald-600">{formatBytes(activeFile.stats.compressed_size_bytes)}</span>
                    </div>
                    
                    <div className="flex flex-col pl-6 border-l border-slate-200 text-xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Actual Savings</span>
                      <span className="text-lg font-bold text-blue-600">{activeFile.stats.savings_percent}% smaller</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Action Bar */}
              <div className="p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20 mt-4 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
                  {activeFile.processedBlob ? 'Compression successfully applied! Click Save.' : 'Select a compression level, then click "Apply Image Compression".'}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && uploadedFiles.some(f => f.processedBlob) && (
                    <button 
                      onClick={saveAllImages}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.processedBlob).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
                      downloadFile(activeFile.processedBlob, `compressed_${nameWithoutExt}.webp`);
                    }}
                    disabled={!activeFile.processedBlob}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                  >
                    <Download className="w-4 h-4" /> Save Compressed Image
                  </button>
                </div>
              </div>

            </div>
          )}
        </main>

      </div>
    </div>
  );
};

export default CompressImages;
