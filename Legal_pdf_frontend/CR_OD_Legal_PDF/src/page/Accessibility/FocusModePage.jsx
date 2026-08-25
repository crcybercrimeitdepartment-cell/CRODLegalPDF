import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Download, FileText, Crosshair, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var focusStyles = [
  { value: 'Paragraph Spotlight', label: 'Paragraph Spotlight' },
  { value: 'Current Page Focus', label: 'Page Focus' },
  { value: 'Focus Frame', label: 'Focus Frame' },
  { value: 'Dim Backdrop', label: 'Dim Backdrop' },
];

var tints = [
  { color: '#fef08a', title: 'Yellow Spotlight' },
  { color: '#cff4fc', title: 'Cyan Focus' },
  { color: '#d1e7dd', title: 'Mint Green' },
  { color: '#fff3cd', title: 'Warm Cream' },
  { color: '#f3e8ff', title: 'Soft Lavender' },
];

var steps = [
  'Open PDF document',
  'Select Focus Mode feature',
  'Configure focus area preferences',
  'System highlights selected content',
  'Read in distraction-free environment',
  'Complete reading or export document',
];

export default function FocusModePage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');

  var [focusActive, setFocusActive] = useState(true);
  var [focusStyle, setFocusStyle] = useState('Paragraph Spotlight');
  var [dimOpacity, setDimOpacity] = useState(60);
  var [highlightTint, setHighlightTint] = useState('#fef08a');
  var [minimizeInterface, setMinimizeInterface] = useState(true);
  var [keyboardNav, setKeyboardNav] = useState(true);
  var [sidebarHidden, setSidebarHidden] = useState(false);

  var [formattedHtml, setFormattedHtml] = useState('');
  var [totalParas, setTotalParas] = useState(0);
  var [activeParaIndex, setActiveParaIndex] = useState(0);

  var [exporting, setExporting] = useState(false);
  var [exported, setExported] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var readerContentRef = useRef(null);

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
        focus_style: focusStyle,
        dim_opacity: dimOpacity / 100,
        highlight_tint_hex: highlightTint,
        minimize_interface: minimizeInterface,
        enable_keyboard_nav: keyboardNav,
      };
      var res = await fetch(API_BASE + '/focus-mode/' + documentId + '/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Extraction failed');
      var data = await res.json();
      setFormattedHtml(data.extracted_html || '');
      setTotalParas(data.total_paragraphs_count || 0);
      setActiveParaIndex(0);
    } catch (err) {
      setFormattedHtml('<div style="color: #ef4444; padding: 20px;">Failed: ' + err.message + '</div>');
    }
  }, [documentId, focusStyle, dimOpacity, highlightTint, minimizeInterface, keyboardNav]);

  useEffect(function () {
    if (documentId) fetchContent();
  }, [documentId, fetchContent]);

  var handleKeyDown = useCallback(function (e) {
    if (!keyboardNav || totalParas === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      setActiveParaIndex(function (prev) { return Math.min(prev + 1, totalParas - 1); });
    } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      setActiveParaIndex(function (prev) { return Math.max(prev - 1, 0); });
    } else if (e.key === 'f' || e.key === 'F') {
      setSidebarHidden(function (h) { return !h; });
    }
  }, [keyboardNav, totalParas]);

  useEffect(function () {
    document.addEventListener('keydown', handleKeyDown);
    return function () { document.removeEventListener('keydown', handleKeyDown); };
  }, [handleKeyDown]);

  var exportMode = useCallback(async function () {
    if (!documentId) return;
    setExporting(true);
    try {
      var payload = {
        focus_style: focusStyle,
        dim_opacity: dimOpacity / 100,
        highlight_tint_hex: highlightTint,
        minimize_interface: minimizeInterface,
        enable_keyboard_nav: keyboardNav,
      };
      var res = await fetch(API_BASE + '/focus-mode/' + documentId + '/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Export failed');
      var data = await res.json();
      setExported(true);
      setDownloadUrl(data.download_url || '');
    } catch (err) {
      alert('Focus Mode export error: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [documentId, focusStyle, dimOpacity, highlightTint, minimizeInterface, keyboardNav]);

  var dimBackdrop = focusStyle === 'Dim Backdrop' && focusActive;
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Focus Mode Studio</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-4 overflow-x-hidden">
        

        <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
          {!sidebarHidden && (
            <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> 1. Open PDF Document
              </div>
              <div
                onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-bold text-sm" style={{ color: '#4338ca' }}>Click or Drag PDF File</div>
                <div className="text-[11px] mt-1" style={{ color: '#6366f1' }}>Distraction-Free Content Spotlight</div>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              {fileStatus && <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : '#ef4444' }}>{fileStatus}</div>}
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="text-base">{'\u2699'}</span> 2. Focus Mode Options
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-600">Focus Spotlight Mode</label>
                <div className="flex flex-wrap gap-2">
                  {focusStyles.map(function (s) {
                    return (
                      <button key={s.value} onClick={function () { setFocusStyle(s.value); }}
                        className={'px-3 py-2 rounded-full text-[13px] font-medium cursor-pointer border transition-all ' +
                          (focusStyle === s.value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600')
                        }
                      >{s.label}</button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-bold text-slate-600">Background Dim Opacity</span>
                  <span className="text-[14px] font-extrabold" style={{ color: '#4f46e5' }}>{dimOpacity}%</span>
                </div>
                <input type="range" min={10} max={90} step={5} value={dimOpacity} onChange={function (e) { setDimOpacity(parseInt(e.target.value)); }} className="w-full accent-indigo-600" />
              </div>

              <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-600">Spotlight Highlight Color</label>
                <div className="flex gap-3 items-center">
                  {tints.map(function (t) {
                    return (
                      <div key={t.color} onClick={function () { setHighlightTint(t.color); }}
                        className="w-8 h-8 rounded-full cursor-pointer border-2 flex items-center justify-center text-xs font-bold transition-all"
                        style={{ backgroundColor: t.color, borderColor: highlightTint === t.color ? '#4f46e5' : 'transparent' }}
                        title={t.title}
                      >{highlightTint === t.color ? '\u2713' : ''}</div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100 mt-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 cursor-pointer">
                    <Maximize2 className="w-3.5 h-3.5" /> Minimize Interface in Focus Mode
                  </label>
                  <input type="checkbox" checked={minimizeInterface} onChange={function (e) { setMinimizeInterface(e.target.checked); }} className="w-[18px] h-[18px] accent-indigo-600 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 cursor-pointer">
                    <span className="text-sm">{'\u2328'}</span> Up/Down or J/K Key Stepping
                  </label>
                  <input type="checkbox" checked={keyboardNav} onChange={function (e) { setKeyboardNav(e.target.checked); }} className="w-[18px] h-[18px] accent-indigo-600 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> 3. Save & Export PDF
              </div>
              <div className="flex justify-between text-[12px] font-semibold text-slate-600">
                <span>Content Blocks: <strong style={{ color: '#4f46e5' }}>{totalParas}</strong></span>
                <span>Active Mode: <strong style={{ color: '#4f46e5' }}>{focusStyle}</strong></span>
              </div>
              <button onClick={exportMode} disabled={!documentId || exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: exporting ? '#94a3b8' : exported ? '#10b981' : '#7c3aed' }}>
                <Crosshair className="w-4 h-4" /> {exporting ? 'Saving Focus Mode...' : exported ? '\u2713 Focus Mode Saved!' : 'Save Focus Mode Document'}
              </button>
              {downloadUrl && (
                <a href={downloadUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                  <Download className="w-4 h-4" /> Download Focus PDF
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
                          backgroundColor: isDone ? '#22c55e' : isActive ? '#7c3aed' : '#f1f5f9',
                          color: isDone || isActive ? '#ffffff' : '#94a3b8',
                          borderColor: isDone ? '#22c55e' : isActive ? '#7c3aed' : '#e2e8f0',
                        }}>{i + 1}</span>
                      {i < steps.length - 1 && <span className="h-1 flex-1 min-w-[30px]" style={{ backgroundColor: isDone ? '#22c55e' : '#e2e8f0' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 border-l border-slate-200 relative min-w-0">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Crosshair className="w-4 h-4" /> Focus Mode Interactive Canvas
            </div>
            <div className="flex items-center gap-2">
              <button onClick={function () { setFocusActive(function (f) { return !f; }); }}
                className={'px-4 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ' +
                  (focusActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300')
                }>
                {focusActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {focusActive ? 'Focus Mode ON' : 'Focus Mode OFF'}
              </button>
              <button onClick={function () { setSidebarHidden(function (h) { return !h; }); }}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                {sidebarHidden ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                {sidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
              </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-auto p-8 bg-slate-50 flex justify-center">
            {dimBackdrop && (
              <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundColor: dimColor }} />
            )}
            <div ref={readerContentRef} className="max-w-[720px] w-full rounded-xl border border-slate-200 shadow-md p-12 bg-white min-h-[300px] relative z-20" style={{ lineHeight: '1.8', fontSize: '16px' }}>
              {!formattedHtml ? (
                <div className="text-center text-slate-500 text-sm py-12">
                  <Crosshair className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                  Upload a PDF to activate distraction-free Focus Mode, content spotlighting & backdrop dimming.
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
  );
}
