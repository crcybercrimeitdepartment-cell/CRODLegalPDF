import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowLeft, X, AlertCircle, Shield, CheckCircle2, XCircle, AlertTriangle, FileSearch } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function DocumentOwnershipVerificationPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Document Ownership Verification';
  const toolDesc = tool?.description || 'Analyze your PDF for ownership evidence and generate a structured verification result.';

  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';
  const fmtSizeNum = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

  const addFiles = (newFiles) => {
    setError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setError('Only PDF files (.pdf) are accepted.'); return; }
    setFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setResult(null);
    analyze(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); };

  const analyze = async (selectedFile) => {
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/ownership-verification/analyze`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) { setResult(j); }
      else { setError(j.error || 'Analysis failed'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setLoading(false); }
  };

  const resetUpload = () => { setFiles([]); setError(''); setResult(null); };

  const getStatusConfig = (status) => {
    if (!status) return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <Shield className="w-5 h-5" /> };
    const s = status.toLowerCase();
    if (s.includes('found') && !s.includes('incomplete')) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> };
    if (s.includes('incomplete')) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: <AlertTriangle className="w-5 h-5 text-amber-600" /> };
    if (s.includes('conflict')) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: <XCircle className="w-5 h-5 text-red-600" /> };
    return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <Shield className="w-5 h-5" /> };
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">{toolName}</h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{toolDesc}</p>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14 space-y-6">
        {/* Upload Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          {!files.length && !loading && (
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-emerald-400 hover:bg-emerald-50/20'}`}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addFiles(e.target.files)} />
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileSearch className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Auto-analyzes ownership on upload</p>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span>
              </div>
              <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={loading}><X className="w-5 h-5" /></button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/30 border border-emerald-100 rounded-2xl mt-4 min-h-[160px]">
              <div className="speeder-loader-wrapper">
                <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                <div className="longfazers"><span></span><span></span><span></span><span></span></div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Analyzing Document Ownership…</p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
        </div>

        {/* Result Card */}
        {result && !loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h2 className="text-sm font-bold text-[#1e2a52] mb-2 uppercase tracking-wider">Verification Result</h2>

            {/* Status Banner */}
            {(() => { const cfg = getStatusConfig(result.overall_result); return (
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
                {cfg.icon}
                <span className={`font-black text-base ${cfg.text}`}>{result.overall_result}</span>
              </div>
            ); })()}

            {/* Findings */}
            <div>
              <h3 className="text-sm font-bold text-[#1e2a52] mb-4 uppercase tracking-wider pb-3 border-b border-slate-100">Ownership Evidence</h3>
              <div className="space-y-3">
                {(result.findings || []).map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${f.status === 'found' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {f.status === 'found' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-slate-800">{f.category}</span>
                      {f.value ? <span className="text-slate-600 ml-1.5 break-words">{String(f.value).substring(0, 150)}</span>
                        : <em className="text-slate-400 ml-1.5">Not found</em>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conflicts */}
            {result.conflicts && result.conflicts.length > 0 && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl">
                <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" /> Conflicts Detected
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-red-700">
                  {result.conflicts.map((c, i) => (
                    <div key={i} className="flex items-start gap-2"><span className="mt-0.5">•</span><span>{c.message}</span></div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <h3 className="text-sm font-bold text-[#1e2a52] mb-4 uppercase tracking-wider pb-3 border-b border-slate-100">Document Info</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Pages', value: result.total_pages },
                  { label: 'File Size', value: fmtSizeNum(result.file_size) },
                  { label: 'Fields Checked', value: result.metadata_keys_checked }
                ].map((s, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                    <div className="text-xl sm:text-2xl font-black text-[#1e2a52]">{s.value}</div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {result.disclaimer && (
              <div className="text-xs text-slate-500 text-center italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />{result.disclaimer}
              </div>
            )}

            <div className="flex justify-center pt-4 border-t border-slate-100">
              <button onClick={resetUpload} className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95">
                Analyze Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
