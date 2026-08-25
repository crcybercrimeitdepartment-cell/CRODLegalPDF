import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, Maximize, X, Zap, Download, Package, RotateCcw, Image as ImageIcon, ArrowLeft, Info
} from 'lucide-react';

const ResizeImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  const fileInputRef = useRef(null);

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
            size: file.size,
            dataUrl: url,
            origWidth: img.naturalWidth,
            origHeight: img.naturalHeight,
            targetWidth: img.naturalWidth,
            targetHeight: img.naturalHeight,
            resizedBlob: null,
            resizedUrl: null
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
    if (item.resizedUrl) URL.revokeObjectURL(item.resizedUrl);

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

  // --- DIMENSIONS & RESIZING ---
  const updateDimension = (dimension, value) => {
    if (!activeFile) return;
    const val = parseInt(value, 10);
    
    setUploadedFiles(prev => {
      const up = [...prev];
      if (dimension === 'w') {
        up[activeIndex].targetWidth = isNaN(val) ? '' : val;
      } else {
        up[activeIndex].targetHeight = isNaN(val) ? '' : val;
      }
      return up;
    });
  };

  const resetDimensions = () => {
    if (!activeFile) return;
    setUploadedFiles(prev => {
      const up = [...prev];
      up[activeIndex].targetWidth = up[activeIndex].origWidth;
      up[activeIndex].targetHeight = up[activeIndex].origHeight;
      up[activeIndex].resizedBlob = null;
      if (up[activeIndex].resizedUrl) URL.revokeObjectURL(up[activeIndex].resizedUrl);
      up[activeIndex].resizedUrl = null;
      return up;
    });
  };

  const isValidWidth = activeFile?.targetWidth >= 1 && activeFile?.targetWidth <= 10000;
  const isValidHeight = activeFile?.targetHeight >= 1 && activeFile?.targetHeight <= 10000;
  const isBothValid = isValidWidth && isValidHeight;

  const applyResize = async () => {
    if (!activeFile || !isBothValid) return;
    setIsProcessing(true);
    
    try {
      // Simulate backend resize OR use frontend canvas
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = activeFile.dataUrl;
      await new Promise(r => img.onload = r);

      const tw = activeFile.targetWidth;
      const th = activeFile.targetHeight;
      
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, tw, th);
      
      canvas.toBlob((blob) => {
        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].resizedBlob = blob;
          up[activeIndex].resizedUrl = URL.createObjectURL(blob);
          return up;
        });
        setIsProcessing(false);
      }, activeFile.file.type);
      
    } catch(err) {
      console.error("Resize Error:", err);
      setIsProcessing(false);
      alert("Failed to resize image.");
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
    const resized = uploadedFiles.filter(f => f.resizedBlob !== null);
    if (resized.length === 0) return alert("No resized images available to save.");
    
    if (resized.length === 1) {
      const idx = uploadedFiles.findIndex(f => f.id === resized[0].id);
      setActiveIndex(idx);
      setTimeout(() => downloadFile(resized[0].resizedBlob, `resized_${resized[0].name}`), 100);
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
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP, BMP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300 bg-slate-100'} ${item.resizedBlob ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-50' : ''}`}>
                        <img src={item.resizedUrl || item.dataUrl} className="w-full h-full object-cover bg-slate-100" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-[#E57373] text-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:opacity-100 hover:scale-100 transition-all z-10 shadow-md"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Target Dimensions */}
            <div className={`flex flex-col gap-3 transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Target Dimensions</h3>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                {/* Width */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Width (px)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1" max="10000"
                      value={activeFile?.targetWidth || ''}
                      onChange={(e) => updateDimension('w', e.target.value)}
                      className={`w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 transition-all ${
                        isValidWidth ? 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/30' : 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/30'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">px</span>
                  </div>
                  {!isValidWidth && <p className="text-[10px] font-bold text-red-500 mt-1">Must be 1 - 10000 px</p>}
                </div>

                {/* Height */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Height (px)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1" max="10000"
                      value={activeFile?.targetHeight || ''}
                      onChange={(e) => updateDimension('h', e.target.value)}
                      className={`w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 transition-all ${
                        isValidHeight ? 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/30' : 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/30'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">px</span>
                  </div>
                  {!isValidHeight && <p className="text-[10px] font-bold text-red-500 mt-1">Must be 1 - 10000 px</p>}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 leading-relaxed flex gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Enter independent Width & Height. Original proportions are not locked automatically here.</span>
              </div>

            </div>

            {/* 3. Actions */}
            <div className={`flex flex-col gap-2 mt-auto pt-4 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={applyResize} 
                disabled={isProcessing || !isBothValid} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? 'Processing...' : <><Maximize className="w-4 h-4" /> Apply Resize</>}
              </button>
              <button 
                onClick={resetDimensions} 
                disabled={!activeFile || (activeFile.targetWidth === activeFile.origWidth && activeFile.targetHeight === activeFile.origHeight)}
                className="w-full py-2 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Reset Original Dimensions
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative border-l border-slate-200">
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-500">No Image Selected</h3>
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload single or multiple images using the left panel to adjust dimensions.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-slate-50 z-20">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Active File</span>
                  <strong className="text-slate-800 truncate max-w-[150px] sm:max-w-[250px]">{activeFile.name}</strong>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold hidden sm:inline-block">Original: {activeFile.origWidth}x{activeFile.origHeight}</span>
                  <span className={`px-2 py-0.5 rounded font-bold border ${isBothValid ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    Target: {isBothValid ? `${activeFile.targetWidth}x${activeFile.targetHeight}` : 'Invalid'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${activeFile.resizedBlob ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {activeFile.resizedBlob ? '✓ Resized Result' : 'Live Preview'}
                  </span>
                </div>
              </div>

              {/* Viewport */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-100 relative z-10">
                <div className="shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-sm border border-slate-200 p-2 bg-white relative">
                  <img 
                    src={activeFile.resizedUrl || activeFile.dataUrl} 
                    alt="Resize Preview" 
                    className="block max-w-full max-h-[60vh] object-contain rounded-sm"
                  />
                  {/* Overlay Dimension Badge */}
                  {isBothValid && (
                    <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg pointer-events-none">
                      {activeFile.targetWidth} × {activeFile.targetHeight} px
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
                  {activeFile.resizedBlob ? 'Image resized successfully | Ready to save' : 'Enter target dimensions and click Apply'}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && (
                    <button 
                      onClick={saveAllImages}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.resizedBlob).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={() => downloadFile(activeFile.resizedBlob, `resized_${activeFile.name}`)}
                    disabled={!activeFile.resizedBlob}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                  >
                    <Download className="w-4 h-4" /> Save Image
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

      </div>
    </div>
  );
};

export default ResizeImages;
