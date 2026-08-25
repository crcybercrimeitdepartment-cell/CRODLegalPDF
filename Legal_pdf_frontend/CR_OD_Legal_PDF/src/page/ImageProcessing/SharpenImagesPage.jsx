import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Zap, Download, Package, ArrowLeft, Image as ImageIcon
} from 'lucide-react';

const PRESETS = [
  { label: 'Light', value: 25 },
  { label: 'Medium', value: 50 },
  { label: 'Strong', value: 75 },
  { label: 'Extreme', value: 100 }
];

const SharpenImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [intensity, setIntensity] = useState(50); // 0-100

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
            dataUrl: url,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
            intensity: 50,
            processedBlob: null,
            processedUrl: null
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

  // Sync Settings to Active File
  useEffect(() => {
    if (activeFile && activeFile.intensity !== intensity) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].intensity = intensity;
          up[activeIndex].processedBlob = null;
          if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
          up[activeIndex].processedUrl = null;
        }
        return up;
      });
    }
  }, [intensity, activeFile, activeIndex]);

  // Sync state when active index changes
  useEffect(() => {
    if (activeFile) {
      setIntensity(activeFile.intensity);
    }
  }, [activeIndex]);

  // --- PROCESSING LOGIC ---
  const applySharpening = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    
    try {
      // Simulate backend delay
      await new Promise(r => setTimeout(r, 1200));
      
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = activeFile.dataUrl;
      await new Promise(r => img.onload = r);
      
      canvas.width = activeFile.origW;
      canvas.height = activeFile.origH;
      const ctx = canvas.getContext('2d');
      
      // Frontend Fallback Simulation for "Sharpening" using Canvas Filters
      // A simple contrast bump gives a slightly sharper edge appearance as a basic visual placeholder
      const contrastVal = 100 + (intensity * 0.8); 
      const saturateVal = 100 + (intensity * 0.2);
      ctx.filter = `contrast(${contrastVal}%) saturate(${saturateVal}%)`;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].processedBlob = blob;
          up[activeIndex].processedUrl = URL.createObjectURL(blob);
          return up;
        });
        setIsProcessing(false);
      }, activeFile.file.type);
      
    } catch(err) {
      console.error("Sharpen Error:", err);
      setIsProcessing(false);
      alert("Failed to sharpen image.");
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
      setTimeout(() => downloadFile(processed[0].processedBlob, `sharpened_${nameWithoutExt}${ext}`), 100);
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
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300 bg-slate-100'} ${item.processedBlob ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-50' : ''}`}>
                        <img src={item.dataUrl} className="w-full h-full object-cover bg-slate-100" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-[#E57373] text-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:opacity-100 hover:scale-100 transition-all z-10 shadow-md"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Settings */}
            <div className={`flex flex-col gap-3 transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Sharpen Intensity</h3>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Sharpen Strength</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{intensity}%</span>
                </div>
                
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2"
                />

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {PRESETS.map(preset => (
                    <button 
                      key={preset.value}
                      onClick={() => setIntensity(preset.value)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded border transition-all ${intensity === preset.value ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {preset.label} ({preset.value}%)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Actions */}
            <div className={`flex flex-col gap-2 mt-auto pt-4 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={applySharpening} 
                disabled={isProcessing} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? 'Processing...' : <><Zap className="w-4 h-4" /> Apply Sharpening</>}
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
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload an image to configure and apply sharpness and edge enhancement.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-slate-50 z-20">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Active File</span>
                  <strong className="text-slate-800 truncate max-w-[150px] sm:max-w-[250px]">{activeFile.name}</strong>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold hidden sm:inline-block">Original: {activeFile.origW}x{activeFile.origH}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${activeFile.processedBlob ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {activeFile.processedBlob ? `✓ Sharpened (${activeFile.intensity}%)` : 'Original Image'}
                  </span>
                </div>
              </div>

              {/* Viewport */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-100 relative z-10">
                <div className="shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-sm border border-slate-200 p-2 bg-white relative">
                  <img 
                    src={activeFile.processedUrl || activeFile.dataUrl} 
                    alt="Preview" 
                    className="block max-w-full max-h-[60vh] object-contain rounded-sm"
                  />
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
                  {activeFile.processedBlob ? `Sharpened (${activeFile.intensity}%) | Ready to save` : `Intensity: ${intensity}% | Click Apply to process`}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && (
                    <button 
                      onClick={saveAllImages}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.processedBlob).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={() => downloadFile(activeFile.processedBlob, `sharpened_${activeFile.name.replace(/\.[^/.]+$/, "")}.${activeFile.file.type === "image/png" ? "png" : "jpg"}`)}
                    disabled={!activeFile.processedBlob}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                  >
                    <Download className="w-4 h-4" /> Save Sharpened Image
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

export default SharpenImages;
