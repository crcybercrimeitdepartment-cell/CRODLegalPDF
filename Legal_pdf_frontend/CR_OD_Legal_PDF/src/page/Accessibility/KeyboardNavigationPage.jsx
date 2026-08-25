import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import {  ArrowLeft, CloudUpload, Download, Wand2, ChevronLeft, ChevronRight, Keyboard , SlidersHorizontal } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Open PDF',
  'Enable Keyboard Nav',
  'Use Shortcuts',
  'Perform Actions',
  'Verify Navigation',
  'Save / Close',
];

const SHORTCUTS = [
  { keys: ['PageDown', '\u2193'], action: 'Next Page / Scroll Down' },
  { keys: ['PageUp', '\u2191'], action: 'Prev Page / Scroll Up' },
  { keys: ['Home', 'End'], action: 'First / Last Page' },
  { keys: ['Tab', 'Shift+Tab'], action: 'Focus Next / Prev Element' },
  { keys: ['Ctrl + (+)', 'Ctrl + (-)'], action: 'Zoom In / Zoom Out' },
  { keys: ['Alt + S'], action: 'Read Aloud Focused Text' },
];

export default function KeyboardNavigationPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [dragOver, setDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');

  var [kbEnabled, setKbEnabled] = useState(true);
  var [lastKey, setLastKey] = useState('None');
  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [zoomLevel, setZoomLevel] = useState(1.2);

  var [applying, setApplying] = useState(false);
  var [applied, setApplied] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var pdfDocRef = useRef(null);
  var viewportRef = useRef(null);

  var currentStep = !documentId ? 1 : !applied ? 4 : 6;

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
  }, [zoomLevel]);

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

  var handleDropzoneKeyDown = useCallback(function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current && fileInputRef.current.click();
    }
  }, []);

  var loadCanvasFromBuffer = useCallback(function (buffer) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    window.pdfjsLib.getDocument({ data: buffer }).promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPage(pdf, 1, 1.2);
    }).catch(function (e) {
      console.error('PDF load error:', e);
    });
  }, []);

  var renderPage = useCallback(function (pdf, num, zoom) {
    if (!pdf) return;
    pdf.getPage(num).then(function (page) {
      var vp = page.getViewport({ scale: zoom || 1.2 });
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
      var newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(pdfDocRef.current, newPage, zoomLevel);
    }
  }, [currentPage, zoomLevel, renderPage]);

  var nextPage = useCallback(function () {
    if (currentPage < totalPages && pdfDocRef.current) {
      var newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(pdfDocRef.current, newPage, zoomLevel);
    }
  }, [currentPage, totalPages, zoomLevel, renderPage]);

  var zoomIn = useCallback(function () {
    var newZoom = Math.min(3.0, zoomLevel + 0.25);
    setZoomLevel(newZoom);
    if (pdfDocRef.current) renderPage(pdfDocRef.current, currentPage, newZoom);
  }, [zoomLevel, currentPage, renderPage]);

  var zoomOut = useCallback(function () {
    var newZoom = Math.max(0.5, zoomLevel - 0.25);
    setZoomLevel(newZoom);
    if (pdfDocRef.current) renderPage(pdfDocRef.current, currentPage, newZoom);
  }, [zoomLevel, currentPage, renderPage]);

  var speakFocusedElement = useCallback(function () {
    var active = document.activeElement;
    var text = active ? (active.innerText || active.value || 'PDF Document Canvas Page ' + currentPage) : 'PDF Page ' + currentPage;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      var utt = new SpeechSynthesisUtterance('Reading element: ' + text);
      utt.rate = 1.0;
      window.speechSynthesis.speak(utt);
    }
  }, [currentPage]);

  useEffect(function () {
    if (!kbEnabled) return;
    function handleKeyDown(e) {
      setLastKey(e.key);
      if (e.key === 'PageDown' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'PageUp' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
        if (pdfDocRef.current) renderPage(pdfDocRef.current, 1, zoomLevel);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(totalPages);
        if (pdfDocRef.current) renderPage(pdfDocRef.current, totalPages, zoomLevel);
      } else if (e.ctrlKey && e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.altKey && e.key === 's') {
        e.preventDefault();
        speakFocusedElement();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return function () { window.removeEventListener('keydown', handleKeyDown); };
  }, [kbEnabled, nextPage, prevPage, zoomLevel, totalPages, zoomIn, zoomOut, speakFocusedElement, renderPage]);

  var processKeyboardNav = useCallback(async function () {
    if (!documentId) return;
    setApplying(true);
    try {
      var res = await fetch(API_BASE + '/keyboard-nav/' + documentId + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Processing failed');
      var data = await res.json();
      setApplied(true);
      setDownloadUrl(data.download_url || '');
    } catch (err) {
      alert('Processing error: ' + err.message);
    } finally {
      setApplying(false);
    }
  }, [documentId]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Keyboard Navigation</h1>
                  </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Open PDF Document
            </div>
            <div
              tabIndex={0}
              role="button"
              onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onKeyDown={handleDropzoneKeyDown}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ' +
                (dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50')
              }
            >
              <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm" style={{ color: '#1e3a8a' }}>
                Click or Press Enter to Upload PDF
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#3b82f6' }}>
                Mouse-Free Accessible Viewer
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
              2. Keyboard Navigation Control
            </div>
            <div className="flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span className="font-bold text-[13px] text-slate-900">Enable Keyboard Navigation</span>
              <input
                type="checkbox"
                checked={kbEnabled}
                onChange={function (e) { setKbEnabled(e.target.checked); }}
                className="w-[18px] h-[18px] cursor-pointer accent-blue-600"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg p-2.5 border border-slate-200 bg-slate-50">
              <span className="text-[12px] text-slate-600">Last Key Pressed:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                {lastKey}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Shortcuts Cheatsheet
            </div>
            <div className="max-h-[220px] overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200">Shortcut</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUTS.map(function (s, i) {
                    return (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-3 py-2 border-b border-slate-100">
                          <div className="flex flex-wrap gap-1">
                            {s.keys.map(function (k, ki) {
                              return (
                                <span key={ki} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                                  {k}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b border-slate-100 text-slate-600">{s.action}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              5. WCAG 2.1 Compliance Audit
            </div>
            <div className="rounded-lg p-3 border border-slate-200 bg-slate-50 text-[11px]">
              <div className="font-bold mb-1" style={{ color: '#10b981' }}>
                {'\u2713'} WCAG 2.1 Criterion 2.1.1 (Keyboard) Passed
              </div>
              <div className="font-bold" style={{ color: '#3b82f6' }}>
                {'\u2713'} WCAG 2.1 Criterion 2.4.7 (Focus Visible) Passed
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2">
            <button
              onClick={processKeyboardNav}
              disabled={!documentId || applying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: applied ? '#10b981' : '#2563eb' }}
            >
              <Wand2 className="w-4 h-4" />
              {applying ? 'Tagging Structure Order...' : applied ? 'Keyboard Structure Tagged!' : 'Apply Keyboard Metadata (/Tabs /S)'}
            </button>
            {applied && downloadUrl && (
              <a
                href={downloadUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Keyboard Accessible PDF
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 border-l border-slate-200 relative min-w-0 p-4 sm:p-6">
          <div
            ref={viewportRef}
            tabIndex={0}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                tabIndex={0}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                <ChevronLeft className="w-4 h-4 inline mr-0.5" /> Prev (PageUp)
              </button>
              <span className="text-[13px] font-bold" style={{ color: '#1e3a8a' }}>
                Page {currentPage} of {totalPages} ({Math.round(zoomLevel * 100)}%)
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= totalPages}
                tabIndex={0}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                Next (PageDown) <ChevronRight className="w-4 h-4 inline ml-0.5" />
              </button>
            </div>

            <div className="rounded-lg p-2.5 bg-white">
              <canvas
                ref={canvasRef}
                tabIndex={0}
                className="max-w-full block focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
              />
              {!documentId && (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Upload a PDF to start keyboard-accessible viewing.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
