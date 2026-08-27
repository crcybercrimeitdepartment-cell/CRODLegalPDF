import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  UploadCloud, X, ArrowLeft, Camera, Image as ImageIcon,
  FileText, Plus, Trash2, CheckCircle2, RefreshCw, Zap,
  Menu, RotateCw
} from 'lucide-react';

const MultiPageScanning = ({ tool, onBack }) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  
  // State
  const [pages, setPages] = useState([]); // { id, file, status, rotation, resultData, originalUrl, showEnhanced }
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  
  // Drag State
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // --- 1. UPLOAD & ADD ---
  const handleUpload = (e) => {
    if (e.target.files?.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files?.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files) => {
    if (isProcessing) return;
    const validFiles = files.filter(f => f.type.match(/image\/(jpeg|png|webp)/));
    if (validFiles.length === 0) return alert("Only JPG, PNG, and WEBP supported.");

    const newPages = validFiles.map(file => ({
      id: 'page_' + Math.random().toString(36).substr(2, 9),
      file,
      status: 'waiting', 
      rotation: 0,
      resultData: null,
      originalUrl: URL.createObjectURL(file),
      showEnhanced: true
    }));

    setPages(prev => [...prev, ...newPages]);
  };

  // --- 2. CAMERA LOGIC ---
  const openCamera = async () => {
    setIsCameraOpen(true);
    setCapturedBlob(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported or blocked by browser security (requires HTTPS/localhost).");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      let errMsg = "Unable to access the camera.";
      if (err.name === 'NotAllowedError') errMsg = "Camera access was denied. Please allow camera permissions in your browser.";
      else if (err.name === 'NotFoundError') errMsg = "No camera device was found on this computer.";
      else errMsg = err.message || errMsg;
      
      alert(errMsg);
      closeCamera();
    }
  };

  const closeCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
    setCapturedBlob(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      blob.name = `capture_${Date.now()}.jpg`;
      setCapturedBlob(blob);
    }, 'image/jpeg', 0.95);
  };

  const usePhoto = () => {
    if (capturedBlob) {
      const fileName = capturedBlob.name || `capture_${Date.now()}.jpg`;
      const file = new File([capturedBlob], fileName, { type: "image/jpeg" });
      addFiles([file]);
      // Allow continuous capture
      setCapturedBlob(null);
      if (videoRef.current && cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);


  // --- 3. PAGE ACTIONS (Remove, Rotate, Reorder) ---
  const removePage = (id) => {
    if (isProcessing) return;
    setPages(prev => prev.filter(x => x.id !== id));
  };

  const rotatePage = (id) => {
    if (isProcessing) return;
    setPages(prev => prev.map(p => {
      if (p.id === id && p.status !== 'success' && p.status !== 'warning') {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  };

  const toggleEnhanced = (id) => {
    setPages(prev => prev.map(p => {
      if (p.id === id) return { ...p, showEnhanced: !p.showEnhanced };
      return p;
    }));
  };

  // HTML5 Drag and Drop Handlers for Reordering
  const handleDragStart = (e, id) => {
    if (isProcessing) { e.preventDefault(); return; }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id); // required for firefox
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (isProcessing) return;
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDropItem = (e, targetId) => {
    e.preventDefault();
    if (isProcessing) return;
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;

    setPages(prev => {
      const draggedIndex = prev.findIndex(p => p.id === draggedId);
      const targetIndex = prev.findIndex(p => p.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newPages = [...prev];
      const [draggedItem] = newPages.splice(draggedIndex, 1);
      newPages.splice(targetIndex, 0, draggedItem);
      return newPages;
    });
    setDraggedId(null);
  };


  // --- 4. PROCESSING ---
  const processAll = async () => {
    const pagesToProcess = pages.filter(p => p.status === 'waiting' || p.status === 'error');
    if (pagesToProcess.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    
    for (let i = 0; i < pagesToProcess.length; i++) {
      const pId = pagesToProcess[i].id;
      
      // Update individual status
      setPages(prev => prev.map(p => p.id === pId ? { ...p, status: 'processing' } : p));
      
      try {
        const formData = new FormData();
        formData.append("file", pagesToProcess[i].file);
        
        const res = await fetch(`${API_BASE_URL}/api/v1/scan/process`, {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.detail || "Processing failed");
        
        setPages(prev => prev.map(p => {
          if (p.id === pId) {
            return {
              ...p,
              status: data.is_detected === false ? 'warning' : 'success',
              job_id: data.job_id,
              resultData: { previewUrl: `${API_BASE_URL}${data.preview_url}` }
            };
          }
          return p;
        }));
      } catch (error) {
        console.error(error);
        setPages(prev => prev.map(p => p.id === pId ? { ...p, status: 'error' } : p));
      }

      setProgress((i + 1) / pagesToProcess.length);
    }

    setIsProcessing(false);
    setTimeout(() => setProgress(0), 1000);
  };

  const downloadFile = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const generatePdf = async () => {
    const completedPages = pages.filter(p => (p.status === 'success' || p.status === 'warning') && p.job_id);
    if (completedPages.length === 0) return;
    
    setIsProcessing(true);
    try {
      const jobIds = completedPages.map(p => p.job_id);
      
      const res = await fetch(`${API_BASE_URL}/api/v1/scan/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_ids: jobIds })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "PDF generation failed");
      
      downloadFile(`${API_BASE_URL}${data.download_url}`, "scanned_document.pdf");
    } catch (error) {
      console.error(error);
      alert("Failed to generate PDF file.");
    }
    setIsProcessing(false);
  };


  // Derived stats
  const waitingCount = pages.filter(p => p.status === 'waiting' || p.status === 'error').length;
  const successCount = pages.filter(p => p.status === 'success' || p.status === 'warning').length;

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar - Actions */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-5 flex flex-col h-full space-y-6">
            
            {/* Add Pages */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-sky-600 uppercase tracking-wide border-b border-slate-200 pb-1">Add Pages</h3>
              
              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${isProcessing ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed' : 'border-slate-300 bg-white cursor-pointer hover:border-sky-400 hover:bg-sky-50'}`}
              >
                <div className="text-3xl mb-2 text-slate-500">📄</div>
                <p className="text-sm text-slate-600 font-medium">Drag & drop or click</p>
                <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, WEBP</p>
                <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept="image/*" className="hidden" />
              </div>

              <button 
                onClick={openCamera}
                disabled={isProcessing}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Use Camera
              </button>
            </div>

            {/* Workflow Actions */}
            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-sky-600 uppercase tracking-wide border-b border-slate-200 pb-1">Workflow Actions</h3>
              
              {/* Progress Bar */}
              {isProcessing && progress > 0 && progress < 1 && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <span className="text-[10px] text-slate-500 text-center">Processing {Math.round(progress * 100)}%</span>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              )}

              <button 
                onClick={processAll}
                disabled={isProcessing || pages.length === 0 || waitingCount === 0}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing && progress > 0 ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : <><Zap className="w-4 h-4" /> Process All Pages</>}
              </button>
              
              <button 
                onClick={generatePdf}
                disabled={isProcessing || successCount === 0}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" /> Generate Multi-page PDF
              </button>
            </div>

          </div>
        </aside>

        {/* Right Workspace - Page Manager */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-slate-100 border-b border-slate-200 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Page Manager ({pages.length})</h3>
              <span className="text-xs text-slate-500">Drag thumbnails to reorder</span>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)', backgroundSize: '16px 16px' }}>
              
              {pages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center min-h-[400px]">
                  <ImageIcon className="w-16 h-16 text-slate-300 mb-4 opacity-50" />
                  <h3 className="text-lg font-bold text-slate-700 mb-2">No pages added yet</h3>
                  <p className="text-sm mt-2 text-slate-500 max-w-[320px]">Use the sidebar to upload images or capture from camera.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {pages.map((page, idx) => (
                    <div 
                      key={page.id}
                      draggable={!isProcessing}
                      onDragStart={(e) => handleDragStart(e, page.id)}
                      onDragOver={(e) => handleDragOver(e, page.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropItem(e, page.id)}
                      className={`bg-white rounded-lg border flex flex-col group transition-all duration-200 
                        ${draggedId === page.id ? 'opacity-50 border-sky-500 border-dashed' : 'border-slate-200 hover:border-slate-300 shadow-sm'}
                        ${dragOverId === page.id ? 'border-t-4 border-t-sky-500 scale-[1.02]' : ''}
                        ${!isProcessing ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      {/* Card Header */}
                      <div className="flex justify-between items-center px-3 py-2 bg-slate-50 border-b border-slate-200 rounded-t-lg">
                        <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-600">
                          <Menu className="w-3.5 h-3.5" />
                          <span className="font-bold text-xs">Page {idx + 1}</span>
                        </div>
                        <StatusBadge status={page.status} />
                      </div>
                      
                      {/* Image Viewer */}
                      <div className="relative aspect-[3/4] bg-slate-100 flex items-center justify-center p-2 overflow-hidden">
                        <img 
                          src={page.resultData && page.showEnhanced ? page.resultData.previewUrl : page.originalUrl} 
                          alt={`Page ${idx + 1}`}
                          className={`max-w-full max-h-full object-contain pointer-events-none transition-transform duration-300 ${page.showEnhanced && page.status === 'success' ? 'contrast-125 brightness-105' : ''}`}
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                        
                        {page.status === 'processing' && (
                          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-sky-400 gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin" />
                            <span className="text-xs font-semibold">Processing...</span>
                          </div>
                        )}
                      </div>

                      {/* Controls Footer */}
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center rounded-b-lg min-h-[44px]">
                        
                        {/* Pre-Processing Controls (Rotate / Delete) */}
                        <div className={`flex justify-between w-full transition-opacity ${(page.status === 'success' || page.status === 'warning') ? 'hidden' : 'flex'}`}>
                          <button 
                            onClick={() => rotatePage(page.id)} 
                            disabled={isProcessing}
                            className="text-slate-400 hover:text-sky-400 transition-colors p-1"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => removePage(page.id)} 
                            disabled={isProcessing}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Post-Processing Controls (Toggle) */}
                        <div className={`flex justify-center w-full transition-opacity ${(page.status === 'success' || page.status === 'warning') ? 'flex' : 'hidden'}`}>
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleEnhanced(page.id)}>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${page.showEnhanced ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                              <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${page.showEnhanced ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600">{page.showEnhanced ? 'Scan' : 'Orig'}</span>
                          </div>
                        </div>

                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center p-4 sm:p-8 overflow-y-auto">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-4 sm:p-5 w-full max-w-4xl shadow-2xl flex flex-col gap-4 my-auto shrink-0">
            
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Camera className="w-5 h-5" /> Document Scanner</h3>
              <button onClick={closeCamera} className="text-slate-400 hover:text-white p-1 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {!capturedBlob ? (
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <img src={URL.createObjectURL(capturedBlob)} className="absolute inset-0 w-full h-full object-contain bg-[#090d16]" alt="Captured" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {!capturedBlob ? (
                <>
                  <button onClick={capturePhoto} className="px-6 sm:px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2">
                    <Camera className="w-5 h-5" /> Capture Page
                  </button>
                  <button onClick={closeCamera} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setCapturedBlob(null)} className="px-5 sm:px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button onClick={usePhoto} className="px-5 sm:px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Add to Manager
                  </button>
                  <button onClick={closeCamera} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors flex items-center gap-2">
                    Close
                  </button>
                </>
              )}
            </div>
            
            {capturedBlob && <p className="text-center text-emerald-400 text-xs mt-2">Captured successfully. Add to manager or retake.</p>}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

// Helper component for status badge
const StatusBadge = ({ status }) => {
  const styles = {
    waiting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-sky-500/20 text-sky-400 border-sky-500/30 animate-pulse',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    waiting: 'Waiting', processing: 'Processing', success: 'Success', warning: 'Warning', error: 'Error'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default MultiPageScanning;
