import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  UploadCloud, X, Camera, Download, Package, ArrowLeft, Image as ImageIcon,
  Wand2, Maximize, Target, Eye, Waves, Smartphone, ZoomIn, ZoomOut, Maximize2,
  Check, Loader2
} from 'lucide-react';

const MODES = [
  { id: 'auto', label: 'Auto Correction', desc: 'Recommended', icon: Wand2 },
  { id: 'barrel', label: 'Barrel', desc: 'Fix outward bulge', icon: Target },
  { id: 'pincushion', label: 'Pincushion', desc: 'Fix inward pinch', icon: Maximize },
  { id: 'fisheye', label: 'Fisheye', desc: 'Extreme wide-angle', icon: Eye },
  { id: 'mustache', label: 'Mustache / Wavy', desc: 'Mixed distortion', icon: Waves },
  { id: 'wide_angle', label: 'Wide-Angle', desc: 'Natural smartphone', icon: Smartphone }
];

const LensDistortionCorrection = ({ tool, onBack }) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [mode, setMode] = useState('auto');
  const [strength, setStrength] = useState(50); // 0 to 100
  
  // View Settings
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [showOriginal, setShowOriginal] = useState(false);

  const fileInputRef = useRef(null);
  const imageWrapperRef = useRef(null);

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
            mode: 'auto',
            strength: 50,
            status: 'waiting', // waiting, processing, completed, error
            processedBlob: null,
            processedUrl: null,
            errorMsg: '',
            job_id: null
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
      setMode(activeFile.mode || 'auto');
      setStrength(activeFile.strength !== undefined ? activeFile.strength : 50);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setShowOriginal(false);
    }
  }, [activeIndex]);

  // If settings change, revert completion status to allow re-applying
  useEffect(() => {
    if (activeFile && (activeFile.mode !== mode || activeFile.strength !== strength)) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].mode = mode;
          up[activeIndex].strength = strength;
          // Note: we don't clear the processed blob immediately so they can still see it,
          // but we change the status back to waiting so they know they have to apply again.
          if (up[activeIndex].status === 'completed') {
             up[activeIndex].status = 'waiting';
          }
        }
        return up;
      });
    }
  }, [mode, strength, activeFile, activeIndex]);


  // --- ZOOM & PAN LOGIC ---
  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(z => Math.max(0.1, Math.min(z + delta, 5)));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDraggingPan(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDraggingPan) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsDraggingPan(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPan, startPan]);


  // --- PROCESSING LOGIC ---
  const applyCorrection = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    
    // Update status
    setUploadedFiles(prev => {
      const up = [...prev];
      up[activeIndex].status = 'processing';
      return up;
    });
    
    try {
      let currentJobId = activeFile.job_id;
      
      // 1. Upload if not already uploaded
      if (!currentJobId) {
        const formData = new FormData();
        formData.append("file", activeFile.file);
        
        const uploadRes = await fetch(`${API_BASE_URL}/api/v1/images/lens-correction/upload`, {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.detail || "Upload failed");
        
        currentJobId = uploadData.job_id;
        
        // Update job_id in state
        setUploadedFiles(prev => {
          const up = [...prev];
          if (up[activeIndex].id === activeFile.id) {
            up[activeIndex].job_id = currentJobId;
          }
          return up;
        });
      }

      // 2. Apply correction
      const applyRes = await fetch(`${API_BASE_URL}/api/v1/images/lens-correction/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: currentJobId,
          mode: mode === 'wavy' ? 'mustache' : (mode === 'wide' ? 'wide_angle' : mode), // map modes if necessary
          strength: strength
        })
      });
      const applyData = await applyRes.json();
      if (!applyRes.ok || !applyData.success) throw new Error(applyData.detail || "Correction failed");
      
      const resultPreviewUrl = `${API_BASE_URL}${applyData.preview_url}`;
      
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex].id === activeFile.id) {
          up[activeIndex].processedUrl = resultPreviewUrl;
          up[activeIndex].status = 'completed';
        }
        return up;
      });
      setIsProcessing(false);
      setShowOriginal(false);
      
    } catch(err) {
      console.error("Correction Error:", err);
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex].id === activeFile.id) {
          up[activeIndex].status = 'error';
          up[activeIndex].errorMsg = err.message || 'Failed to correct lens distortion.';
        }
        return up;
      });
      setIsProcessing(false);
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
    const processed = uploadedFiles.filter(f => f.processedUrl !== null && f.status === 'completed');
    if (processed.length === 0) return alert("No completed images available to save.");
    
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      for (const item of processed) {
        const response = await fetch(item.processedUrl);
        const blob = await response.blob();
        const nameWithoutExt = item.name.replace(/\.[^/.]+$/, "");
        const ext = item.file.type === "image/png" ? ".png" : ".jpg";
        zip.file(`lens_corrected_${nameWithoutExt}${ext}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadFile(URL.createObjectURL(zipBlob), "lens_corrected_images.zip");
    } catch (err) {
      console.error(err);
      alert("Failed to generate ZIP file.");
    }
    setIsProcessing(false);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'waiting': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-600 border border-slate-300">Waiting</span>;
      case 'processing': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-600 border border-blue-300">Processing</span>;
      case 'completed': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-600 border border-emerald-300">Completed</span>;
      case 'error': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-600 border border-red-300">Failed</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-4 flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-800">Images ({uploadedFiles.length})</h3>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors">
                + Add
              </button>
              <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
            </div>

            {uploadedFiles.length === 0 ? (
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] ${isDraggingFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-100/50'}`}
              >
                <Camera className="w-10 h-10 mb-3 text-slate-600" />
                <p className="text-sm text-slate-600 font-medium">Drag & drop photos</p>
                <p className="text-xs text-slate-400 mt-1">or <span className="text-emerald-500 underline">browse files</span></p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {uploadedFiles.map((item, idx) => (
                  <div key={item.id} onClick={() => setActiveIndex(idx)} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${idx === activeIndex ? 'border-emerald-500 bg-emerald-50/50 shadow-[inset_3px_0_0_#10b981]' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                    <img src={item.localUrl || item.dataUrl} className="w-10 h-10 object-cover rounded bg-slate-100 shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-700 truncate">{item.name}</span>
                      <div className="flex">{getStatusBadge(item.status)}</div>
                    </div>
                    <button onClick={(e) => removeFile(e, idx)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="pt-4 mt-4 border-t border-slate-200 shrink-0">
                <button 
                  onClick={saveAllImages}
                  disabled={!uploadedFiles.some(f => f.status === 'completed')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Package className="w-4 h-4" /> Save All Completed (ZIP)
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-white relative">
          
          {/* Controls Panel (Top) */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button 
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    disabled={!activeFile || isProcessing}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${mode === m.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'} disabled:opacity-50`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-[10px] font-bold text-center leading-tight">{m.label}</span>
                  </button>
                )
              })}
            </div>
            
            {mode !== 'auto' && (
              <div className={`bg-white border border-slate-200 rounded-lg p-3 ${!activeFile ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-600">Correction Strength</span>
                  <span className="text-xs font-bold text-emerald-600">{strength}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={strength} onChange={(e) => setStrength(parseInt(e.target.value, 10))}
                  disabled={!activeFile || isProcessing}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Canvas/Preview Area */}
          <div className="flex-1 flex items-center justify-center p-4 bg-slate-100 relative overflow-hidden">
            
            {!activeFile ? (
              <div className="text-slate-500 italic text-sm">Select an image from the gallery to begin.</div>
            ) : (
              <>
                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-slate-200 rounded-full flex items-center p-1 gap-1 z-20 shadow-md">
                  <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full"><ZoomOut className="w-3.5 h-3.5" /></button>
                  <span className="text-xs font-bold text-slate-700 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full"><ZoomIn className="w-3.5 h-3.5" /></button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full"><Maximize2 className="w-3 h-3" /></button>
                </div>
                
                {/* Image Wrapper */}
                <div 
                  ref={imageWrapperRef}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  className={`relative w-full h-full flex items-center justify-center ${isDraggingPan ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                  <img 
                    src={showOriginal ? activeFile.dataUrl : (activeFile.processedUrl || activeFile.dataUrl)} 
                    alt="Preview" 
                    draggable={false}
                    className="max-w-full max-h-full block object-contain transition-opacity duration-300"
                    style={{ 
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  />
                </div>

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-500 z-30">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <span className="text-sm font-bold tracking-wide">Processing Lens Correction...</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Bar (Bottom) */}
          {activeFile && (
            <div className="p-3 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between bg-slate-50 gap-3 z-20">
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
                {getStatusBadge(activeFile.status)}
                <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">
                  {activeFile.status === 'completed' ? 'Correction applied' : (activeFile.status === 'error' ? activeFile.errorMsg : 'Ready to apply')}
                </span>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                
                {/* Before/After Toggle */}
                {activeFile.status === 'completed' && (
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm mr-2">
                    <span className={`text-[10px] font-bold ${showOriginal ? 'text-emerald-600' : 'text-slate-400'}`}>Original</span>
                    <button 
                      onClick={() => setShowOriginal(!showOriginal)}
                      className={`relative w-8 h-4 rounded-full transition-colors ${showOriginal ? 'bg-slate-300' : 'bg-emerald-500'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showOriginal ? 'left-0.5' : 'left-[18px]'}`}></div>
                    </button>
                    <span className={`text-[10px] font-bold ${!showOriginal ? 'text-emerald-600' : 'text-slate-400'}`}>Corrected</span>
                  </div>
                )}

                {activeFile.status === 'completed' ? (
                  <button 
                    onClick={() => downloadFile(activeFile.processedBlob, `lens_corrected_${activeFile.name.replace(/\.[^/.]+$/, "")}.${activeFile.file.type === "image/png" ? "png" : "jpg"}`)}
                    className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                ) : (
                  <button 
                    onClick={applyCorrection}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" /> Apply Correction
                  </button>
                )}
              </div>
            </div>
          )}

        </main>

      </div>
    </div>
  );
};

export default LensDistortionCorrection;
