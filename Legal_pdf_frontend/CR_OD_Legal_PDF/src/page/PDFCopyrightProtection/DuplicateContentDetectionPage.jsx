import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowLeft, X, AlertCircle, Copy, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function DuplicateContentDetectionPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Duplicate Content Detection';
  const toolDesc = tool?.description || 'Detect duplicate or highly similar content within your PDF document — across pages and within the same page.';

  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

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
    setLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', selectedFile);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/duplicate-detection/analyze`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) { setResult(j); }
      else { setError(j.error || 'Analysis failed'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setLoading(false); }
  };

  const resetUpload = () => { setFiles([]); setError(''); setResult(null); };

  const getStatusConfig = (status) => {
    if (!status) return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <Copy className="w-5 h-5" /> };
    const s = status.toLowerCase();
    if (s.includes('no duplicate') || s.includes('clean')) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> };
    if (s.includes('some')) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: <AlertTriangle className="w-5 h-5 text-amber-600" /> };
    if (s.includes('significant')) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: <XCircle className="w-5 h-5 text-red-600" /> };
    return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <Copy className="w-5 h-5" /> };
  };

  const getFindingBadge = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('exact')) return 'bg-red-100 text-red-700 border-red-200';
    if (t.includes('similar')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
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
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-yellow-500 bg-yellow-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-yellow-400 hover:bg-yellow-50/20'}`}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addFiles(e.target.files)} />
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Copy className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Auto-analyzes duplicates on upload</p>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-yellow-600 shrink-0" />
                <span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span>
              </div>
              <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={loading}><X className="w-5 h-5" /></button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-6 bg-yellow-50/30 border border-yellow-100 rounded-2xl mt-4 min-h-[160px]">
              <div className="speeder-loader-wrapper">
                <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                <div className="longfazers"><span></span><span></span><span></span><span></span></div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Analyzing Duplicate Content…</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Comparing paragraphs, hashes, and page blocks</p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
        </div>

        {/* Result */}
        {result && !loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h2 className="text-sm font-bold text-[#1e2a52] mb-2 uppercase tracking-wider">Analysis Result</h2>

            {/* Status */}
            {(() => { const cfg = getStatusConfig(result.summary); return (
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
                {cfg.icon}
                <span className={`font-black text-base ${cfg.text}`}>{result.summary}</span>
              </div>
            ); })()}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Paragraphs', value: result.total_paragraphs || 0, color: 'text-[#1e2a52]' },
                { label: 'Exact Duplicates', value: result.total_duplicates || 0, color: 'text-red-600' },
                { label: 'Similar Blocks', value: result.total_similar || 0, color: 'text-amber-600' }
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <div className={`text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Findings */}
            <div>
              <h3 className="text-sm font-bold text-[#1e2a52] mb-4 uppercase tracking-wider pb-3 border-b border-slate-100">Findings</h3>
              {!result.total_findings || result.total_findings === 0 || !(result.findings && result.findings.length) ? (
                <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-emerald-800 font-bold text-sm">No significant duplicate content detected.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.findings.map((f, i) => (
                    <div key={i} className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${getFindingBadge(f.type)}`}>
                          {(f.type || '').replace(/_/g, ' ')}
                        </span>
                        {f.similarity && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {f.similarity}% Similar
                          </span>
                        )}
                      </div>
                      <p className="text-slate-800 font-medium text-sm mb-3">{f.message}</p>
                      {f.text_preview && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                          <span className="text-slate-400 text-lg leading-none mr-1">"</span>
                          {f.text_preview.substring(0, 150)}…
                          <span className="text-slate-400 text-lg leading-none ml-1">"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center pt-4 border-t border-slate-100">
              <button onClick={resetUpload}
                className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95">
                Analyze Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
