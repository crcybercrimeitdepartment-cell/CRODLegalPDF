import React, { useState, useRef } from 'react';
import { 
  UploadCloud, X, ArrowLeft, Image as ImageIcon,
  Wand2, Download, Package, RefreshCw, CheckCircle2,
  AlertTriangle, SlidersHorizontal, Settings2, FileArchive
} from 'lucide-react';

const RemoveNoise = ({ tool, onBack }) => {
  // State
  const [items, setItems] = useState([]); // { id, file, status, originalUrl, previewUrl, level, detectionStatus }
  const [activeId, setActiveId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLevel, setCurrentLevel] = useState('medium');
  const [processingText, setProcessingText] = useState("");

  const fileInputRef = useRef(null);

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
      const id = 'noise_' + Math.random().toString(36).substr(2, 9);
      return {
        id,
        file,
        status: 'ready', // ready, processing, success, failed
        originalUrl: URL.createObjectURL(file),
        previewUrl: null,
        level: null,
        detectionStatus: null, // 'success' or 'no_noise'
        showDenoised: false
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


  // --- 2. APPLY DENOISE ---
  const applyDenoise = async () => {
    if (!activeItem || (activeItem.status !== 'ready' && activeItem.status !== 'success' && activeItem.status !== 'failed')) return;
    lockUI("Removing noise...");
    
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'processing', level: currentLevel } : i));

    try {
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800)); // Simulate process
      
      const hasNoise = Math.random() > 0.15; // 85% chance it had noise
      
      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          return { 
            ...i, 
            status: 'success',
            detectionStatus: hasNoise ? 'success' : 'no_noise',
            previewUrl: i.originalUrl, // Mock final URL
            showDenoised: hasNoise
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
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, showDenoised: !i.showDenoised } : i));
  };


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

  const downloadAllZip = () => {
    alert("Simulated ZIP generation for processed files.");
  };

  // Stats
  const successCount = items.filter(i => i.status === 'success').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar - Gallery */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-hidden z-20">
          <div className="p-4 sm:p-5 flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-sky-600 uppercase tracking-wide">Images ({items.length})</h3>
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
                    ${activeId === item.id ? 'bg-cyan-500/10 border-cyan-500 shadow-[inset_4px_0_0_rgba(6,182,212,1)]' : 'bg-white border-slate-200 hover:border-slate-300'}
                  `}
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                    <img 
                      src={item.originalUrl} 
                      className="absolute inset-0 w-full h-full object-cover transition-all" 
                      style={{ 
                        filter: item.showDenoised ? 'blur(0px) contrast(1.1)' : 'blur(0px)',
                        // In reality, it would just show the denoised image from backend. Mocking denoise visually is hard, so we just toggle slight contrast.
                      }}
                      alt="thumb" 
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-xs font-semibold text-slate-700 truncate">{item.file.name}</span>
                    <StatusBadge item={item} />
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
                  className="mt-4 border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-500/5 transition-all"
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
                {successCount > 0 && items.every(i => i.status !== 'processing') && (
                  <button 
                    onClick={downloadAllZip}
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

        {/* Right Workspace - Main Area */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex-1 flex flex-col h-full gap-4">
            
            {/* Top Settings Bar */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 shrink-0 shadow-lg">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Noise Reduction Level
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'low', title: 'Low', desc: 'Preserves details' },
                  { id: 'medium', title: 'Medium', desc: 'Recommended' },
                  { id: 'high', title: 'High', desc: 'Heavy noise' }
                ].map(lvl => (
                  <div 
                    key={lvl.id}
                    onClick={() => {
                      if (!isProcessing) {
                        setCurrentLevel(lvl.id);
                        // If we change level on a succeeded item, reset its showDenoised so they know to reapply
                        if (activeItem && activeItem.status === 'success' && activeItem.level !== lvl.id) {
                          // We don't reset status here, we just let them click apply again
                        }
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${currentLevel === lvl.id ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white border-slate-200 hover:border-slate-300'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`text-sm font-bold ${currentLevel === lvl.id ? 'text-cyan-400' : 'text-slate-200'}`}>{lvl.title}</span>
                    <span className="text-[10px] text-slate-500 text-center mt-1">{lvl.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Image Stage */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative flex items-center justify-center p-4 sm:p-8"
                 style={{ backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)', backgroundSize: '16px 16px' }}
            >
              {!activeItem ? (
                <div className="text-center text-slate-500 flex flex-col items-center">
                  <ImageIcon className="w-16 h-16 opacity-50 mb-4" />
                  <p>Select an image from the gallery</p>
                </div>
              ) : (
                <div className="relative inline-flex items-center justify-center max-w-full max-h-full w-full h-full">
                  
                  {/* Mock Visual (We use slight filter for denoised to show a change happened) */}
                  <img 
                    src={activeItem.originalUrl} 
                    alt="Active" 
                    className="max-w-full max-h-full object-contain transition-all duration-300 shadow-2xl"
                    style={{ 
                      filter: (activeItem.status === 'success' && activeItem.showDenoised) 
                        ? (currentLevel === 'high' ? 'blur(0.5px) contrast(1.15)' : currentLevel === 'low' ? 'blur(0px) contrast(1.05)' : 'blur(0.2px) contrast(1.1)') 
                        : 'none'
                    }}
                  />

                  {/* Processing Overlay */}
                  {activeItem.status === 'processing' && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-400 gap-3 rounded-lg">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-bold tracking-wider uppercase">Processing...</span>
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
                  <ActiveStatusBadge item={activeItem} currentLevel={currentLevel} />
                  <span className="text-xs text-slate-500 font-medium hidden sm:block">
                    {activeItem.status === 'ready' && "Click 'Apply Noise Removal' to process."}
                    {activeItem.status === 'processing' && "Applying noise reduction filters..."}
                    {activeItem.status === 'success' && activeItem.detectionStatus === 'no_noise' && "No significant noise detected. Original preserved."}
                    {activeItem.status === 'success' && activeItem.detectionStatus === 'success' && (activeItem.level !== currentLevel ? "Level changed. Click 'Apply' to process again." : "Noise removal applied successfully.")}
                    {activeItem.status === 'failed' && "Processing failed. Try another level or image."}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {activeItem.status === 'success' && activeItem.detectionStatus !== 'no_noise' && (
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200" onClick={toggleView}>
                      <span className="text-[10px] font-semibold text-slate-500">Orig</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${activeItem.showDenoised ? 'bg-cyan-500' : 'bg-slate-300'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${activeItem.showDenoised ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-[10px] font-semibold text-cyan-400">Denoised</span>
                    </div>
                  )}

                  {activeItem.status === 'success' ? (
                    <>
                      {activeItem.level !== currentLevel && (
                        <button 
                          onClick={applyDenoise}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <Wand2 className="w-3.5 h-3.5" /> Re-apply
                        </button>
                      )}
                      <button 
                        onClick={() => downloadFile(activeItem.originalUrl, `denoised_${activeItem.file.name}`)}
                        className="px-4 py-2 bg-white hover:bg-slate-800 text-cyan-400 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={applyDenoise}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> {activeItem.status === 'failed' ? 'Retry' : 'Apply Noise Removal'}
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
const StatusBadge = ({ item }) => {
  if (item.status === 'ready') return <span className="px-1.5 mt-1 self-start rounded text-[9px] font-bold border bg-slate-500/20 text-slate-400 border-slate-500/30">Ready</span>;
  if (item.status === 'processing') return <span className="px-1.5 mt-1 self-start rounded text-[9px] font-bold border bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse">Processing</span>;
  if (item.status === 'failed') return <span className="px-1.5 mt-1 self-start rounded text-[9px] font-bold border bg-red-500/20 text-red-400 border-red-500/30">Error</span>;
  
  if (item.status === 'success') {
    if (item.detectionStatus === 'no_noise') {
      return <span className="px-1.5 mt-1 self-start rounded text-[9px] font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Clean</span>;
    }
    return <span className="px-1.5 mt-1 self-start rounded text-[9px] font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Denoised</span>;
  }
  return null;
};

const ActiveStatusBadge = ({ item, currentLevel }) => {
  if (item.status === 'ready') return <span className="px-3 py-1 rounded-full text-xs font-bold border bg-slate-500/20 text-slate-400 border-slate-500/30">READY</span>;
  if (item.status === 'processing') return <span className="px-3 py-1 rounded-full text-xs font-bold border bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse">PROCESSING...</span>;
  if (item.status === 'failed') return <span className="px-3 py-1 rounded-full text-xs font-bold border bg-red-500/20 text-red-400 border-red-500/30">FAILED</span>;
  
  if (item.status === 'success') {
    if (item.level !== currentLevel) {
       return <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-500/20 text-amber-400 border-amber-500/30">LEVEL CHANGED</span>;
    }
    if (item.detectionStatus === 'no_noise') {
      return <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">CLEAN</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">DENOISED</span>;
  }
  return null;
};

export default RemoveNoise;
