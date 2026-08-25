import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, ArrowLeft, Image as ImageIcon,
  RotateCcw, Download, Package, RefreshCw, CheckCircle2,
  AlertTriangle, Wand2, FileArchive, Layers
} from 'lucide-react';

const DeskewImages = ({ tool, onBack }) => {
  // State
  const [items, setItems] = useState([]); // { id, file, status, originalUrl, previewUrl, finalUrl, angle }
  const [activeId, setActiveId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
    const validFiles = files.filter(f => f.type.match(/image\/(jpeg|png|webp)/) && f.size <= 15 * 1024 * 1024);
    if (validFiles.length < files.length) alert("Some files were skipped (unsupported or >15MB).");
    if (validFiles.length === 0) return;

    const newItems = validFiles.map(file => {
      const id = 'deskew_' + Math.random().toString(36).substr(2, 9);
      const item = {
        id,
        file,
        status: 'waiting', // waiting, detecting, detected, no_skew, processing, completed, failed
        originalUrl: URL.createObjectURL(file),
        previewUrl: null, // Simulated rotated preview
        finalUrl: null,
        angle: 0,
        showCropped: false // Before/After toggle state
      };
      // Auto-start detection
      startDetection(item);
      return item;
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

  // --- 2. DETECTION (Simulated) ---
  const startDetection = async (item) => {
    // Set initial detecting state for the individual item
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'detecting' } : i));

    try {
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000)); // Simulate varied API delay
      
      // Simulate detection logic (70% skewed, 30% no_skew)
      const hasSkew = Math.random() > 0.3;
      let angle = 0;
      let status = 'no_skew';

      if (hasSkew) {
        // Random angle between -15 and +15, excluding near-zero
        angle = (Math.random() * 30 - 15);
        if (Math.abs(angle) < 0.5) angle = (angle > 0 ? 2 : -2);
        status = 'detected';
      }

      setItems(prev => prev.map(i => {
        if (i.id === item.id) {
          return { 
            ...i, 
            status, 
            angle, 
            previewUrl: i.originalUrl, // For mock, we use CSS rotate on the original URL to simulate deskew
            showCropped: status === 'detected' // Auto switch to 'After' view if detected
          };
        }
        return i;
      }));
    } catch(err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed' } : i));
    }
  };

  const manualDetect = () => {
    if (activeItem) startDetection(activeItem);
  };

  // --- 3. APPLY DESKEW (Simulated) ---
  const applyDeskew = async () => {
    if (!activeItem || activeItem.status !== 'detected') return;
    lockUI("Applying deskew transform...");
    
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'processing' } : i));

    try {
      await new Promise(r => setTimeout(r, 1200)); // Simulate process
      
      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          return { 
            ...i, 
            status: 'completed',
            finalUrl: i.originalUrl, // Mock final URL (relies on CSS to hold the rotation state for now)
            showCropped: true
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
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, showCropped: !i.showCropped } : i));
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
  const successCount = items.filter(i => i.status === 'completed' || i.status === 'no_skew').length;
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
                    ${activeId === item.id ? 'bg-sky-500/10 border-sky-500 shadow-[inset_4px_0_0_rgba(56,189,248,1)]' : 'bg-white border-slate-200 hover:border-slate-300'}
                  `}
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                    <img 
                      src={item.originalUrl} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300" 
                      style={{ transform: item.showCropped ? `rotate(${-item.angle}deg) scale(1.1)` : 'rotate(0deg)' }}
                      alt="thumb" 
                    />
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
                  className="mt-4 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-sky-500 hover:bg-sky-50 transition-all"
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Drag & Drop</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-3 shrink-0">
                <div className="text-[10px] text-center text-slate-500">
                  {items.length} total • {successCount} ready • {failedCount} failed
                </div>
                {successCount > 0 && items.every(i => !['waiting', 'detecting', 'processing'].includes(i.status)) && (
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

        {/* Right Workspace - Image Area */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            
            {/* Main Stage */}
            <div 
              className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden"
              style={{ backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)', backgroundSize: '16px 16px' }}
            >
              {!activeItem ? (
                <div className="text-center text-slate-500 flex flex-col items-center">
                  <ImageIcon className="w-16 h-16 opacity-50 mb-4" />
                  <p>Select an image from the gallery</p>
                </div>
              ) : (
                <div className="relative inline-flex items-center justify-center max-w-full max-h-full">
                  
                  {/* Simulate Original Image visually skewed, or apply counter-rotation to deskew it */}
                  <img 
                    src={activeItem.originalUrl} 
                    alt="Active" 
                    className="max-w-full max-h-[70vh] object-contain transition-all duration-700 shadow-2xl"
                    style={{ 
                      // If showing cropped (deskewed), we rotate by negative angle. 
                      // To make it realistic, we also scale up slightly to hide corners like a real crop.
                      transform: activeItem.showCropped ? `rotate(${-activeItem.angle}deg) scale(1.05)` : 'rotate(0deg) scale(1)'
                    }}
                  />

                  {/* Processing Overlay */}
                  {(activeItem.status === 'detecting' || activeItem.status === 'processing') && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-sky-400 gap-3 rounded-lg">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-bold tracking-wider uppercase">
                        {activeItem.status === 'detecting' ? 'Detecting Skew...' : 'Applying Deskew...'}
                      </span>
                    </div>
                  )}
                  
                  {/* Global Block Overlay */}
                  {isProcessing && activeItem.status !== 'detecting' && activeItem.status !== 'processing' && (
                    <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-sm rounded-lg" />
                  )}
                </div>
              )}
            </div>

            {/* Action Bar (Bottom) */}
            {activeItem && (
              <div className="px-5 py-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                
                {/* Status Info */}
                <div className="flex items-center gap-3">
                  <ActiveStatusBadge status={activeItem.status} />
                  <span className="text-xs text-slate-500 font-medium hidden sm:block">
                    {activeItem.status === 'waiting' && "Ready to detect skew."}
                    {activeItem.status === 'detecting' && "Analyzing image angles..."}
                    {activeItem.status === 'detected' && `Detected Skew: ${activeItem.angle.toFixed(1)}°. Review and Apply.`}
                    {activeItem.status === 'no_skew' && "Image is straight. No deskew needed."}
                    {activeItem.status === 'processing' && "Processing final image..."}
                    {activeItem.status === 'completed' && "Deskew applied successfully."}
                    {activeItem.status === 'failed' && "Processing failed. Try again."}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {(activeItem.status === 'detected' || activeItem.status === 'completed') && (
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200" onClick={toggleView}>
                      <span className="text-[10px] font-semibold text-slate-500">Before</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${activeItem.showCropped ? 'bg-sky-500' : 'bg-slate-300'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${activeItem.showCropped ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-[10px] font-semibold text-sky-600">After</span>
                    </div>
                  )}

                  {activeItem.status === 'completed' ? (
                    <button 
                      onClick={() => downloadFile(activeItem.originalUrl, `deskewed_${activeItem.file.name}`)}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-sky-600 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  ) : (
                    <>
                      {['no_skew', 'failed'].includes(activeItem.status) && (
                         <button 
                         onClick={manualDetect}
                         disabled={isProcessing}
                         className="px-4 py-2 bg-white hover:bg-slate-50 text-sky-600 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                       >
                         <Wand2 className="w-3.5 h-3.5" /> Retake
                       </button>
                      )}

                      {activeItem.status === 'detected' && (
                        <button 
                          onClick={applyDeskew}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Apply Deskew
                        </button>
                      )}
                    </>
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
    detecting: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse',
    detected: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    no_skew: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-sky-500/20 text-sky-400 border-sky-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    waiting: 'Waiting', detecting: 'Detecting', detected: 'Detected', no_skew: 'Straight', processing: 'Processing', completed: 'Completed', failed: 'Error'
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
    detecting: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse',
    detected: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    no_skew: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-sky-500/20 text-sky-400 border-sky-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    waiting: 'WAITING', detecting: 'DETECTING...', detected: 'SKEW DETECTED', no_skew: 'NO SKEW', processing: 'PROCESSING...', completed: 'DESKEWED', failed: 'FAILED'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default DeskewImages;
