import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import {  ArrowLeft, CloudUpload, Download, FileText, Smartphone, Tablet, Monitor , SlidersHorizontal } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Open PDF',
  'Text Reflow Enable',
  'Zoom & Settings',
  'Review Content',
  'Continue Reading',
  'Save / Export',
];

const DEVICE_PRESETS = [
  { key: 'mobile', label: 'Mobile (360px)', icon: Smartphone, width: '360px', badge: '360px Mobile Width' },
  { key: 'tablet', label: 'Tablet (768px)', icon: Tablet, width: '768px', badge: '768px Tablet Width' },
  { key: 'desktop', label: 'Desktop (100%)', icon: Monitor, width: '100%', badge: '100% Desktop Width' },
];

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter (Sans-serif)' },
  { value: 'Roboto', label: 'Roboto (Clean)' },
  { value: 'Georgia', label: 'Georgia (Serif Book)' },
  { value: 'OpenDyslexic', label: 'OpenDyslexic (Dyslexia Friendly)' },
];

const THEMES = [
  { key: 'light', label: 'Light', bg: '#ffffff', color: '#1e293b' },
  { key: 'dark', label: 'Dark', bg: '#1e293b', color: '#e2e8f0' },
  { key: 'sepia', label: 'Sepia', bg: '#f5f0e6', color: '#5c4b37' },
  { key: 'high_contrast', label: 'High Contrast', bg: '#000000', color: '#ffffff' },
];

