import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import {  ArrowLeft, CloudUpload, Download, Wand2, ChevronLeft, ChevronRight, Search , SlidersHorizontal } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Open PDF',
  'Select Checker Tool',
  'Start Scan',
  'Review Issues',
  'Apply Improvements',
  'Save / Download',
];

export default function AccessibilityCheckerPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [dragOver, setDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);

  var [scanning, setScanning] = useState(false);
  var [scanComplete, setScanComplete] = useState(false);
  var [complianceScore, setComplianceScore] = useState(0);
  var [wcagStatus, setWcagStatus] = useState('');
  var [issuesSummary, setIssuesSummary] = useState('');
  var [issuesList, setIssuesList] = useState([]);

  var [applying, setApplying] = useState(false);
  var [applied, setApplied] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var pdfDocRef = useRef(null);

  var currentStep = !documentId ? 1 : !scanComplete ? 3 : !applied ? 4 : 6;

  var scoreColor = complianceScore >= 85 ? '#10b981' : complianceScore >= 60 ? '#f59e0b' : '#ef4444';

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
    if (file && file.type === 'application/pdf') {
      uploadPdf(file);
    } else {
      alert('Please upload a PDF file.');
    }
  }, [uploadPdf]);

  var handleDragOver = useCallback(function (e) {
    e.preventDefault();
    setDragOver(true);
  }, []);

  var handleDragLeave = useCallback(function () {
    setDragOver(false);
  }, []);

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
    }).catch(function (e) {
      console.error('PDF load error:', e);
    });
  }, []);

  var loadCanvasFromUrl = useCallback(function (url) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    window.pdfjsLib.getDocument(url).promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPage(pdf, 1);
    }).catch(function (e) {
      console.error('PDF load error:', e);
    });
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

  var runScan = useCallback(async function () {
    if (!documentId) return;
    setScanning(true);
    try {
      var res = await fetch(API_BASE + '/checker/' + documentId + '/scan', { method: 'POST' });
      if (!res.ok) throw new Error('Scan failed');
      var data = await res.json();
      var scan = data.scan;
      setScanComplete(true);
      setComplianceScore(scan.compliance_score || 0);
      setWcagStatus('WCAG Status: ' + (scan.wcag_21_aa_status || 'Unknown'));
      setIssuesSummary((scan.total_issues_count || 0) + ' Issues Found (' + (scan.critical_errors_count || 0) + ' Errors, ' + (scan.warnings_count || 0) + ' Warnings)');
      setIssuesList(scan.issues_list || []);
    } catch (err) {
      alert('Scan error: ' + err.message);
    } finally {
      setScanning(false);
    }
  }, [documentId]);

  useEffect(function () {
    if (documentId && !scanComplete) {
      runScan();
    }
  }, [documentId, scanComplete, runScan]);

  var handleIssueClick = useCallback(function (issue) {
    var pageNum = issue.page_number || 1;
    setCurrentPage(pageNum);
    if (pdfDocRef.current) renderPage(pdfDocRef.current, pageNum);
  }, [renderPage]);

  var applyFixes = useCallback(async function () {
    if (!documentId) return;
    setApplying(true);
    try {
      var payload = {
        auto_fix_all: true,
        document_language: 'en-US',
        default_alt_text: 'Decorative graphic illustration',
      };
      var res = await fetch(API_BASE + '/checker/' + documentId + '/apply-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Fixes failed');
      var data = await res.json();
      setApplied(true);
      setComplianceScore(data.improved_score || 0);
      setDownloadUrl(data.download_url || '');
      if (data.preview_page_url) {
        loadCanvasFromUrl(data.preview_page_url + '?t=' + Date.now());
      }
      var scanRes = await fetch(API_BASE + '/checker/' + documentId + '/scan', { method: 'POST' });
      if (scanRes.ok) {
        var scanData = await scanRes.json();
        setIssuesList(scanData.scan.issues_list || []);
        setIssuesSummary((scanData.scan.total_issues_count || 0) + ' Issues Found (' + (scanData.scan.critical_errors_count || 0) + ' Errors, ' + (scanData.scan.warnings_count || 0) + ' Warnings)');
      }
    } catch (err) {
      alert('Fix application error: ' + err.message);
    } finally {
      setApplying(false);
    }
  }, [documentId, loadCanvasFromUrl]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Accessibility Checker</h1>
                  </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Open PDF Document
            </div>
            <div
              onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ' +
                (dragOver
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-300 hover:border-sky-400 hover:bg-sky-50/50')
              }
            >
              <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm" style={{ color: '#0369a1' }}>
                Click or Drag PDF File
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#0284c7' }}>
                Automated WCAG &amp; PDF/UA Audit Engine
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            {fileStatus && (
              <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : fileStatus.indexOf('\u2717') >= 0 ? '#ef4444' : '#2563eb' }}>
                {fileStatus}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Accessibility Scan Status
            </div>
            <button
              onClick={runScan}
              disabled={!documentId || scanning}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: scanComplete ? '#10b981' : '#2563eb' }}
            >
              <Search className="w-4 h-4" />
              {scanning ? 'Scanning Document...' : scanComplete ? 'Scan Complete' : 'Run Automated Scan'}
            </button>

            {scanComplete && (
              <div className="rounded-xl p-4 text-white flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}>
                <div className="flex flex-col gap-0.5">
                  <div className="text-[11px] text-slate-300 font-bold uppercase">Compliance Score</div>
                  <div className="text-[15px] font-extrabold text-white">{wcagStatus}</div>
                  <div className="text-[11px] font-bold" style={{ color: '#38bdf8' }}>{issuesSummary}</div>
                </div>
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0 text-xl font-extrabold"
                  style={{ border: '4px solid ' + scoreColor, color: scoreColor }}
                >
                  {complianceScore}%
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              4. Detected Issues Review
            </div>
            <div className="max-h-[240px] overflow-y-auto flex flex-col gap-2">
              {issuesList.length === 0 ? (
                <div className="text-[12px] text-slate-500 text-center py-5">
                  {scanComplete ? 'No accessibility violations detected.' : 'Upload a PDF and run scan to detect issues.'}
                </div>
              ) : (
                issuesList.map(function (issue, i) {
                  var isError = issue.severity === 'Error';
                  return (
                    <div
                      key={i}
                      onClick={function () { handleIssueClick(issue); }}
                      className="border border-slate-200 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all"
                      title={'Click to jump to Page ' + (issue.page_number || 1)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[13px] text-slate-900 truncate">{issue.title}</span>
                        <div className="flex gap-1 items-center flex-shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white" style={{ backgroundColor: '#0284c7' }}>
                            Page {issue.page_number || 1}
                          </span>
                          <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold ' + (isError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                            {issue.severity}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 mb-1">{issue.description}</div>
                      <div className="flex justify-between items-center text-[10px] font-bold" style={{ color: '#0284c7' }}>
                        <span>Section: {issue.section_name || 'General'}</span>
                        <span>Click to View Page</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2">
            <button
              onClick={applyFixes}
              disabled={!documentId || !scanComplete || applying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: applied ? '#10b981' : '#0284c7' }}
            >
              <Wand2 className="w-4 h-4" />
              {applying ? 'Applying Auto Fixes...' : applied ? 'Improvements Applied!' : 'Apply Suggested Improvements'}
            </button>
            {applied && downloadUrl && (
              <a
                href={downloadUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Compliant PDF
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 border-l border-slate-200 relative min-w-0 p-4 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                <ChevronLeft className="w-4 h-4 inline mr-0.5" /> Prev
              </button>
              <span className="text-[13px] font-bold" style={{ color: '#0369a1' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= totalPages}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                Next <ChevronRight className="w-4 h-4 inline ml-0.5" />
              </button>
            </div>

            <div className="rounded-lg p-2.5 bg-white">
              <canvas
                ref={canvasRef}
                className="max-w-full block"
              />
              {!documentId && (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Upload a PDF to preview and run accessibility checks.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
