import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Download, Package, ArrowLeft, Image as ImageIcon,
  Zap, Info, FileImage, Settings2, CheckCircle2, RotateCcw
} from 'lucide-react';

const FORMATS = [
  { id: 'png', name: 'PNG', tag: 'Lossless', title: 'PNG Format Settings', desc: 'Preserves pixel-perfect image quality and alpha transparency where supported.' },
  { id: 'jpg', name: 'JPG', tag: 'Compact', title: 'JPG Encoding Settings', desc: 'Adjust compression quality. Transparent areas in input images are cleanly blended onto a white background.' },
  { id: 'webp', name: 'WEBP', tag: 'Modern', title: 'WebP Encoding Settings', desc: 'Modern web image format supporting lossy/lossless compression and alpha transparency.' },
  { id: 'bmp', name: 'BMP', tag: 'Bitmap', title: 'BMP Format Settings', desc: 'Uncompressed bitmap format. Transparent areas in input images are blended onto a white background.' },
  { id: 'tiff', name: 'TIFF', tag: 'Print', title: 'TIFF Format Settings', desc: 'High-quality print and archive format supporting lossless encoding and transparency.' },
  { id: 'gif', name: 'GIF', tag: 'Graphics', title: 'GIF Format Settings', desc: 'Graphics format supporting indexed color palettes and transparency.' }
];

