import React, { useState, useRef, useEffect } from 'react';
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function OCRPDFPage() {
  const [file, setFile] = useState(null);
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [metadata, setMetadata] = useState({ size: '-', orient: '-', rotate: 'Rotation: 0°' });
  const [analysis, setAnalysis] = useState(null);
  
  const [settings, setSettings] = useState({
    language: 'english',
    quality: 'balanced',
    autoRotate: true,
    deskew: true,
    cleanNoise: true,
    preserveMetadata: true,
    optimizePdf: true,
    skipSearchable: true,
    forceOcr: false
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '', visible: false });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const activeRenderTask = useRef(null);
  const fileInputRef = useRef(null);
  const progressTimer = useRef(null);
  
  const [thumbnails, setThumbnails] = useState([]); // Base64 strings for thumbnails

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  const fmtBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please upload a PDF document.', 'error');
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      showToast('File size exceeds the 100MB limit.', 'error');
      return;
    }
    
    setFile(f);
    setResult(null);
    setProgressStep(0);
    setAnalysis(null);
    setThumbnails([]);
    
    // Load Preview
    try {
      const buf = await f.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      setPdfJsDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      generateThumbnails(doc);
    } catch (e) {
      showToast(`Preview loading failed: ${e.message}`, 'error');
    }
    
    // Analyze API
    const fd = new FormData();
    fd.append('file', f);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf/pdf-to-searchable/upload`, { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        setMetadata({
          size: `${Math.round(data.width * 100) / 100}x${Math.round(data.height * 100) / 100} pt`,
          orient: data.orientation,
          rotate: 'Rotation: 0°'
        });
        if (data.is_searchable) {
          setSettings(s => ({ ...s, skipSearchable: true, forceOcr: false }));
        }
      }
    } catch (e) {
      // Ignore API fail for now (development/mock mode)
    }
  };

  const generateThumbnails = async (doc) => {
    const thumbs = [];
    // Max 10 thumbnails for performance
    const maxThumbs = Math.min(doc.numPages, 10);
    for (let i = 1; i <= maxThumbs; i++) {
        try {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs.push(canvas.toDataURL());
        } catch(e) {}
    }
    setThumbnails(thumbs);
  };

  useEffect(() => {
    if (pdfJsDoc) renderPage(currentPage);
  }, [pdfJsDoc, currentPage, zoomScale]);

  const renderPage = async (num) => {
    if (!pdfJsDoc || !canvasRef.current || !containerRef.current) return;
    try {
      const page = await pdfJsDoc.getPage(num);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const container = containerRef.current;
      
      if (activeRenderTask.current) activeRenderTask.current.cancel();

      const dpiScale = window.devicePixelRatio || 2;
      const baseViewport = page.getViewport({ scale: 1.0 });
      const fitScale = Math.min((container.clientWidth - 32) / baseViewport.width, (container.clientHeight - 32) / baseViewport.height);
      const displayViewport = page.getViewport({ scale: fitScale * zoomScale });
      const renderViewport = page.getViewport({ scale: fitScale * zoomScale * dpiScale });

      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;

      activeRenderTask.current = page.render({ canvasContext: ctx, viewport: renderViewport });
      await activeRenderTask.current.promise;
      activeRenderTask.current = null;

      setMetadata(prev => ({ ...prev, rotate: `Rotation: ${page.rotate}°` }));
    } catch (e) {
      if (e.name !== 'RenderingCancelledException' && e.name !== 'HeadingStatus') {
        console.error(e);
      }
    }
  };

  const navigatePage = (delta) => {
    const next = currentPage + delta;
    if (next >= 1 && next <= totalPages) setCurrentPage(next);
  };

  const processOCR = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResult(null);
    setProgressStep(1);

    const STEP_DELAYS = [400, 600, 800, 1000, 1500, 1200, 500];
    let step = 1;

    const advanceProgress = () => {
      if (step > 7) return;
      setProgressStep(step);
      progressTimer.current = setTimeout(() => {
        step++;
        advanceProgress();
      }, STEP_DELAYS[step - 1] || 1000);
    };
    advanceProgress();

    const fd = new FormData();
    fd.append('file', file);
    
    // Map camelCase to snake_case for backend
    const keyMap = {
      language: 'language',
      quality: 'quality',
      autoRotate: 'auto_rotate',
      deskew: 'deskew',
      cleanNoise: 'clean_noise',
      preserveMetadata: 'preserve_metadata',
      skipSearchable: 'skip_searchable',
      forceOcr: 'force_ocr'
    };
    
    Object.keys(settings).forEach(key => {
      if (keyMap[key]) {
        fd.append(keyMap[key], settings[key]);
      }
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf/pdf-to-searchable/process`, { method: 'POST', body: fd });
      const data = await res.json();
      
      clearTimeout(progressTimer.current);
      setProgressStep(8); // Done

      if (!res.ok) throw new Error(data.detail || 'OCR processing failed.');
      if (!data.success) throw new Error(data.message || 'Operation failed.');

      setResult({
        message: data.message,
        origSize: data.original_size || 0,
        finalSize: data.final_size || 0,
        duration: data.processing_time || 0,
        pages: data.pages_processed || 0,
        lang: data.ocr_lang || 'English',
        downloadUrl: data.download_url,
        filename: data.filename
      });
      showToast('PDF converted to searchable document! 🎉', 'success');
    } catch (e) {
      clearTimeout(progressTimer.current);
      setProgressStep(0);
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPdfJsDoc(null);
    setCurrentPage(1);
    setTotalPages(0);
    setThumbnails([]);
    setResult(null);
    setProgressStep(0);
    setAdvancedOpen(false);
    setSettings({
      language: 'english', quality: 'balanced', autoRotate: true, deskew: true,
      cleanNoise: true, preserveMetadata: true, optimizePdf: true, skipSearchable: true, forceOcr: false
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 min-h-screen flex flex-col items-center">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      
      <div className="w-full max-w-7xl relative z-10">
      
      {/* Header */}
      <div className="text-center py-8 mb-4 max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">PDF to Searchable PDF (OCR)</h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">Convert scanned and non-searchable PDF documents into searchable PDFs with selectable and highlightable text layers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 xl:gap-8 items-start pb-12">
        
        {/* Left Area: Live Document View */}
        <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl overflow-hidden flex flex-col lg:sticky lg:top-8 h-[750px]">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-bold text-slate-700 text-sm flex items-center">
             Live Document View
          </div>
          <div className="flex flex-1 overflow-hidden">
            {/* Thumbnails Sidebar */}
            <div className="w-[100px] min-w-[100px] bg-slate-50 border-r border-slate-200 p-2 overflow-y-auto flex flex-col gap-2">
              {!file ? (
                <div className="text-xs text-slate-400 text-center mt-4">No PDF</div>
              ) : (
                thumbnails.map((src, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setCurrentPage(i+1); setZoomScale(1.0); }}
                    className={`relative w-full aspect-[210/297] bg-white border-2 rounded cursor-pointer overflow-hidden transition-all duration-200 ${currentPage === i+1 ? 'border-blue-600 ring-2 ring-blue-200/50 scale-95' : 'border-slate-300 hover:border-slate-400'}`}
                  >
                    <img src={src} className="w-full h-full object-contain" alt={`Page ${i+1}`}/>
                    <span className="absolute bottom-1 right-1 bg-slate-900/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">{i+1}</span>
                  </div>
                ))
              )}
            </div>
            
            {/* Main Canvas Container */}
            <div className="flex-1 flex flex-col bg-slate-100">
              <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-700">
                <button onClick={() => navigatePage(-1)} disabled={!file || currentPage <= 1} className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">Prev</button>
                <div className="flex items-center gap-3">
                  <button onClick={() => setZoomScale(z => Math.max(0.3, z - 0.2))} disabled={!file} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">-</button>
                  <span>Page {totalPages > 0 ? currentPage : 0} / {totalPages}</span>
                  <button onClick={() => setZoomScale(z => Math.min(3.0, z + 0.2))} disabled={!file} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">+</button>
                </div>
                <button onClick={() => navigatePage(1)} disabled={!file || currentPage >= totalPages} className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">Next</button>
              </div>
              
              <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
                {!file && <div className="text-slate-400 text-sm">Upload a PDF file to view page layouts</div>}
                <canvas ref={canvasRef} className={`bg-white shadow-lg ${!file ? 'hidden' : 'block'}`} />
              </div>
              
              <div className="bg-white border-t border-slate-200 px-3 py-1.5 text-center text-[11px] text-slate-400">
                <span>{metadata.size}</span> <span className="mx-1">|</span> <span>{metadata.orient}</span> <span className="mx-1">|</span> <span>{metadata.rotate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Settings Panel */}
        <div className="flex flex-col gap-4">
          
          {/* Step 1: Upload */}
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">1. Upload scanned PDF</h3>
            
            {!file ? (
              <div 
                onDragOver={e => e.preventDefault()} 
                onDrop={handleDrop}
                className="relative overflow-hidden border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50 hover:border-blue-600 transition-colors"
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => handleFileSelect(e.target.files[0])} />
                <div className="relative z-0 pointer-events-none">
                  <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="text-slate-600 text-sm mb-1">Drag PDF here or <span className="text-blue-600 font-semibold underline">Browse files</span></p>
                  <p className="text-[11px] text-slate-400">Max size: 100MB</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="text-red-500 bg-red-50 p-2 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400">{fmtBytes(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-white rounded-lg hover:bg-red-50 transition-colors ml-2 shrink-0 z-20 relative">Remove</button>
              </div>
            )}
            {/* The input was moved into the !file block, so we just remove the extra hidden one here if it was outside */}
          </div>

          {/* Searchable Warning */}
          {analysis?.is_searchable && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 shadow-sm">
              <h4 className="font-bold text-yellow-700 text-sm mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                Already Searchable PDF
              </h4>
              <p className="text-xs text-yellow-800 mb-3">This document already contains a selectable text layer. Re-running OCR might overwrite existing text.</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="forceOcr" checked={settings.skipSearchable} onChange={() => setSettings(s => ({...s, skipSearchable: true, forceOcr: false}))} className="mt-0.5 accent-yellow-600"/>
                  <span className="text-xs font-semibold text-slate-900">Skip OCR on searchable pages (Recommended)</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="forceOcr" checked={settings.forceOcr} onChange={() => setSettings(s => ({...s, skipSearchable: false, forceOcr: true}))} className="mt-0.5 accent-yellow-600"/>
                  <span className="text-xs font-semibold text-slate-900">Run OCR again on all pages (Redo OCR)</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="font-bold text-slate-900 mb-4">2. OCR Settings</h3>
            
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">OCR Language</label>
              <select value={settings.language} onChange={e => setSettings(s => ({...s, language: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="english">English (eng)</option>
                <option value="hindi">Hindi (hin)</option>
                <option value="odia">Odia (ori)</option>
                <option value="bengali">Bengali (ben)</option>
                <option value="tamil">Tamil (tam)</option>
                <option value="telugu">Telugu (tel)</option>
                <option value="kannada">Kannada (kan)</option>
                <option value="malayalam">Malayalam (mal)</option>
                <option value="punjabi">Punjabi (pan)</option>
                <option value="gujarati">Gujarati (guj)</option>
                <option value="marathi">Marathi (mar)</option>
                <option value="urdu">Urdu (urd)</option>
                <option value="japanese">Japanese (jpn)</option>
                <option value="chinese">Chinese (chi_sim)</option>
                <option value="german">German (deu)</option>
                <option value="french">French (fra)</option>
                <option value="spanish">Spanish (spa)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Choose the main language of the scanned document.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">OCR Quality Preset</label>
              <select value={settings.quality} onChange={e => setSettings(s => ({...s, quality: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="fast">Fast (Skip processing steps)</option>
                <option value="balanced">Balanced (Standard density)</option>
                <option value="high">High Accuracy (Clean noise & deskew)</option>
                <option value="max">Maximum Accuracy (Oversample 300 DPI)</option>
              </select>
            </div>
          </div>

          {/* Step 3: Preprocessing */}
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="font-bold text-slate-900 mb-3">3. Preprocessing Enhancements</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'autoRotate', title: 'Auto Rotate Pages', desc: 'Fix sideways scanned orientation pages.' },
                { id: 'deskew', title: 'Deskew Pages', desc: 'Straighten slightly tilted scans automatically.' },
                { id: 'cleanNoise', title: 'Clean Background Noise', desc: 'Remove small dust particles and scan dots.' }
              ].map(opt => (
                <label key={opt.id} className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={settings[opt.id]} onChange={e => setSettings(s => ({...s, [opt.id]: e.target.checked}))} className="mt-1 accent-blue-600 w-4 h-4"/>
                  <div>
                    <strong className="block text-sm text-slate-700 font-semibold">{opt.title}</strong>
                    <span className="text-xs text-slate-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Step 4: Advanced */}
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl shadow-xl hover:shadow-2xl transition-shadow overflow-hidden">
            <div onClick={() => setAdvancedOpen(!advancedOpen)} className="p-6 flex items-center justify-between cursor-pointer select-none">
              <h3 className="font-bold text-slate-900">4. Advanced Settings</h3>
              <svg className={`w-5 h-5 text-slate-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </div>
            {advancedOpen && (
              <div className="px-5 pb-5 border-t border-slate-100 pt-4 bg-slate-50">
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'preserveMetadata', title: 'Preserve Original Metadata', desc: 'Copy original title, author and creation stamps.' },
                    { id: 'optimizePdf', title: 'Optimize Output PDF', desc: 'Compress image streams to reduce final file size.' }
                  ].map(opt => (
                    <label key={opt.id} className="flex items-start gap-3 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" checked={settings[opt.id]} onChange={e => setSettings(s => ({...s, [opt.id]: e.target.checked}))} className="mt-1 accent-blue-600 w-4 h-4"/>
                      <div>
                        <strong className="block text-sm text-slate-700 font-semibold">{opt.title}</strong>
                        <span className="text-xs text-slate-500">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button 
              onClick={processOCR}
              disabled={!file || isProcessing}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white py-4 px-4 rounded-xl font-bold shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95 disabled:hover:scale-100"
            >
              {isProcessing ? (
                <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Processing OCR...</>
              ) : (
                <>Start OCR Processing</>
              )}
            </button>
                        {isProcessing ? (
              <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] w-full mt-4 mb-4">
                  <div className="speeder-loader-wrapper" style={{ margin: "0 auto", transform: "scale(0.8)" }}>
                      <div className="loader">
                          <span><span></span><span></span><span></span><span></span></span>
                          <div className="base"><span></span><div className="face"></div></div>
                      </div>
                      <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-700">Processing Document...</h3>
              </div>
            ) : (
              <button onClick={resetAll} disabled={isProcessing} className="px-6 py-4 bg-white/70 backdrop-blur-sm border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
                Reset
              </button>
            )}
          </div>

          {/* Progress Card */}
          {progressStep > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-2">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                {progressStep < 8 && <svg className="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>}
                Processing Timeline
              </h3>
              <div className="flex flex-col gap-1.5">
                {[
                  'Uploading scanned PDF', 'Analyzing searchability layer', 'Straightening & rotating pages',
                  'Preprocessing image contrast', 'Running Tesseract OCR engine', 'Creating invisible text layer', 'Validating final searchable PDF'
                ].map((txt, i) => {
                  const stepNum = i + 1;
                  const isActive = progressStep === stepNum;
                  const isDone = progressStep > stepNum;
                  return (
                    <div key={stepNum} className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-semibold' : isDone ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className="w-5 flex justify-center">
                        {isDone ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> : isActive ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> : <span className="w-2 h-2 rounded-full bg-slate-300"/>}
                      </div>
                      {txt}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm mt-2 animate-[fadein_0.4s_ease]">
              <h3 className="font-bold text-green-700 text-lg mb-1 flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                OCR Conversion Successful!
              </h3>
              <p className="text-sm text-green-800 mb-4">{result.message}</p>
              
              <div className="bg-white/60 rounded-xl p-3 mb-5">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-green-200/50"><td className="py-1.5 text-green-800/70">Original File Size</td><td className="py-1.5 text-right font-semibold text-green-900">{fmtBytes(result.origSize)}</td></tr>
                    <tr className="border-b border-green-200/50"><td className="py-1.5 text-green-800/70">Searchable File Size</td><td className="py-1.5 text-right font-semibold text-green-900">{fmtBytes(result.finalSize)}</td></tr>
                    <tr className="border-b border-green-200/50"><td className="py-1.5 text-green-800/70">Processing Duration</td><td className="py-1.5 text-right font-semibold text-green-900">{result.duration}s</td></tr>
                    <tr className="border-b border-green-200/50"><td className="py-1.5 text-green-800/70">Pages Processed</td><td className="py-1.5 text-right font-semibold text-green-900">{result.pages}</td></tr>
                    <tr><td className="py-1.5 text-green-800/70">OCR Language Used</td><td className="py-1.5 text-right font-semibold text-green-900">{result.lang}</td></tr>
                  </tbody>
                </table>
              </div>

              <a href={`${API_BASE_URL || ''}${result.downloadUrl || '#'}`} download={result.filename || 'searchable.pdf'} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-green-600/20 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Download Searchable PDF
              </a>
            </div>
          )}

        </div>
      </div>
      </div>
      
      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-3 animate-[fadein_0.3s_ease] z-50 ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-900 border-slate-800 text-white'}`}>
          {toast.type === 'error' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          ) : (
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
          )}
          {toast.msg}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
