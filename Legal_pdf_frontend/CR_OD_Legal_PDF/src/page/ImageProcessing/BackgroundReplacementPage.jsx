import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Palette, Download, Package, ArrowLeft, Image as ImageIcon, Paintbrush, ImagePlus, LayoutGrid
} from 'lucide-react';

const GRADIENT_MAP = {
  sunset: "linear-gradient(135deg, #ff7e5f, #feb47b)",
  ocean: "linear-gradient(135deg, #2b5876, #4e4376)",
  neon: "linear-gradient(135deg, #833ab4, #fd1d1d)",
  emerald: "linear-gradient(135deg, #11998e, #38ef7d)",
  purple_haze: "linear-gradient(135deg, #6a11cb, #2575fc)"
};

const BgReplaceImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [bgType, setBgType] = useState('color'); // color, gradient, image, custom
  const [colorHex, setColorHex] = useState('#ffffff');
  const [gradientName, setGradientName] = useState('sunset');
  const [patternName, setPatternName] = useState('grid');
  
  const [customBgFile, setCustomBgFile] = useState(null);
  const [customBgUrl, setCustomBgUrl] = useState(null);

  const fileInputRef = useRef(null);
  const customBgInputRef = useRef(null);

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
            bgType: 'color',
            colorHex: '#ffffff',
            gradientName: 'sunset',
            patternName: 'grid',
            bgFile: null,
            bgUrl: null,
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
    if (item.bgUrl) URL.revokeObjectURL(item.bgUrl);

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

  // Sync Global Settings to Active File
  useEffect(() => {
    if (activeFile && (
      activeFile.bgType !== bgType || 
      activeFile.colorHex !== colorHex || 
      activeFile.gradientName !== gradientName || 
      activeFile.patternName !== patternName ||
      activeFile.bgUrl !== customBgUrl
    )) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].bgType = bgType;
          up[activeIndex].colorHex = colorHex;
          up[activeIndex].gradientName = gradientName;
          up[activeIndex].patternName = patternName;
          up[activeIndex].bgFile = customBgFile;
          up[activeIndex].bgUrl = customBgUrl;
          
          up[activeIndex].processedBlob = null;
          if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
          up[activeIndex].processedUrl = null;
        }
        return up;
      });
    }
  }, [bgType, colorHex, gradientName, patternName, customBgUrl, customBgFile, activeIndex]);

  // Sync state when active index changes
  useEffect(() => {
    if (activeFile) {
      setBgType(activeFile.bgType);
      setColorHex(activeFile.colorHex);
      setGradientName(activeFile.gradientName);
      setPatternName(activeFile.patternName);
      setCustomBgFile(activeFile.bgFile);
      setCustomBgUrl(activeFile.bgUrl);
    }
  }, [activeIndex]);

  const handleCustomBgUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCustomBgFile(file);
      setCustomBgUrl(url);
    }
  };

  // --- PREVIEW RENDER HELPER ---
  const getBackgroundStyle = () => {
    if (bgType === 'color') return { background: colorHex };
    if (bgType === 'gradient') return { background: GRADIENT_MAP[gradientName] };
    if (bgType === 'image') {
      if (customBgUrl) return { backgroundImage: `url(${customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      return { background: 'linear-gradient(135deg, #1e293b, #0f172a)' };
    }
    if (bgType === 'custom') {
      if (patternName === 'dots') return { background: '#0f172a radial-gradient(rgba(56, 189, 248, 0.4) 2px, transparent 2px)', backgroundSize: '24px 24px' };
      if (patternName === 'mesh') return { background: 'repeating-linear-gradient(45deg, #1e293b, #1e293b 10px, #0f172a 10px, #0f172a 20px)' };
      return { background: '#0f172a linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' };
    }
    return {};
  };

  // --- PROCESSING LOGIC ---
  const applyBgReplace = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', activeFile.file);
      
      const stateObj = {
        bg_type: bgType,
        color_hex: colorHex,
        gradient_name: gradientName,
        pattern_name: patternName
      };
      
      formData.append('state', JSON.stringify(stateObj));
      
      if (bgType === 'image' && customBgFile) {
        formData.append('bg_file', customBgFile);
      }
      
      const response = await fetch('/api/v1/images/bg-replace', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Background replacement failed on the server.');
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
      console.error("BG Replace Error:", err);
      setIsProcessing(false);
      alert("Failed to replace background: " + err.message);
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
      setTimeout(() => downloadFile(processed[0].processedBlob, `bg_replaced_${nameWithoutExt}.jpg`), 100);
      return;
    }
    
    // Fallback: download all processed files individually since batch endpoint takes files as input
    // which we already processed here.
    processed.forEach((item, i) => {
      setTimeout(() => {
        const nameWithoutExt = item.name.replace(/\.[^/.]+$/, "");
        downloadFile(item.processedBlob, `bg_replaced_${nameWithoutExt}.jpg`);
      }, i * 300);
    });
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 space-y-6">
            
            {/* 1. Upload */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200 mb-3">1. Upload Subject Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-pink-500 bg-pink-50/5' : 'border-slate-300 hover:border-pink-500 hover:bg-pink-50/5'}`}
              >
                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP, BMP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer bg-slate-100 transition-all group ${idx === activeIndex ? 'border-pink-500 scale-105 shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'border-transparent hover:border-slate-300'} ${item.processedBlob ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-white' : ''}`}>
                        <img src={item.dataUrl} className="w-full h-full object-cover" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:opacity-100 hover:scale-100 transition-all z-10 shadow-md"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Choose New Background */}
            <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200 mb-4">2. Choose New Background</h3>
              
              {/* Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 mb-4 shadow-inner">
                <button onClick={() => setBgType('color')} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${bgType === 'color' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Color</button>
                <button onClick={() => setBgType('gradient')} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${bgType === 'gradient' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Grad</button>
                <button onClick={() => setBgType('image')} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${bgType === 'image' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Image</button>
                <button onClick={() => setBgType('custom')} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${bgType === 'custom' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Design</button>
              </div>

              {/* Panels */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                
                {/* Panel: Color */}
                {bgType === 'color' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600">Select Color:</span>
                      <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                      <span className="text-sm font-mono font-bold text-pink-500 uppercase">{colorHex}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {['#ffffff', '#0f172a', '#0284c7', '#f43f5e', '#10b981', '#8b5cf6'].map(c => (
                        <button 
                          key={c} onClick={() => setColorHex(c)}
                          className={`aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${colorHex === c ? 'border-pink-500 shadow-md scale-110' : 'border-transparent shadow-sm'}`}
                          style={{ background: c, borderColor: c === '#ffffff' && colorHex !== '#ffffff' ? '#e2e8f0' : undefined }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Panel: Gradient */}
                {bgType === 'gradient' && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(GRADIENT_MAP).map(([name, grad]) => (
                      <button 
                        key={name} onClick={() => setGradientName(name)}
                        className={`h-12 rounded-lg text-white text-xs font-bold capitalize transition-all border-2 ${gradientName === name ? 'border-pink-500 shadow-lg scale-105' : 'border-transparent'}`}
                        style={{ background: grad }}
                      >
                        {name.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                )}

                {/* Panel: Image */}
                {bgType === 'image' && (
                  <div>
                    <div 
                      onClick={() => customBgInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-pink-500 rounded-lg p-4 text-center cursor-pointer bg-white transition-colors"
                    >
                      <ImagePlus className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      <p className="text-xs font-bold text-slate-600">Upload Custom BG</p>
                      <p className="text-[10px] text-slate-400 mt-1">JPG or PNG</p>
                      <input type="file" ref={customBgInputRef} onChange={handleCustomBgUpload} accept="image/*" className="hidden" />
                    </div>
                    {customBgUrl && (
                      <div className="mt-3 flex items-center justify-between bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ImageIcon className="w-4 h-4 text-pink-500 shrink-0" />
                          <span className="text-xs font-bold text-pink-700 truncate">{customBgFile?.name}</span>
                        </div>
                        <button onClick={() => { setCustomBgFile(null); setCustomBgUrl(null); }} className="text-pink-400 hover:text-pink-600 ml-2">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Panel: Custom Pattern */}
                {bgType === 'custom' && (
                  <div className="space-y-2">
                    {[
                      { id: 'grid', icon: '🏁', label: 'Studio Grid' },
                      { id: 'dots', icon: '🫧', label: 'Dot Matrix' },
                      { id: 'mesh', icon: '📐', label: 'Abstract Mesh' }
                    ].map(pat => (
                      <button 
                        key={pat.id} onClick={() => setPatternName(pat.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${patternName === pat.id ? 'bg-pink-500 border-pink-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-pink-300'}`}
                      >
                        <span>{pat.icon}</span>
                        <span className="text-xs font-bold">{pat.label}</span>
                      </button>
                    ))}
                  </div>
                )}

              </div>
            </div>

            {/* 3. Actions */}
            <div className={`flex flex-col gap-2 mt-auto pt-4 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={applyBgReplace} 
                disabled={isProcessing} 
                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? 'Processing AI...' : <><Palette className="w-5 h-5" /> Apply Replacement</>}
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative">
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-500">No Image Selected</h3>
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload an image to isolate the subject and combine it with a new background.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-slate-50 z-20">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Active File</span>
                  <strong className="text-slate-800 truncate max-w-[150px] sm:max-w-[250px]">{activeFile.name}</strong>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold hidden sm:inline-block">{activeFile.origW}x{activeFile.origH}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${activeFile.processedBlob ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
                    {activeFile.processedBlob ? '✓ Background Replaced' : 'Alignment Preview'}
                  </span>
                </div>
              </div>

              {/* Viewport (Alignment Stage) */}
              <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none bg-slate-100 relative z-10">
                
                <div className="relative shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-lg overflow-hidden border border-slate-200 p-2 bg-white inline-block max-w-[85%] max-h-[75vh]">
                  
                  {/* Layer 1: Selected Background */}
                  {!activeFile.processedBlob && (
                    <div 
                      className="absolute inset-2 z-0 transition-all duration-300 rounded-sm" 
                      style={getBackgroundStyle()} 
                    />
                  )}

                  {/* Layer 2: Image */}
                  <img 
                    src={activeFile.processedUrl || activeFile.dataUrl} 
                    alt="Preview" 
                    className="block relative z-10 w-auto max-w-full object-contain rounded-sm"
                    style={{ maxHeight: '70vh' }}
                  />
                  
                </div>

              </div>

              {/* Bottom Bar */}
              <div className="p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
                  {activeFile.processedBlob ? `Background Replaced (${activeFile.bgType.toUpperCase()}) | Ready to save` : 'Click "Apply Replacement" to process'}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && (
                    <button 
                      onClick={saveAllImages}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.processedBlob).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={() => downloadFile(activeFile.processedBlob, `bg_replaced_${activeFile.name.replace(/\.[^/.]+$/, "")}.jpg`)}
                    disabled={!activeFile.processedBlob}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md"
                  >
                    <Download className="w-4 h-4" /> Save Replaced Image
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

export default BgReplaceImages;
