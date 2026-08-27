import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Download, Search, Sparkles, ChevronLeft, ChevronRight, MousePointer } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

const steps = [
  'Upload PDF document',
  'Select Color Contrast Tool',
  'Start contrast analysis',
  'Review validation report',
  'Apply color improvements',
  'Save updated accessible PDF',
];

export default function ColorContrastValidationPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [dragOver, setDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);

  var [wcagLevel, setWcagLevel] = useState('AA');
  var [scanning, setScanning] = useState(false);
  var [scanComplete, setScanComplete] = useState(false);

  var [score, setScore] = useState(null);
  var [wcagStatus, setWcagStatus] = useState('');
  var [elementsSummary, setElementsSummary] = useState('');
  var [elementsList, setElementsList] = useState([]);

  var [applyingFixes, setApplyingFixes] = useState(false);
  var [fixesApplied, setFixesApplied] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var pdfDocRef = useRef(null);

  var currentStep = !documentId ? 1 : !scanComplete ? 3 : !fixesApplied ? 5 : 6;

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Loading ' + file.name + '...');
    try {
      var buffer = await file.arrayBuffer();
      loadCanvasFromBuffer(buffer);
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var data = await res.json();
      if (res.ok) {
        setDocumentId(data.document_id);
        setTotalPages(data.page_count || 1);
        setCurrentPage(1);
        setFileStatus('\u2713 Loaded: ' + data.filename + ' (' + (data.page_count || 1) + ' pages)');
        runContrastScan();
      } else {
        setFileStatus('\u2717 Upload error: ' + (data.error || 'Failed'));
      }
    } catch (err) {
      setFileStatus('\u2717 Upload error: ' + err.message);
    }
  }, []);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    setDragOver(false);
    var file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') uploadPdf(file);
  }, [uploadPdf]);

  var handleDragOver = useCallback(function (e) { e.preventDefault(); setDragOver(true); }, []);
  var handleDragLeave = useCallback(function () { setDragOver(false); }, []);

  var handleFileSelect = useCallback(function (e) {
    var file = e.target.files[0];
    if (file) uploadPdf(file);
  }, [uploadPdf]);

  var loadCanvasFromBuffer = useCallback(function (buffer) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    window.pdfjsLib.getDocument({ data: buffer }).promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPage(pdf, 1);
    }).catch(function (e) { console.error('PDF load error:', e); });
  }, []);

  var loadCanvasFromUrl = useCallback(function (url) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    window.pdfjsLib.getDocument(url).promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPage(pdf, 1);
    }).catch(function (e) { console.error('PDF load error:', e); });
  }, []);

  var renderPage = useCallback(function (pdf, num) {
    if (!pdf) return;
    pdf.getPage(num).then(function (page) {
      var vp = page.getViewport({ scale: 1.2 });
      var c = canvasRef.current;
      if (!c) return;
      var ctx = c.getContext('2d');
      c.width = vp.width;
      c.height = vp.height;
      page.render({ canvasContext: ctx, viewport: vp });
    });
  }, []);

  var prevPage = useCallback(function () {
    if (currentPage > 1 && pdfDocRef.current) {
      var p = currentPage - 1;
      setCurrentPage(p);
      renderPage(pdfDocRef.current, p);
    }
  }, [currentPage, renderPage]);

  var nextPage = useCallback(function () {
    if (currentPage < totalPages && pdfDocRef.current) {
      var p = currentPage + 1;
      setCurrentPage(p);
      renderPage(pdfDocRef.current, p);
    }
  }, [currentPage, totalPages, renderPage]);

  var runContrastScan = useCallback(async function () {
    if (!documentId) return;
    setScanning(true);
    try {
      var res = await fetch(API_BASE + '/color-contrast/' + documentId + '/scan', { method: 'POST' });
      if (!res.ok) throw new Error('Analysis failed');
      var report = await res.json();

      setScore(report.compliance_score);
      setWcagStatus(report.wcag_status);
      setElementsSummary(report.total_text_elements + ' Text Spans (' + report.failing_elements_count + ' Failing, ' + report.passing_elements_count + ' Passing)');
      setElementsList(report.elements_list || []);
      setScanComplete(true);
    } catch (err) {
      alert('Scan error: ' + err.message);
    } finally {
      setScanning(false);
    }
  }, [documentId]);

  var applyFixes = useCallback(async function () {
    if (!documentId) return;
    setApplyingFixes(true);
    try {
      var payload = { auto_fix_all: true, target_level: wcagLevel, custom_fg_hex: '#000000' };
      var res = await fetch(API_BASE + '/color-contrast/' + documentId + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Fix application failed');
      var data = await res.json();

      setFixesApplied(true);
      setDownloadUrl(data.download_url || '');
      setScore(data.improved_score);
      setWcagStatus('Pass (' + data.audit_report.wcag_status + ')');
      setElementsSummary(data.fixed_elements_count + ' Contrast Issues Fixed!');
      setElementsList([]);

      if (data.preview_page_url) loadCanvasFromUrl(data.preview_page_url + '?t=' + Date.now());
    } catch (err) {
      alert('Improvement error: ' + err.message);
    } finally {
      setApplyingFixes(false);
    }
  }, [documentId, wcagLevel, loadCanvasFromUrl]);

  var getScoreClass = function (s) {
    if (s === null) return '';
    return s >= 85 ? 'text-emerald-600 border-emerald-500' : s >= 60 ? 'text-amber-600 border-amber-500' : 'text-red-600 border-red-500';
  };

  var getStatusClass = function (s) {
    if (s === null) return 'border-slate-200 bg-white';
    return s >= 85 ? 'border-emerald-500 bg-emerald-50' : s >= 60 ? 'border-amber-500 bg-amber-50' : 'border-red-500 bg-red-50';
  };

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      {/* Header Area */}
      <div className="absolute top-1.5 left-4 sm:top-5 sm:left-8 md:left-12 z-50 flex items-center w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] min-h-[40px]">
        {/* Back Button */}
        <div className="absolute left-0 z-10">
          {onBack && (
            <button onClick={onBack}
              className="text-slate-700 hover:text-[#1e2a52] font-bold flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
        </div>
        
        {/* Centered Title */}
        <div className="flex-1 flex flex-col items-center justify-center text-center pointer-events-none w-full px-20">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">{"\uD83D\uDF08"} Color Contrast Studio</h1>
                  </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20">
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-3.5 h-3.5"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> 1. Open PDF Document
              </div>
              <div
                onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload w-8 h-8 text-slate-400 mx-auto mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                <div className="font-bold text-sm text-[#4f46e5]">Click or Drag PDF File</div>
                <div className="text-[11px] mt-1 text-[#6366f1]">Upload Document</div>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              {fileStatus && <div className="text-xs font-semibold min-h-[16px]" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : '#ef4444' }}>{fileStatus}</div>}
            </section>

            <section className="flex flex-col gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> 2. Target WCAG Standard & Scan
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">WCAG Contrast Level</label>
                <select
                  value={wcagLevel}
                  onChange={function (e) { setWcagLevel(e.target.value); }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="AA">WCAG 2.1 Level AA (4.5:1 Normal, 3.0:1 Large)</option>
                  <option value="AAA">WCAG 2.1 Level AAA (7.0:1 Enhanced Visibility)</option>
                </select>
              </div>
              <button
                onClick={runContrastScan}
                disabled={!documentId || scanning}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: scanning ? '#94a3b8' : '#4f46e5' }}
              >
                <Search className="w-4 h-4" /> {scanning ? 'Analyzing Contrast...' : 'Start Color Contrast Analysis'}
              </button>
            </section>

            {scanComplete && (
              <div className="flex items-start gap-4 p-4 rounded-xl transition-all" style={{ borderColor: score >= 85 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444', backgroundColor: score >= 85 ? '#f0fdf4' : score >= 60 ? '#fffbeb' : '#fef2f2' }}>
                <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid', borderColor: getScoreClass(score) }}>
                  <span className="text-2xl font-bold" style={{ color: getScoreClass(score) }}>{score}%</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: getScoreClass(score) }}>Score</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-bold text-sm text-slate-800">WCAG Status: {wcagStatus}</div>
                  <div className="text-[11px] mt-1 text-slate-600">{elementsSummary}</div>
                </div>
              </div>
            )}

            <section className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="text-base" role="img" aria-label="list">{"\uD83D\uDCCB"}</span> 4. Validation Report & Elements
              </div>
              <div className="flex-1 overflow-y-auto min-h-[140px] max-h-[220px] pr-1" style={{ flex: 1 }}>
                {elementsList.length === 0 && !scanComplete ? (
                  <div className="text-[11px] text-slate-400 text-center py-5">Upload a PDF and click \'Start Analysis\' to inspect contrast ratios.</div>
                ) : elementsList.length === 0 && scanComplete ? (
                  <div className="text-center text-emerald-700 font-bold text-sm py-4 bg-emerald-50 rounded-lg">\u2713 Excellent! All text elements meet WCAG 2.1 contrast guidelines.</div>
                ) : (
                  elementsList.map(function (item, i) {
                    var isFail = item.wcag_status === 'Fail';
                    return (
                      <div
                        key={i}
                        onClick={function () { setCurrentPage(item.page_number); }}
                        className="bg-white border rounded-xl p-4 mb-3 cursor-pointer transition-all hover:shadow-md"
                        style={{ borderColor: isFail ? '#fecaca' : '#bbf7d0', backgroundColor: isFail ? '#fef2f2' : '#f0fdf4' }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-[12px] text-slate-900 truncate max-w-[160px] block">"{item.text_snippet}"</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#4338ca', color: '#ffffff' }}>Page {item.page_number}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: isFail ? '#fee2e2' : '#dcfce7', color: isFail ? '#991b1b' : '#166534' }}>
                              {item.contrast_ratio}:1 ({item.wcag_status})
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>Colors: <strong style={{ color: item.fg_color_hex }}>{item.fg_color_hex}</strong> on <strong>{item.bg_color_hex}</strong></span>
                          <span className="text-indigo-600 font-bold flex items-center gap-1"><MousePointer className="w-3 h-3" /> View Page</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <button
                onClick={applyFixes}
                disabled={!scanComplete || applyingFixes || fixesApplied}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: applyingFixes ? '#94a3b8' : fixesApplied ? '#10b981' : '#22c55e' }}
              >
                <Sparkles className="w-4 h-4" /> {applyingFixes ? 'Applying Color Contrast Fixes...' : fixesApplied ? '\u2713 Color Improvements Applied!' : 'Apply Suggested Color Improvements'}
              </button>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: '#059669' }}
                >
                  <Download className="w-4 h-4" /> Save & Download Compliant PDF
                </a>
              )}
            </section>

            <section className="flex flex-col gap-3 pt-1 border-t border-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="text-base" role="img" aria-label="steps">{"\uD83D\uDCCA"}</span> User Workflow Progress
              </div>
              <div className="grid grid-cols-1 gap-2">
                {steps.map(function (step, i) {
                  var isActive = currentStep === i + 1;
                  var isDone = currentStep > i + 1;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg px-2.5 py-2 border transition-all"
                      style={{
                        backgroundColor: isActive ? '#eef2ff' : isDone ? '#f0fdf4' : '#ffffff',
                        borderColor: isActive ? '#c7d2fe' : isDone ? '#bbf7d0' : '#e2e8f0',
                      }}
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold border-2 transition-all shrink-0"
                        style={{
                          backgroundColor: isDone ? '#22c55e' : isActive ? '#4f46e5' : '#f1f5f9',
                          color: isDone || isActive ? '#ffffff' : '#94a3b8',
                          borderColor: isDone ? '#22c55e' : isActive ? '#4f46e5' : '#e2e8f0',
                        }}
                      >{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-700 leading-tight">{step}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isDone ? 'Completed' : isActive ? 'Current step' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <span className="text-base" role="img" aria-label="view">{"\uD83D\uDC41"}</span> PDF Visual Viewer
              <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-slate-800 text-white">Page {currentPage} of {totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={prevPage} disabled={currentPage <= 1} className="px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40 bg-slate-800 text-white">
                <ChevronLeft className="w-4 h-4 inline mr-1" /> Prev
              </button>
              <button onClick={nextPage} disabled={currentPage >= totalPages} className="px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40 bg-slate-800 text-white">
                Next <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-5">
            <canvas ref={canvasRef} className="max-w-full block border border-slate-200 rounded-lg shadow-xl" />
            {!documentId && (
              <div className="absolute text-center text-slate-500 text-sm py-20">
                Upload a PDF to analyze color contrast.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
