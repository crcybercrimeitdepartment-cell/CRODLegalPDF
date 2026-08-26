import React, { useState, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function BackgroundManagementPage() {
  // Main PDF File State
  const [pdfFile, setPdfFile] = useState(null);
  
  // App Settings State
  const [actionType, setActionType] = useState('add'); // 'add' | 'remove' | 'erase'
  const [bgType, setBgType] = useState('color'); // 'color' | 'image' | 'pdf'
  
  const [color, setColor] = useState('#f8fafc');
  const [imageFile, setImageFile] = useState(null);
  const [pdfBgFile, setPdfBgFile] = useState(null);
  
  const [opacity, setOpacity] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pagesSelection, setPagesSelection] = useState('all');

  // App Execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  
  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfBgInputRef = useRef(null);

  // Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => setIsDragOver(false);
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePdfChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handlePdfChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
          alert('Please upload a valid PDF file.');
          return;
      }
      setPdfFile(file);
      const blob = new Blob([file], { type: 'application/pdf' });
      setPreviewUrl(URL.createObjectURL(blob));
    }
  };

  const handleImageChange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
          setImageFile(e.target.files[0]);
      }
  };

  const handlePdfBgChange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
          setPdfBgFile(e.target.files[0]);
      }
  };

  const removePdf = () => {
    setPdfFile(null);
    setIsSuccess(false);
    setIsProcessing(false);
    setPreviewUrl(null);
  };

  const resetAll = () => {
    removePdf();
    setActionType('add');
    setBgType('color');
    setColor('#f8fafc');
    setImageFile(null);
    setPdfBgFile(null);
    setOpacity(100);
    setRotation(0);
    setPagesSelection('all');
    setDownloadUrl(null);
  };

  const processFile = async () => {
    if (!pdfFile) return;
    setIsFlying(true);

    setTimeout(async () => {
        setIsProcessing(true);
        
        const fd = new FormData();
        fd.append('file', pdfFile);
        fd.append('action', actionType);
        fd.append('pages_selection', pagesSelection);

        if (actionType === 'add') {
            fd.append('bg_type', bgType);
            fd.append('opacity', opacity);
            fd.append('rotation', rotation);

            if (bgType === 'color') {
                fd.append('color', color);
            } else if (bgType === 'image' && imageFile) {
                fd.append('image_file', imageFile);
            } else if (bgType === 'pdf' && pdfBgFile) {
                fd.append('pdf_file', pdfBgFile);
            }
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/pdf/background`, { method: 'POST', body: fd });
            if (!response.ok) {
                let errMsg = 'Processing failed';
                try {
                  const err = await response.json();
                  errMsg = err.detail || errMsg;
                } catch (_) {}
                throw new Error(errMsg);
            }
            const data = await response.json();
            if (data.download_url) {
                const fileRes = await fetch(`${API_BASE_URL}${data.download_url}`);
                if (!fileRes.ok) throw new Error('Failed to download file');
                const blob = await fileRes.blob();
                const dlUrl = window.URL.createObjectURL(blob);
                setDownloadUrl(dlUrl);
            }
            setIsSuccess(true);
        } catch (err) {
            console.error('API failed.', err);
            alert('Failed to process: ' + err.message);
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
            Background Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Add, replace, or remove backgrounds from your PDF files with enterprise-grade tools.
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
                onClick={() => pdfInputRef.current?.click()}
              >
                <input type="file" accept=".pdf" hidden ref={pdfInputRef} onChange={handlePdfChange} />
                
                <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-translate-y-1">
                  <svg className="w-10 h-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="drop-text text-xl font-bold text-slate-800 mb-2 transition-colors group-hover:text-indigo-900">
                  {pdfFile ? 'Replace PDF File' : 'Drag & drop a PDF here'}
                </p>
                {!pdfFile && <p className="text-sm text-slate-500">or <span className="font-semibold text-indigo-600 group-hover:underline">click to browse</span></p>}
              </div>

              {/* PDF File List */}
              {pdfFile && (
                <div className="file-list mt-6 space-y-3">
                  <div className="file-item flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="flex flex-col truncate">
                         <span className="font-medium text-slate-700 truncate">{pdfFile.name}</span>
                         <span className="text-xs text-slate-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removePdf(); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0" title="Remove PDF">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview UI */}
              {pdfFile && (
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
          {pdfFile && !isProcessing && !isSuccess && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden mx-auto lg:mx-0 transition-all duration-500 animate-fade-in-up">
              
              <div className="space-y-6">
                
                {/* Action Choice */}
                <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Choose Action</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setActionType('add')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${actionType === 'add' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                        <span className="text-xl">➕</span>
                        <span className="text-xs font-bold text-center leading-tight">Add / Replace</span>
                    </button>
                    <button onClick={() => setActionType('remove')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${actionType === 'remove' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                        <span className="text-xl">❌</span>
                        <span className="text-xs font-bold text-center leading-tight">Remove</span>
                    </button>
                    <button onClick={() => setActionType('erase')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${actionType === 'erase' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                        <span className="text-xl">🧽</span>
                        <span className="text-xs font-bold text-center leading-tight">Erase Area</span>
                    </button>
                  </div>
                </div>

                {/* Background Type (Only show if action is Add) */}
                {actionType === 'add' && (
                    <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4 animate-fade-in-up">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Background Type</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setBgType('color')} className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${bgType === 'color' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                                <span className="text-lg">🎨</span>
                                <span className="text-xs font-bold">Solid Color</span>
                            </button>
                            <button onClick={() => setBgType('image')} className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${bgType === 'image' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                                <span className="text-lg">🖼️</span>
                                <span className="text-xs font-bold">Image / Logo</span>
                            </button>
                            <button onClick={() => setBgType('pdf')} className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${bgType === 'pdf' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                                <span className="text-lg">📄</span>
                                <span className="text-xs font-bold">PDF Page</span>
                            </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            {bgType === 'color' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-600">Select Color</label>
                                    <div className="flex gap-3 items-center">
                                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent" />
                                        <input type="text" value={color} onChange={e => setColor(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none uppercase" />
                                    </div>
                                </div>
                            )}

                            {bgType === 'image' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-600">Upload Image (PNG, JPG)</label>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                                </div>
                            )}

                            {bgType === 'pdf' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-600">Upload PDF Background</label>
                                    <input type="file" accept=".pdf" onChange={handlePdfBgChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                                    <p className="text-[10px] text-slate-400 font-medium">The first page of this PDF will be used as the background.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Appearance Settings (Only show if action is Add) */}
                {actionType === 'add' && (
                    <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4 animate-fade-in-up">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">3. Appearance</h3>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Opacity: {opacity}%</label>
                            <input type="range" min="0" max="100" value={opacity} onChange={e => setOpacity(e.target.value)} className="w-full accent-indigo-600" />
                        </div>
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Rotation: {rotation}°</label>
                            <input type="range" min="-180" max="180" value={rotation} onChange={e => setRotation(e.target.value)} className="w-full accent-indigo-600" />
                        </div>
                    </div>
                )}

                {/* Pages to Apply */}
                <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{actionType === 'add' ? '4.' : '2.'} Apply To Pages</h3>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">Page Range</label>
                    <input type="text" value={pagesSelection} onChange={e => setPagesSelection(e.target.value)} placeholder="e.g. all, odd, even, 1, 3-5" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>

                <button 
                  onClick={processFile} 
                  disabled={isFlying}
                  className={`w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-indigo-200 transform transition-all duration-500 flex items-center justify-center gap-2 group mt-8 relative overflow-hidden ${isFlying ? 'scale-95 opacity-80 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                  <span className={`transition-all duration-500 ${isFlying ? '-translate-x-4 opacity-0' : ''}`}>Apply Background Changes</span>
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
                  <span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <div className="base">
                    <span></span>
                    <div className="face"></div>
                  </div>
                </div>
                <div className="longfazers">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Processing Background</h3>
              <p className="text-slate-500 text-center text-sm">Please wait... updating your PDF backgrounds.</p>
            </div>
          )}

          {isSuccess && !isProcessing && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in-up min-h-[400px]">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <svg className="w-12 h-12 text-emerald-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Processing Complete!</h3>
              <p className="text-slate-500 text-center mb-8 font-medium">Your PDF background has been updated successfully.</p>
              
              {downloadUrl && (
                <a href={downloadUrl} download="background_updated.pdf" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex justify-center items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Updated PDF
                </a>
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
