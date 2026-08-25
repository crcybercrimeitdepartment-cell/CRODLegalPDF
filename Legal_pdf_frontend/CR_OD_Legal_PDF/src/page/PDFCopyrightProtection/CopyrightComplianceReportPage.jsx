import React, { useState, useRef } from 'react';
import { ArrowLeft, FileText, X, AlertCircle, Plus, Download, RefreshCw, CheckCircle2, XCircle, AlertTriangle, BarChart3, ClipboardList, Lightbulb } from 'lucide-react';

// ─── Inline API helpers ───────────────────────────────────────────────────────
const analyzeCompliance = async (base64Data, fileName, fileSize) => {
  const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/compliance/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_data: base64Data, file_name: fileName, file_size: fileSize }),
  });
  const j = await r.json();
  return { success: j.success, data: j, message: j.error || '' };
};

const exportComplianceReport = async (analysisId) => {
  const r = await fetch(`/api/pdf-copyright-protection/compliance/export/${analysisId}`);
  if (!r.ok) throw new Error('Export failed');
  const blob = await r.blob();
  const cd = r.headers.get('content-disposition') || '';
  const filename = cd.match(/filename="?([^"]+)"?/)?.[1] || `compliance_report_${analysisId}.pdf`;
  return { blob, filename };
};

