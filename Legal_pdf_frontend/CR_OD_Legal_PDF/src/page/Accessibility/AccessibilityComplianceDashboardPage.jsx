import React, { useState, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, TrendingUp, Shield, CheckCircle2, FileText } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

export default function AccessibilityComplianceDashboardPage({ onBack }) {
  var [metrics, setMetrics] = useState(null);
  var [health, setHealth] = useState([]);
  var [fileStatus, setFileStatus] = useState('');
  var [isDragOver, setIsDragOver] = useState(false);
  var [loading, setLoading] = useState(false);
  var fileInputRef = useRef(null);

  var uploadAndAnalyze = useCallback(async function (file) {
    setFileStatus('Uploading ' + file.name + '...');
    setLoading(true);
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/compliance-dashboard', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Analysis failed');
      var data = await res.json();
      if (data.success) {
        setMetrics({
          overall: data.overall_compliance_score || 0,
          pdfUa: data.pdf_ua_compliance_rate || 0,
          wcag: data.wcag_aa_compliance_rate || 0,
          scanned: data.total_documents_scanned || 1,
        });
        setHealth(data.portfolio_health || []);
        setFileStatus('\u2713 Analysis complete: ' + file.name);
      } else {
        setFileStatus('\u2717 Analysis returned no data');
      }
    } catch (err) {
      setFileStatus('\u2717 Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    setIsDragOver(false);
    var f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') uploadAndAnalyze(f);
  }, [uploadAndAnalyze]);

  var handleFileSelect = useCallback(function (e) {
    var f = e.target.files[0];
    if (f) uploadAndAnalyze(f);
  }, [uploadAndAnalyze]);

  function scoreColor(score) {
    if (score >= 90) return '#16a34a';
    if (score >= 80) return '#d97706';
    return '#dc2626';
  }

  function scoreBg(score) {
    if (score >= 90) return '#dcfce7';
    if (score >= 80) return '#fef3c7';
    return '#fee2e2';
  }

  function scoreTextColor(score) {
    if (score >= 90) return '#15803d';
    if (score >= 80) return '#b45309';
    return '#b91c1c';
  }

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      <div className="absolute top-1.5 left-4 sm:top-5 sm:left-8 md:left-12 z-50 flex items-center w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] min-h-[40px]">
        <div className="absolute left-0 z-10">
          {onBack && (
            <button onClick={onBack}
              className="text-slate-700 hover:text-[#1e2a52] font-bold flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center pointer-events-none w-full px-20">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Accessibility Compliance Dashboard</h1>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={function () { setIsDragOver(false); }}
            className={"border-2 border-dashed rounded-2xl py-10 px-8 text-center cursor-pointer transition " + (isDragOver ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50/30')}
          >
            <Upload className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here to view compliance dashboard</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-semibold">Analyzing document compliance...</p>
          </div>
        )}

        {metrics && !loading && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition">
                <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wide">Portfolio Compliance</div>
                <div className="text-3xl font-bold text-slate-800 mt-1">{metrics.overall}%</div>
                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> Current Score
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition">
                <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wide">PDF/UA Passed</div>
                <div className="text-3xl font-bold mt-1" style={{ color: '#0284c7' }}>{metrics.pdfUa}%</div>
                <span className="text-slate-500 text-xs">ISO 14289 Standard</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition">
                <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wide">WCAG 2.1 AA Passed</div>
                <div className="text-3xl font-bold mt-1" style={{ color: '#d97706' }}>{metrics.wcag}%</div>
                <span className="text-slate-500 text-xs">50+ Criteria Scan</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition">
                <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wide">Documents Scanned</div>
                <div className="text-3xl font-bold mt-1" style={{ color: '#059669' }}>{metrics.scanned}</div>
                <span className="text-slate-500 text-xs">Total Portfolio Size</span>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-3">Document Health Breakdown by Category</h3>
            <div className="flex flex-col gap-2.5">
              {health.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No category health data available.</div>
              ) : health.map(function (h, i) {
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50/30 transition">
                    <div className="flex-1 min-w-0">
                      <strong className="text-[15px] text-slate-800 block">{h.category}</strong>
                      <span className="text-xs text-slate-400">{h.passed} Passed | {h.failed} Failed / Issues Detected</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-xl font-extrabold" style={{ color: scoreColor(h.score) }}>{h.score}%</span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: scoreBg(h.score), color: scoreTextColor(h.score) }}>
                        {h.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!metrics && !loading && (
          <div className="text-center py-16 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-slate-600">Upload a PDF to view compliance dashboard</p>
            <p className="text-sm mt-1">Analyze your document for WCAG 2.1 AA and PDF/UA compliance</p>
          </div>
        )}
      </div>
    </div>
  );
}
