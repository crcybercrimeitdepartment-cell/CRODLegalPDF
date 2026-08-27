import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Download, FileText, Type, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var presets = [
  { spacing: 0.00, label: 'Normal (0.00em)' },
  { spacing: 0.05, label: 'Wide (0.05em)' },
  { spacing: 0.12, label: 'Expanded (0.12em)' },
  { spacing: 0.20, label: 'X-Wide (0.20em)' },
  { spacing: 0.30, label: 'Max (0.30em)' },
];

var steps = [
  'Open PDF document',
  'Select Adjustable Letter Spacing tool',
  'Choose letter spacing level',
  'System updates document text',
  'Review updated character spacing',
  'Apply settings & save updated PDF',
];

function getPresetName(spacing) {
  if (Math.abs(spacing - 0.00) < 0.015) return 'Normal';
  if (Math.abs(spacing - 0.05) < 0.015) return 'Wide';
  if (Math.abs(spacing - 0.12) < 0.015) return 'Expanded';
  if (Math.abs(spacing - 0.20) < 0.015) return 'Extra Wide';
  if (Math.abs(spacing - 0.30) < 0.015) return 'Maximum';
  return 'Custom';
}

export default function AdjustableLetterSpacingPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [letterSpacing, setLetterSpacing] = useState(0.12);
  var [lineHeight, setLineHeight] = useState(1.6);

  var [formattedHtml, setFormattedHtml] = useState('');
  var [extractedPages, setExtractedPages] = useState([]);
  var [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  var [totalCharacters, setTotalCharacters] = useState(0);
  var [appliedSpacing, setAppliedSpacing] = useState(0.12);

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
        letter_spacing_em: letterSpacing,
        preset_name: getPresetName(letterSpacing),
        line_spacing_mult: lineHeight,
        text_color_hex: '#1e293b',
      };
      var res = await fetch(API_BASE + '/letter-spacing/' + documentId + '/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Preview failed');
      var data = await res.json();
      setFormattedHtml(data.extracted_html || '');
      setExtractedPages(Array.isArray(data.extracted_pages) ? data.extracted_pages : []);
      setCurrentPreviewPage(1);
      setTotalCharacters(data.total_characters_count || 0);
      setAppliedSpacing(data.applied_letter_spacing || letterSpacing);
    } catch (err) {
      setFormattedHtml('<div style="color: #ef4444; padding: 20px;">Failed: ' + err.message + '</div>');
      setExtractedPages([]);
      setCurrentPreviewPage(1);
    }
  }, [documentId, letterSpacing, lineHeight]);

  useEffect(function () {
    if (documentId) fetchPreview();
  }, [documentId, fetchPreview]);

  var handleSpacingChange = useCallback(function (newVal) {
    newVal = Math.max(-0.05, Math.min(0.40, newVal));
    setLetterSpacing(newVal);
    setAppliedSpacing(newVal);
  }, []);

  var applyLetterSpacing = useCallback(async function () {
    if (!documentId) return;
    setApplying(true);
    try {
      var payload = {
        letter_spacing_em: letterSpacing,
        preset_name: getPresetName(letterSpacing),
        line_spacing_mult: lineHeight,
        text_color_hex: '#1e293b',
      };
      var res = await fetch(API_BASE + '/letter-spacing/' + documentId + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Application failed');
      var data = await res.json();
      setApplied(true);
      setDownloadUrl(data.download_url || '');
    } catch (err) {
      alert('Letter spacing error: ' + err.message);
    } finally {
      setApplying(false);
    }
  }, [documentId, letterSpacing, lineHeight]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Adjustable Letter Spacing Studio</h1>
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
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload w-8 h-8 text-slate-400 mx-auto mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <div className="font-bold text-sm text-[#4f46e5]">Click or Drag PDF File</div>
              <div className="text-[11px] mt-1 text-[#6366f1]">Upload Document</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            {fileStatus && <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : '#ef4444' }}>{fileStatus}</div>}
          </div>

          <div className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="text-base">{'\u2699'}</span> 2. Letter Spacing Controls
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-600">Letter Spacing Presets</label>
              <div className="flex flex-wrap gap-2">
                {presets.map(function (p) {
                  return (
                    <button key={p.spacing} onClick={function () { handleSpacingChange(p.spacing); }}
                      className={'px-3 py-2 rounded-full text-[13px] font-medium cursor-pointer border transition-all ' +
                        (Math.abs(letterSpacing - p.spacing) < 0.015
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600')
                      }
                    >{p.label}</button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-slate-600">Character Tracking (em)</span>
                <div className="flex items-center gap-2">
                  <button onClick={function () { handleSpacingChange(letterSpacing - 0.01); }} disabled={letterSpacing <= -0.05}
                    className="w-9 h-9 flex items-center justify-center rounded-l-lg border border-r-0 border-slate-300 bg-white text-lg font-semibold cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed">-</button>
                  <span className="text-[15px] font-extrabold min-w-[55px] text-center" style={{ color: '#6366f1' }}>{letterSpacing.toFixed(2)} em</span>
                  <button onClick={function () { handleSpacingChange(letterSpacing + 0.01); }} disabled={letterSpacing >= 0.40}
                    className="w-9 h-9 flex items-center justify-center rounded-r-lg border border-l-0 border-slate-300 bg-white text-lg font-semibold cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                </div>
              </div>
              <input type="range" min={-0.05} max={0.40} step={0.01} value={letterSpacing} onChange={function (e) { handleSpacingChange(parseFloat(e.target.value)); }} className="w-full accent-indigo-600" />
            </div>

            <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-slate-600">Line Height Multiplier</span>
                <span className="text-[13px] font-bold" style={{ color: '#6366f1' }}>{lineHeight.toFixed(1)}x</span>
              </div>
              <input type="range" min={1.2} max={2.5} step={0.1} value={lineHeight} onChange={function (e) { setLineHeight(parseFloat(e.target.value)); }} className="w-full accent-indigo-600" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 3. Save & Export PDF
            </div>
            <div className="flex justify-between text-[12px] font-semibold text-slate-600">
              <span>Text Blocks: <strong style={{ color: '#6366f1' }}>{totalCharacters}</strong></span>
              <span>Applied Spacing: <strong style={{ color: '#6366f1' }}>{appliedSpacing.toFixed(2)} em</strong></span>
            </div>
            <button onClick={applyLetterSpacing} disabled={!documentId || applying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: applying ? '#94a3b8' : applied ? '#10b981' : '#6366f1' }}>
              <Type className="w-4 h-4" /> {applying ? 'Applying Letter Spacing...' : applied ? '\u2713 Letter Spacing Applied!' : 'Apply Custom Letter Spacing'}
            </button>
            {downloadUrl && (
              <a href={downloadUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                <Download className="w-4 h-4" /> Save & Download Spaced PDF
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
                        backgroundColor: isDone ? '#22c55e' : isActive ? '#6366f1' : '#f1f5f9',
                        color: isDone || isActive ? '#ffffff' : '#94a3b8',
                        borderColor: isDone ? '#22c55e' : isActive ? '#6366f1' : '#e2e8f0',
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
              <Type className="w-4 h-4" /> Letter Spacing Reader Canvas
            </div>
            <div className="text-[11px] text-slate-400 font-semibold">Real-time character tracking adjustment for enhanced dyslexia readability</div>
          </div>

          <div className="flex-1 overflow-hidden p-8 bg-slate-50">
            <div className="max-w-[720px] h-full max-h-full mx-auto rounded-xl border border-slate-200 shadow-md p-12 bg-white transition-all overflow-y-auto overflow-x-hidden">
              {!formattedHtml ? (
                <div className="text-center text-slate-500 text-sm py-12">
                  <FileText className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                  Upload a PDF to adjust character letter spacing for dyslexia and low-vision clarity.
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
                    <div dangerouslySetInnerHTML={{ __html: activePreviewPage.html }} style={{ color: '#1e293b' }} />
                  </section>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: formattedHtml }} style={{
                  letterSpacing: letterSpacing + 'em',
                  lineHeight: lineHeight,
                  color: '#1e293b',
                }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
