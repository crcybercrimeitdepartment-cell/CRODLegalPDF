import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Download, FileText, Ruler, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, MousePointer, Keyboard } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var styles = [
  { value: 'Highlight Line', label: 'Highlight Line' },
  { value: 'Focus Mask', label: 'Focus Mask' },
  { value: 'Underline Pointer', label: 'Underline' },
  { value: 'Magnifier Strip', label: 'Magnifier Strip' },
];

var steps = [
  'Open PDF document',
  'Select Reading Ruler feature',
  'Place ruler at required position',
  'System highlights selected text line',
  'Move ruler line-by-line',
  'Complete reading or save document',
];

export default function ReadingRulerPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');

  var [rulerStyle, setRulerStyle] = useState('Highlight Line');
  var [rulerHeight, setRulerHeight] = useState(44);
  var [dimOpacity, setDimOpacity] = useState(50);
  var [mouseTracking, setMouseTracking] = useState(true);
  var [keyboardTracking, setKeyboardTracking] = useState(true);

  var [formattedHtml, setFormattedHtml] = useState('');
  var [totalLines, setTotalLines] = useState(0);
  var [activeLineIndex, setActiveLineIndex] = useState(0);

  var [exporting, setExporting] = useState(false);
  var [exported, setExported] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var [rulerTop, setRulerTop] = useState(0);

  var fileInputRef = useRef(null);
  var readerViewportRef = useRef(null);
  var readerContentRef = useRef(null);
  var lastClientY = useRef(null);

  var currentStep = !documentId ? 1 : !formattedHtml ? 3 : !exported ? 5 : 6;

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

  var fetchContent = useCallback(async function () {
    if (!documentId) return;
    try {
      var payload = {
        ruler_style: rulerStyle,
        ruler_height_px: rulerHeight,
        ruler_color_hex: '#f59e0b',
        dim_opacity: dimOpacity / 100,
        enable_keyboard_arrows: keyboardTracking,
      };
      var res = await fetch(API_BASE + '/reading-ruler/' + documentId + '/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Extraction failed');
      var data = await res.json();
      setFormattedHtml(data.extracted_html || '');
      setTotalLines(data.total_lines_count || 0);
      setActiveLineIndex(0);
    } catch (err) {
      setFormattedHtml('<div style="color: #ef4444; padding: 20px;">Failed: ' + err.message + '</div>');
    }
  }, [documentId, rulerStyle, rulerHeight, dimOpacity, keyboardTracking]);

  useEffect(function () {
    if (documentId) fetchContent();
  }, [documentId, fetchContent]);

  var positionRuler = useCallback(function (yPos) {
    if (!readerViewportRef.current) return;
    var viewportHeight = readerViewportRef.current.clientHeight;
    var boundedY = Math.max(0, Math.min(yPos, viewportHeight - rulerHeight));
    setRulerTop(boundedY);
  }, [rulerHeight]);

  var handleMouseMove = useCallback(function (e) {
    if (!mouseTracking || !readerViewportRef.current) return;
    var rect = readerViewportRef.current.getBoundingClientRect();
    var yPos = e.clientY - rect.top - (rulerHeight / 2);
    positionRuler(yPos);
    lastClientY.current = e.clientY;
  }, [mouseTracking, rulerHeight, positionRuler]);

  var handleMouseLeave = useCallback(function () { lastClientY.current = null; }, []);

  var handleKeyDown = useCallback(function (e) {
    if (!keyboardTracking || totalLines === 0) return;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      setActiveLineIndex(function (prev) { return Math.min(prev + 1, totalLines - 1); });
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      setActiveLineIndex(function (prev) { return Math.max(prev - 1, 0); });
    }
  }, [keyboardTracking, totalLines]);

  useEffect(function () {
    document.addEventListener('keydown', handleKeyDown);
    return function () { document.removeEventListener('keydown', handleKeyDown); };
  }, [handleKeyDown]);

  var exportRuler = useCallback(async function () {
    if (!documentId) return;
    setExporting(true);
    try {
      var payload = {
        ruler_style: rulerStyle,
        ruler_height_px: rulerHeight,
        ruler_color_hex: '#f59e0b',
        dim_opacity: dimOpacity / 100,
        enable_keyboard_arrows: keyboardTracking,
      };
      var res = await fetch(API_BASE + '/reading-ruler/' + documentId + '/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Export failed');
      var data = await res.json();
      setExported(true);
      setDownloadUrl(data.download_url || '');
    } catch (err) {
      alert('Ruler export error: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [documentId, rulerStyle, rulerHeight, dimOpacity, keyboardTracking]);

  var getRulerStyle = function () {
    if (rulerStyle === 'Highlight Line') {
      return { backgroundColor: 'rgba(251,191,36,0.28)', borderTop: '2px solid #f59e0b', borderBottom: '2px solid #f59e0b' };
    }
    if (rulerStyle === 'Focus Mask') {
      return { backgroundColor: 'transparent', borderTop: '2px solid #38bdf8', borderBottom: '2px solid #38bdf8' };
    }
    if (rulerStyle === 'Underline Pointer') {
      return { backgroundColor: 'transparent', borderTop: 'none', borderBottom: '4px solid #06b6d4' };
    }
    if (rulerStyle === 'Magnifier Strip') {
      return { backgroundColor: 'rgba(59,130,246,0.20)', borderTop: '2px solid #3b82f6', borderBottom: '2px solid #3b82f6' };
    }
    return {};
  };

  var dimColor = 'rgba(15,23,42,' + (dimOpacity / 100) + ')';

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Reading Ruler Studio</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-4 overflow-x-hidden">
        

        <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 1. Open PDF Document
            </div>
            <div
              onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-slate-300 hover:border-amber-400 hover:bg-amber-50/50"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm" style={{ color: '#d97706' }}>Click or Drag PDF File</div>
              <div className="text-[11px] mt-1" style={{ color: '#b45309' }}>Line-by-Line Reading Focus Guide</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            {fileStatus && <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : '#ef4444' }}>{fileStatus}</div>}
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="text-base">{'\u2699'}</span> 2. Reading Ruler Options
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-600">Ruler Visual Style</label>
              <div className="flex flex-wrap gap-2">
                {styles.map(function (s) {
                  return (
                    <button key={s.value} onClick={function () { setRulerStyle(s.value); }}
                      className={'px-3 py-2 rounded-full text-[13px] font-medium cursor-pointer border transition-all ' +
                        (rulerStyle === s.value
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-600')
                      }
                    >{s.label}</button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-slate-600">Ruler Height (px)</span>
                <div className="flex items-center gap-2">
                  <button onClick={function () { setRulerHeight(function (h) { return Math.max(20, h - 2); }); }} disabled={rulerHeight <= 20}
                    className="w-9 h-9 flex items-center justify-center rounded-l-lg border border-r-0 border-slate-300 bg-white text-lg font-semibold cursor-pointer hover:bg-amber-50 hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed">-</button>
                  <span className="text-[15px] font-extrabold min-w-[45px] text-center" style={{ color: '#d97706' }}>{rulerHeight} px</span>
                  <button onClick={function () { setRulerHeight(function (h) { return Math.min(100, h + 2); }); }} disabled={rulerHeight >= 100}
                    className="w-9 h-9 flex items-center justify-center rounded-r-lg border border-l-0 border-slate-300 bg-white text-lg font-semibold cursor-pointer hover:bg-amber-50 hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                </div>
              </div>
              <input type="range" min={20} max={100} step={2} value={rulerHeight} onChange={function (e) { setRulerHeight(parseInt(e.target.value)); }} className="w-full accent-amber-600" />
            </div>

            <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-slate-600">Focus Mask Dim Opacity</span>
                <span className="text-[13px] font-bold" style={{ color: '#d97706' }}>{dimOpacity}%</span>
              </div>
              <input type="range" min={0} max={80} step={5} value={dimOpacity} onChange={function (e) { setDimOpacity(parseInt(e.target.value)); }} className="w-full accent-amber-600" />
            </div>

            <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100 mt-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 cursor-pointer">
                  <MousePointer className="w-3.5 h-3.5" /> Mouse Line Tracking
                </label>
                <input type="checkbox" checked={mouseTracking} onChange={function (e) { setMouseTracking(e.target.checked); }} className="w-[18px] h-[18px] accent-amber-600 cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 cursor-pointer">
                  <Keyboard className="w-3.5 h-3.5" /> Up/Down Arrow Key Navigation
                </label>
                <input type="checkbox" checked={keyboardTracking} onChange={function (e) { setKeyboardTracking(e.target.checked); }} className="w-[18px] h-[18px] accent-amber-600 cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 3. Save & Export PDF
            </div>
            <div className="flex justify-between text-[12px] font-semibold text-slate-600">
              <span>Extracted Lines: <strong style={{ color: '#d97706' }}>{totalLines}</strong></span>
              <span>Active Style: <strong style={{ color: '#d97706' }}>{rulerStyle}</strong></span>
            </div>
            <button onClick={exportRuler} disabled={!documentId || exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: exporting ? '#94a3b8' : exported ? '#10b981' : '#059669' }}>
              <Ruler className="w-4 h-4" /> {exporting ? 'Saving Reading Ruler Guide...' : exported ? '\u2713 Ruler Guide Saved!' : 'Save Reading Ruler Guide'}
            </button>
            {downloadUrl && (
              <a href={downloadUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                <Download className="w-4 h-4" /> Save & Download PDF
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
                        backgroundColor: isDone ? '#22c55e' : isActive ? '#059669' : '#f1f5f9',
                        color: isDone || isActive ? '#ffffff' : '#94a3b8',
                        borderColor: isDone ? '#22c55e' : isActive ? '#059669' : '#e2e8f0',
                      }}>{i + 1}</span>
                    {i < steps.length - 1 && <span className="h-1 flex-1 min-w-[30px]" style={{ backgroundColor: isDone ? '#22c55e' : '#e2e8f0' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 border-l border-slate-200 relative min-w-0">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Ruler className="w-4 h-4" /> Reading Ruler Interactive Canvas
            </div>
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              Use mouse pointer or <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px]">{'\u2191'}</kbd> <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px]">{'\u2193'}</kbd> arrow keys
            </div>
          </div>

          <div ref={readerViewportRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="flex-1 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
              {rulerStyle === 'Focus Mask' && (
                <>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rulerTop, backgroundColor: dimColor }} />
                  <div style={{ position: 'absolute', top: rulerTop + rulerHeight, left: 0, right: 0, bottom: 0, backgroundColor: dimColor }} />
                </>
              )}
              <div style={{ position: 'absolute', top: rulerTop, left: 0, right: 0, height: rulerHeight, ...getRulerStyle(), transition: 'top 0.1s ease' }} />
            </div>

            <div ref={readerContentRef} className="flex-1 overflow-auto p-8 bg-slate-50">
              <div className="max-w-[720px] mx-auto rounded-xl border border-slate-200 shadow-md p-12 bg-white min-h-[300px]">
                {!formattedHtml ? (
                  <div className="text-center text-slate-500 text-sm py-12">
                    <Ruler className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    Upload a PDF to activate movable line reading ruler and focus masking.
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: formattedHtml }} />
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
