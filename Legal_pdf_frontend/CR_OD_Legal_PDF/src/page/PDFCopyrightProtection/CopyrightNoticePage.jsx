import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Stamp, Save, RefreshCw, Type, Eye, LayoutTemplate } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightNoticePage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [resultData, setResultData] = useState(null);
  
  const [formData, setFormData] = useState({
    noticeText: '',
    position: 'bottom',
    fontSize: '12',
    opacity: '1.0',
    pages: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Notice';
  const toolDesc = tool?.description || 'Stamp a copyright notice text directly onto your PDF pages.';
  
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
      setResultData(null);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };
  
  const resetUpload = () => {
    setFiles([]);
    setError('');
    setResultData(null);
  };

  const resetAll = () => {
    resetUpload();
    setFormData(prev => ({ ...prev, noticeText: '' }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!files.length) {
      setError('Please select a PDF file first.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    fd.append('notice_text', formData.noticeText);
    fd.append('position', formData.position);
    fd.append('font_size', formData.fontSize || '12');
    fd.append('opacity', formData.opacity || '1.0');
    fd.append('pages', formData.pages || 'all');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/notice/apply`, { method: 'POST', body: fd });
      const data = await res.json();
      
      if (data.success) {
        setResultData({
          message: data.message || '',
          filename: data.saved_filename || '',
          downloadUrl: `/api/pdf-copyright-protection/notice/download/${data.session_id}`
        });
        window.scrollTo(0, 0);
      } else {
        setError(data.error || data.detail || 'Failed to apply notice');
      }
    } catch (ex) {
      setError('Error: ' + ex.message);
    } finally {
      setLoading(false);
    }
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
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          
          {/* Upload Area */}
          {!resultData && (
            <>
              {!files.length && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-[#1e2a52] bg-[#e8f0e2]' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
                >
                  <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                  <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-[#1e2a52]" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop file here or click to browse</p>
                  <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
                </div>
              )}

              {error && !files.length && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          {/* Form Area */}
          {files.length > 0 && !resultData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-[#1e2a52] flex items-center gap-2">
                  <Stamp className="w-5 h-5" /> Configure Copyright Notice
                </h2>
                <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" title="Remove File">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="text-sm font-bold text-slate-800 truncate">{files[0].name}</div>
                  <div className="text-xs text-slate-500">{files[0].size}</div>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="space-y-1.5 mb-5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Copyright Notice Text <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        name="noticeText"
                        value={formData.noticeText}
                        onChange={handleFormChange}
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-slate-50 text-slate-800 font-bold text-sm" 
                        placeholder="e.g. © 2026 John Doe. All Rights Reserved." 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Position</label>
                      <div className="relative">
                        <LayoutTemplate className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                          name="position"
                          value={formData.position}
                          onChange={handleFormChange}
                          className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm appearance-none"
                        >
                          <option value="bottom">Bottom</option>
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Pages</label>
                      <input 
                        type="text" 
                        name="pages"
                        value={formData.pages}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        placeholder="all or e.g. 1-3,5" 
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Font Size</label>
                      <input 
                        type="number" 
                        name="fontSize"
                        value={formData.fontSize}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        min="6" 
                        max="72" 
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                        <span>Opacity</span>
                        <span className="text-slate-400 normal-case">{formData.opacity}</span>
                      </label>
                      <div className="relative flex items-center h-[46px] px-1">
                        <input 
                          type="range" 
                          name="opacity"
                          value={formData.opacity}
                          onChange={handleFormChange}
                          className="w-full accent-[#1e2a52]" 
                          min="0.1" 
                          max="1.0" 
                          step="0.1" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {error && (
                  <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] w-full">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Applying Notice… Please wait!</p>
                    </div>
                  ) : (
                    <button 
                      type="submit" 
                      className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                    >
                      <Stamp className="w-4 h-4" /> Apply Copyright Notice
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Result Area */}
          {resultData && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">Notice Applied</h2>
                <p className="text-sm font-medium text-slate-600">The copyright notice has been successfully stamped onto the PDF.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-8 shadow-inner">
                <div className="space-y-5 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Status Message
                    </span>
                    <div className="text-slate-800 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">{resultData.message}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Output File
                    </span>
                    <div className="text-slate-800 font-bold break-all">{resultData.filename}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-200/80">
                <a 
                  href={`${API_BASE_URL}${resultData.downloadUrl}`}
                  download
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
                <button 
                  onClick={resetAll} 
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Process Another Document
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
