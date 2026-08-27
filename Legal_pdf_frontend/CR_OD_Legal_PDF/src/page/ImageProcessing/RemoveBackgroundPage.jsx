import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Scissors, Download, Package, ArrowLeft, Wand2, Image as ImageIcon
} from 'lucide-react';

const BgRemoveImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [feather, setFeather] = useState(0); // 0-20
  const [threshold, setThreshold] = useState(50); // 0-100

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
            feather: 0,
            threshold: 50,
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
    if (activeFile && (activeFile.feather !== feather || activeFile.threshold !== threshold)) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].feather = feather;
          up[activeIndex].threshold = threshold;
          up[activeIndex].processedBlob = null;
          if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
          up[activeIndex].processedUrl = null;
        }
        return up;
      });
    }
  }, [feather, threshold, activeFile, activeIndex]);

  // Sync state when active index changes
  useEffect(() => {
    if (activeFile) {
      setFeather(activeFile.feather);
      setThreshold(activeFile.threshold);
    }
  }, [activeIndex]);

  // --- PROCESSING LOGIC ---
  const applyBgRemove = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', activeFile.file);
      
      const stateObj = {
        feather: feather,
        threshold: threshold
      };
      
      formData.append('state', JSON.stringify(stateObj));
      
      const response = await fetch('/api/v1/images/bg-remove', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Background removal failed on the server.');
      }
      
      const blob = await response.blob();
      
      setUploadedFiles(prev => {
        const up = [...prev];
        up[activeIndex].processedBlob = blob;
        up[activeIndex].processedUrl = URL.createObjectURL(blob);
        return up;
      });
      setIsProcessing(false);
      
    } catch(err) {
      console.error("BG Remove Error:", err);
      setIsProcessing(false);
      alert("Failed to remove background: " + err.message);
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
      setTimeout(() => downloadFile(processed[0].processedBlob, `bg_removed_${nameWithoutExt}.png`), 100);
      return;
    }
    
    // Fallback: download all processed files individually since batch endpoint takes files as input
    // which we already processed here.
    processed.forEach((item, i) => {
      setTimeout(() => {
        const nameWithoutExt = item.name.replace(/\.[^/.]+$/, "");
        downloadFile(item.processedBlob, `bg_removed_${nameWithoutExt}.png`);
      }, i * 300);
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border-t border-slate-200 shadow-inner bg-white overflow-hidden rounded-t-xl">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[360px] border-r border-slate-200 bg-transparent flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 space-y-6">
            
            {/* 1. Upload */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider mb-3">1. Upload Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-[#1e2a52] hover:bg-transparent'}`}
              >
                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-700 font-medium">Drag & drop or browse</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto p-1">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer ${idx === activeIndex ? 'border-blue-600 scale-105' : 'border-transparent hover:border-slate-300'} ${item.processedBlob ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}>
                        <img src={item.dataUrl} className="w-full h-full object-cover bg-white" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center scale-75 opacity-0 hover:opacity-100 transition-all z-10"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. AI Notice */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60">
              <div className="flex gap-3 items-start">
                <Wand2 className="w-6 h-6 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800 mb-1">AI Subject Isolation</h4>
                  <p className="text-xs text-emerald-700/80 leading-relaxed">AI automatically detects the primary subject and removes the surrounding background with sub-pixel precision.</p>
                </div>
              </div>
            </div>

            {/* 3. Refinements */}
            <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider mb-4">3. Mask & Edge Refinements</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600">Edge Feathering (Blur)</span>
                    <span className="text-xs font-bold text-emerald-600">{feather}px {feather === 0 ? '(Sharp)' : '(Soft)'}</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="0.5" 
                    value={feather} onChange={(e) => setFeather(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                    <span>0px (Crisp)</span>
                    <span>20px (Soft)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600">Mask Cutoff Sensitivity</span>
                    <span className="text-xs font-bold text-emerald-600">{threshold}% {threshold === 50 ? '(Normal)' : threshold > 50 ? '(Strict)' : '(Soft)'}</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1" 
                    value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                    <span>Keep Soft Edges</span>
                    <span>Strict Cutoff</span>
                  </div>
                </div>
              </div>

            </div>

            {/* 4. Actions */}
            <div className={`flex flex-col gap-2 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={applyBgRemove} 
                disabled={isProcessing} 
                className="w-full py-3 bg-[#1e2a52] hover:bg-blue-900 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? 'Removing BG...' : <><Scissors className="w-5 h-5" /> Remove Background</>}
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-white relative">
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-500">No Image Selected</h3>
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload an image to automatically isolate the subject and remove the background.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-transparent">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500">Active:</span>
                  <strong className="text-[#1e2a52] truncate max-w-[150px] sm:max-w-[250px]">{activeFile.name}</strong>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-300 hidden sm:inline-block">{activeFile.origW}x{activeFile.origH}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${activeFile.processedBlob ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600 border border-slate-300'}`}>
                    {activeFile.processedBlob ? '✓ Transparent PNG' : 'Original Image'}
                  </span>
                </div>
              </div>

              {/* Viewport (Checkerboard Background) */}
              <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2ZmZiIgLz4KPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjFmNWY5IiAvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2YxZjVmOSIgLz4KPC9zdmc+')]">
                
                <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-300/50 inline-block max-w-[85%] max-h-[75vh]">
                  
                  {/* Image */}
                  <img 
                    src={activeFile.processedUrl || activeFile.dataUrl} 
                    alt="Preview" 
                    className="block w-auto max-w-full object-contain"
                    style={{ maxHeight: '75vh' }}
                  />
                  
                </div>

              </div>

              {/* Bottom Bar */}
              <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 hidden sm:block">
                  {activeFile.processedBlob ? `Subject isolated (Feather: ${activeFile.feather}px | Cutoff: ${activeFile.threshold}%)` : 'Click "Remove Background" to isolate subject'}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && (
                    <button 
                      onClick={saveAllImages}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.processedBlob).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={() => downloadFile(activeFile.processedBlob, `bg_removed_${activeFile.name.replace(/\.[^/.]+$/, "")}.png`)}
                    disabled={!activeFile.processedBlob}
                    className="flex-1 sm:flex-none px-6 py-2 bg-[#1e2a52] hover:bg-blue-900 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> Save Transparent PNG
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

export default BgRemoveImages;
