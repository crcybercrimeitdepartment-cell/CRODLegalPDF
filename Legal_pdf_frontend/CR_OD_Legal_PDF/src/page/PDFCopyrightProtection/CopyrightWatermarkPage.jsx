import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Type, LayoutTemplate, BoxSelect, Maximize, RotateCw, Palette, Files, Wand2, Plus, DownloadCloud } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightWatermarkPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  
  const [formData, setFormData] = useState({
    text: '',
    position: 'center',
    fontSize: '60',
    opacity: '0.3',
    rotation: '45',
    color: '#888888',
    pages: 'all'
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Watermark';
  const toolDesc = tool?.description || 'Apply a visible copyright watermark text to your PDF pages.';
  
  const addFiles = (newFiles) => {
    setError('');
    const valid = [];
    const invalid = [];

    Array.from(newFiles).forEach(f => {
      if (f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf') {
        valid.push({
          name: f.name,
          size: f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: f.type,
          originalFile: f
        });
      } else {
        invalid.push(f.name);
      }
    });

    if (invalid.length > 0) setError(`Only PDF files (.pdf) are accepted. Rejected: ${invalid.join(', ')}`);
    if (valid.length > 0) {
      setFiles([valid[0]]);
      setShowResult(false);
      setShowForm(true);
      setResult(null);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    if (!formData.text.trim()) { setError('Watermark text is required.'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      fd.append('watermark_text', formData.text.trim());
      fd.append('position', formData.position);
      fd.append('font_size', formData.fontSize || '60');
      fd.append('opacity', formData.opacity || '0.3');
      fd.append('rotation', formData.rotation || '45');
      fd.append('color', formData.color || '#888888');
      fd.append('pages', formData.pages || 'all');
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/watermark/apply`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setResult({
          message: j.message || '',
          filename: j.saved_filename || '',
          downloadUrl: '/api/pdf-copyright-protection/watermark/download/' + j.session_id
        });
        setShowForm(false);
        setShowResult(true);
        window.scrollTo(0, 0);
      } else {
        setError(j.error || j.detail || 'Failed to apply watermark');
      }
    } catch (ex) {
      setError('Error: ' + ex.message);
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setError('');
    setShowForm(false);
    setShowResult(false);
    setResult(null);
  };

  const resetAll = () => {
    resetUpload();
    setFormData(prev => ({ ...prev, text: '' }));
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen">
      {/* Back button */}
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">{toolName}</h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{toolDesc}</p>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14">
        
        {/* Upload Area */}
        {!showResult && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 mb-6">
            {!files.length && !loading && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-sky-500 bg-sky-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
              >
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop file here or click to browse</p>
                <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
              </div>
            )}

            {files.length > 0 && !showForm && !loading && (
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-5 h-5 text-sky-500 shrink-0" />
                  <span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span>
                </div>
                <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" title="Remove File">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {error && !showForm && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Config Form (Inside same card for smooth flow) */}
            {showForm && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3 truncate pr-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-xs">{files[0].name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{files[0].size}</span>
                    </div>
                  </div>
                  <button onClick={resetUpload} className="bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-full p-2 transition-all shadow-sm">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-[#1e2a52] mb-5 flex items-center gap-1.5 uppercase tracking-wider">
                  <LayoutTemplate className="w-4 h-4 text-sky-500" /> Configure Watermark
                </h3>

                <form onSubmit={submit} className="space-y-5 bg-sky-50/30 p-5 rounded-2xl border border-sky-100">
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Watermark Text <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500 pointer-events-none" />
                      <input 
                        type="text" name="text" value={formData.text} onChange={handleFormChange} required placeholder="e.g. © 2026 ABC Corporation" 
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Position</label>
                      <div className="relative">
                        <BoxSelect className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select 
                          name="position" value={formData.position} onChange={handleFormChange}
                          className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm appearance-none"
                        >
                          <option value="center">Center</option>
                          <option value="top-left">Top Left</option>
                          <option value="top-center">Top Center</option>
                          <option value="top-right">Top Right</option>
                          <option value="middle-left">Middle Left</option>
                          <option value="middle-right">Middle Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-center">Bottom Center</option>
                          <option value="bottom-right">Bottom Right</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Pages</label>
                      <div className="relative">
                        <Files className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input 
                          type="text" name="pages" value={formData.pages} onChange={handleFormChange} placeholder="all or 1-3,5" 
                          className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size (pt)</label>
                      <div className="relative flex items-center">
                        <Maximize className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input 
                          type="number" name="fontSize" value={formData.fontSize} onChange={handleFormChange} min="8" max="200" 
                          className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-slate-50 text-slate-800 font-bold text-xs" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opacity (0-1)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 pointer-events-none text-[10px] font-bold">O:</span>
                        <input 
                          type="number" name="opacity" value={formData.opacity} onChange={handleFormChange} min="0.05" max="1" step="0.05" 
                          className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-slate-50 text-slate-800 font-bold text-xs" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rotation (°)</label>
                      <div className="relative flex items-center">
                        <RotateCw className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input 
                          type="number" name="rotation" value={formData.rotation} onChange={handleFormChange} min="0" max="360" 
                          className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-slate-50 text-slate-800 font-bold text-xs" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color</label>
                      <div className="relative flex items-center w-full h-[34px] rounded-lg border border-slate-200 bg-slate-50 overflow-hidden pr-2">
                        <Palette className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10 mix-blend-difference opacity-50" />
                        <input 
                          type="color" name="color" value={formData.color} onChange={handleFormChange} 
                          className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer border-0 p-0 m-0" 
                        />
                        <span className="relative z-10 ml-auto text-[10px] font-bold text-slate-600 bg-white/80 px-1 rounded uppercase pointer-events-none mix-blend-luminosity">{formData.color}</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-slate-200/60 flex justify-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-white border border-sky-100 rounded-2xl overflow-hidden relative min-h-[160px] w-full">
                        <div className="speeder-loader-wrapper">
                          <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                          <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Applying Watermark…</p>
                      </div>
                    ) : (
                      <button 
                        type="submit" 
                        className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                      >
                        <Wand2 className="w-4 h-4" /> Apply Watermark
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Result Area */}
        {showResult && result && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col items-center justify-center text-center mb-8">
              <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-5 shadow-inner border border-sky-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1e2a52] mb-3">Watermark Applied!</h2>
              <p className="text-sm font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">{result.message}</p>
            </div>
            
            <div className="bg-sky-50/50 rounded-2xl border border-sky-100/50 p-5 mb-8">
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-sky-500 shrink-0" />
                <span className="font-bold text-slate-700 break-all">{result.filename}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href={`${API_BASE_URL}${result.downloadUrl}`}
                download
                className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3.5 rounded-full font-bold shadow-md shadow-sky-500/20 transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                <DownloadCloud className="w-5 h-5" /> Download PDF
              </a>
              <button 
                onClick={resetAll}
                className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> Process Another
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
