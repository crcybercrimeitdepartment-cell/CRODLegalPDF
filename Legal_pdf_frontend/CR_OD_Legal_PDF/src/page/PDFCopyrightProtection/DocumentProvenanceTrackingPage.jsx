import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, ArrowLeft, X, AlertCircle, GitCommit, Download, Filter, Clock, Hash, ChevronDown } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function DocumentProvenanceTrackingPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [provData, setProvData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [filterType, setFilterType] = useState('');
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Document Provenance Tracking';
  const toolDesc = tool?.description || 'Track and visualize the complete lifecycle of your PDF document.';

  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

  const addFiles = (newFiles) => {
    setError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setError('Only PDF files (.pdf) are accepted.'); return; }
    setFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setProvData(null); setRawData(null); setAllEvents([]); setFilterType('');
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); };

  const track = async () => {
    if (!files.length) return;
    setLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', files[0].originalFile);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/provenance/track`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Tracking failed');
      setProvData(d.provenance); setRawData(d); setAllEvents(d.provenance?.timeline || []);
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setLoading(false); }
  };

  const generateReport = async () => {
    if (!files.length) return;
    try {
      const fd = new FormData(); fd.append('file', files[0].originalFile);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/provenance/report`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Report failed');
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'provenance-report.json'; a.click(); URL.revokeObjectURL(url);
    } catch (ex) { setError('Error: ' + ex.message); }
  };

  const resetUpload = () => { setFiles([]); setError(''); setProvData(null); setRawData(null); setAllEvents([]); setFilterType(''); };

  const getDotClass = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('creation')) return 'bg-emerald-500';
    if (t.includes('ownership')) return 'bg-blue-500';
    if (t.includes('copyright')) return 'bg-purple-500';
    if (t.includes('verif')) return 'bg-amber-500';
    if (t.includes('modif')) return 'bg-rose-500';
    return 'bg-slate-400';
  };

  const getDotGlow = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('creation')) return 'shadow-[0_0_0_4px_rgba(16,185,129,0.25)]';
    if (t.includes('ownership')) return 'shadow-[0_0_0_4px_rgba(59,130,246,0.25)]';
    if (t.includes('copyright')) return 'shadow-[0_0_0_4px_rgba(168,85,247,0.25)]';
    if (t.includes('verif')) return 'shadow-[0_0_0_4px_rgba(245,158,11,0.25)]';
    if (t.includes('modif')) return 'shadow-[0_0_0_4px_rgba(244,63,94,0.25)]';
    return 'shadow-[0_0_0_4px_rgba(148,163,184,0.25)]';
  };

  const eventTypes = useMemo(() => [...new Set(allEvents.map(e => e.event_type))], [allEvents]);
  const filteredEvents = useMemo(() => filterType ? allEvents.filter(e => e.event_type === filterType) : allEvents, [allEvents, filterType]);

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
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-sky-500 bg-sky-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-sky-400 hover:bg-sky-50/20'}`}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addFiles(e.target.files)} />
              <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitCommit className="w-8 h-8 text-sky-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-sky-50 border border-sky-100 rounded-xl mb-6">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-sky-500 shrink-0" />
                <span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span>
              </div>
              <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={loading}><X className="w-5 h-5" /></button>
            </div>
          )}

          {files.length > 0 && !loading && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={track}
                className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-6 py-3 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 flex-1 sm:flex-none">
                <GitCommit className="w-4 h-4" /> Track Provenance
              </button>
              <button onClick={generateReport}
                className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-6 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 flex-1 sm:flex-none">
                <Download className="w-4 h-4" /> Download Report
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-6 bg-sky-50/30 border border-sky-100 rounded-2xl mt-4 min-h-[160px]">
              <div className="speeder-loader-wrapper">
                <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                <div className="longfazers"><span></span><span></span><span></span><span></span></div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Tracking Provenance…</p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
        </div>

        {/* Filter */}
        {provData && eventTypes.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-bold text-[#1e2a52] mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-sky-500" /> Filter Timeline
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1e2a52] bg-white text-slate-800 font-medium text-sm appearance-none">
                  <option value="">All Event Types</option>
                  {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {filterType && (
                <button onClick={() => setFilterType('')}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-5 py-3 rounded-full font-bold text-sm transition-all cursor-pointer">
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Timeline Result */}
        {provData && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h2 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" /> Provenance Timeline
            </h2>

            {/* Doc Info */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-sm">
              {[
                { label: 'Title', value: provData.document_info?.title || 'Not Available' },
                { label: 'Author', value: provData.document_info?.author || 'Not Available' },
                { label: 'Total Events', value: provData.total_events || 0, bold: true },
              ].map((r, i) => (
                <div key={i} className={`flex items-start justify-between gap-4 ${i < 2 ? 'pb-3 border-b border-slate-200' : ''}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{r.label}</span>
                  <span className={`text-right text-slate-800 ${r.bold ? 'font-black text-sky-600 text-base' : 'font-medium'}`}>{r.value}</span>
                </div>
              ))}
              {provData.document_info?.document_hash && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2"><Hash className="w-3 h-3" /> Document Hash</span>
                  <div className="font-mono text-xs text-slate-600 break-all bg-white px-3 py-2 rounded-lg border border-slate-200">{provData.document_info.document_hash}</div>
                </div>
              )}
            </div>

            {/* Events */}
            {!filteredEvents.length ? (
              <div className="text-center text-slate-400 p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm font-medium">
                No provenance events found for selected filter.
              </div>
            ) : (
              <div className="relative border-l-2 border-sky-100 ml-4 pl-6 space-y-6">
                {filteredEvents.map((t, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[31px] top-2 w-4 h-4 rounded-full ${getDotClass(t.event_type)} ${getDotGlow(t.event_type)}`} />
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                        <h4 className="font-black text-slate-900 text-sm">{t.event_type}</h4>
                        <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit">
                          {t.timestamp} — {t.source}
                        </div>
                      </div>
                      <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rawData?.disclaimer && (
              <div className="text-xs text-slate-500 text-center italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                {rawData.disclaimer}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-100">
              <button onClick={generateReport}
                className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                <Download className="w-4 h-4" /> Download JSON Report
              </button>
              <button onClick={resetUpload}
                className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95 w-full sm:w-auto">
                Analyze Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
