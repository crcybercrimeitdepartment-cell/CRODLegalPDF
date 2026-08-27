import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  UploadCloud, X, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Download, FileArchive, RefreshCw, Printer,
  Settings2, Info, Ruler, Settings
} from 'lucide-react';

const ImageResolutionDPIConverter = ({ tool, onBack }) => {
  // State
  const [items, setItems] = useState([]); // { id, file, status, localUrl, data, applyData, targetDpiX, targetDpiY }
  const [activeId, setActiveId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("");
  
  // Settings State for active item
  const [sameDpi, setSameDpi] = useState(true);
  const [dpiX, setDpiX] = useState(300);
  const [dpiY, setDpiY] = useState(300);
  const [inputError, setInputError] = useState(false);

  const fileInputRef = useRef(null);

  const activeItem = items.find(i => i.id === activeId);

  // --- 1. UPLOAD & DETECT (Mock) ---
  const handleUpload = (e) => {
    if (e.target.files?.length > 0) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files?.length > 0) addFiles(Array.from(e.dataTransfer.files));
  };

  const addFiles = async (files) => {
    if (isProcessing) return;
    const validFiles = files.filter(f => f.type.match(/image\/(jpeg|png|webp)/));
    if (validFiles.length < files.length) alert("Some files were skipped (unsupported format).");
    if (validFiles.length === 0) return;

    const newItems = validFiles.map(file => ({
      id: 'dpi_' + Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading', // uploading, ready, processing, completed, error, unsupported
      localUrl: URL.createObjectURL(file),
      data: null,
      applyData: null,
      targetDpiX: 300,
      targetDpiY: 300
    }));

    setItems(prev => {
      const updated = [...prev, ...newItems];
      if (!activeId && updated.length > 0) setActiveId(updated[0].id);
      return updated;
    });

    // Simulate scanning DPI for each
    for (const item of newItems) {
      await mockDetectDPI(item.id);
    }
  };

  const mockDetectDPI = async (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'uploading' } : i));
    await new Promise(r => setTimeout(r, 600)); // simulate scan time
    
    // Mock image dimension extraction
    // In real scenario, we'd read naturalWidth/Height or use backend
    const mockData = {
      format_supported: true,
      has_dpi: true,
      dpi_x: 72,
      dpi_y: 72,
      width: 1920,
      height: 1080,
      format: 'JPEG'
    };

    setItems(prev => prev.map(i => {
      if (i.id === id) {
        return { 
          ...i, 
          status: 'ready', 
          data: mockData,
          targetDpiX: mockData.dpi_x || 300,
          targetDpiY: mockData.dpi_y || 300
        };
      }
      return i;
    }));
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

  // Sync settings when active item changes
  useEffect(() => {
    if (activeItem) {
      setDpiX(activeItem.targetDpiX);
      setDpiY(activeItem.targetDpiY);
      setSameDpi(activeItem.targetDpiX === activeItem.targetDpiY);
      setInputError(false);
    }
  }, [activeId, activeItem?.status]);

  // Update Item State when inputs change
  const updateItemTarget = (x, y) => {
    if (!activeItem) return;
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, targetDpiX: x, targetDpiY: y } : i));
  };

  const handleDpiXChange = (val) => {
    const num = parseInt(val);
    setDpiX(val);
    if (isNaN(num) || num <= 0 || num > 10000) {
      setInputError(true);
      return;
    }
    setInputError(false);
    
    if (sameDpi) {
      setDpiY(val);
      updateItemTarget(num, num);
    } else {
      updateItemTarget(num, isNaN(parseInt(dpiY)) ? 300 : parseInt(dpiY));
    }
  };

  const handleDpiYChange = (val) => {
    const num = parseInt(val);
    setDpiY(val);
    if (isNaN(num) || num <= 0 || num > 10000) {
      setInputError(true);
      return;
    }
    setInputError(false);
    updateItemTarget(isNaN(parseInt(dpiX)) ? 300 : parseInt(dpiX), num);
  };

  const applyPreset = (val) => {
    setDpiX(val);
    setDpiY(val);
    setSameDpi(true);
    setInputError(false);
    updateItemTarget(val, val);
  };

  const handleSameDpiToggle = (checked) => {
    setSameDpi(checked);
    if (checked) {
      setDpiY(dpiX);
      if (!inputError) updateItemTarget(parseInt(dpiX), parseInt(dpiX));
    }
  };

  // --- 2. APPLY CHANGES (Simulated) ---
  const applyConversion = async () => {
    if (!activeItem || inputError) return;
    lockUI(`Writing DPI Metadata...`);
    
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'processing' } : i));

    try {
      await new Promise(r => setTimeout(r, 1200)); 
      
      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          return { 
            ...i, 
            status: 'completed',
            applyData: { 
              previewUrl: i.localUrl,
              verified_dpi_x: i.targetDpiX,
              verified_dpi_y: i.targetDpiY
            }
          };
        }
        return i;
      }));
    } catch(err) {
      setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'error' } : i));
    }
    
    unlockUI();
  };

  // --- Calculators ---
  const getPrintSize = () => {
    if (!activeItem || !activeItem.data || inputError || !dpiX || !dpiY) {
      return { inches: "-- × --", cm: "-- × --" };
    }
    const x = parseFloat(dpiX);
    const y = parseFloat(dpiY);
    if (x <= 0 || y <= 0) return { inches: "-- × --", cm: "-- × --" };

    const w_in = (activeItem.data.width / x).toFixed(2);
    const h_in = (activeItem.data.height / y).toFixed(2);
    const w_cm = (w_in * 2.54).toFixed(2);
    const h_cm = (h_in * 2.54).toFixed(2);
    
    return { inches: `${w_in} × ${h_in}`, cm: `${w_cm} × ${h_cm}` };
  };

  const printSize = getPrintSize();
  const formatDpi = (has, x, y) => {
    if (!has || !x) return "Not Set";
    if (x === y) return `${x} DPI`;
    return `${x} × ${y} DPI`;
  };

  // --- Helpers ---
  const lockUI = (msg) => { setIsProcessing(true); setProcessingText(msg); };
  const unlockUI = () => setIsProcessing(false);

  const downloadZip = async () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.applyData?.previewUrl);
    if (completedItems.length === 0) return alert("No converted images to download.");
    
    lockUI("Generating ZIP file...");
    try {
      const zip = new JSZip();
      for (const item of completedItems) {
        const response = await fetch(item.applyData.previewUrl);
        const blob = await response.blob();
        zip.file(`converted_${item.file.name}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadFile(URL.createObjectURL(zipBlob), "converted_images.zip");
    } catch (err) {
      console.error(err);
      alert("Failed to generate ZIP file.");
    }
    unlockUI();
  };

  const downloadFile = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const successCount = items.filter(i => i.status === 'completed').length;
  const failedCount = items.filter(i => i.status === 'error').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border-t border-slate-800 bg-[#0f172a] overflow-hidden rounded-t-xl shadow-2xl">
        
        {/* Left Sidebar - Gallery */}
        <aside className="w-full lg:w-[320px] border-r border-slate-800 bg-[#1e293b]/70 backdrop-blur-md flex flex-col shrink-0 overflow-hidden z-20">
          <div className="p-4 sm:p-5 flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700/50">
              <h3 className="text-sm font-bold text-pink-500 uppercase tracking-wide">Images ({items.length})</h3>
              <button 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                disabled={isProcessing}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md font-bold transition-colors disabled:opacity-50 border border-slate-700 flex items-center gap-1"
              >
                + Add
              </button>
              <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept="image/jpeg,image/png,image/webp" className="hidden" />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
              {items.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => !isProcessing && setActiveId(item.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer group 
                    ${activeId === item.id ? 'bg-pink-500/10 border-pink-500 shadow-[inset_4px_0_0_rgba(236,72,153,1)]' : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'}
                  `}
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-black shrink-0 border border-slate-700">
                    <img src={item.localUrl} className="w-full h-full object-cover" alt="thumb" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-xs font-semibold text-slate-200 truncate">{item.file.name}</span>
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
                  <Printer className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">DPI Conversion</p>
                  <p className="text-xs text-slate-500 mt-1">Drag & Drop images</p>
                </div>
              )}
            </div>
            
            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-3 shrink-0">
                <div className="text-[10px] text-center text-slate-400">
                  {items.length} total • {successCount} ready • {failedCount} failed
                </div>
                {successCount > 0 && (
                  <button 
                    onClick={downloadZip}
                    disabled={isProcessing}
                    className="w-full py-2 bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <FileArchive className="w-4 h-4" /> Download All (ZIP)
                  </button>
                )}
              </div>
            )}

          </div>
        </aside>

        {/* Right Workspace */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-800 bg-[#060a12] p-4 sm:p-5">
          <div className="flex-1 flex flex-col h-full gap-4">
            
            {/* Main Stage */}
            <div className="flex-1 relative flex flex-col overflow-hidden bg-transparent border border-slate-700 rounded-xl shadow-xl">
              
              {!activeItem ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <ImageIcon className="w-16 h-16 opacity-50 mb-4" />
                  <p>Select an image to configure DPI</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
                  
                  {/* Content Wrapper */}
                  <div className="max-w-4xl mx-auto w-full space-y-6 pb-12">
                    
                    {/* Info Card */}
                    {activeItem.status !== 'uploading' && activeItem.data && (
                      <div className="bg-[#1e293b]/50 border border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-pink-500 font-bold mb-4 pb-3 border-b border-slate-700/50">
                          <Info className="w-5 h-5" /> Current Image Properties
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pixel Dimensions</span>
                            <span className="text-lg font-bold text-slate-200">{activeItem.data.width} × {activeItem.data.height} px</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current DPI</span>
                            <span className="text-lg font-bold text-slate-200">{formatDpi(activeItem.data.has_dpi, activeItem.data.dpi_x, activeItem.data.dpi_y)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Format</span>
                            <span className="text-lg font-bold text-slate-200">{activeItem.data.format || 'Unknown'}</span>
                          </div>
                        </div>

                        {!activeItem.data.format_supported && (
                          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 text-amber-400 text-sm">
                            <Info className="w-5 h-5 shrink-0" />
                            <p>DPI metadata is not supported reliably for this format. Conversion may fail or be ignored.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Settings Card */}
                    <div className="bg-[#1e293b]/50 border border-slate-700 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-pink-500 font-bold mb-5 pb-3 border-b border-slate-700/50">
                        <Settings className="w-5 h-5" /> Target DPI Settings
                      </div>
                      
                      <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Presets</label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { val: 72, label: 'Web' },
                            { val: 96, label: 'Screen' },
                            { val: 150, label: 'Draft Print' },
                            { val: 300, label: 'High Quality Print' },
                            { val: 600, label: 'Archival' }
                          ].map(preset => {
                            const isActive = sameDpi && parseInt(dpiX) === preset.val;
                            return (
                              <button 
                                key={preset.val}
                                onClick={() => applyPreset(preset.val)}
                                disabled={isProcessing || activeItem.status === 'completed'}
                                className={`flex-1 min-w-[100px] flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${isActive ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/30' : 'bg-[#0f172a] border-slate-600 text-slate-300 hover:border-pink-500/50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <span className="text-lg font-bold">{preset.val}</span>
                                <span className={`text-[10px] mt-1 ${isActive ? 'text-pink-100' : 'text-slate-400'}`}>{preset.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom DPI</label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={sameDpi} 
                              onChange={(e) => handleSameDpiToggle(e.target.checked)}
                              disabled={isProcessing || activeItem.status === 'completed'}
                              className="w-4 h-4 accent-pink-500"
                            />
                            <span className="text-xs font-medium text-slate-300">Same for X/Y</span>
                          </label>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 flex">
                            <span className="bg-[#0f172a] border border-slate-600 border-r-0 rounded-l-md px-4 flex items-center text-slate-400 font-bold">X</span>
                            <input 
                              type="number" 
                              value={dpiX} 
                              onChange={(e) => handleDpiXChange(e.target.value)}
                              disabled={isProcessing || activeItem.status === 'completed'}
                              min="1" max="10000"
                              className={`flex-1 bg-[#0f172a] border rounded-r-md px-4 py-2.5 text-white focus:outline-none transition-colors ${inputError ? 'border-red-500' : 'border-slate-600 focus:border-pink-500'}`}
                            />
                          </div>
                          {!sameDpi && (
                            <div className="flex-1 flex">
                              <span className="bg-[#0f172a] border border-slate-600 border-r-0 rounded-l-md px-4 flex items-center text-slate-400 font-bold">Y</span>
                              <input 
                                type="number" 
                                value={dpiY} 
                                onChange={(e) => handleDpiYChange(e.target.value)}
                                disabled={isProcessing || activeItem.status === 'completed'}
                                min="1" max="10000"
                                className={`flex-1 bg-[#0f172a] border rounded-r-md px-4 py-2.5 text-white focus:outline-none transition-colors ${inputError ? 'border-red-500' : 'border-slate-600 focus:border-pink-500'}`}
                              />
                            </div>
                          )}
                        </div>
                        {inputError && (
                          <div className="text-red-500 text-xs mt-2 font-medium">Please enter a valid DPI between 1 and 10000.</div>
                        )}
                      </div>
                    </div>

                    {/* Print Size Calculator */}
                    <div className="bg-[#1e293b]/50 border border-slate-700 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-pink-500 font-bold mb-4 pb-3 border-b border-slate-700/50">
                        <Ruler className="w-5 h-5" /> Estimated Print Size
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#0f172a]/80 border border-pink-500/20 rounded-lg p-6 flex flex-col items-center justify-center border-dashed">
                          <span className="text-2xl font-bold text-white mb-1">{printSize.inches}</span>
                          <span className="text-xs text-slate-400 uppercase tracking-widest">Inches</span>
                        </div>
                        <div className="bg-[#0f172a]/80 border border-pink-500/20 rounded-lg p-6 flex flex-col items-center justify-center border-dashed">
                          <span className="text-2xl font-bold text-white mb-1">{printSize.cm}</span>
                          <span className="text-xs text-slate-400 uppercase tracking-widest">Centimeters</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-4 flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0" />
                        DPI controls how image pixels are interpreted for printing. Changing DPI does not add or remove pixels from your image.
                      </p>
                    </div>

                    {/* Verification Panel */}
                    {activeItem.status === 'completed' && activeItem.applyData && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                        <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-4">
                          <CheckCircle2 className="w-5 h-5" /> Verification Successful
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#0f172a]/50 rounded-lg p-4">
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700/50 pb-1">Before</div>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-slate-400 inline-block w-16">Pixels:</span> <span className="text-slate-200 font-bold">{activeItem.data.width} × {activeItem.data.height}</span></div>
                              <div><span className="text-slate-400 inline-block w-16">DPI:</span> <span className="text-slate-200 font-bold">{formatDpi(activeItem.data.has_dpi, activeItem.data.dpi_x, activeItem.data.dpi_y)}</span></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700/50 pb-1">After</div>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-slate-400 inline-block w-16">Pixels:</span> 
                                <span className="text-slate-200 font-bold">{activeItem.data.width} × {activeItem.data.height}</span>
                                <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded ml-2 uppercase font-bold">Unchanged</span>
                              </div>
                              <div>
                                <span className="text-slate-400 inline-block w-16">DPI:</span> 
                                <span className="text-emerald-400 font-bold">{formatDpi(true, activeItem.applyData.verified_dpi_x, activeItem.applyData.verified_dpi_y)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Processing Overlay */}
                  {(isProcessing || activeItem.status === 'uploading') && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-pink-500 gap-3">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-bold tracking-wider uppercase">{activeItem.status === 'uploading' ? 'Extracting DPI...' : processingText}</span>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Action Bar (Bottom) */}
            {activeItem && (
              <div className="px-5 py-4 bg-[#1e293b] border border-slate-700 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-lg">
                
                {/* Status Info */}
                <div className="flex items-center gap-3">
                  <ActiveStatusBadge status={activeItem.status} />
                  <span className="text-xs text-slate-400 font-medium hidden sm:block">
                    {activeItem.status === 'uploading' && "Extracting current DPI metadata..."}
                    {activeItem.status === 'ready' && "Select target DPI and convert."}
                    {activeItem.status === 'processing' && "Updating DPI metadata..."}
                    {activeItem.status === 'completed' && "DPI verified and updated successfully."}
                    {activeItem.status === 'error' && "Processing failed. Try again."}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {activeItem.status === 'completed' ? (
                    <button 
                      onClick={() => downloadFile(activeItem.localUrl, `dpi${activeItem.targetDpiX}_${activeItem.file.name}`)}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20"
                    >
                      <Download className="w-4 h-4" /> Download Updated Image
                    </button>
                  ) : (
                    <button 
                      onClick={applyConversion}
                      disabled={isProcessing || activeItem.status === 'uploading' || inputError}
                      className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:shadow-none shadow-lg shadow-pink-500/20"
                    >
                      <RefreshCw className="w-4 h-4" /> Convert DPI
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
    uploading: 'bg-pink-500/20 text-pink-400 border-pink-500/30 animate-pulse',
    ready: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-pink-500/20 text-pink-400 border-pink-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    uploading: 'Detecting', ready: 'Ready', processing: 'Converting', completed: 'Converted', error: 'Error'
  };

  return (
    <span className={`px-1.5 mt-1 self-start rounded text-[9px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const ActiveStatusBadge = ({ status }) => {
  const styles = {
    uploading: 'bg-pink-500/20 text-pink-500 border-pink-500/30 animate-pulse',
    ready: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-pink-500/20 text-pink-500 border-pink-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    uploading: 'DETECTING...', ready: 'READY', processing: 'CONVERTING...', completed: 'CONVERTED', error: 'FAILED'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default ImageResolutionDPIConverter;
