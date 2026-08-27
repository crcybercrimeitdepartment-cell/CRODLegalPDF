import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Download, FileArchive, RefreshCw, Eye, 
  ZoomIn, ZoomOut, Maximize, Feather, Zap
} from 'lucide-react';

const DeblurImagesAI = ({ tool, onBack }) => {
  // State
  const [items, setItems] = useState([]); // { id, file, status, localUrl, applyData, showOriginal }
  const [activeId, setActiveId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const [currentLevel, setCurrentLevel] = useState('medium'); // low, medium, high
  
  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const activeItem = items.find(i => i.id === activeId);

  // --- 1. UPLOAD ---
  const handleUpload = (e) => {
    if (e.target.files?.length > 0) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files?.length > 0) addFiles(Array.from(e.dataTransfer.files));
  };

  const addFiles = (files) => {
    if (isProcessing) return;
    const validFiles = files.filter(f => f.type.match(/image\/(jpeg|png|webp)/) && f.size <= 20 * 1024 * 1024);
    if (validFiles.length < files.length) alert("Some files were skipped (unsupported or >20MB).");
    if (validFiles.length === 0) return;

    const newItems = validFiles.map(file => {
      const id = 'deblur_' + Math.random().toString(36).substr(2, 9);
      return {
        id,
        file,
        status: 'waiting', // waiting, processing, completed, failed
        localUrl: URL.createObjectURL(file),
        applyData: null,
        showOriginal: false,
        level: null
      };
    });

    setItems(prev => {
      const updated = [...prev, ...newItems];
      if (!activeId && updated.length > 0) setActiveId(updated[0].id);
      return updated;
    });
  };

  const removeItem = (id, e) => {
    e.stopPropagation();
    if (isProcessing) return;
    setItems(prev => {
      const filtered = prev.filter(x => x.id !== id);
      if (activeId === id) setActiveId(filtered.length > 0 ? filtered[0].id : null);
      return filtered;
    });
  };

  // --- 2. APPLY DEBLUR (Simulated) ---
  const applyDeblur = async () => {
    if (!activeItem) return;
    lockUI("Intelligently restoring details...");
    
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'processing' } : i));

    try {
      await new Promise(r => setTimeout(r, 1500)); // Simulate AI processing
      
      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          return { 
            ...i, 
            status: 'completed',
            applyData: { previewUrl: i.localUrl }, 
            showOriginal: false,
            level: currentLevel
          };
        }
        return i;
      }));
    } catch(err) {
      setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'failed' } : i));
    }
    
    unlockUI();
  };

  const toggleView = () => {
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, showOriginal: !i.showOriginal } : i));
  };

  // --- 3. ZOOM & PAN LOGIC ---
  const handleZoom = (delta) => {
    setZoomLevel(prev => Math.max(0.1, Math.min(prev + delta, 5)));
  };

  const handleZoomFit = () => {
    setZoomLevel(1);
    setPanPos({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0 || !activeItem) return; // Left click only
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - panPos.x, y: e.clientY - panPos.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanPos({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // --- Helpers ---
  const lockUI = (msg) => {
    setIsProcessing(true);
    setProcessingText(msg);
  };
  const unlockUI = () => setIsProcessing(false);

  const downloadFile = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const successCount = items.filter(i => i.status === 'completed').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar - Gallery */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-hidden z-20">
          <div className="p-4 sm:p-5 flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Images ({items.length})</h3>
              <button 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                disabled={isProcessing}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-bold transition-colors disabled:opacity-50 border border-slate-200 flex items-center gap-1"
              >
                + Add
              </button>
              <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept="image/*" className="hidden" />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
              {items.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => !isProcessing && setActiveId(item.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer group 
                    ${activeId === item.id ? 'bg-emerald-500/10 border-emerald-500 shadow-[inset_4px_0_0_rgba(16,185,129,1)]' : 'bg-white border-slate-200 hover:border-slate-300'}
                  `}
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    <img src={item.localUrl} className="w-full h-full object-cover" alt="thumb" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-xs font-semibold text-slate-700 truncate">{item.file.name}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <button 
                    onClick={(e) => removeItem(item.id, e)}
                    disabled={isProcessing}
                    className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {items.length === 0 && (
                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleDrop}
                  className="mt-4 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                >
                  <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Drag & Drop</p>
                  <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-3 shrink-0">
                <div className="text-[10px] text-center text-slate-500">
                  {items.length} total • {successCount} ready • {failedCount} failed
                </div>
                {successCount > 0 && (
                  <button 
                    onClick={() => alert("Simulated ZIP save")}
                    disabled={isProcessing}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <FileArchive className="w-4 h-4" /> Save All (ZIP)
                  </button>
                )}
              </div>
            )}

          </div>
        </aside>

        {/* Right Workspace */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex-1 flex flex-col h-full gap-4">
            
            {/* Top Controls Panel */}
            <div className={`grid grid-cols-3 gap-3 bg-slate-100 p-4 rounded-xl border border-slate-200 shrink-0 shadow-lg transition-opacity ${!activeItem ? 'opacity-50 pointer-events-none' : ''}`}>
              {[
                { id: 'low', title: 'Low', desc: 'Light restoration', icon: <Feather className="w-5 h-5 mb-1" /> },
                { id: 'medium', title: 'Medium', desc: 'Recommended', icon: <Eye className="w-5 h-5 mb-1" /> },
                { id: 'high', title: 'High', desc: 'Strong deblur', icon: <Zap className="w-5 h-5 mb-1" /> }
              ].map(lvl => (
                <div 
                  key={lvl.id}
                  onClick={() => {
                    if (!isProcessing) {
                      setCurrentLevel(lvl.id);
                      if (activeItem && activeItem.status === 'completed') {
                        // Reset to waiting so user can re-apply
                        setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'waiting' } : i));
                      }
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${currentLevel === lvl.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {lvl.icon}
                  <span className="text-sm font-bold">{lvl.title}</span>
                  <span className="text-[10px] text-slate-500 text-center mt-1">{lvl.desc}</span>
                </div>
              ))}
            </div>

            {/* Main Image Stage */}
            <div 
              ref={containerRef}
              className="flex-1 relative flex items-center justify-center overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xl min-h-[300px]"
              style={{ backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)', backgroundSize: '16px 16px' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              {/* Zoom Controls Overlay */}
              {activeItem && (
                <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-md p-1 shadow-lg">
                  <button onClick={() => handleZoom(-0.2)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><ZoomOut className="w-4 h-4" /></button>
                  <span className="text-xs font-mono font-bold w-12 text-center text-slate-700">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => handleZoom(0.2)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><ZoomIn className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-slate-600 mx-1" />
                  <button onClick={handleZoomFit} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><Maximize className="w-4 h-4" /></button>
                </div>
              )}

              {!activeItem ? (
                <div className="text-center text-slate-500 flex flex-col items-center">
                  <ImageIcon className="w-16 h-16 opacity-50 mb-4" />
                  <p>Select an image from the gallery</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                  <div 
                    className="relative"
                    style={{ 
                      transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomLevel})`,
                      transformOrigin: 'center',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  >
                    {/* Mock visual effect: Original is blurred slightly to simulate we are fixing a blurry image. Once processed, it becomes sharp. */}
                    <img 
                      src={activeItem.localUrl} 
                      alt="Active" 
                      draggable="false"
                      className="max-w-none max-h-none shadow-2xl transition-all duration-300 pointer-events-none"
                      style={{ 
                        filter: (activeItem.status === 'completed' && !activeItem.showOriginal) 
                          ? (activeItem.level === 'high' ? 'contrast(1.2) brightness(1.05)' : activeItem.level === 'low' ? 'contrast(1.05)' : 'contrast(1.1) brightness(1.02)') 
                          : 'blur(1px) contrast(0.95)' // Simulate original blurry state
                      }}
                    />
                  </div>

                  {/* Processing Overlay */}
                  {activeItem.status === 'processing' && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-400 gap-3">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-bold tracking-wider uppercase">{processingText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Bar (Bottom) */}
            {activeItem && (
              <div className="px-5 py-4 bg-slate-100 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-lg">
                
                {/* Status Info */}
                <div className="flex items-center gap-3">
                  <ActiveStatusBadge status={activeItem.status} />
                  <span className="text-xs text-slate-500 font-medium hidden sm:block">
                    {activeItem.status === 'waiting' && "Ready to apply deblur."}
                    {activeItem.status === 'processing' && "AI is analyzing and restoring details..."}
                    {activeItem.status === 'completed' && "Image deblurred successfully."}
                    {activeItem.status === 'failed' && "Processing failed. Try again."}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {activeItem.status === 'completed' && (
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200" onClick={toggleView}>
                      <span className={`text-[10px] font-semibold ${activeItem.showOriginal ? 'text-emerald-400' : 'text-slate-400'}`}>Original</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${!activeItem.showOriginal ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${!activeItem.showOriginal ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className={`text-[10px] font-semibold ${!activeItem.showOriginal ? 'text-emerald-400' : 'text-slate-400'}`}>Deblurred</span>
                    </div>
                  )}

                  {activeItem.status === 'completed' ? (
                    <button 
                      onClick={() => downloadFile(activeItem.localUrl, `deblur_${activeItem.file.name}`)}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-600 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  ) : (
                    <button 
                      onClick={applyDeblur}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Apply Deblur
                    </button>
                  )}
                  
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};


// Helpers
const StatusBadge = ({ status }) => {
  const styles = {
    waiting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    waiting: 'Ready', processing: 'Processing', completed: 'Completed', failed: 'Error'
  };

  return (
    <span className={`px-1.5 mt-1 self-start rounded text-[9px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const ActiveStatusBadge = ({ status }) => {
  const styles = {
    waiting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    waiting: 'READY', processing: 'PROCESSING...', completed: 'DEBLURRED', failed: 'FAILED'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default DeblurImagesAI;
