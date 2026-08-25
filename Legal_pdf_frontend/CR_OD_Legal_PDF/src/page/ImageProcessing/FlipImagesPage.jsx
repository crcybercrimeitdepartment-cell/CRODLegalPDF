import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, FlipHorizontal, FlipVertical, X, Zap, 
  Download, Package, RotateCcw, Image as ImageIcon, ArrowLeft, MoveHorizontal
} from 'lucide-react';

const FlipImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  // File Upload Handlers
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(file => 
      file.type.match(/image\/(jpeg|png|webp|bmp|tiff)/)
    );

    if (validFiles.length === 0) {
      alert("No valid image files selected.");
      return;
    }

    const newItems = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file: file,
      name: file.name,
      size: file.size,
      dataUrl: URL.createObjectURL(file),
      width: 0,
      height: 0,
      flip_h: false,
      flip_v: false,
      processedBlob: null
    }));

    setUploadedFiles(prev => {
      const updated = [...prev, ...newItems];
      if (prev.length === 0 && newItems.length > 0) {
        setActiveIndex(0);
      }
      return updated;
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (e, index) => {
    e.stopPropagation();
    const item = uploadedFiles[index];
    URL.revokeObjectURL(item.dataUrl);
    if (item.processedBlob) URL.revokeObjectURL(item.processedBlob);

    setUploadedFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });

    if (uploadedFiles.length - 1 === 0) {
      setActiveIndex(-1);
    } else if (activeIndex === index) {
      setActiveIndex(Math.max(0, index - 1));
    } else if (activeIndex > index) {
      setActiveIndex(activeIndex - 1);
    }
  };

  // Editing Handlers
  const toggleFlip = (type) => {
    if (activeIndex === -1) return;
    setUploadedFiles(prev => {
      const updated = [...prev];
      updated[activeIndex] = {
        ...updated[activeIndex],
        [type]: !updated[activeIndex][type],
        processedBlob: null // Reset processed blob if they change flip state again
      };
      return updated;
    });
  };

  const resetFlip = () => {
    if (activeIndex === -1) return;
    setUploadedFiles(prev => {
      const updated = [...prev];
      updated[activeIndex] = {
        ...updated[activeIndex],
        flip_h: false,
        flip_v: false,
        processedBlob: null
      };
      return updated;
    });
  };

  const handleImageLoad = (e) => {
    if (activeIndex === -1) return;
    const { naturalWidth, naturalHeight } = e.target;
    setUploadedFiles(prev => {
      const updated = [...prev];
      if (updated[activeIndex] && (updated[activeIndex].width !== naturalWidth)) {
        updated[activeIndex] = {
          ...updated[activeIndex],
          width: naturalWidth,
          height: naturalHeight
        };
      }
      return updated;
    });
  };

  // API Call logic
  const applyFlipToActive = async () => {
    if (activeIndex === -1) return null;
    const current = uploadedFiles[activeIndex];
    
    if (!current.flip_h && !current.flip_v) {
      alert("No flip options selected.");
      return null;
    }

    setIsProcessing(true);
    try {
      // Simulate backend processing
      await new Promise(r => setTimeout(r, 600));

      const canvas = document.createElement("canvas");
      const img = new Image();
      img.src = current.dataUrl;
      await new Promise(r => img.onload = r);
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      
      ctx.translate(
        current.flip_h ? canvas.width : 0,
        current.flip_v ? canvas.height : 0
      );
      ctx.scale(current.flip_h ? -1 : 1, current.flip_v ? -1 : 1);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        setUploadedFiles(prev => {
          const updated = [...prev];
          updated[activeIndex] = {
            ...updated[activeIndex],
            processedBlob: URL.createObjectURL(blob)
          };
          return updated;
        });
        setIsProcessing(false);
      }, current.file.type);
      
    } catch (error) {
      console.error("Flip failed:", error);
      alert("Error applying flip.");
      setIsProcessing(false);
    }
  };

  const downloadBlob = (url, filename) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const saveSingleImage = async () => {
    if (activeIndex === -1) return;
    const current = uploadedFiles[activeIndex];
    
    let urlToSave = current.processedBlob;
    if (!urlToSave) {
      // If not processed yet, process on the fly
      if (current.flip_h || current.flip_v) {
         const canvas = document.createElement("canvas");
         const img = new Image();
         img.src = current.dataUrl;
         await new Promise(r => img.onload = r);
         
         canvas.width = img.naturalWidth;
         canvas.height = img.naturalHeight;
         const ctx = canvas.getContext("2d");
         
         ctx.translate(
           current.flip_h ? canvas.width : 0,
           current.flip_v ? canvas.height : 0
         );
         ctx.scale(current.flip_h ? -1 : 1, current.flip_v ? -1 : 1);
         ctx.drawImage(img, 0, 0);
         
         urlToSave = canvas.toDataURL(current.file.type);
      } else {
         urlToSave = current.dataUrl;
      }
    }
    
    const ext = current.file.type === "image/png" ? ".png" : ".jpg";
    const name = `flipped_${current.name.replace(/\.[^/.]+$/, "")}${ext}`;
    downloadBlob(urlToSave, name);
  };

  const saveAllImages = async () => {
    const modifiedFiles = uploadedFiles.filter(f => f.flip_h || f.flip_v);
    if (modifiedFiles.length === 0) {
      alert("No images have been flipped. Please flip at least one image.");
      return;
    }
    
    if (modifiedFiles.length === 1) {
      const index = uploadedFiles.findIndex(f => f.id === modifiedFiles[0].id);
      setActiveIndex(index);
      setTimeout(saveSingleImage, 100);
      return;
    }

    alert("Batch ZIP saving requires the backend API which is currently simulated.");
  };

  const activeFile = activeIndex !== -1 ? uploadedFiles[activeIndex] : null;

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-20">
          <div className="p-5 space-y-6">
            
            {/* 1. Upload Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">1. Image Source</h3>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-blue-500 bg-blue-50/5' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/5'
                }`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gallery ({uploadedFiles.length})</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto p-1 custom-scrollbar">
                    {uploadedFiles.map((item, idx) => (
                      <div 
                        key={item.id}
                        onClick={() => setActiveIndex(idx)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${
                          idx === activeIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300 bg-slate-100'
                        }`}
                      >
                        <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover bg-slate-100" />
                        <button 
                          onClick={(e) => removeFile(e, idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center scale-75 hover:scale-100 transition-all shadow-md z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Flip Options */}
            <div className={`flex flex-col gap-3 transition-opacity ${uploadedFiles.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Flip Orientation</h3>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <button 
                  onClick={() => toggleFlip('flip_h')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    activeFile?.flip_h ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FlipHorizontal className={`w-5 h-5 ${activeFile?.flip_h ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-bold ${activeFile?.flip_h ? 'text-blue-900 font-bold' : 'text-slate-600'}`}>Horizontal Flip</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold border ${activeFile?.flip_h ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {activeFile?.flip_h ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button 
                  onClick={() => toggleFlip('flip_v')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    activeFile?.flip_v ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FlipVertical className={`w-5 h-5 ${activeFile?.flip_v ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-bold ${activeFile?.flip_v ? 'text-blue-900 font-bold' : 'text-slate-600'}`}>Vertical Flip</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold border ${activeFile?.flip_v ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {activeFile?.flip_v ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              <div className="mt-2 pt-4 flex gap-2">
                <button 
                  onClick={resetFlip}
                  disabled={!activeFile || (!activeFile.flip_h && !activeFile.flip_v)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <button 
                  onClick={applyFlipToActive}
                  disabled={!activeFile || (!activeFile.flip_h && !activeFile.flip_v) || isProcessing}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                >
                  {isProcessing ? 'Processing...' : <><Zap className="w-3.5 h-3.5" /> Process</>}
                </button>
              </div>
            </div>

          </div>
        </aside>

        {/* Right Stage Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative border-l border-slate-200">
          
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-500 mb-2">No Image Selected</h3>
              <p className="text-sm text-center max-w-md text-slate-400">Upload images using the sidebar and select one from the gallery to start flipping.</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Active File</span>
                  <strong className="text-sm text-slate-800 truncate max-w-[200px] sm:max-w-xs">{activeFile.name}</strong>
                  {activeFile.width > 0 && (
                    <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {activeFile.width} x {activeFile.height} px
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
                    activeFile.processedBlob ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                  }`}>
                    {activeFile.processedBlob ? '✓ Processed' : 'Preview Mode'}
                  </span>
                </div>
              </div>

              {/* Viewport */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-100">
                <div className="shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-sm max-w-full max-h-full p-2 border border-slate-200 bg-white relative">
                  <img 
                    src={activeFile.processedBlob || activeFile.dataUrl} 
                    alt="Preview" 
                    onLoad={handleImageLoad}
                    className="block max-w-full max-h-[60vh] object-contain transition-transform duration-300"
                    style={!activeFile.processedBlob ? {
                      transform: `scaleX(${activeFile.flip_h ? -1 : 1}) scaleY(${activeFile.flip_v ? -1 : 1})`
                    } : {}}
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {activeFile.processedBlob ? 'Ready to download result.' : (
                    activeFile.flip_h && activeFile.flip_v ? 'Flipped Horizontally & Vertically' :
                    activeFile.flip_h ? 'Flipped Horizontally (Left ↔ Right)' :
                    activeFile.flip_v ? 'Flipped Vertically (Top ↕ Bottom)' : 'Original Orientation'
                  )}
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && (
                    <button 
                      onClick={saveAllImages}
                      disabled={isProcessing}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.flip_h || f.flip_v).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={saveSingleImage}
                    disabled={(!activeFile.flip_h && !activeFile.flip_v && !activeFile.processedBlob) || isProcessing}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                  >
                    <Download className="w-4 h-4" /> Save Image
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

export default FlipImages;
