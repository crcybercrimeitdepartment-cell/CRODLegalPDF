import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Download, FileText, Glasses, Ruler, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var fonts = [
  { value: 'OpenDyslexic', label: 'OpenDyslexic (Heavy-bottomed strokes)', css: "'OpenDyslexic', sans-serif" },
  { value: 'Lexend', label: 'Lexend (Cognitive reading efficiency)', css: "'Lexend', sans-serif" },
  { value: 'Comic Neue', label: 'Comic Neue (Distinct character shapes)', css: "'Comic Neue', cursive" },
  { value: 'Arial', label: 'Arial (Clean sans-serif baseline)', css: "Arial, sans-serif" },
];

var tints = [
  { color: '#fef3c7', name: 'Warm Cream' },
  { color: '#ecfdf5', name: 'Mint Green' },
  { color: '#e0f2fe', name: 'Sky Blue' },
  { color: '#ffffff', name: 'Soft White' },
];

var steps = [
  'Open PDF document',
  'Select Dyslexia Reading Mode',
  'Configure reading preferences',
  'View dyslexia-friendly format',
  'Review document with reading ruler',
  'Save & export dyslexia PDF',
];

export default function DyslexiaReadingModePage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');

  var [fontFamily, setFontFamily] = useState('OpenDyslexic');
  var [fontSize, setFontSize] = useState(16);
  var [lineHeight, setLineHeight] = useState(1.8);
  var [letterSpacing, setLetterSpacing] = useState(0.12);
  var [bgTint, setBgTint] = useState('#fef3c7');
  var [enableRuler, setEnableRuler] = useState(false);

  var [formattedHtml, setFormattedHtml] = useState('');
  var [totalWords, setTotalWords] = useState(0);
  var [readTime, setReadTime] = useState(0);

  var [exporting, setExporting] = useState(false);
  var [exported, setExported] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var [rulerY, setRulerY] = useState(-100);

  var fileInputRef = useRef(null);
  var readerViewportRef = useRef(null);

  var currentStep = !documentId ? 1 : !formattedHtml ? 3 : !exported ? 5 : 6;

  var getFontCss = function () {
    var f = fonts.find(function (f) { return f.value === fontFamily; });
    return f ? f.css : 'sans-serif';
  };

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

  var fetchContent = useCallback(async function () {
    if (!documentId) return;
    try {
      var settings = {
        font_family: fontFamily,
        font_size_pt: fontSize,
        line_height_mult: lineHeight,
        letter_spacing_em: letterSpacing,
        background_tint_hex: bgTint,
        text_color_hex: '#1e293b',
        enable_reading_ruler: enableRuler,
      };
      var res = await fetch(API_BASE + '/dyslexia-mode/' + documentId + '/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settings }),
      });
      if (!res.ok) throw new Error('Extraction failed');
      var data = await res.json();
      setFormattedHtml(data.formatted_html || '');
      setTotalWords(data.total_words_count || 0);
      setReadTime(data.reading_time_minutes || 0);
    } catch (err) {
      setFormattedHtml('<div style="color: #ef4444; padding: 20px;">Failed: ' + err.message + '</div>');
    }
  }, [documentId, fontFamily, fontSize, lineHeight, letterSpacing, bgTint, enableRuler]);

  useEffect(function () {
    if (documentId) fetchContent();
  }, [documentId, fetchContent]);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') uploadPdf(file);
  }, [uploadPdf]);

  var handleDragOver = useCallback(function (e) { e.preventDefault(); }, []);

  var handleFileSelect = useCallback(function (e) {
    var file = e.target.files[0];
    if (file) uploadPdf(file);
  }, [uploadPdf]);

  var handleMouseMove = useCallback(function (e) {
    if (!enableRuler || !readerViewportRef.current) return;
    var rect = readerViewportRef.current.getBoundingClientRect();
    var y = e.clientY - rect.top + readerViewportRef.current.scrollTop;
    setRulerY(y - 25);
  }, [enableRuler]);

  var handleMouseLeave = useCallback(function () { setRulerY(-100); }, []);

  var exportPdf = useCallback(async function () {
    if (!documentId) return;
    setExporting(true);
    try {
      var settings = {
        font_family: fontFamily,
        font_size_pt: fontSize,
        line_height_mult: lineHeight,
        letter_spacing_em: letterSpacing,
        background_tint_hex: bgTint,
        text_color_hex: '#1e293b',
        enable_reading_ruler: enableRuler,
      };
      var res = await fetch(API_BASE + '/dyslexia-mode/' + documentId + '/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settings }),
      });
      if (!res.ok) throw new Error('Export failed');
      var data = await res.json();
      setExported(true);
      setDownloadUrl(data.download_url || '');
    } catch (err) {
      alert('Export error: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [documentId, fontFamily, fontSize, lineHeight, letterSpacing, bgTint, enableRuler]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Dyslexia Reading Studio</h1>
                  </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20">
          <div className="flex flex-col gap-2">
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

          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="text-base">{'\u2699'}</span> 2. Reading Preferences
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Dyslexia Font Family</label>
              <select value={fontFamily} onChange={function (e) { setFontFamily(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400">
                {fonts.map(function (f) { return <option key={f.value} value={f.value}>{f.label}</option>; })}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Font Size</span><span>{fontSize} pt</span>
              </div>
              <input type="range" min={12} max={24} step={1} value={fontSize} onChange={function (e) { setFontSize(parseInt(e.target.value)); }} className="w-full accent-teal-600" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Line Height Spacing</span><span>{lineHeight.toFixed(1)} x</span>
              </div>
              <input type="range" min={1.4} max={2.5} step={0.1} value={lineHeight} onChange={function (e) { setLineHeight(parseFloat(e.target.value)); }} className="w-full accent-teal-600" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Letter Spacing</span><span>{letterSpacing.toFixed(2)} em</span>
              </div>
              <input type="range" min={0.05} max={0.25} step={0.01} value={letterSpacing} onChange={function (e) { setLetterSpacing(parseFloat(e.target.value)); }} className="w-full accent-teal-600" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-600">Background Color Tint</label>
              <div className="flex gap-2.5">
                {tints.map(function (t) {
                  return (
                    <button key={t.color} onClick={function () { setBgTint(t.color); }} title={t.name}
                      className="w-10 h-10 rounded-lg cursor-pointer transition-all hover:scale-110 hover:shadow-md border-2"
                      style={{ backgroundColor: t.color, borderColor: bgTint === t.color ? '#0d9488' : '#e2e8f0', boxShadow: bgTint === t.color ? '0 0 0 3px rgba(13,148,136,0.3)' : 'none' }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 cursor-pointer">
                <Ruler className="w-3.5 h-3.5" /> Enable Focus Reading Ruler
              </label>
              <input type="checkbox" checked={enableRuler} onChange={function (e) { setEnableRuler(e.target.checked); }} className="w-[18px] h-[18px] accent-teal-600 cursor-pointer" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 3. Export & Stats
            </div>
            <div className="flex justify-between text-[12px] font-semibold text-slate-600">
              <span>Total Words: <strong style={{ color: '#0d9488' }}>{totalWords}</strong></span>
              <span>Est. Read Time: <strong style={{ color: '#0d9488' }}>{readTime} min</strong></span>
            </div>
            <button onClick={exportPdf} disabled={!documentId || exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: exporting ? '#94a3b8' : exported ? '#10b981' : '#0d9488' }}>
              <FileText className="w-4 h-4" /> {exporting ? 'Exporting Dyslexia PDF...' : exported ? '\u2713 Export Complete!' : 'Export Dyslexia-Friendly PDF'}
            </button>
            {downloadUrl && (
              <a href={downloadUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                <Download className="w-4 h-4" /> Save & Download Dyslexia PDF
              </a>
            )}
          </div>

          <div className="flex flex-col gap-2">
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
                        backgroundColor: isDone ? '#22c55e' : isActive ? '#0d9488' : '#f1f5f9',
                        color: isDone || isActive ? '#ffffff' : '#94a3b8',
                        borderColor: isDone ? '#22c55e' : isActive ? '#0d9488' : '#e2e8f0',
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
              <Glasses className="w-4 h-4" /> Dyslexia Reader Canvas
            </div>
            <div className="text-[11px] text-slate-400 font-semibold">Move mouse over text to guide reading ruler</div>
          </div>

          <div ref={readerViewportRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="flex-1 overflow-auto relative p-8" style={{ backgroundColor: bgTint }}>
            {enableRuler && rulerY > -100 && (
              <div className="fixed left-0 right-0 h-[60px] pointer-events-none z-50 border-y-2" style={{ top: rulerY, backgroundColor: 'rgba(255,200,0,0.3)', borderColor: 'rgba(255,200,0,0.5)' }} />
            )}

            <div className="max-w-[720px] mx-auto rounded-xl border border-slate-200 shadow-xl p-12" style={{ backgroundColor: bgTint }}>
              {!formattedHtml ? (
                <div className="text-center text-slate-500 text-sm py-12">
                  <FileText className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                  Upload a PDF to render formatted dyslexia-friendly text with focus ruler guidance.
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: formattedHtml }} style={{
                  fontFamily: getFontCss(),
                  fontSize: fontSize + 'px',
                  lineHeight: lineHeight,
                  letterSpacing: letterSpacing + 'em',
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