const ConvertImageFormat = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [targetFormat, setTargetFormat] = useState('png');
  const [quality, setQuality] = useState(90);

  const fileInputRef = useRef(null);

  // --- FILE HANDLING ---
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png|webp|bmp|tiff|gif)/));
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
            targetFormat: 'png',
            quality: 90,
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

  const activeFile = activeIndex !== -1 ? uploadedFiles[activeIndex] : null;

  // Sync state when active index changes
  useEffect(() => {
    if (activeFile) {
      setTargetFormat(activeFile.targetFormat);
      setQuality(activeFile.quality);
    }
  }, [activeIndex]);

  // Sync settings back to active file
  useEffect(() => {
    if (activeFile && (activeFile.targetFormat !== targetFormat || activeFile.quality !== quality)) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].targetFormat = targetFormat;
          up[activeIndex].quality = quality;
          // Invalidate processed state if they change format or quality
          if (up[activeIndex].processedBlob) {
            up[activeIndex].processedBlob = null;
            if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
            up[activeIndex].processedUrl = null;
          }
        }
        return up;
      });
    }
  }, [targetFormat, quality]);


  // --- PROCESSING LOGIC ---
  const startConversion = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    
    try {
      // Simulate conversion delay
      await new Promise(r => setTimeout(r, 800));
      
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = activeFile.dataUrl;
      await new Promise(r => img.onload = r);
      
      canvas.width = activeFile.origW;
      canvas.height = activeFile.origH;
      const ctx = canvas.getContext('2d');
      
      // If converting to JPG or BMP, we need white background for transparency
      if (targetFormat === 'jpg' || targetFormat === 'bmp') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Map extensions to mime types
      const mimeTypes = {
        png: 'image/png',
        jpg: 'image/jpeg',
        webp: 'image/webp',
        bmp: 'image/bmp',
        tiff: 'image/tiff', // might not be supported natively by canvas
        gif: 'image/gif' // might not be supported natively by canvas
      };

      // Fallback for unsupported canvas types
      const exportMime = mimeTypes[targetFormat] || 'image/png';
      
      canvas.toBlob((blob) => {
        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].processedBlob = blob;
          up[activeIndex].processedUrl = URL.createObjectURL(blob);
          return up;
        });
        setIsProcessing(false);
      }, exportMime, quality / 100);
      
    } catch(err) {
      console.error("Conversion Error:", err);
      setIsProcessing(false);
      alert("Failed to convert image format.");
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
    if (processed.length === 0) return alert("No converted images available to save.");
    
    if (processed.length === 1) {
      const idx = uploadedFiles.findIndex(f => f.id === processed[0].id);
      setActiveIndex(idx);
      const nameWithoutExt = processed[0].name.replace(/\.[^/.]+$/, "");
      setTimeout(() => downloadFile(processed[0].processedBlob, `converted_${nameWithoutExt}.${processed[0].targetFormat}`), 100);
      return;
    }
    
    alert("Batch ZIP saving requires the backend API which is currently simulated.");
  };

  const activeFormatInfo = FORMATS.find(f => f.id === targetFormat);
  const showQualitySlider = targetFormat === 'jpg' || targetFormat === 'webp';

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[360px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-5 space-y-6">
            
            {/* 1. Upload */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">1. Upload Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-500/5' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-500/5'}`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDraggingFile ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP, BMP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300 bg-slate-100'} ${item.processedBlob ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-50' : ''}`}>
                        <img src={item.processedUrl || item.dataUrl} className="w-full h-full object-cover bg-slate-100" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-[#E57373] text-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:opacity-100 hover:scale-100 transition-all z-10 shadow-md"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Format Selection */}
            <div className={`flex flex-col gap-3 transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Choose Output Format</h3>
              <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                {FORMATS.map(fmt => (
                  <button
                    key={fmt.id}
                    onClick={() => setTargetFormat(fmt.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${targetFormat === fmt.id ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span className="text-sm font-bold">{fmt.name}</span>
                    <span className={`text-[9px] mt-0.5 ${targetFormat === fmt.id ? 'text-blue-500 font-bold' : 'text-slate-400'}`}>{fmt.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Conversion Settings */}
            <div className={`flex flex-col gap-3 transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">3. Conversion Settings</h3>
              
              {showQualitySlider ? (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600">Encoding Quality</span>
                    <span className="font-bold text-blue-600">{quality}%</span>
                  </div>
                  <div className="pt-2">
                    <input 
                      type="range" min="1" max="100" step="1" 
                      value={quality} onChange={(e) => setQuality(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                      <span>Small Size</span>
                      <span>High Quality</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3 text-xs text-blue-800">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-900 block mb-1 font-bold">{activeFormatInfo?.title}</strong>
                    <p className="leading-relaxed">{activeFormatInfo?.desc}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Actions */}
            <div className={`flex flex-col gap-2 mt-auto pt-4 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={startConversion}
                disabled={!activeFile || isProcessing || activeFile.processedBlob} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? <><Settings2 className="w-4 h-4 animate-spin" /> Converting...</> : <><Zap className="w-4 h-4" /> Start Format Conversion</>}
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative border-l border-slate-200">
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-500">No Image Selected</h3>
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload single or multiple images using the left panel to select target output format.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-slate-50 z-20">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Active File</span>
                  <strong className="text-slate-800 truncate max-w-[150px] sm:max-w-[250px]">{activeFile.name}</strong>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold hidden sm:inline-block">Original: {activeFile.origW} × {activeFile.origH} px</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${activeFile.processedBlob ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {activeFile.processedBlob ? `Converted (${activeFile.targetFormat.toUpperCase()})` : 'Original Image'}
                  </span>
                </div>
              </div>

              {/* Viewport */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-100 relative z-10">
                <div className="shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-sm border border-slate-200 p-2 bg-white relative">
                  <img 
                    src={activeFile.processedUrl || activeFile.dataUrl} 
                    alt="Preview" 
                    className="block max-w-full max-h-[60vh] object-contain rounded-sm"
                  />
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
                  {activeFile.processedBlob 
                    ? `Target: ${activeFile.targetFormat.toUpperCase()} | Ready to save` 
                    : `Target Format: ${targetFormat.toUpperCase()} | Click "Start Format Conversion" to process`}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && uploadedFiles.some(f => f.processedBlob) && (
                    <button 
                      onClick={saveAllImages}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.processedBlob).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
                      downloadFile(activeFile.processedBlob, `converted_${nameWithoutExt}.${activeFile.targetFormat}`);
                    }}
                    disabled={!activeFile.processedBlob}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                  >
                    <Download className="w-4 h-4" /> Save Converted Image
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

export default ConvertImageFormat;
