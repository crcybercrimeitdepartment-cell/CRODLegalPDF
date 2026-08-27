import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  UploadCloud, X, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Download, FileArchive, RefreshCw, Shield,
  MapPinOff, Eraser, Info, ShieldAlert, MapPin, Camera, Clock, UserCheck
} from 'lucide-react';

const EXIFMetadataRemover = ({ tool, onBack }) => {
  // State
  const [items, setItems] = useState([]); // { id, file, status, localUrl, exifData, applyData }
  const [activeId, setActiveId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("");
  
  const fileInputRef = useRef(null);
  const activeItem = items.find(i => i.id === activeId);

  // --- 1. UPLOAD & EXTRACT (Mock) ---
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
    const validFiles = files.filter(f => f.type.match(/image\/(jpeg|png|webp|tiff)/));
    if (validFiles.length < files.length) alert("Some files were skipped (unsupported format).");
    if (validFiles.length === 0) return;

    const newItems = validFiles.map(file => ({
      id: 'exif_rm_' + Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading', // uploading, waiting, processing, completed, failed
      localUrl: URL.createObjectURL(file),
      exifData: null,
      applyData: null
    }));

    setItems(prev => {
      const updated = [...prev, ...newItems];
      if (!activeId && updated.length > 0) setActiveId(updated[0].id);
      return updated;
    });

    // Simulate scanning EXIF for each
    for (const item of newItems) {
      await mockScanExif(item.id);
    }
  };

  const mockScanExif = async (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'uploading' } : i));
    await new Promise(r => setTimeout(r, 800)); // simulate scan time
    
    // Mock EXIF data detection
    const mockData = {
      format_supported: true,
      raw_exif_exists: true,
      date_time: { date_original: '2023-10-15T14:30:00' },
      camera_info: { make: 'Canon', model: 'EOS 80D' },
      general: { artist: 'John Doe' },
      location: { has_gps: true, latitude: 40.7128 },
      capture_settings: { iso: '100' }
    };

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'waiting', exifData: mockData } : i));
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

  // --- 2. APPLY CHANGES (Simulated) ---
  const applyAction = async (actionType) => {
    if (!activeItem) return;
    if (actionType === 'remove_all' && !window.confirm("Are you sure you want to remove ALL supported metadata from this image?")) return;

    lockUI(`Removing metadata...`);
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'processing' } : i));

    try {
      await new Promise(r => setTimeout(r, 1200)); 
      
      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          
          // Mock the resulting clean state
          const cleanMetadata = {
            format_supported: true,
            raw_exif_exists: false,
            date_time: null,
            camera_info: null,
            general: null,
            location: { has_gps: false },
            capture_settings: null
          };

          if (actionType === 'remove_gps') {
            // keep others, just remove gps
            cleanMetadata.date_time = i.exifData.date_time;
            cleanMetadata.camera_info = i.exifData.camera_info;
            cleanMetadata.general = i.exifData.general;
            cleanMetadata.capture_settings = i.exifData.capture_settings;
            cleanMetadata.raw_exif_exists = true;
          }

          return { 
            ...i, 
            status: 'completed',
            applyData: { 
              previewUrl: i.localUrl,
              verified_metadata: cleanMetadata
            }
          };
        }
        return i;
      }));
    } catch(err) {
      setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'failed' } : i));
    }
    
    unlockUI();
  };

  const lockUI = (msg) => { setIsProcessing(true); setProcessingText(msg); };
  const unlockUI = () => setIsProcessing(false);

  const downloadZip = async () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.applyData?.previewUrl);
    if (completedItems.length === 0) return alert("No cleaned images to download.");
    
    lockUI("Generating ZIP file...");
    try {
      const zip = new JSZip();
      for (const item of completedItems) {
        const response = await fetch(item.applyData.previewUrl);
        const blob = await response.blob();
        zip.file(`cleaned_${item.file.name}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadFile(URL.createObjectURL(zipBlob), "cleaned_images.zip");
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

  const hasData = (obj) => {
    if (!obj) return false;
    return Object.values(obj).some(val => val !== null && val !== false && val !== "");
  };

  const successCount = items.filter(i => i.status === 'completed').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  // Render Category Logic
  const renderCategory = (name, icon, dataObj, isLocation = false, currentData = null, isAfter = false) => {
    let isFound = false;
    if (isLocation) {
      isFound = dataObj?.has_gps || dataObj?.latitude !== null;
    } else {
      isFound = hasData(dataObj);
    }

    const isUnsupported = currentData && !currentData.format_supported;
    
    let badgeClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
    let badgeText = 'Not Found';
    let statusText = 'No data present';
    let iconClass = 'bg-slate-800 text-slate-500';

    if (isUnsupported) {
      badgeText = 'Not Supported';
      statusText = 'Not Removable for this format';
    } else if (isAfter && !isFound) {
      badgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      badgeText = 'Removed';
      statusText = 'Successfully scrubbed';
    } else if (isFound) {
      badgeClass = 'bg-red-500/10 text-red-500 border-red-500/20';
      badgeText = 'Found';
      statusText = 'Removable metadata detected';
      iconClass = 'bg-orange-500/10 text-orange-500';
    }

    return (
      <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconClass}`}>
            {icon}
          </div>
          <div>
            <div className="font-bold text-slate-200">{name}</div>
            <div className="text-xs text-slate-400 mt-0.5">{statusText}</div>
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badgeClass}`}>
          {badgeText}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar - Gallery */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-hidden z-20">
          <div className="p-4 sm:p-5 flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide">Images ({items.length})</h3>
              <button 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                disabled={isProcessing}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-bold transition-colors disabled:opacity-50 border border-slate-200 flex items-center gap-1"
              >
                + Add
              </button>
              <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept="image/jpeg,image/png,image/webp,image/tiff" className="hidden" />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
              {items.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => !isProcessing && setActiveId(item.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer group 
                    ${activeId === item.id ? 'bg-orange-500/10 border-orange-500 shadow-[inset_4px_0_0_rgba(249,115,22,1)]' : 'bg-white border-slate-200 hover:border-slate-300'}
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
                  className="mt-4 border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-orange-500 hover:bg-orange-500/5 transition-all"
                >
                  <Shield className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Privacy Scan</p>
                  <p className="text-xs text-slate-500 mt-1">Drag & Drop images</p>
                </div>
              )}
            </div>
            
            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-3 shrink-0">
                <div className="text-[10px] text-center text-slate-500">
                  {items.length} total • {successCount} cleaned • {failedCount} failed
                </div>
                {successCount > 0 && (
                  <button 
                    onClick={downloadZip}
                    disabled={isProcessing}
                    className="w-full py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <FileArchive className="w-4 h-4" /> Download All Cleaned (ZIP)
                  </button>
                )}
              </div>
            )}

          </div>
        </aside>

        {/* Right Workspace */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex-1 flex flex-col h-full gap-4">
            
            {/* Main Detection Stage */}
            <div className="flex-1 relative flex flex-col overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xl">
              
              {!activeItem ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <ShieldAlert className="w-16 h-16 opacity-50 mb-4" />
                  <p>Select an image to view privacy scan</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative flex flex-col">
                  
                  {activeItem.status === 'completed' ? (
                    <div className="flex flex-col flex-1 items-center justify-center text-emerald-400 gap-4">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h2 className="text-xl font-bold">Metadata Removed</h2>
                      <p className="text-sm text-slate-400">Selected metadata has been safely scrubbed from this image.</p>
                      
                      <div className="w-full max-w-lg mt-6 space-y-3">
                        {renderCategory("GPS / Location", <MapPin className="w-4 h-4"/>, activeItem.applyData?.verified_metadata?.location, true, activeItem.applyData?.verified_metadata, true)}
                        {renderCategory("Camera Information", <Camera className="w-4 h-4"/>, activeItem.applyData?.verified_metadata?.camera_info, false, activeItem.applyData?.verified_metadata, true)}
                        {renderCategory("Date & Time", <Clock className="w-4 h-4"/>, activeItem.applyData?.verified_metadata?.date_time, false, activeItem.applyData?.verified_metadata, true)}
                        {renderCategory("Copyright & General", <UserCheck className="w-4 h-4"/>, activeItem.applyData?.verified_metadata?.general, false, activeItem.applyData?.verified_metadata, true)}
                      </div>

                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-orange-500 font-bold text-lg mb-6 pb-4 border-b border-slate-200">
                        <ShieldAlert className="w-6 h-6" /> Privacy Scan Results
                      </div>

                      {!activeItem.exifData?.format_supported && activeItem.status === 'waiting' && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 text-amber-400">
                          <Info className="w-5 h-5 shrink-0 mt-0.5" />
                          <p className="text-sm">This format has limited EXIF support. Complete removal is recommended.</p>
                        </div>
                      )}

                      <div className="space-y-3 max-w-3xl mx-auto w-full">
                        {renderCategory("GPS / Location", <MapPin className="w-4 h-4"/>, activeItem.exifData?.location, true, activeItem.exifData, false)}
                        {renderCategory("Camera Information", <Camera className="w-4 h-4"/>, activeItem.exifData?.camera_info, false, activeItem.exifData, false)}
                        {renderCategory("Date & Time", <Clock className="w-4 h-4"/>, activeItem.exifData?.date_time, false, activeItem.exifData, false)}
                        {renderCategory("Copyright & General", <UserCheck className="w-4 h-4"/>, activeItem.exifData?.general, false, activeItem.exifData, false)}
                      </div>

                      {activeItem.status === 'waiting' && (
                        <div className="mt-8 p-4 bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg flex items-start gap-4 text-orange-200/80 max-w-3xl mx-auto w-full">
                          <Shield className="w-6 h-6 shrink-0 text-orange-500" />
                          <p className="text-sm">Removing metadata can permanently delete location, camera, date, and other sensitive information from the processed copy.</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Processing Overlay */}
                  {(isProcessing || activeItem.status === 'uploading') && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-orange-500 gap-3">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-bold tracking-wider uppercase">{activeItem.status === 'uploading' ? 'Inspecting Image...' : processingText}</span>
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
                    {activeItem.status === 'uploading' && "Scanning for privacy risks..."}
                    {activeItem.status === 'waiting' && "Review privacy scan results."}
                    {activeItem.status === 'processing' && "Scrubbing metadata..."}
                    {activeItem.status === 'completed' && "Metadata successfully removed."}
                    {activeItem.status === 'failed' && "Processing failed. Try again."}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {activeItem.status === 'completed' ? (
                    <button 
                      onClick={() => downloadFile(activeItem.localUrl, `clean_${activeItem.file.name}`)}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20"
                    >
                      <Download className="w-4 h-4" /> Download Clean Image
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => applyAction('remove_gps')}
                        disabled={isProcessing || activeItem.status === 'uploading' || (!activeItem.exifData?.location?.has_gps && activeItem.exifData?.location?.latitude === null)}
                        className="px-4 py-2.5 bg-white hover:bg-slate-800 text-slate-600 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <MapPinOff className="w-3.5 h-3.5 text-slate-400" /> Remove GPS Only
                      </button>

                      <button 
                        onClick={() => applyAction('remove_all')}
                        disabled={isProcessing || activeItem.status === 'uploading'}
                        className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 shadow-md shadow-orange-500/20"
                      >
                        <Eraser className="w-3.5 h-3.5" /> Remove All Metadata
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
    uploading: 'bg-orange-500/20 text-orange-500 border-orange-500/30 animate-pulse',
    waiting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-orange-500/20 text-orange-500 border-orange-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    uploading: 'Scanning', waiting: 'Ready', processing: 'Cleaning', completed: 'Cleaned', failed: 'Error'
  };

  return (
    <span className={`px-1.5 mt-1 self-start rounded text-[9px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const ActiveStatusBadge = ({ status }) => {
  const styles = {
    uploading: 'bg-orange-500/20 text-orange-500 border-orange-500/30 animate-pulse',
    waiting: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    processing: 'bg-orange-500/20 text-orange-500 border-orange-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    uploading: 'SCANNING...', waiting: 'DETECTED', processing: 'CLEANING...', completed: 'CLEANED', failed: 'FAILED'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default EXIFMetadataRemover;
