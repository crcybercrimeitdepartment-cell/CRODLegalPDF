import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  UploadCloud, X, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Download, FileArchive, RefreshCw, Tags,
  MapPinOff, Eraser, Clock, Camera, User, MapPin, Info
} from 'lucide-react';

const EXIFMetadataEditor = ({ tool, onBack }) => {
  // State
  const [items, setItems] = useState([]); // { id, file, status, localUrl, exifData, applyData }
  const [activeId, setActiveId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("");
  
  // EXIF Form State for active item
  const [formData, setFormData] = useState({
    dateOriginal: '',
    make: '', model: '', lensMake: '', lensModel: '',
    artist: '', copyright: '', description: '',
    lat: '', lon: '', alt: ''
  });

  const [errors, setErrors] = useState({});

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
      id: 'exif_' + Math.random().toString(36).substr(2, 9),
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

    // Simulate reading EXIF for each
    for (const item of newItems) {
      await mockReadExif(item.id);
    }
  };

  const mockReadExif = async (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'uploading' } : i));
    await new Promise(r => setTimeout(r, 600)); // simulate read time
    
    // Mock EXIF data
    const mockData = {
      format_supported: true,
      date_time: { date_original: '2023-10-15T14:30:00' },
      camera_info: { make: 'Canon', model: 'EOS 80D', lens_make: 'Canon', lens_model: 'EF 50mm f/1.8 STM' },
      general: { artist: 'John Doe', copyright: '© 2023 John Doe', description: 'Sample Photo' },
      location: { has_gps: true, latitude: 40.7128, longitude: -74.0060, altitude: 10.5 },
      capture_settings: { iso: '100', aperture: 'f/2.8', exposure_time: '1/200s', focal_length: '50mm' },
      image_info: { width: 1920, height: 1080 }
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

  // Sync form data when active item changes
  useEffect(() => {
    if (activeItem && activeItem.exifData && activeItem.status === 'waiting') {
      const d = activeItem.exifData;
      setFormData({
        dateOriginal: d.date_time?.date_original || '',
        make: d.camera_info?.make || '',
        model: d.camera_info?.model || '',
        lensMake: d.camera_info?.lens_make || '',
        lensModel: d.camera_info?.lens_model || '',
        artist: d.general?.artist || '',
        copyright: d.general?.copyright || '',
        description: d.general?.description || '',
        lat: d.location?.latitude ?? '',
        lon: d.location?.longitude ?? '',
        alt: d.location?.altitude ?? ''
      });
      setErrors({});
    } else {
      setFormData({
        dateOriginal: '', make: '', model: '', lensMake: '', lensModel: '',
        artist: '', copyright: '', description: '', lat: '', lon: '', alt: ''
      });
    }
  }, [activeId, activeItem?.status]);

  // --- 2. APPLY CHANGES (Simulated) ---
  const validateForm = () => {
    let errs = {};
    let isValid = true;
    
    if (formData.lat !== '') {
      const lat = parseFloat(formData.lat);
      if (isNaN(lat) || lat < -90 || lat > 90) { errs.lat = "Must be between -90 and 90"; isValid = false; }
    }
    if (formData.lon !== '') {
      const lon = parseFloat(formData.lon);
      if (isNaN(lon) || lon < -180 || lon > 180) { errs.lon = "Must be between -180 and 180"; isValid = false; }
    }
    
    setErrors(errs);
    return isValid;
  };

  const applyAction = async (actionType) => {
    if (!activeItem) return;
    if (actionType === 'edit' && !validateForm()) return;
    if (actionType === 'remove_all' && !window.confirm("Are you sure you want to remove ALL supported metadata from this image?")) return;

    lockUI(`Applying metadata ${actionType.replace('_', ' ')}...`);
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, status: 'processing' } : i));

    try {
      await new Promise(r => setTimeout(r, 1200)); 
      
      setItems(prev => prev.map(i => {
        if (i.id === activeId) {
          return { 
            ...i, 
            status: 'completed',
            applyData: { previewUrl: i.localUrl } // In a real app, this would be a new blob with modified EXIF
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
    if (completedItems.length === 0) return alert("No updated images to download.");
    
    lockUI("Generating ZIP file...");
    try {
      const zip = new JSZip();
      for (const item of completedItems) {
        const response = await fetch(item.applyData.previewUrl);
        const blob = await response.blob();
        zip.file(`updated_${item.file.name}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadFile(URL.createObjectURL(zipBlob), "updated_images.zip");
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wide">Images ({items.length})</h3>
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
                    ${activeId === item.id ? 'bg-indigo-500/10 border-indigo-500 shadow-[inset_4px_0_0_rgba(99,102,241,1)]' : 'bg-white border-slate-200 hover:border-slate-300'}
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
                  className="mt-4 border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all"
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
                    onClick={downloadZip}
                    disabled={isProcessing}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
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
            
            {/* Top Quick Actions Panel */}
            <div className={`flex flex-wrap items-center justify-center gap-4 bg-slate-100 p-3 rounded-xl border border-slate-200 shrink-0 shadow-lg transition-opacity ${(!activeItem || activeItem.status !== 'waiting') ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={() => applyAction('remove_gps')}
                className="px-4 py-2 bg-white hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <MapPinOff className="w-3.5 h-3.5" /> Remove GPS Only
              </button>
              <button 
                onClick={() => applyAction('remove_all')}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <Eraser className="w-3.5 h-3.5" /> Remove All Metadata
              </button>
            </div>

            {/* Main EXIF Editor Stage */}
            <div className="flex-1 relative flex flex-col overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xl">
              
              {!activeItem ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <ImageIcon className="w-16 h-16 opacity-50 mb-4" />
                  <p>Select an image to view metadata</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative">
                  
                  {activeItem.status === 'completed' ? (
                    <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-4">
                      <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h2 className="text-xl font-bold">Metadata Updated</h2>
                      <p className="text-sm text-slate-400">The metadata for this image has been successfully modified/removed.</p>
                      <button 
                        onClick={() => downloadFile(activeItem.localUrl, `meta_${activeItem.file.name}`)}
                        className="mt-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                      >
                        <Download className="w-4 h-4" /> Download Updated Image
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Unsupported Format Warning (Mock) */}
                      {!activeItem.exifData?.format_supported && activeItem.status === 'waiting' && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 text-amber-400">
                          <Info className="w-5 h-5 shrink-0 mt-0.5" />
                          <p className="text-sm">This format has limited EXIF support. Only basic removal is guaranteed to work safely.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        
                        {/* Date & Time */}
                        <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-4 pb-2 border-b border-slate-200">
                            <Clock className="w-4 h-4" /> Date & Time
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs text-slate-400 mb-1.5">Date Taken (Original)</label>
                            <input type="datetime-local" step="1" name="dateOriginal" value={formData.dateOriginal} onChange={handleInputChange} className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                        </div>

                        {/* Camera Info */}
                        <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-4 pb-2 border-b border-slate-200">
                            <Camera className="w-4 h-4" /> Camera Info
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Make</label>
                              <input type="text" name="make" value={formData.make} onChange={handleInputChange} placeholder="e.g. Canon" className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Model</label>
                              <input type="text" name="model" value={formData.model} onChange={handleInputChange} placeholder="e.g. EOS 80D" className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Lens Make</label>
                              <input type="text" name="lensMake" value={formData.lensMake} onChange={handleInputChange} className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Lens Model</label>
                              <input type="text" name="lensModel" value={formData.lensModel} onChange={handleInputChange} className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                          </div>
                        </div>

                        {/* General */}
                        <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-4 pb-2 border-b border-slate-200">
                            <User className="w-4 h-4" /> General
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Artist / Author</label>
                              <input type="text" name="artist" value={formData.artist} onChange={handleInputChange} placeholder="Author name" className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Copyright</label>
                              <input type="text" name="copyright" value={formData.copyright} onChange={handleInputChange} placeholder="Copyright info" className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Description</label>
                              <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="Image description" className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                          </div>
                        </div>

                        {/* GPS */}
                        <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold">
                              <MapPin className="w-4 h-4" /> GPS Location
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeItem.exifData?.location?.has_gps ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                              {activeItem.exifData?.location?.has_gps ? 'DATA FOUND' : 'NO DATA'}
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Latitude</label>
                              <input type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} placeholder="e.g. 40.7128" min="-90" max="90" className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none transition-colors ${errors.lat ? 'border-red-500 focus:border-red-500' : 'border-slate-600 focus:border-indigo-500'}`} />
                              {errors.lat && <span className="text-[10px] text-red-500 mt-1 block">{errors.lat}</span>}
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Longitude</label>
                              <input type="number" step="any" name="lon" value={formData.lon} onChange={handleInputChange} placeholder="e.g. -74.0060" min="-180" max="180" className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none transition-colors ${errors.lon ? 'border-red-500 focus:border-red-500' : 'border-slate-600 focus:border-indigo-500'}`} />
                              {errors.lon && <span className="text-[10px] text-red-500 mt-1 block">{errors.lon}</span>}
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">Altitude (m)</label>
                              <input type="number" step="any" name="alt" value={formData.alt} onChange={handleInputChange} placeholder="e.g. 10.5" className="w-full bg-white border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                          </div>
                        </div>

                        {/* Read Only Info */}
                        <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-4 pb-2 border-b border-slate-200">
                            <Info className="w-4 h-4" /> Capture Settings (Read-Only)
                          </div>
                          <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-400 font-medium">ISO:</span>
                              <span className="text-slate-200 font-mono">{activeItem.exifData?.capture_settings?.iso || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-400 font-medium">Aperture:</span>
                              <span className="text-slate-200 font-mono">{activeItem.exifData?.capture_settings?.aperture || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-400 font-medium">Exposure:</span>
                              <span className="text-slate-200 font-mono">{activeItem.exifData?.capture_settings?.exposure_time || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-400 font-medium">Focal Length:</span>
                              <span className="text-slate-200 font-mono">{activeItem.exifData?.capture_settings?.focal_length || '-'}</span>
                            </div>
                            <div className="flex justify-between pb-1">
                              <span className="text-slate-400 font-medium">Resolution:</span>
                              <span className="text-slate-200 font-mono">
                                {activeItem.exifData?.image_info?.width ? `${activeItem.exifData.image_info.width} x ${activeItem.exifData.image_info.height}` : '-'}
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </>
                  )}

                  {/* Processing Overlay */}
                  {(isProcessing || activeItem.status === 'uploading') && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-indigo-400 gap-3">
                      <RefreshCw className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-bold tracking-wider uppercase">{activeItem.status === 'uploading' ? 'Extracting EXIF...' : processingText}</span>
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
                    {activeItem.status === 'uploading' && "Extracting metadata..."}
                    {activeItem.status === 'waiting' && "Ready to edit metadata."}
                    {activeItem.status === 'processing' && "Applying changes..."}
                    {activeItem.status === 'completed' && "Metadata updated successfully."}
                    {activeItem.status === 'failed' && "Processing failed. Try again."}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {activeItem.status === 'completed' ? (
                    <button 
                      onClick={() => downloadFile(activeItem.localUrl, `meta_${activeItem.file.name}`)}
                      className="px-4 py-2 bg-white hover:bg-slate-800 text-indigo-400 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  ) : (
                    <button 
                      onClick={() => applyAction('edit')}
                      disabled={isProcessing || activeItem.status === 'uploading'}
                      className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400 shadow-md shadow-indigo-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Apply Changes
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
    uploading: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse',
    waiting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    uploading: 'Reading', waiting: 'Ready', processing: 'Processing', completed: 'Completed', failed: 'Error'
  };

  return (
    <span className={`px-1.5 mt-1 self-start rounded text-[9px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const ActiveStatusBadge = ({ status }) => {
  const styles = {
    uploading: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse',
    waiting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    processing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    uploading: 'READING EXIF...', waiting: 'READY', processing: 'APPLYING...', completed: 'UPDATED', failed: 'FAILED'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default EXIFMetadataEditor;
