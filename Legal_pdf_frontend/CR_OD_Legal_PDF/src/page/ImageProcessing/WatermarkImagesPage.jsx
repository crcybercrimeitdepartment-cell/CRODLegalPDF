import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, X, Download, Package, ArrowLeft, Image as ImageIcon,
  Type, ImagePlus, RotateCw, MonitorPlay, Move, CheckCircle2
} from 'lucide-react';

const WatermarkImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  const [watermarkImageFile, setWatermarkImageFile] = useState(null);
  const [watermarkImageUrl, setWatermarkImageUrl] = useState(null);

  const fileInputRef = useRef(null);
  const wmImageInputRef = useRef(null);
  const canvasRef = useRef(null);
  const previewWrapperRef = useRef(null);

  const [overlayPos, setOverlayPos] = useState({ x: 0, y: 0 });
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const overlayStartPos = useRef({ x: 0, y: 0 });

  // Default State Generator
  const getDefaultState = () => ({
    type: 'text', // 'text' | 'image'
    text: 'MediaTools',
    color: '#ffffff',
    fontFamily: 'Roboto, sans-serif',
    positionMode: 'grid', // 'grid' | 'custom'
    gridPosition: 'center', // 'top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'
    customX: 0,
    customY: 0,
    size: 20, // 5 to 100 (%)
    opacity: 50, // 0 to 100 (%)
    rotation: 0, // -180 to 180 (deg)
  });

  const [globalState, setGlobalState] = useState(getDefaultState());

  const activeFile = activeIndex !== -1 ? uploadedFiles[activeIndex] : null;
  const activeState = activeFile ? activeFile.state : globalState;

  // --- FILE HANDLING ---
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png|webp|bmp|tiff)/));
    if (validFiles.length === 0) return alert("No valid image files.");

    const baseState = uploadedFiles.length > 0 ? { ...uploadedFiles[uploadedFiles.length - 1].state } : getDefaultState();

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
            state: { ...baseState },
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

  // --- WATERMARK IMAGE UPLOAD ---
  const handleWatermarkImageUpload = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setWatermarkImageFile(file);
      if (watermarkImageUrl) URL.revokeObjectURL(watermarkImageUrl);
      setWatermarkImageUrl(URL.createObjectURL(file));
      updateActiveState('type', 'image');
    }
  };

  // --- STATE UPDATES ---
  const updateActiveState = (key, value) => {
    if (activeFile) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].state = { ...up[activeIndex].state, [key]: value };
          if (key === 'gridPosition') up[activeIndex].state.positionMode = 'grid';
          
          if (up[activeIndex].processedBlob) {
            up[activeIndex].processedBlob = null;
            if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
            up[activeIndex].processedUrl = null;
          }
        }
        return up;
      });
    } else {
      setGlobalState(prev => {
        const up = { ...prev, [key]: value };
        if (key === 'gridPosition') up.positionMode = 'grid';
        return up;
      });
    }
  };

  // --- LIVE PREVIEW MATH ---
  const calculateOverlayStyles = () => {
    if (!activeFile || activeFile.processedUrl || !previewWrapperRef.current) return {};
    
    const wrapper = previewWrapperRef.current;
    const baseImg = wrapper.querySelector('#base-preview-img');
    if (!baseImg) return {};

    const displayWidth = baseImg.clientWidth;
    const displayHeight = baseImg.clientHeight;
    if (displayWidth === 0 || displayHeight === 0) return {};

    const targetWidth = displayWidth * (activeState.size / 100);
    
    let fontSize = 10;
    if (activeState.type === 'text') {
      // Estimate font size based on target width
      // a very rough estimation: 1 letter roughly 0.6em width
      const charCount = activeState.text.length || 1;
      fontSize = (targetWidth / charCount) * 1.5;
      fontSize = Math.max(12, fontSize);
    }

    return {
      opacity: activeState.opacity / 100,
      transform: `rotate(${activeState.rotation}deg)`,
      color: activeState.color,
      fontFamily: activeState.fontFamily,
      width: activeState.type === 'image' ? targetWidth : 'auto',
      height: activeState.type === 'image' ? targetWidth : 'auto',
      fontSize: `${fontSize}px`,
      backgroundImage: activeState.type === 'image' && watermarkImageUrl ? `url(${watermarkImageUrl})` : 'none',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    };
  };

  const updateOverlayPosition = useCallback(() => {
    if (!activeFile || activeFile.processedUrl || !previewWrapperRef.current) return;
    
    const wrapper = previewWrapperRef.current;
    const baseImg = wrapper.querySelector('#base-preview-img');
    const overlay = wrapper.querySelector('#watermark-overlay');
    if (!baseImg || !overlay) return;

    const displayWidth = baseImg.clientWidth;
    const displayHeight = baseImg.clientHeight;
    const wmW = overlay.offsetWidth;
    const wmH = overlay.offsetHeight;

    let x = 0, y = 0;

    if (activeState.positionMode === 'grid') {
      const pos = activeState.gridPosition;
      if (pos.includes("top")) y = 0;
      else if (pos.includes("bottom")) y = displayHeight - wmH;
      else y = (displayHeight - wmH) / 2;
      
      if (pos.includes("left")) x = 0;
      else if (pos.includes("right")) x = displayWidth - wmW;
      else x = (displayWidth - wmW) / 2;
    } else {
      x = (activeState.customX / 100) * displayWidth;
      y = (activeState.customY / 100) * displayHeight;
    }

    x = Math.max(0, Math.min(displayWidth - wmW, x));
    y = Math.max(0, Math.min(displayHeight - wmH, y));

    setOverlayPos({ x, y });
  }, [activeFile, activeState, watermarkImageUrl]);

  useEffect(() => {
    updateOverlayPosition();
    // A small delay to ensure DOM is updated for font-size rendering
    const t = setTimeout(updateOverlayPosition, 50);
    return () => clearTimeout(t);
  }, [activeFile, activeState, watermarkImageUrl, updateOverlayPosition]);

  // --- DRAG OVERLAY ---
  const handleOverlayDragStart = (e) => {
    if (activeFile?.processedUrl) return;
    setIsDraggingOverlay(true);
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    overlayStartPos.current = { x: overlayPos.x, y: overlayPos.y };
    e.preventDefault(); // prevent text selection
  };

  const handleOverlayDragMove = useCallback((e) => {
    if (!isDraggingOverlay || !previewWrapperRef.current) return;
    
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragStartPos.current.x;
    const dy = clientY - dragStartPos.current.y;

    let newX = overlayStartPos.current.x + dx;
    let newY = overlayStartPos.current.y + dy;

    const wrapper = previewWrapperRef.current;
    const baseImg = wrapper.querySelector('#base-preview-img');
    const overlay = wrapper.querySelector('#watermark-overlay');
    if (!baseImg || !overlay) return;

    const displayWidth = baseImg.clientWidth;
    const displayHeight = baseImg.clientHeight;
    const wmW = overlay.offsetWidth;
    const wmH = overlay.offsetHeight;

    newX = Math.max(0, Math.min(displayWidth - wmW, newX));
    newY = Math.max(0, Math.min(displayHeight - wmH, newY));

    setOverlayPos({ x: newX, y: newY });
    
    // Update custom pos in state smoothly without triggering full re-render
    const customXPct = (newX / displayWidth) * 100;
    const customYPct = (newY / displayHeight) * 100;
    
    setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].state.positionMode = 'custom';
          up[activeIndex].state.customX = customXPct;
          up[activeIndex].state.customY = customYPct;
          
          if (up[activeIndex].processedBlob) {
            up[activeIndex].processedBlob = null;
            if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
            up[activeIndex].processedUrl = null;
          }
        }
        return up;
    });

  }, [isDraggingOverlay, activeIndex]);

  const handleOverlayDragEnd = useCallback(() => {
    setIsDraggingOverlay(false);
  }, []);

  useEffect(() => {
    if (isDraggingOverlay) {
      window.addEventListener('mousemove', handleOverlayDragMove);
      window.addEventListener('mouseup', handleOverlayDragEnd);
      window.addEventListener('touchmove', handleOverlayDragMove, { passive: false });
      window.addEventListener('touchend', handleOverlayDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleOverlayDragMove);
      window.removeEventListener('mouseup', handleOverlayDragEnd);
      window.removeEventListener('touchmove', handleOverlayDragMove);
      window.removeEventListener('touchend', handleOverlayDragEnd);
    };
  }, [isDraggingOverlay, handleOverlayDragMove, handleOverlayDragEnd]);


  // --- PROCESSING ---
  const applyWatermark = async () => {
    if (!activeFile) return;

    if (activeState.type === 'image' && !watermarkImageFile) {
      return alert("Please upload a watermark image (logo) first.");
    }

    setIsProcessing(true);
    
    try {
      // Simulate backend processing time
      await new Promise(r => setTimeout(r, 800));
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = activeFile.origW;
      canvas.height = activeFile.origH;
      
      const img = new Image();
      img.src = activeFile.dataUrl;
      await new Promise(r => img.onload = r);
      ctx.drawImage(img, 0, 0);

      // Draw Watermark (Simplified for Simulation)
      const maxDim = Math.max(activeFile.origW, activeFile.origH);
      const targetSize = activeFile.origW * (activeState.size / 100);
      
      ctx.globalAlpha = activeState.opacity / 100;
      
      let x = activeFile.origW / 2;
      let y = activeFile.origH / 2;

      // Map Grid positions to canvas coords roughly
      if (activeState.positionMode === 'grid') {
        const pos = activeState.gridPosition;
        if (pos.includes('left')) x = targetSize;
        if (pos.includes('right')) x = activeFile.origW - targetSize;
        if (pos.includes('top')) y = targetSize;
        if (pos.includes('bottom')) y = activeFile.origH - targetSize;
      } else {
         x = (activeState.customX / 100) * activeFile.origW;
         y = (activeState.customY / 100) * activeFile.origH;
      }

      ctx.translate(x, y);
      ctx.rotate((activeState.rotation * Math.PI) / 180);

      if (activeState.type === 'text') {
        const fontSize = Math.max(20, targetSize / (activeState.text.length || 1) * 2);
        ctx.font = `bold ${fontSize}px ${activeState.fontFamily}`;
        ctx.fillStyle = activeState.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeState.text || 'MediaTools', 0, 0);
      } else if (watermarkImageUrl) {
        const wmImg = new Image();
        wmImg.src = watermarkImageUrl;
        await new Promise(r => wmImg.onload = r);
        ctx.drawImage(wmImg, -targetSize/2, -targetSize/2, targetSize, targetSize);
      }

      ctx.rotate((-activeState.rotation * Math.PI) / 180);
      ctx.translate(-x, -y);
      ctx.globalAlpha = 1.0;
      
      const mimeType = activeFile.file.type || 'image/jpeg';
      
      canvas.toBlob((blob) => {
        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].processedBlob = blob;
          up[activeIndex].processedUrl = URL.createObjectURL(blob);
          return up;
        });
        
        setIsProcessing(false);
      }, mimeType, 0.95);
      
    } catch(err) {
      console.error("Watermark Error:", err);
      setIsProcessing(false);
      alert("Failed to apply watermark.");
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
      const ext = processed[0].file.name.substring(processed[0].file.name.lastIndexOf("."));
      setTimeout(() => downloadFile(processed[0].processedBlob, `watermarked_${nameWithoutExt}${ext}`), 100);
      return;
    }
    
    alert("Batch ZIP saving requires the backend API which is currently simulated.");
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border-t border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 flex flex-col h-full space-y-6">
            
            {/* 1. Upload */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide border-b border-slate-700/50 pb-1">1. Upload Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-sky-400 bg-sky-400/10' : 'border-slate-600 bg-[#0f172a]/60 hover:border-sky-400 hover:bg-sky-900/20'}`}
              >
                <div className="text-3xl mb-2">📤</div>
                <p className="text-sm text-slate-300">Drag & drop image(s) here or <span className="text-sky-400 underline font-semibold">browse</span></p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Uploaded Files ({uploadedFiles.length}):</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer bg-slate-50 transition-all group ${idx === activeIndex ? 'border-sky-400 shadow-[0_0_0_2px_rgba(56,189,248,0.35)]' : 'border-slate-800 hover:border-slate-500'}`}>
                        <img src={item.processedUrl || item.dataUrl} className="w-full h-full object-cover" />
                        {item.processedBlob && (
                          <div className="absolute top-1 left-1 bg-emerald-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <button onClick={(e) => removeFile(e, idx)} className="absolute top-1 right-1 w-4 h-4 bg-red-500/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all z-10"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Watermark Settings */}
            <div className={`flex flex-col gap-4 transition-opacity duration-300 ${!activeFile ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide border-b border-slate-700/50 pb-1">2. Watermark Settings</h3>
              
              {/* Type Toggle */}
              <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-700">
                <button 
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${activeState.type === 'text' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  onClick={() => updateActiveState('type', 'text')}
                >
                  <Type className="w-3.5 h-3.5" /> Text
                </button>
                <button 
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${activeState.type === 'image' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  onClick={() => updateActiveState('type', 'image')}
                >
                  <ImagePlus className="w-3.5 h-3.5" /> Image
                </button>
              </div>

              {/* Text Settings Panel */}
              {activeState.type === 'text' && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Text Content</label>
                    <input 
                      type="text" 
                      value={activeState.text} 
                      onChange={(e) => updateActiveState('text', e.target.value)}
                      className="w-full bg-[#0f172a] border border-slate-700 text-white text-sm rounded-md px-3 py-2 focus:border-sky-500 focus:outline-none"
                      placeholder="Enter watermark text..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Font Family</label>
                      <select 
                        value={activeState.fontFamily} 
                        onChange={(e) => updateActiveState('fontFamily', e.target.value)}
                        className="w-full bg-[#0f172a] border border-slate-700 text-white text-sm rounded-md px-3 py-2 focus:border-sky-500 focus:outline-none appearance-none"
                      >
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Times New Roman, serif">Times New Roman</option>
                        <option value="Courier New, monospace">Courier New</option>
                      </select>
                    </div>
                    <div className="w-[70px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Color</label>
                      <input 
                        type="color" 
                        value={activeState.color} 
                        onChange={(e) => updateActiveState('color', e.target.value)}
                        className="w-full h-[38px] rounded-md cursor-pointer border border-slate-700 bg-[#0f172a] p-0.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Image Settings Panel */}
              {activeState.type === 'image' && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <label className="text-xs font-semibold text-slate-400">Upload Watermark Image (Logo)</label>
                  <button 
                    onClick={() => wmImageInputRef.current?.click()}
                    className="w-full py-2 bg-[#0f172a] border border-slate-700 hover:border-sky-500 text-slate-300 text-sm font-semibold rounded-md transition-colors"
                  >
                    Choose Image File
                  </button>
                  <input type="file" ref={wmImageInputRef} onChange={handleWatermarkImageUpload} accept="image/*" className="hidden" />
                  <p className="text-[10px] text-slate-500 truncate">{watermarkImageFile ? watermarkImageFile.name : 'No file selected.'}</p>
                </div>
              )}

              <div className="h-px bg-slate-700/50 w-full my-1"></div>

              {/* Position Grid */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400">Position Grid</label>
                <div className="grid grid-cols-3 grid-rows-3 gap-1 aspect-square w-full max-w-[120px] mx-auto bg-[#0f172a] p-1.5 rounded-lg border border-slate-700">
                  {['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(pos => (
                    <div 
                      key={pos}
                      onClick={() => updateActiveState('gridPosition', pos)}
                      className={`rounded-sm cursor-pointer transition-colors flex items-center justify-center ${activeState.positionMode === 'grid' && activeState.gridPosition === pos ? 'bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'bg-[#1e293b] hover:bg-slate-600'}`}
                    >
                      {activeState.positionMode === 'grid' && activeState.gridPosition === pos && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 text-center">Select an anchor point, or drag in preview.</p>
              </div>

              {/* Sliders */}
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400">Size / Scale</label>
                    <span className="text-xs text-sky-400 font-bold">{activeState.size}%</span>
                  </div>
                  <input type="range" min="5" max="100" value={activeState.size} onChange={(e) => updateActiveState('size', parseInt(e.target.value))} className="w-full accent-sky-500" />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400">Opacity</label>
                    <span className="text-xs text-sky-400 font-bold">{activeState.opacity}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={activeState.opacity} onChange={(e) => updateActiveState('opacity', parseInt(e.target.value))} className="w-full accent-sky-500" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400">Rotation</label>
                    <span className="text-xs text-sky-400 font-bold">{activeState.rotation}°</span>
                  </div>
                  <input type="range" min="-180" max="180" value={activeState.rotation} onChange={(e) => updateActiveState('rotation', parseInt(e.target.value))} className="w-full accent-sky-500" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={`mt-auto pt-4 flex flex-col gap-2 ${!activeFile ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <button 
                onClick={applyWatermark}
                disabled={!activeFile || isProcessing || (activeState.type === 'image' && !watermarkImageUrl)} 
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span> Processing...</> : <><MonitorPlay className="w-4 h-4" /> Apply Watermark</>}
              </button>
              <button 
                onClick={() => setGlobalState(getDefaultState())}
                disabled={!activeFile || isProcessing}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
              >
                Reset Options
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <canvas ref={canvasRef} className="hidden" />

          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center min-h-[450px]">
              <ImageIcon className="w-16 h-16 text-slate-700 mb-4 opacity-80" />
              <h3 className="text-xl font-bold text-slate-200 mb-2">No Image Uploaded</h3>
              <p className="text-sm mt-2 text-slate-400 max-w-[320px]">Upload single or multiple images to see live watermark preview.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full gap-4 overflow-y-auto">
              
              {/* Stage Header */}
              <div className="flex justify-between items-center px-4 py-3 bg-[#1e293b] border border-slate-700 rounded-lg shrink-0">
                <div className="flex items-center gap-2 text-sm text-slate-200 flex-wrap">
                  <span className="text-slate-500 font-medium">Active Image:</span>
                  <strong className="truncate max-w-[200px]">{activeFile.name}</strong>
                  <span className="bg-cyan-500/20 text-sky-400 px-2 py-0.5 rounded-md text-xs border border-cyan-500/30">
                    Mode: {activeState.type.toUpperCase()}
                  </span>
                </div>
                
                <div className="hidden sm:block">
                  <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/30">
                    Live Preview
                  </span>
                </div>
              </div>

              {/* Viewport */}
              <div 
                className="flex-1 bg-[#090d16] rounded-xl border border-slate-700 relative flex items-center justify-center p-2 min-h-[400px] overflow-hidden"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0)',
                  backgroundSize: '16px 16px'
                }}
              >
                {/* Image Wrapper */}
                <div 
                  ref={previewWrapperRef}
                  className="relative max-w-full max-h-full inline-flex justify-center items-center shadow-2xl"
                  style={{ touchAction: 'none' }}
                >
                  <img 
                    id="base-preview-img"
                    src={activeFile.processedUrl || activeFile.dataUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-[550px] object-contain select-none"
                    draggable="false"
                  />
                  
                  {/* Draggable Watermark Overlay (Only show if not processed) */}
                  {!activeFile.processedUrl && (
                    <div 
                      id="watermark-overlay"
                      className={`absolute cursor-grab active:cursor-grabbing select-none hover:outline hover:outline-1 hover:outline-white/50 ${activeState.type === 'text' ? 'font-bold leading-none whitespace-nowrap' : ''}`}
                      style={{
                        top: `${overlayPos.y}px`,
                        left: `${overlayPos.x}px`,
                        transformOrigin: 'center center',
                        ...calculateOverlayStyles()
                      }}
                      onMouseDown={handleOverlayDragStart}
                      onTouchStart={handleOverlayDragStart}
                      title="Drag to position"
                    >
                      {activeState.type === 'text' ? (activeState.text || 'Text') : ''}
                      {!watermarkImageUrl && activeState.type === 'image' && <div className="w-full h-full bg-slate-800/80 text-white flex items-center justify-center text-[10px] border border-dashed border-white/50">NO LOGO</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex justify-between items-center px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl shrink-0">
                <div className="text-xs text-slate-400">
                  {activeFile.processedBlob 
                    ? `Watermark applied! Click Save to download.` 
                    : `Drag watermark in preview to reposition precisely.`}
                </div>
                
                <div className="flex gap-3">
                  {uploadedFiles.length > 1 && uploadedFiles.some(f => f.processedBlob) && (
                    <button 
                      onClick={saveAllImages}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white border border-cyan-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                      <Package className="w-4 h-4" /> Save All (ZIP)
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
                      const ext = activeFile.file.name.substring(activeFile.file.name.lastIndexOf("."));
                      downloadFile(activeFile.processedBlob, `watermarked_${nameWithoutExt}${ext}`);
                    }}
                    disabled={!activeFile.processedBlob}
                    className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    <Download className="w-4 h-4" /> Save Processed Image
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

export default WatermarkImages;