export default function TextReflowPage({ onBack }) {
  var [pdfFile, setPdfFile] = useState(null);
  var [documentId, setDocumentId] = useState(null);
  var [dragOver, setDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');

  var [reflowEnabled, setReflowEnabled] = useState(true);
  var [devicePreset, setDevicePreset] = useState('mobile');
  var [fontSize, setFontSize] = useState(16);
  var [fontFamily, setFontFamily] = useState('Inter');
  var [theme, setTheme] = useState('light');

  var [reflowHtml, setReflowHtml] = useState('');
  var [pagesHtml, setPagesHtml] = useState([]);
  var [currentPage, setCurrentPage] = useState(0);
  var [exporting, setExporting] = useState(false);
  var [exported, setExported] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var pdfDocRef = useRef(null);

  var currentStep = !documentId ? 1 : !reflowHtml ? 3 : 6;

  var currentPreset = DEVICE_PRESETS.find(function (p) { return p.key === devicePreset; });
  var viewportBadge = currentPreset ? currentPreset.badge : '360px';
  var simulatorWidth = currentPreset ? currentPreset.width : '360px';

  var themeStyle = THEMES.find(function (t) { return t.key === theme; }) || THEMES[0];

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Loading ' + file.name + '...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var data = await res.json();
      if (res.ok) {
        setDocumentId(data.document_id);
        setPdfFile(file);
        setFileStatus('\u2713 Loaded: ' + data.filename + ' (' + (data.page_count || 0) + ' pages)');
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

  var fetchReflowContent = useCallback(async function () {
    if (!documentId) return;
    try {
      var params = new URLSearchParams({
        font_size_px: String(fontSize),
        font_family: fontFamily,
        theme: theme,
      });
      var res = await fetch(API_BASE + '/text-reflow/' + documentId + '/content?' + params.toString());
            if (!res.ok) {
        var errText = await res.text();
        var errMsg = 'Reflow fetch failed (Status ' + res.status + '): ' + errText;
        try {
          var errJson = JSON.parse(errText);
          errMsg = errJson.detail || errJson.error || errJson.message || errMsg;
        } catch (e) {
          errMsg = errText || errMsg;
        }
        if (errMsg === 'Document not found' || errMsg.includes('Document not found') || res.status === 404) {
            errMsg = 'The server restarted and forgot your document. Please upload the PDF again.';
            localStorage.removeItem('pdf_document_id');
            setDocumentId(null);
            setFileStatus('');
        }
        throw new Error(errMsg);
      }
      var data = await res.json();
      setReflowHtml(data.full_reflow_html || '<div style="color: #64748b;">No text extracted for reflow.</div>');
      if (data.pages && data.pages.length > 0) {
        setPagesHtml(data.pages);
      } else {
        setPagesHtml([data.full_reflow_html || '<div style="color: #64748b;">No text extracted for reflow.</div>']);
      }
      setCurrentPage(0);
    } catch (err) {
      setReflowHtml('<div style="color: #ef4444;">Reflow error: ' + err.message + '</div>');
      setPagesHtml(['<div style="color: #ef4444;">Reflow error: ' + err.message + '</div>']);
    }
  }, [documentId, fontSize, fontFamily, theme]);

  useEffect(function () {
    if (documentId && reflowEnabled) {
      fetchReflowContent();
    }
  }, [documentId, reflowEnabled, fetchReflowContent]);

  var handleExport = useCallback(async function () {
    if (!documentId) return;
    setExporting(true);
    try {
      var payload = {
        settings: {
          font_size_px: fontSize,
          font_family: fontFamily,
          line_spacing: 1.5,
          device_preset: devicePreset,
          theme: theme,
        },
      };
      var res = await fetch(API_BASE + '/text-reflow/' + documentId + '/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
            if (!res.ok) {
        var errText = await res.text();
        var errMsg = 'Export failed';
        try {
          var errJson = JSON.parse(errText);
          errMsg = errJson.detail || errJson.error || errJson.message || errMsg;
        } catch (e) {
          errMsg = errText || errMsg;
        }
        if (errMsg === 'Document not found' || errMsg.includes('Document not found') || res.status === 404) {
            errMsg = 'The server restarted and forgot your document. Please upload the PDF again.';
            localStorage.removeItem('pdf_document_id');
            setDocumentId(null);
            setFileStatus('');
        }
        throw new Error(errMsg);
      }
      var data = await res.json();
      setExported(true);
      setDownloadUrl(data.download_url || '');
    } catch (err) {
      alert('Export error: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [documentId, fontSize, fontFamily, devicePreset, theme]);

  var renderFixedPdf = useCallback(function () {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined' || !documentId) return;
    window.pdfjsLib.getDocument(API_BASE + '/' + documentId + '/download').promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      pdf.getPage(1).then(function (page) {
        var vp = page.getViewport({ scale: 1.0 });
        var c = canvasRef.current;
        if (!c) return;
        c.width = vp.width;
        c.height = vp.height;
        page.render({ canvasContext: c.getContext('2d'), viewport: vp });
      });
    });
  }, [documentId]);

  useEffect(function () {
    if (!reflowEnabled && documentId) {
      renderFixedPdf();
    }
  }, [reflowEnabled, documentId, renderFixedPdf]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Text Reflow</h1>
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
              <div className="font-bold text-sm text-violet-900">
                Click or Drag PDF File
              </div>
              <div className="text-[11px] text-violet-600 mt-1">
                Zero Horizontal Scroll Reading
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
              <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : fileStatus.indexOf('\u2717') >= 0 ? '#ef4444' : '#0284c7' }}>
                {fileStatus}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2. Text Reflow Mode
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[13px] text-slate-900">Enable Responsive Reflow</span>
              <input
                type="checkbox"
                checked={reflowEnabled}
                onChange={function (e) { setReflowEnabled(e.target.checked); }}
                className="w-[18px] h-[18px] cursor-pointer accent-sky-600"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Device &amp; Zoom Settings
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Target Device Screen</label>
              <div className="flex gap-2">
                {DEVICE_PRESETS.map(function (preset) {
                  var Icon = preset.icon;
                  return (
                    <button
                      key={preset.key}
                      onClick={function () { setDevicePreset(preset.key); }}
                      className={
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-all ' +
                        (devicePreset === preset.key
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50')
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {preset.key === 'mobile' ? 'Mobile' : preset.key === 'tablet' ? 'Tablet' : 'Desktop'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-gray-700">Font Size / Zoom Level</label>
                <span className="text-[11px] font-bold text-violet-600">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={fontSize}
                onChange={function (e) { setFontSize(parseInt(e.target.value)); }}
                className="w-full accent-sky-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Typography Font Family</label>
              <select
                value={fontFamily}
                onChange={function (e) { setFontFamily(e.target.value); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
              >
                {FONT_FAMILIES.map(function (f) {
                  return (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Reading Color Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(function (t) {
                  return (
                    <button
                      key={t.key}
                      onClick={function () { setTheme(t.key); }}
                      className={
                        'px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all ' +
                        (theme === t.key
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-400')
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2">
            <button
              onClick={handleExport}
              disabled={!documentId || exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export Mobile Reflowed PDF'}
            </button>
            {exported && downloadUrl && (
              <a
                href={downloadUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Reflowed PDF
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 border-l border-slate-200 relative min-w-0 p-4 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Mobile Reflow Viewport
              </span>
              <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                {viewportBadge}
              </span>
            </div>

            {reflowEnabled ? (
              <div className="flex flex-col h-full relative">
                <div
                  className="min-h-[400px] p-5 transition-all overflow-y-auto pb-20"
                  style={{
                    maxWidth: simulatorWidth,
                    margin: simulatorWidth === '100%' ? '0' : '0 auto',
                    width: '100%',
                    backgroundColor: themeStyle.bg,
                    color: themeStyle.color,
                    fontFamily: fontFamily,
                    fontSize: fontSize + 'px',
                    lineHeight: '1.7',
                  }}
                >
                  {pagesHtml.length > 0 ? (
                    <div dangerouslySetInnerHTML={{ __html: pagesHtml[currentPage] || '' }} />
                  ) : (
                    <div className="text-center pt-10" style={{ fontSize: '13px', opacity: 0.5 }}>
                      Upload a PDF document to view responsive, reflowed content without horizontal scrolling.
                    </div>
                  )}
                </div>
                {pagesHtml.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur border border-slate-200 shadow-lg px-4 py-2 rounded-full z-30">
                    <button 
                      onClick={function() { setCurrentPage(function(p) { return Math.max(0, p - 1); }); }}
                      disabled={currentPage === 0}
                      className="text-slate-600 hover:text-sky-600 font-semibold text-sm disabled:opacity-40 disabled:hover:text-slate-600 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      Page {currentPage + 1} of {pagesHtml.length}
                    </span>
                    <button 
                      onClick={function() { setCurrentPage(function(p) { return Math.min(pagesHtml.length - 1, p + 1); }); }}
                      disabled={currentPage === pagesHtml.length - 1}
                      className="text-slate-600 hover:text-sky-600 font-semibold text-sm disabled:opacity-40 disabled:hover:text-slate-600 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 text-center">
                <canvas ref={canvasRef} className="max-w-full border border-slate-200 rounded-lg" />
                {!documentId && (
                  <div className="text-xs text-slate-500 py-4">
                    Upload a document to view fixed PDF layout.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
