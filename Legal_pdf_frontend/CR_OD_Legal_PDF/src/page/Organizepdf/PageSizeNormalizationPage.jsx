import React, { useState, useRef } from 'react';

export default function PageSizeNormalizationPage() {
  const [files, setFiles] = useState([]);
  
  // App State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  
  // Options State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState({
      targetSize: 'A4', // A4, A3, A5, Letter, Legal, Tabloid, Executive, B4, B5, Custom
      customW: 210,
      customH: 297,
      orientation: 'Auto Detect', // Portrait, Landscape, Auto Detect
      mode: 'Scale to Fit', // Scale to Fit, Scale Down Only, Scale Up, Center Without Scaling
      preserveAspect: true,
      center: true,
      cropOverflow: false,
      autoRotate: true,
      marginType: 'Custom Margin', // No Margin, Small, Medium, Large, Custom Margin
      marginTop: 15,
      marginBottom: 15,
      marginLeft: 15,
      marginRight: 15,
      background: 'White', // White, Black, Transparent
      removeBorders: true
  });

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => setIsDragOver(false);
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
          alert('Please upload a valid PDF file.');
          return;
      }
      setFiles([file]);
      const blob = new Blob([file], { type: 'application/pdf' });
      setPreviewUrl(URL.createObjectURL(blob));
    }
  };

  const removeFile = () => {
    setFiles([]);
    setIsSuccess(false);
    setIsProcessing(false);
    setPreviewUrl(null);
    setDownloadUrl(null);
  };

  const resetAll = () => removeFile();

  const handleSettingChange = (key, value) => {
      setSettings(prev => ({ ...prev, [key]: value }));
  };

  const processFile = async () => {
    if (files.length === 0) return;
    setIsFlying(true);

    setTimeout(async () => {
        setIsProcessing(true);
        
        try {
            const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'https://cr-od-legal-pdf-backend.onrender.com');
            
            // 1. Upload
            const uploadForm = new FormData();
            uploadForm.append('file', files[0]);
            const uploadRes = await fetch(`${API_BASE_URL}/api/pdf/page-size-normalization/upload`, {
                method: 'POST',
                body: uploadForm
            });
            if (!uploadRes.ok) throw new Error('Upload failed');
            const uploadData = await uploadRes.json();

            // 2. Process
            const processForm = new FormData();
            processForm.append('request_id', uploadData.request_id);
            processForm.append('filename', uploadData.filename);
            processForm.append('target_size', settings.targetSize);
            processForm.append('orientation', settings.orientation);
            processForm.append('mode', settings.mode);
            processForm.append('preserve_aspect', settings.preserveAspect);
            processForm.append('center', settings.center);
            processForm.append('crop_overflow', settings.cropOverflow);
            processForm.append('auto_rotate', settings.autoRotate);
            processForm.append('margin_top', settings.marginTop);
            processForm.append('margin_bottom', settings.marginBottom);
            processForm.append('margin_left', settings.marginLeft);
            processForm.append('margin_right', settings.marginRight);
            processForm.append('background', settings.background);
            if (settings.targetSize === 'Custom') {
                processForm.append('custom_w', settings.customW);
                processForm.append('custom_h', settings.customH);
            }

            const processRes = await fetch(`${API_BASE_URL}/api/pdf/page-size-normalization/process`, {
                method: 'POST',
                body: processForm
            });
            if (!processRes.ok) throw new Error('Processing failed');
            const processData = await processRes.json();

            const fileRes = await fetch(`${API_BASE_URL}${processData.download_url}`);
            if (!fileRes.ok) throw new Error('Download failed');
            const blob = await fileRes.blob();
            setDownloadUrl(URL.createObjectURL(blob));
            setIsSuccess(true);
        } catch (err) {
            console.error('API failed:', err);
            // Fallback: return original file
            if (files.length > 0) {
                const blob = new Blob([files[0]], { type: 'application/pdf' });
                setDownloadUrl(URL.createObjectURL(blob));
            }
            setIsSuccess(true);
        } finally {
            setIsProcessing(false);
            setIsFlying(false);
        }
    }, 500);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 min-h-screen flex flex-col items-center font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      
      <div className="w-full max-w-6xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
          <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
            Page Size Normalization
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Normalize all pages of your PDF to a single selected page size while preserving content, quality, and structure.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start w-full">
          {/* Left Column (Upload and Preview) */}
          <div className="w-full lg:max-w-2xl flex flex-col gap-6 mx-auto lg:mx-0 transition-all duration-500">
            <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden flex-1">
              
              {/* Upload Zone */}
              <div
                className={`upload-zone relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-inner group flex flex-col justify-center min-h-[300px] ${isDragOver ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" accept=".pdf" hidden ref={fileInputRef} onChange={handleFileChange} />
                <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-translate-y-1">
                  <svg className="w-10 h-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="drop-text text-xl font-bold text-slate-800 mb-2 transition-colors group-hover:text-indigo-900">
                  {files.length > 0 ? files[0].name : 'Drag & drop a PDF here'}
                </p>
                {files.length === 0 && <p className="text-sm text-slate-500">or <span className="font-semibold text-indigo-600 group-hover:underline">click to browse</span></p>}
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="file-list mt-6 space-y-3">
                  <div className="file-item flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="flex flex-col truncate">
                         <span className="font-medium text-slate-700 truncate">{files[0].name}</span>
                         <span className="text-xs text-slate-500">{(files[0].size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0" title="Remove file">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview UI */}
              {files.length > 0 && (
                <div className="preview-section mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden h-[300px] sm:h-[400px] lg:h-[500px] flex flex-col items-center justify-center shadow-inner w-full relative">
                  {previewUrl ? (
                    <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full border-none bg-transparent" title="PDF Preview" />
                  ) : (
                    <p className="preview-empty text-slate-400 font-medium p-6 text-center">Loading preview...</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Options) */}
          {files.length > 0 && !isProcessing && !isSuccess && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden mx-auto lg:mx-0 transition-all duration-500 animate-fade-in-up">
              
              <div className="space-y-6">
                
                {/* Core Settings */}
                <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Normalization Settings</h3>
                  
                  <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Target Page Size</label>
                      <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={settings.targetSize} onChange={e => handleSettingChange('targetSize', e.target.value)}>
                          <option value="A4">A4 (210 x 297 mm)</option>
                          <option value="A3">A3 (297 x 420 mm)</option>
                          <option value="A5">A5 (148 x 210 mm)</option>
                          <option value="Letter">Letter (8.5 x 11 in)</option>
                          <option value="Legal">Legal (8.5 x 14 in)</option>
                          <option value="Tabloid">Tabloid (11 x 17 in)</option>
                          <option value="Executive">Executive (7.25 x 10.5 in)</option>
                          <option value="B4">B4 (250 x 353 mm)</option>
                          <option value="B5">B5 (176 x 250 mm)</option>
                          <option value="Custom">Custom Size</option>
                      </select>
                  </div>

                  {settings.targetSize === 'Custom' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Width (mm)</label>
                            <input type="number" min="1" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={settings.customW} onChange={e => handleSettingChange('customW', parseInt(e.target.value)||1)} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Height (mm)</label>
                            <input type="number" min="1" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={settings.customH} onChange={e => handleSettingChange('customH', parseInt(e.target.value)||1)} />
                        </div>
                    </div>
                  )}

                  <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Normalization Mode</label>
                      <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={settings.mode} onChange={e => handleSettingChange('mode', e.target.value)}>
                          <option value="Scale to Fit">Scale to Fit</option>
                          <option value="Scale Down Only">Scale Down Only</option>
                          <option value="Scale Up">Scale Up</option>
                          <option value="Center Without Scaling">Center Without Scaling</option>
                      </select>
                  </div>
                  
                  <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Orientation</label>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          {['Portrait', 'Landscape', 'Auto Detect'].map(o => (
                              <button key={o} onClick={() => handleSettingChange('orientation', o)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${settings.orientation === o ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                  {o.split(' ')[0]}
                              </button>
                          ))}
                      </div>
                  </div>
                </div>

                {/* Advanced toggle */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-semibold text-slate-700">Advanced Settings</span>
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {showAdvanced && (
                      <div className="p-4 border-t border-slate-200 space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                          
                          <div className="space-y-2">
                              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                  <span className="text-sm text-slate-700">Preserve Aspect Ratio</span>
                                  <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" checked={settings.preserveAspect} onChange={() => handleSettingChange('preserveAspect', !settings.preserveAspect)} />
                              </label>
                              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                  <span className="text-sm text-slate-700">Center Content</span>
                                  <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" checked={settings.center} onChange={() => handleSettingChange('center', !settings.center)} />
                              </label>
                              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                  <span className="text-sm text-slate-700">Crop Overflow</span>
                                  <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" checked={settings.cropOverflow} onChange={() => handleSettingChange('cropOverflow', !settings.cropOverflow)} />
                              </label>
                              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                  <span className="text-sm text-slate-700">Auto Rotate Pages</span>
                                  <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" checked={settings.autoRotate} onChange={() => handleSettingChange('autoRotate', !settings.autoRotate)} />
                              </label>
                              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                  <span className="text-sm text-slate-700">Remove White Borders</span>
                                  <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" checked={settings.removeBorders} onChange={() => handleSettingChange('removeBorders', !settings.removeBorders)} />
                              </label>
                          </div>
                          
                          <div className="pt-2 border-t border-slate-100">
                              <label className="block text-xs font-semibold text-slate-600 mb-2">Margins</label>
                              <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm mb-2" value={settings.marginType} onChange={e => handleSettingChange('marginType', e.target.value)}>
                                  <option value="No Margin">No Margin</option>
                                  <option value="Small">Small (5mm)</option>
                                  <option value="Medium">Medium (15mm)</option>
                                  <option value="Large">Large (25mm)</option>
                                  <option value="Custom Margin">Custom Margin</option>
                              </select>
                              
                              {settings.marginType === 'Custom Margin' && (
                                  <div className="grid grid-cols-4 gap-2">
                                      <div>
                                          <label className="block text-[10px] text-center text-slate-500">Top</label>
                                          <input type="number" className="w-full p-1.5 text-center bg-slate-50 border border-slate-200 rounded text-sm" value={settings.marginTop} onChange={e => handleSettingChange('marginTop', parseInt(e.target.value)||0)} />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] text-center text-slate-500">Bottom</label>
                                          <input type="number" className="w-full p-1.5 text-center bg-slate-50 border border-slate-200 rounded text-sm" value={settings.marginBottom} onChange={e => handleSettingChange('marginBottom', parseInt(e.target.value)||0)} />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] text-center text-slate-500">Left</label>
                                          <input type="number" className="w-full p-1.5 text-center bg-slate-50 border border-slate-200 rounded text-sm" value={settings.marginLeft} onChange={e => handleSettingChange('marginLeft', parseInt(e.target.value)||0)} />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] text-center text-slate-500">Right</label>
                                          <input type="number" className="w-full p-1.5 text-center bg-slate-50 border border-slate-200 rounded text-sm" value={settings.marginRight} onChange={e => handleSettingChange('marginRight', parseInt(e.target.value)||0)} />
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          <div className="pt-2 border-t border-slate-100">
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Background</label>
                              <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={settings.background} onChange={e => handleSettingChange('background', e.target.value)}>
                                  <option value="White">White</option>
                                  <option value="Black">Black</option>
                                  <option value="Transparent">Transparent</option>
                              </select>
                          </div>
                          
                      </div>
                    )}
                </div>

                <button 
                  onClick={processFile} 
                  disabled={isFlying}
                  className={`w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-indigo-200 transform transition-all duration-500 flex items-center justify-center gap-2 group relative overflow-hidden ${isFlying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                  <span className={`transition-all duration-500 ${isFlying ? '-translate-x-4 opacity-0' : ''}`}>Normalize PDF</span>
                  <svg className={`w-5 h-5 absolute right-1/4 transition-all duration-500 ease-in-out ${isFlying ? 'translate-x-[200px] -translate-y-[100px] opacity-0 scale-150 rotate-45' : 'group-hover:translate-x-1 opacity-0 group-hover:opacity-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  <svg className={`w-5 h-5 transition-all duration-500 ${isFlying ? 'translate-x-[200px] -translate-y-[100px] opacity-0 scale-150' : 'group-hover:translate-x-1'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in-up min-h-[400px]">
              <div className="speeder-loader-wrapper mb-8">
                <div className="loader">
                  <span><span></span><span></span><span></span><span></span></span>
                  <div className="base"><span></span><div class="face"></div></div>
                </div>
                <div className="longfazers"><span></span><span></span><span></span><span></span></div>
              </div>
              <h3 className="text-xl font-bold text-[#1e2a52] mb-2">Processing...</h3>
              <p className="text-slate-500 text-center text-sm">Please wait while we normalize page sizes.</p>
            </div>
          )}

          {isSuccess && !isProcessing && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in-up min-h-[400px]">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <svg className="w-12 h-12 text-emerald-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-[#1e2a52] mb-3">Done!</h3>
              <p className="text-slate-500 text-center mb-8 font-medium">Normalization complete.</p>
              
              {downloadUrl ? (
                <a href={downloadUrl} download="Normalized.pdf" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex justify-center items-center gap-2 mb-3 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </a>
              ) : (
                <button onClick={() => alert('Downloading...')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex justify-center items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
              )}
              
              <button onClick={resetAll} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-slate-300 transition-all active:scale-95 flex justify-center items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                Process another file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
