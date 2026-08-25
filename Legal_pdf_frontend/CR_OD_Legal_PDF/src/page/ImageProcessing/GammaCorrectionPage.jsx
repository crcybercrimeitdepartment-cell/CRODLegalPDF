import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Download, Package, ArrowLeft, Image as ImageIcon,
  Sun, Moon, Zap, RotateCcw, Check, Contrast, MonitorPlay
} from 'lucide-react';

const GAMMA_PRESETS = [
  { label: '0.1 (Much Brighter)', value: 0.1 },
  { label: '0.5 (Brighter)', value: 0.5 },
  { label: '1.0 (Neutral)', value: 1.0 },
  { label: '1.8 (Darker)', value: 1.8 },
  { label: '3.0 (Much Darker)', value: 3.0 }
];

const GammaCorrection = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [gamma, setGamma] = useState(1.0); // 0.1 to 3.0
  const [showOriginal, setShowOriginal] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenImgRef = useRef(new Image());

  // --- FILE HANDLING ---
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png|webp|bmp|tiff)/));
    if (validFiles.length === 0) return alert("No valid image files.");

    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setUploadedFiles(prev => {
          const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            dataUrl: url,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
            gamma: 1.0,
            processedBlob: null,
            processedUrl: null,
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
      setGamma(activeFile.gamma);
      setShowOriginal(false);
      
      // Load image into offscreen reference for canvas pixel manipulation
      offscreenImgRef.current.onload = () => {
        renderCanvasGammaPreview(activeFile.gamma);
      };
      offscreenImgRef.current.src = activeFile.dataUrl;
    }
  }, [activeIndex, activeFile?.dataUrl]); // Depend on dataUrl so we only reload offscreen on file switch

  // Sync settings back to active file
  useEffect(() => {
    if (activeFile && activeFile.gamma !== gamma) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].gamma = gamma;
          // Clear backend processed state if they change slider manually
          if (up[activeIndex].processedBlob) {
            up[activeIndex].processedBlob = null;
            if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
            up[activeIndex].processedUrl = null;
          }
        }
        return up;
      });
      renderCanvasGammaPreview(gamma);
    }
  }, [gamma]);

  // Re-render canvas if showOriginal toggles
  useEffect(() => {
    if (activeFile && !activeFile.processedBlob) {
       renderCanvasGammaPreview(showOriginal ? 1.0 : gamma);
    }
  }, [showOriginal]);


  // --- PIXEL LEVEL HTML5 CANVAS LUT ---
  const renderCanvasGammaPreview = (gammaVal) => {
    const canvas = canvasRef.current;
    const img = offscreenImgRef.current;
    if (!canvas || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    if (Math.abs(gammaVal - 1.0) < 0.01) return; // Neutral

    // Build 256-byte LUT
    const invGamma = 1.0 / Math.max(0.1, Math.min(3.0, gammaVal));
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.min(255, Math.max(0, Math.round(Math.pow(i / 255.0, invGamma) * 255.0)));
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const len = data.length;

    // Apply LUT to RGB channels (ignore alpha)
    for (let i = 0; i < len; i += 4) {
      data[i] = lut[data[i]];
      data[i+1] = lut[data[i+1]];
      data[i+2] = lut[data[i+2]];
    }

    ctx.putImageData(imgData, 0, 0);
  };


  // --- GET PREVIEW BADGE ---
  const getPreviewBadge = () => {
    if (!activeFile) return null;
    if (showOriginal) return { text: 'Original Image', color: 'bg-red-500' };
    if (activeFile.processedBlob) return { text: 'Backend Processed', color: 'bg-emerald-500' };
    if (gamma === 1.0) return null;
    return { text: 'Live Canvas LUT', color: 'bg-amber-500' };
  };

  const badge = getPreviewBadge();
  const getGammaLabel = (v) => {
    if (v === 1.0) return "Neutral";
    if (v <= 0.1) return "Much Brighter";
    if (v <= 0.5) return "Brighter";
    if (v >= 3.0) return "Much Darker";
    if (v >= 1.8) return "Darker";
    return "";
  };


  // --- PROCESSING LOGIC ---
  const applyGammaCorrection = async () => {
    if (!activeFile || !canvasRef.current) return;
    setIsProcessing(true);
    
    try {
      // We will bake the current canvas state directly for simulation since we do client-side LUT
      await new Promise(r => setTimeout(r, 600)); // fake delay for UX
      
      canvasRef.current.toBlob((blob) => {
        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].processedBlob = blob;
          up[activeIndex].processedUrl = URL.createObjectURL(blob);
          return up;
        });
        setIsProcessing(false);
        setShowOriginal(false);
      }, activeFile.file.type);
      
    } catch(err) {
      console.error("Gamma Error:", err);
      setIsProcessing(false);
      alert("Failed to apply gamma correction.");
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
    if (processed.length === 0) return alert("No processed images available to save.");
    
    if (processed.length === 1) {
      const idx = uploadedFiles.findIndex(f => f.id === processed[0].id);
      setActiveIndex(idx);
      const nameWithoutExt = processed[0].name.replace(/\.[^/.]+$/, "");
      const ext = processed[0].file.type === "image/png" ? ".png" : ".jpg";
      setTimeout(() => downloadFile(processed[0].processedBlob, `gamma_${nameWithoutExt}${ext}`), 100);
      return;
    }
    
    alert("Batch ZIP saving requires the backend API which is currently simulated.");
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-5 flex flex-col h-full space-y-6">
            
            {/* 1. Upload */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">1. Upload Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-50/5' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/5'}`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDraggingFile ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP, BMP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer bg-slate-100 transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'border-transparent hover:border-slate-300'}`}>
                        <img src={item.processedUrl || item.dataUrl} className="w-full h-full object-cover" />
                        {item.processedBlob && (
                          <div className="absolute top-1 left-1 bg-emerald-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <button onClick={(e) => removeFile(e, idx)} className="absolute top-1 right-1 w-4 h-4 bg-red-500 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Gamma Settings */}
            <div className={`flex flex-col gap-3 transition-opacity duration-300 ${!activeFile ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Gamma Value Configuration</h3>
              
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                
                {/* Gamma Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gamma Value</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                      {gamma.toFixed(2)} {getGammaLabel(gamma) ? `(${getGammaLabel(gamma)})` : ''}
                    </span>
                  </div>
                  
                  <div className="pt-2 pb-1 relative">
                    <input 
                      type="range" min="0.1" max="3.0" step="0.05" 
                      value={gamma} onChange={(e) => setGamma(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none bg-gradient-to-r from-blue-500 via-slate-200 to-slate-400 accent-blue-600"
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Brighter &larr; 0.1</span>
                    <span>1.0 (Neutral)</span>
                    <span>3.0 &rarr; Darker</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
                  {GAMMA_PRESETS.map(preset => {
                    const isActive = Math.abs(gamma - preset.value) < 0.03;
                    return (
                      <button 
                        key={preset.label}
                        onClick={() => setGamma(preset.value)}
                        className={`flex-1 min-w-[30%] py-1.5 px-2 rounded-lg border transition-all ${isActive ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-[inset_0_2px_10px_rgba(59,130,246,0.05)]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700'}`}
                      >
                        <span className="text-[9px] font-bold block truncate">{preset.label}</span>
                      </button>
                    )
                  })}
                </div>

                <button 
                  onClick={() => setGamma(1.0)}
                  className="w-full py-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Default (1.0)
                </button>

              </div>
            </div>

            {/* 3. Actions */}
            <div className={`mt-auto pt-4 flex flex-col gap-2 ${!activeFile ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <button 
                onClick={applyGammaCorrection}
                disabled={!activeFile || isProcessing || (gamma === 1.0 && !activeFile.processedBlob)} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? <><Zap className="w-4 h-4 animate-bounce" /> Processing LUT...</> : <><MonitorPlay className="w-4 h-4" /> Apply Gamma Correction</>}
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-100">
          
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-slate-500">No Image Uploaded</h3>
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload image(s) using the left panel to configure and preview gamma correction adjustments.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full p-4 sm:p-5">
              
              {/* Stage Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 shrink-0">
                <div className="flex items-center gap-2 text-sm text-slate-800">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active:</span>
                  <strong className="truncate max-w-[200px] sm:max-w-xs text-xs">{activeFile.name}</strong>
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs font-semibold border border-blue-200">
                    {activeFile.origW ? `${activeFile.origW}x${activeFile.origH} px` : 'Loading...'}
                  </span>
                </div>
                
                <button 
                  onClick={() => setShowOriginal(!showOriginal)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 uppercase tracking-wider`}
                >
                  {showOriginal ? 'Show Processed' : 'Show Original'}
                </button>
              </div>

              {/* Viewport */}
              <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center p-4 relative overflow-hidden min-h-[380px]">
                <div className="relative max-w-full max-h-full flex items-center justify-center">
                  {!activeFile.processedBlob || showOriginal || gamma !== activeFile.gamma ? (
                     <canvas 
                        ref={canvasRef}
                        className="max-w-full object-contain rounded-sm shadow-md border border-slate-200 p-2 bg-white"
                        style={{ maxHeight: '520px' }}
                     />
                  ) : (
                     <img 
                        src={activeFile.processedUrl}
                        alt="Processed"
                        className="max-w-full object-contain rounded-sm shadow-md border border-slate-200 p-2 bg-white"
                        style={{ maxHeight: '520px' }}
                     />
                  )}
                  
                  {badge && (
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase shadow-lg text-white ${badge.color}`}>
                      {badge.text}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex justify-between items-center pt-3 mt-4 border-t border-slate-200 shrink-0">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {activeFile.processedBlob ? 'Gamma Correction applied! Click Save.' : 'Adjust gamma slider for instant preview, then click "Apply".'}
                </div>
                
                <div className="flex gap-3">
                  {uploadedFiles.length > 1 && uploadedFiles.some(f => f.processedBlob) && (
                    <button 
                      onClick={saveAllImages}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All
                    </button>
                  )}
                  
                  <button 
                    onClick={() => downloadFile(activeFile.processedBlob, `gamma_corrected_${activeFile.name.replace(/\.[^/.]+$/, "")}.${activeFile.file.type === "image/png" ? "png" : "jpg"}`)}
                    disabled={!activeFile.processedBlob}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md"
                  >
                    <Download className="w-4 h-4" /> Save Gamma Corrected
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

export default GammaCorrection;
