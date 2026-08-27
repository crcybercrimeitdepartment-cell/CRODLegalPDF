import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { 
  UploadCloud, X, ArrowLeft, Image as ImageIcon,
  CheckCircle2, BoxSelect, Search, Download, FileArchive, RefreshCw
} from 'lucide-react';

const PerspectiveCorrection = ({ tool, onBack }) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  
  // State
  const [items, setItems] = useState([]); // { id, file, status, localUrl, corners, applyData, showCropped }
  const [activeId, setActiveId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("");

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas interaction state
  const [draggingNodeIdx, setDraggingNodeIdx] = useState(-1);
  const NODE_RADIUS = 12;

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
    const validFiles = files.filter(f => f.type.match(/image\/(jpeg|png|webp)/));
    if (validFiles.length === 0) return alert("Only JPG, PNG, and WEBP supported.");

    const newItems = validFiles.map(file => ({
      id: 'item_' + Math.random().toString(36).substr(2, 9),
      file,
      status: 'waiting', // waiting, detecting, detected, processing, completed, failed
      localUrl: URL.createObjectURL(file),
      corners: [
        { x: 0.1, y: 0.1 }, 
        { x: 0.9, y: 0.1 }, 
        { x: 0.9, y: 0.9 }, 
        { x: 0.1, y: 0.9 }
      ], // Default safe corners mapping 10% from edges
      applyData: null,
      showCropped: true,
      job_id: null
    }));

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

  // --- 2. DETECTION (Backend Auto Detect) ---
  const detectBorders = async () => {
    if (!activeItem) return;
    lockUI("Detecting corners automatically...");
    
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'detecting' } : i));

    try {
      const formData = new FormData();
      formData.append("file", activeItem.file);

      const res = await fetch(`${API_BASE_URL}/api/v1/images/perspective/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Detection failed");

      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          return { 
            ...i, 
            status: 'detected', 
            corners: (data.corners && data.corners.length === 4) ? data.corners : i.corners,
            job_id: data.job_id
          };
        }
        return i;
      }));
    } catch(err) {
      console.error(err);
      setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'failed' } : i));
    }
    
    unlockUI();
  };

  // --- 3. APPLY CORRECTION (Backend) ---
  const applyCorrection = async () => {
    if (!activeItem || activeItem.corners.length !== 4) return;
    lockUI("Applying perspective correction...");
    
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'processing' } : i));

    try {
      let currentJobId = activeItem.job_id;
      
      // Upload if not already uploaded (e.g. if user just dragged manually and hit Apply)
      if (!currentJobId) {
        const formData = new FormData();
        formData.append("file", activeItem.file);
        
        const uploadRes = await fetch(`${API_BASE_URL}/api/v1/images/perspective/upload`, {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.detail || "Upload failed");
        
        currentJobId = uploadData.job_id;
      }

      const applyRes = await fetch(`${API_BASE_URL}/api/v1/images/perspective/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: currentJobId,
          corners: activeItem.corners
        })
      });
      const applyData = await applyRes.json();
      if (!applyRes.ok || !applyData.success) throw new Error(applyData.detail || "Correction failed");

      const resultPreviewUrl = `${API_BASE_URL}${applyData.preview_url}`;

      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          return { 
            ...i, 
            status: 'completed',
            applyData: { previewUrl: resultPreviewUrl },
            processedUrl: resultPreviewUrl,
            showCropped: true,
            job_id: currentJobId
          };
        }
        return i;
      }));
    } catch(err) {
      console.error("Correction Error:", err);
      setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'failed' } : i));
    }
    
    unlockUI();
  };

  const toggleView = () => {
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, showCropped: !i.showCropped } : i));
  };
  
  const lockUI = (msg) => { setIsProcessing(true); setProcessingText(msg); };
  const unlockUI = () => setIsProcessing(false);

  const downloadFile = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllZip = async () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.processedUrl);
    if (completedItems.length === 0) return alert("No corrected images to download.");
    
    lockUI("Generating ZIP file...");
    try {
      const zip = new JSZip();
      for (const item of completedItems) {
        const response = await fetch(item.processedUrl);
        const blob = await response.blob();
        zip.file(`perspective_${item.file.name}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadFile(URL.createObjectURL(zipBlob), "perspective_corrected_images.zip");
    } catch (err) {
      console.error(err);
      alert("Failed to generate ZIP file.");
    }
    unlockUI();
  };


  // --- 4. CANVAS INTERACTION (Drawing & Dragging) ---
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !activeItem) return;

    const ctx = canvas.getContext('2d');
    
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeItem.corners.length === 4 && (activeItem.status === 'detected' || activeItem.status === 'waiting' || activeItem.status === 'detecting' || (activeItem.status === 'completed' && !activeItem.showCropped))) {
      
      const pxCorners = activeItem.corners.map(c => ({
        x: c.x * canvas.width,
        y: c.y * canvas.height
      }));

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(pxCorners[0].x, pxCorners[0].y);
      ctx.lineTo(pxCorners[1].x, pxCorners[1].y);
      ctx.lineTo(pxCorners[2].x, pxCorners[2].y);
      ctx.lineTo(pxCorners[3].x, pxCorners[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      
      ctx.strokeStyle = '#db2777'; // Pink
      ctx.lineWidth = 2;
      ctx.stroke();
      
      pxCorners.forEach((node, i) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = i === draggingNodeIdx ? '#ffffff' : '#db2777';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }, [activeItem, draggingNodeIdx]);

  useEffect(() => {
    drawCanvas();
    window.addEventListener('resize', drawCanvas);
    return () => window.removeEventListener('resize', drawCanvas);
  }, [drawCanvas]);


  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (!activeItem || (activeItem.status !== 'detected' && activeItem.status !== 'waiting') || activeItem.corners.length !== 4) return;
    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    
    const pxCorners = activeItem.corners.map(c => ({
      x: c.x * canvas.width,
      y: c.y * canvas.height
    }));

    const idx = pxCorners.findIndex(c => Math.hypot(c.x - pos.x, c.y - pos.y) <= NODE_RADIUS + 10);
    if (idx !== -1) {
      e.preventDefault();
      setDraggingNodeIdx(idx);
    }
  };

  const handlePointerMove = (e) => {
    if (draggingNodeIdx !== -1 && activeItem) {
      e.preventDefault();
      const pos = getMousePos(e);
      const canvas = canvasRef.current;
      
      const newX = Math.max(0, Math.min(1, pos.x / canvas.width));
      const newY = Math.max(0, Math.min(1, pos.y / canvas.height));

      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          const newCorners = [...i.corners];
          newCorners[draggingNodeIdx] = { x: newX, y: newY };
          return { ...i, corners: newCorners };
        }
        return i;
      }));
    } else if (activeItem && (activeItem.status === 'detected' || activeItem.status === 'waiting')) {
      const pos = getMousePos(e);
      const canvas = canvasRef.current;
      const pxCorners = activeItem.corners.map(c => ({
        x: c.x * canvas.width,
        y: c.y * canvas.height
      }));
      const isHover = pxCorners.some(c => Math.hypot(c.x - pos.x, c.y - pos.y) <= NODE_RADIUS + 10);
      canvas.style.cursor = isHover ? 'grab' : 'crosshair';
    }
  };

  const handlePointerUp = () => {
    if (draggingNodeIdx !== -1) setDraggingNodeIdx(-1);
  };

  useEffect(() => {
    const handleMouseUp = () => setDraggingNodeIdx(-1);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    }
  }, []);

  const successCount = items.filter(i => i.status === 'completed').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar - Gallery */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-hidden z-20">
          <div className="p-4 sm:p-5 flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-sky-600 uppercase tracking-wide">Gallery ({items.length})</h3>
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
                    ${activeId === item.id ? 'bg-pink-500/10 border-pink-500 shadow-[inset_4px_0_0_rgba(219,39,119,1)]' : 'bg-white border-slate-200 hover:border-slate-300'}
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
                  className="mt-4 border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-pink-500 hover:bg-pink-500/5 transition-all"
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
                  {items.length} total • {successCount} success • {failedCount} failed
                </div>
                {successCount > 0 && (
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

        {/* Right Workspace - Canvas Area */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            
            {/* Main Stage */}
            <div 
              ref={containerRef}
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
                  <img 
                    ref={imageRef}
                    src={(activeItem.status === 'completed' && activeItem.showCropped && activeItem.processedUrl) ? activeItem.processedUrl : activeItem.localUrl} 
                    alt="Active" 
                    className={`max-w-full max-h-[70vh] object-contain pointer-events-none transition-transform duration-500 ${activeItem.status === 'completed' && activeItem.showCropped ? 'shadow-[0_0_30px_rgba(219,39,119,0.2)]' : 'shadow-2xl'}`}
                    onLoad={drawCanvas}
                  />
                  
                  <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 z-10 touch-none"
                    style={{ 
                      pointerEvents: ((activeItem.status === 'detected' || activeItem.status === 'waiting') && !isProcessing) ? 'auto' : 'none',
                      opacity: (activeItem.status === 'completed' && activeItem.showCropped) ? 0 : 1,
                      transition: 'opacity 0.3s'
                    }}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                  />

                  {isProcessing && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-pink-400 gap-3 rounded-lg">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-bold tracking-wider uppercase">{processingText}</span>
                    </div>
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
                    {activeItem.status === 'waiting' && "Adjust corners manually or click 'Auto Detect'."}
                    {activeItem.status === 'detecting' && "Finding document boundaries..."}
                    {(activeItem.status === 'detected' || activeItem.status === 'processing') && "Adjust corners by dragging nodes if needed, then Apply."}
                    {activeItem.status === 'completed' && "Perspective corrected successfully."}
                    {activeItem.status === 'failed' && "Processing failed. Try again."}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {activeItem.status === 'completed' && (
                    <div className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200" onClick={toggleView}>
                      <span className="text-[10px] font-semibold text-slate-500">Orig</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${activeItem.showCropped ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${activeItem.showCropped ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700">Corrected</span>
                    </div>
                  )}

                  {activeItem.status === 'completed' ? (
                    <button 
                      onClick={() => downloadFile(activeItem.processedUrl || activeItem.localUrl, `perspective_${activeItem.file.name}`)}
                      className="px-4 py-2 bg-white hover:bg-slate-800 text-pink-400 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={detectBorders}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Search className="w-3.5 h-3.5" /> Auto Detect
                      </button>

                      <button 
                        onClick={applyCorrection}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Apply
                      </button>
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
    detecting: 'bg-pink-500/20 text-pink-400 border-pink-500/30 animate-pulse',
    detected: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    processing: 'bg-pink-500/20 text-pink-400 border-pink-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    waiting: 'Waiting', detecting: 'Detecting', detected: 'Detected', processing: 'Processing', completed: 'Completed', failed: 'Error'
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
    detecting: 'bg-pink-500/20 text-pink-400 border-pink-500/30 animate-pulse',
    detected: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    processing: 'bg-pink-500/20 text-pink-400 border-pink-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    waiting: 'MANUAL', detecting: 'DETECTING...', detected: 'AUTO DETECTED', processing: 'PROCESSING...', completed: 'COMPLETED', failed: 'FAILED'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default PerspectiveCorrection;
