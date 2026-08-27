import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Download, FileText, TextCursorInput, Heading, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var presets = [
  { size: 12, label: 'Small (12pt)' },
  { size: 16, label: 'Normal (16pt)' },
  { size: 20, label: 'Large (20pt)' },
  { size: 24, label: 'X-Large (24pt)' },
  { size: 28, label: 'Huge (28pt)' },
];

var steps = [
  'Open PDF document',
  'Select Custom Font Size tool',
  'Increase or decrease font size',
  'System updates document display',
  'Review scaled text experience',
  'Continue reading or save updated PDF',
];

function getPresetName(size) {
  if (size === 12) return 'Small';
  if (size === 16) return 'Normal';
  if (size === 20) return 'Large';
  if (size === 24) return 'Extra Large';
  if (size === 28) return 'Huge';
  return 'Custom';
}

export default function CustomFontSizeControlsPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [fontSize, setFontSize] = useState(20);
  var [preserveHeading, setPreserveHeading] = useState(true);

  var [formattedHtml, setFormattedHtml] = useState('');
  var [extractedPages, setExtractedPages] = useState([]);
  var [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  var [totalSpans, setTotalSpans] = useState(0);
  var [appliedSize, setAppliedSize] = useState(20);

  var [applying, setApplying] = useState(false);
  var [applied, setApplied] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);

  var currentStep = !documentId ? 1 : !formattedHtml ? 3 : !applied ? 5 : 6;

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Loading ' + file.name + '...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var data = await res.json();
      if (res.ok) {
        setDocumentId(data.document_id);
        setFileStatus('\u2713 Loaded: ' + data.filename + ' (' + data.page_count + ' pages)');
      } else {
        setFileStatus('\u2717 Upload error: ' + (data.error || 'Failed'));
      }
    } catch (err) {
      setFileStatus('\u2717 Upload error: ' + err.message);
    }
  }, []);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') uploadPdf(file);
  }, [uploadPdf]);

  var handleDragOver = useCallback(function (e) { e.preventDefault(); }, []);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var fetchPreview = useCallback(async function () {
    if (!documentId) return;
    try {
      var payload = {
        target_fontsize_pt: fontSize,
        preset_name: getPresetName(fontSize),
        preserve_heading_scale: preserveHeading,
        text_color_hex: '#1e293b',
      };
      var res = await fetch(API_BASE + '/font-size-controls/' + documentId + '/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Preview failed');
      var data = await res.json();
      setFormattedHtml(data.extracted_html || '');
      setExtractedPages(Array.isArray(data.extracted_pages) ? data.extracted_pages : []);
      setCurrentPreviewPage(1);
      setTotalSpans(data.total_spans_count || 0);
      setAppliedSize(data.applied_fontsize_pt || fontSize);
    } catch (err) {
      setFormattedHtml('<div style="color: #ef4444; padding: 20px;">Failed: ' + err.message + '</div>');
      setExtractedPages([]);
      setCurrentPreviewPage(1);
    }
  }, [documentId, fontSize, preserveHeading]);

  useEffect(function () {
    if (documentId) fetchPreview();
  }, [documentId, fetchPreview]);

  var handleFontSizeChange = useCallback(function (newSize) {
    newSize = Math.max(8, Math.min(36, newSize));
    setFontSize(newSize);
    setAppliedSize(newSize);
  }, []);

  var applyFontSize = useCallback(async function () {
    if (!documentId) return;
    setApplying(true);
    try {
      var payload = {
        target_fontsize_pt: fontSize,
        preset_name: getPresetName(fontSize),
        preserve_heading_scale: preserveHeading,
        text_color_hex: '#1e293b',
      };
      var res = await fetch(API_BASE + '/font-size-controls/' + documentId + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Application failed');
      var data = await res.json();
      setApplied(true);
      setDownloadUrl(data.download_url || '');
    } catch (err) {
      alert('Font size error: ' + err.message);
    } finally {
      setApplying(false);
    }
  }, [documentId, fontSize, preserveHeading]);

  var activePreviewPage = extractedPages.length > 0
    ? (extractedPages.find(function (page) { return page.page_number === currentPreviewPage; }) || extractedPages[0])
    : null;

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Custom Font Size Studio</h1>
                  </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20 gap-5">
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-3.5 h-3.5"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> 1. Open PDF Document
            </div>
            <div
              onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-slate-300 hover:border-sky-400 hover:bg-sky-50/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload w-8 h-8 text-slate-400 mx-auto mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <div className="font-bold text-sm text-[#0284c7]">Click or Drag PDF File</div>
              <div className="text-[11px] mt-1 text-[#0369a1]">Low Vision Custom Font Controls</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            {fileStatus && <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : '#ef4444' }}>{fileStatus}</div>}
          </div>

          <div className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="text-base">{'\u2699'}</span> 2. Font Size Controls
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-600">Font Size Presets</label>
              <div className="flex flex-wrap gap-2">
                {presets.map(function (p) {
                  return (
                    <button key={p.size} onClick={function () { handleFontSizeChange(p.size); }}
                      className={'px-3 py-2 rounded-full text-[13px] font-medium cursor-pointer border transition-all ' +
                        (fontSize === p.size
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-sky-400 hover:text-sky-600')
                      }
                    >{p.label}</button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-slate-600">Target Text Size</span>
                <div className="flex items-center gap-2">
                  <button onClick={function () { handleFontSizeChange(fontSize - 1); }} disabled={fontSize <= 8}
                    className="w-10 h-10 flex items-center justify-center rounded-l-lg border border-r-0 border-slate-300 bg-white text-lg font-semibold cursor-pointer hover:bg-sky-50 hover:border-sky-400 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed">-</button>
                  <span className="text-[15px] font-extrabold min-w-[50px] text-center" style={{ color: '#0284c7' }}>{fontSize} pt</span>
                  <button onClick={function () { handleFontSizeChange(fontSize + 1); }} disabled={fontSize >= 36}
                    className="w-10 h-10 flex items-center justify-center rounded-r-lg border border-l-0 border-slate-300 bg-white text-lg font-semibold cursor-pointer hover:bg-sky-50 hover:border-sky-400 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                </div>
              </div>
              <input type="range" min={8} max={36} step={1} value={fontSize} onChange={function (e) { handleFontSizeChange(parseInt(e.target.value)); }} className="w-full accent-sky-600" />
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
              <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 cursor-pointer">
                <Heading className="w-3.5 h-3.5" /> Preserve Heading Scale
              </label>
              <input type="checkbox" checked={preserveHeading} onChange={function (e) { setPreserveHeading(e.target.checked); }} className="w-[18px] h-[18px] accent-sky-600 cursor-pointer" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 3. Save & Export PDF
            </div>
            <div className="flex justify-between text-[12px] font-semibold text-slate-600">
              <span>Adjusted Elements: <strong style={{ color: '#0284c7' }}>{totalSpans}</strong></span>
              <span>Applied Size: <strong style={{ color: '#0284c7' }}>{appliedSize} pt</strong></span>
            </div>
            <button onClick={applyFontSize} disabled={!documentId || applying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: applying ? '#94a3b8' : applied ? '#10b981' : '#0284c7' }}>
              <TextCursorInput className="w-4 h-4" /> {applying ? 'Applying Custom Font Size...' : applied ? '\u2713 Font Size Applied!' : 'Apply Custom Font Size'}
            </button>
            {downloadUrl && (
              <a href={downloadUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                <Download className="w-4 h-4" /> Save & Download Scaled PDF
              </a>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="text-base">{'\uD83D\uDCCA'}</span> User Workflow Progress
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {steps.map(function (step, i) {
                var isActive = currentStep === i + 1;
                var isDone = currentStep > i + 1;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold border-2 transition-all"
                      style={{
                        backgroundColor: isDone ? '#22c55e' : isActive ? '#0284c7' : '#f1f5f9',
                        color: isDone || isActive ? '#ffffff' : '#94a3b8',
                        borderColor: isDone ? '#22c55e' : isActive ? '#0284c7' : '#e2e8f0',
                      }}>{i + 1}</span>
                    {i < steps.length - 1 && <span className="h-1 flex-1 min-w-[30px]" style={{ backgroundColor: isDone ? '#22c55e' : '#e2e8f0' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TextCursorInput className="w-4 h-4" /> Scaled Reader Canvas
            </div>
            <div className="text-[11px] text-slate-400 font-semibold">Real-time font size adjustment for low-vision readability</div>
          </div>

          <div className="flex-1 overflow-hidden p-8 bg-white">
            <div className="max-w-[720px] h-full max-h-full mx-auto rounded-xl border border-slate-200 shadow-xl p-12 transition-all overflow-y-auto overflow-x-hidden" style={{ fontSize: fontSize + 'px' }}>
              {!formattedHtml ? (
                <div className="text-center text-slate-500 text-sm py-12">
                  <FileText className="w-10 h-10 text-sky-400 mx-auto mb-3" />
                  Upload a PDF to dynamically adjust and scale text sizes for low vision support.
                </div>
              ) : extractedPages.length > 0 && activePreviewPage ? (
                <div className="flex flex-col gap-6 h-full">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-sm shadow-sm" style={{ fontSize: '16px' }}>
                    <button
                      onClick={function () { setCurrentPreviewPage(function (prev) { return Math.max(1, prev - 1); }); }}
                      disabled={currentPreviewPage <= 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Preview Page</span>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-white">
                        Page {activePreviewPage.page_number} of {extractedPages.length}
                      </span>
                    </div>
                    <button
                      onClick={function () { setCurrentPreviewPage(function (prev) { return Math.min(extractedPages.length, prev + 1); }); }}
                      disabled={currentPreviewPage >= extractedPages.length}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <section key={activePreviewPage.page_number} className="bg-transparent">
                    <div dangerouslySetInnerHTML={{ __html: activePreviewPage.html }} style={{ lineHeight: 1.6, color: '#1e293b' }} />
                  </section>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: formattedHtml }} style={{ lineHeight: 1.6, color: '#1e293b' }} />
              )}
            </div>
          </div>
            </div>
      </div>
    </div>
  );
}
