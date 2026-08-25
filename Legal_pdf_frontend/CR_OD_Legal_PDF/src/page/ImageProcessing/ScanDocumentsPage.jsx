import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, X, Download, Package, ArrowLeft, Camera, Image as ImageIcon,
  FileText, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, RefreshCw
} from 'lucide-react';

const ScanDocuments = ({ tool, onBack }) => {
  const [pages, setPages] = useState([]); // { id, file, status, resultData, originalUrl }
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // --- 1. FILE UPLOAD ---
  const handleUpload = (e) => {
    if (e.target.files?.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = ''; // Reset
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files) => {
    const validFiles = files.filter(f => f.type.match(/image\/(jpeg|png|webp)/));
    if (validFiles.length === 0) return alert("Only JPG, PNG, and WEBP supported.");

    const newPages = validFiles.map(file => ({
      id: 'page_' + Math.random().toString(36).substr(2, 9),
      file,
      status: 'waiting', // waiting, processing, success, warning, error
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable.");
      closeCamera();
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }
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
      const file = new File([capturedBlob], capturedBlob.name, { type: "image/jpeg" });
      addFiles([file]);
      closeCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);


  // --- 3. PROCESSING QUEUE (SIMULATED) ---
  const processQueue = useCallback(async () => {
    const waitingIndex = pages.findIndex(p => p.status === 'waiting');
    if (waitingIndex === -1) return; // Nothing to process

    // Mark as processing
    setPages(prev => {
      const p = [...prev];
      p[waitingIndex].status = 'processing';
      return p;
    });

    try {
      // Simulate backend deskew/enhance time
      await new Promise(r => setTimeout(r, 2000));
      
      // Simulate success
      setPages(prev => {
        const p = [...prev];
        if (p[waitingIndex]) {
          p[waitingIndex].status = 'success';
          p[waitingIndex].resultData = {
            // Simulated processed image url (using placeholder for now, usually it'd be a generated blob)
            previewUrl: p[waitingIndex].originalUrl // Just use original url for mock, but apply CSS filter to simulate enhancement
          };
        }
        return p;
      });
      
    } catch(err) {
       setPages(prev => {
        const p = [...prev];
        if (p[waitingIndex]) p[waitingIndex].status = 'error';
        return p;
      });
    }
  }, [pages]);

  useEffect(() => {
    processQueue();
  }, [pages, processQueue]);


  // --- 4. GALLERY ACTIONS ---
  const removePage = (id) => {
    setPages(prev => {
      const p = prev.find(x => x.id === id);
      if (p) {
         URL.revokeObjectURL(p.originalUrl);
         // if processed blob, revoke too
      }
      return prev.filter(x => x.id !== id);
    });
  };

  const toggleEnhanced = (id) => {
    setPages(prev => prev.map(p => {
      if (p.id === id) return { ...p, showEnhanced: !p.showEnhanced };
      return p;
    }));
  };

  // --- 5. DOWNLOADS ---
  const allDone = pages.length > 0 && pages.every(p => p.status === 'success' || p.status === 'error' || p.status === 'warning');
  const hasSuccess = pages.some(p => p.status === 'success' || p.status === 'warning');

  const downloadPdf = async () => {
    alert("Simulating PDF generation for " + pages.filter(p => p.status === 'success').length + " pages...");
  };

  const downloadZip = async () => {
    alert("Simulating ZIP generation...");
  };


  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      {/* Top Actions */}
      <div className="absolute top-1.5 right-3 sm:top-5 sm:right-6 md:right-10 z-40 flex gap-2">
         {pages.length > 0 && (
           <>
            <button 
              onClick={downloadPdf}
              disabled={!canDownload(pages)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save as PDF</span>
            </button>
            <button 
              onClick={downloadZip}
              disabled={!canDownload(pages)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Download All (ZIP)</span>
            </button>
           </>
         )}
      </div>

      <div className="flex-1 w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative flex flex-col">
        
        {/* Workspace Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8"
             style={{ backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)', backgroundSize: '16px 16px' }}
        >
          
          {pages.length === 0 ? (
            /* Upload State */
            <div className="max-w-3xl mx-auto flex flex-col gap-6 items-center justify-center min-h-[500px]">
               <div 
                  className="w-full border-2 border-dashed border-slate-300 bg-white rounded-2xl p-10 text-center flex flex-col items-center justify-center shadow-xl"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
               >
                  <Camera className="w-16 h-16 text-slate-400 mb-4" />
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload or Capture Documents</h3>
                  <p className="text-slate-500 mb-6">Drag & drop images here, or browse files.</p>
                  
                  <div className="flex gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-colors shadow-lg">
                      Browse Files
                    </button>
                    <button onClick={openCamera} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors shadow-lg">
                      Use Camera
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-6">Supported: JPG, PNG, WEBP</p>
                  <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept="image/jpeg,image/png,image/webp" className="hidden" />
               </div>
            </div>
          ) : (
            /* Gallery State */
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Scanned Pages ({pages.length})</h3>
                <div className="flex gap-3">
                  <button onClick={openCamera} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors">
                    <Camera className="w-4 h-4" /> Camera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white hover:bg-slate-50 text-sky-600 border border-slate-200 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> Add More
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept="image/jpeg,image/png,image/webp" className="hidden" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {pages.map((page, idx) => (
                  <div key={page.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col group transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 shadow-sm">
                    
                    <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <span className="font-bold text-sm text-slate-700">Page {idx + 1}</span>
                      <StatusBadge status={page.status} />
                    </div>
                    
                    <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden flex items-center justify-center p-2">
                      <img 
                        src={page.resultData && page.showEnhanced ? page.resultData.previewUrl : page.originalUrl} 
                        alt={`Page ${idx + 1}`}
                        className={`max-w-full max-h-full object-contain ${page.showEnhanced && page.status === 'success' ? 'contrast-125 brightness-105' : ''}`} // CSS trick to simulate enhancement for mock
                      />
                      
                      {page.status === 'processing' && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-sky-400 gap-3">
                          <RefreshCw className="w-8 h-8 animate-spin" />
                          <span className="text-sm font-semibold">Processing...</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Card Controls */}
                    <div className={`px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center transition-opacity ${page.status === 'success' || page.status === 'warning' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleEnhanced(page.id)}>
                         <div className={`w-10 h-5 rounded-full relative transition-colors ${page.showEnhanced ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                           <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${page.showEnhanced ? 'translate-x-5' : 'translate-x-0.5'}`} />
                         </div>
                         <span className="text-xs font-semibold text-slate-600">{page.showEnhanced ? 'Enhanced' : 'Original'}</span>
                      </div>
                      
                      <button onClick={() => removePage(page.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {page.status === 'error' && (
                      <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/30 text-xs font-semibold text-red-400">
                        Processing failed.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 w-full max-w-4xl shadow-2xl flex flex-col gap-4">
            
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
            
            <div className="flex justify-center pt-2">
              {!capturedBlob ? (
                <button onClick={capturePhoto} className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Capture
                </button>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => setCapturedBlob(null)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button onClick={usePhoto} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Use Photo
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
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
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const canDownload = (pages) => {
  if (pages.length === 0) return false;
  const allDone = pages.every(p => p.status === 'success' || p.status === 'error' || p.status === 'warning');
  const hasSuccess = pages.some(p => p.status === 'success' || p.status === 'warning');
  return allDone && hasSuccess;
};

export default ScanDocuments;