const getComplianceReport = async (analysisId) => {
  const r = await fetch(`/api/pdf-copyright-protection/compliance/report/${analysisId}`);
  return r.json();
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const r = 44, c = 2 * Math.PI * r, dash = (score / 100) * c;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-[#1e2a52]">{score}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightComplianceReportPage({ tool, onBack }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const fileInputRef = useRef(null);

  const toolName = tool?.name || 'Copyright Compliance Report';
  const toolDesc = tool?.description || 'Analyze PDF documents for copyright compliance and generate structured compliance reports.';
  const fmtSize = (bytes) => bytes < 1048576 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1048576).toFixed(2) + ' MB';

  const addFiles = (newFiles) => {
    setError('');
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) { setError('Only PDF files (.pdf) are accepted.'); return; }
    setSelectedFiles(prev => [...prev, ...pdfs]);
    setAnalysisResult(null);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); };
  const handleRemove = (idx) => { setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); setAnalysisResult(null); setError(''); };
  const resetAll = () => { setSelectedFiles([]); setAnalysisResult(null); setError(''); setFilterStatus('all'); };

  const handleAnalyze = async () => {
    if (!selectedFiles.length) { setError('Please select a PDF document first.'); return; }
    setIsAnalyzing(true); setError(''); setAnalysisResult(null); setFilterStatus('all');
    try {
      const file = selectedFiles[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64Data = ev.target.result.split(',')[1];
          const result = await analyzeCompliance(base64Data, file.name, file.size);
          if (result.success) { setAnalysisResult(result.data); }
          else { setError(result.message || 'Compliance analysis failed. Please try again.'); }
        } catch (err) { setError('Analysis error: ' + err.message); }
        finally { setIsAnalyzing(false); }
      };
      reader.onerror = () => { setError('Failed to read the file. Please try again.'); setIsAnalyzing(false); };
      reader.readAsDataURL(file);
    } catch (err) { setError('Error: ' + err.message); setIsAnalyzing(false); }
  };

  const handleExport = async () => {
    if (!analysisResult?.analysis_id) return;
    setIsExporting(true); setError('');
    try {
      const { blob, filename } = await exportComplianceReport(analysisResult.analysis_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { setError('Export failed: ' + err.message); }
    finally { setIsExporting(false); }
  };

  const handleRefresh = async () => {
    if (!analysisResult?.analysis_id) return;
    try { await getComplianceReport(analysisResult.analysis_id); }
    catch (err) { setError('Refresh failed: ' + err.message); }
  };

  // Helpers
  const statusCfg = (status) => {
    const m = {
      'Fully Compliant':            { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
      'Minor Non-Compliance':       { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    dot: 'bg-blue-500' },
      'Moderate Non-Compliance':    { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   dot: 'bg-amber-500' },
      'Major Non-Compliance':       { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-800',  dot: 'bg-orange-500' },
      'Critical Compliance Failure':{ bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     dot: 'bg-red-500' },
    };
    return m[status] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', dot: 'bg-slate-400' };
  };

  const findingBadge = (status) => {
    const m = {
      PASS: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      WARNING: 'bg-amber-100 text-amber-800 border-amber-200',
      FAIL: 'bg-red-100 text-red-800 border-red-200',
      NOT_AVAILABLE: 'bg-slate-100 text-slate-600 border-slate-200',
      NOT_VERIFIED: 'bg-blue-100 text-blue-800 border-blue-200',
      NOT_CONFIGURED: 'bg-purple-100 text-purple-800 border-purple-200',
      INSUFFICIENT_DATA: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return m[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const severityBadge = (sev) => {
    const m = { INFO: 'bg-blue-100 text-blue-700', LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-amber-100 text-amber-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };
    return m[sev] || 'bg-slate-100 text-slate-600';
  };

  const priorityBar = (p) => {
    const m = { INFO: 'border-l-blue-400 bg-blue-50/50', LOW: 'border-l-slate-400 bg-slate-50', MEDIUM: 'border-l-amber-500 bg-amber-50/50', HIGH: 'border-l-orange-500 bg-orange-50/50', CRITICAL: 'border-l-red-500 bg-red-50/50' };
    return m[p] || 'border-l-slate-400 bg-slate-50';
  };

  const summary = analysisResult?.summary;
  const findings = analysisResult?.findings || [];
  const recommendations = analysisResult?.recommendations || [];
  const filteredFindings = filterStatus === 'all' ? findings : findings.filter(f => f.status === filterStatus);
  const statusCounts = findings.reduce((acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {});

  return (
    <div className="flex-1 flex flex-col w-full bg-[#f2f6ee] relative z-20 min-h-screen">

      {/* Back */}
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">{toolName}</h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{toolDesc}</p>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14 space-y-6">

        {/* ── Upload Card ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">

          {/* Drop zone — only when no files */}
          {!selectedFiles.length && !isAnalyzing && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-emerald-400 hover:bg-emerald-50/20'}`}>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple onChange={(e) => e.target.files?.length && addFiles(e.target.files)} className="hidden" />
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
            </div>
          )}

          {/* Files list */}
          {selectedFiles.length > 0 && !isAnalyzing && !analysisResult && (
            <div className="space-y-3">
              {selectedFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700 text-sm truncate">{file.name} <span className="text-slate-400 font-normal ml-1">({fmtSize(file.size)})</span></span>
                  </div>
                  <button onClick={() => handleRemove(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1.5"><X className="w-5 h-5" /></button>
                </div>
              ))}

              {/* Add more button */}
              <button onClick={() => { fileInputRef.current?.click(); }}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-600 font-bold text-xs hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Another PDF
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple onChange={(e) => e.target.files?.length && addFiles(e.target.files)} className="hidden" />
            </div>
          )}

          {/* Loader */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/30 border border-emerald-100 rounded-2xl min-h-[180px]">
              <div className="speeder-loader-wrapper">
                <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                <div className="longfazers"><span></span><span></span><span></span><span></span></div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Analyzing Compliance…</p>
            </div>
          )}

          {/* Result summary file row */}
          {analysisResult && !isAnalyzing && selectedFiles.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-700 text-sm truncate">{selectedFiles[0].name} <span className="text-slate-400 font-normal ml-1">({fmtSize(selectedFiles[0].size)})</span></span>
              </div>
              <button onClick={resetAll} className="text-slate-400 hover:text-red-500 transition-colors p-1.5"><X className="w-5 h-5" /></button>
            </div>
          )}

          {/* Inline Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          {/* Centered Analyze button */}
          {selectedFiles.length > 0 && !isAnalyzing && !analysisResult && (
            <div className="flex justify-center mt-6 pt-6 border-t border-slate-100">
              <button onClick={handleAnalyze}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-emerald-500/20 transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center">
                <ClipboardList className="w-4 h-4" /> Analyze Compliance
              </button>
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {analysisResult && !isAnalyzing && (
          <>
            {/* Stat Cards */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {[
                  { label: 'Total Checks',  value: summary.total_checks,  textColor: 'text-[#1e2a52]',  bg: 'bg-white',      border: 'border-slate-200' },
                  { label: 'Passed',        value: summary.passed_checks, textColor: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Warnings',      value: summary.warnings,      textColor: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
                  { label: 'Violations',    value: summary.violations,    textColor: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} border ${s.border} rounded-3xl p-5 text-center shadow-[0_4px_16px_rgba(0,0,0,0.03)]`}>
                    <div className={`text-3xl font-black ${s.textColor} mb-1`}>{s.value}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Score + Status */}
            {summary && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" /> Compliance Score & Status
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <ScoreRing score={summary.score} />
                  <div className="flex-1 w-full space-y-4">
                    {(() => { const cfg = statusCfg(summary.status); return (
                      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
                        <div className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0`} />
                        <span className={`font-black text-sm ${cfg.text}`}>{summary.status}</span>
                      </div>
                    ); })()}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-3 rounded-full transition-all duration-700 ${summary.score >= 75 ? 'bg-emerald-500' : summary.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${summary.score}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold"><span>0</span><span>50</span><span>100</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Findings */}
            {findings.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-500" /> Detailed Findings
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterStatus('all')}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${filterStatus === 'all' ? 'bg-[#1e2a52] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      All ({findings.length})
                    </button>
                    {Object.entries(statusCounts).map(([s, c]) => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${filterStatus === s ? 'bg-[#1e2a52] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {s.replace(/_/g, ' ')} ({c})
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredFindings.map((f, i) => (
                    <div key={i} className={`border rounded-2xl p-4 ${findingBadge(f.status)}`}>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-black text-sm">{f.check_name}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${severityBadge(f.severity)}`}>{f.severity}</span>
                      </div>
                      <p className="text-sm font-semibold mb-1">{f.message}</p>
                      <p className="text-xs opacity-75 leading-relaxed">{f.details}</p>
                      {f.recommendation && <p className="text-xs mt-2 italic opacity-75">💡 {f.recommendation}</p>}
                    </div>
                  ))}
                  {!filteredFindings.length && <div className="text-center text-slate-400 py-8 text-sm font-medium">No findings match the selected filter.</div>}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-slate-100">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> Recommendations
                </h2>
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className={`border-l-4 rounded-r-2xl p-4 ${priorityBar(rec.priority)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-black text-sm text-slate-900 mb-1">{rec.title}</h3>
                          <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          rec.priority === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                          rec.priority === 'HIGH'     ? 'bg-orange-200 text-orange-800' :
                          rec.priority === 'MEDIUM'   ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>{rec.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export / Refresh */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xs font-bold text-slate-400 mb-5 uppercase tracking-wider pb-4 border-b border-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4" /> Report Actions
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={handleRefresh}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-100 text-slate-700 rounded-full font-bold text-sm hover:bg-slate-200 transition-all cursor-pointer hover:scale-105 active:scale-95 w-full sm:w-auto">
                  <RefreshCw className="w-4 h-4" /> Refresh Report
                </button>
                <button onClick={handleExport} disabled={isExporting}
                  className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm transition-all shadow-md w-full sm:w-auto ${isExporting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#1e2a52] hover:bg-[#16203e] text-white cursor-pointer hover:scale-105 active:scale-95'}`}>
                  {isExporting
                    ? <><div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4" /> Export PDF Report</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}