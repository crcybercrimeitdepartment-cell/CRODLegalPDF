import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, CloudUpload, Download, SlidersHorizontal } from 'lucide-react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
];

const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '');

const COLOR_MODES = [
  { id: 'normal', label: 'Default' },
  { id: 'dark_mode', label: 'Dark Mode' },
  { id: 'high_contrast', label: 'High Contrast' },
  { id: 'sepia', label: 'Sepia Tint' },
  { id: 'grayscale', label: 'Monochrome' },
];

const STEPS = ['Upload PDF', 'Configure', 'Process', 'Review', 'Download'];

export default function AccessibilitySupportPage({ onBack }) {
  const [docId, setDocId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [author, setAuthor] = useState('');
  const [colorMode, setColorMode] = useState('normal');
  const [altTexts, setAltTexts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [auditScore, setAuditScore] = useState(null);
  const [complianceLevel, setComplianceLevel] = useState('Awaiting PDF');
  const [auditIssues, setAuditIssues] = useState([]);
  const [stats, setStats] = useState({ title: '--', lang: '--', alt: '--', images: 0 });
  const [speechText, setSpeechText] = useState('');
  const [ttsRate, setTtsRate] = useState(1.0);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  const markDone = useCallback((s) => setCompletedSteps(prev => new Set([...prev, s])), []);

  const runAudit = useCallback(async (id) => {
    if (!id) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/accessibility/` + id + '/audit');
      if (!r.ok) return;
      const a = await r.json();
      setAuditScore(a.compliance_score || 0);
      setComplianceLevel(a.compliance_level || 'Unknown');
      setStats({
        title: a.has_title ? 'Present' : 'Missing',
        lang: a.has_language ? 'Present' : 'Missing',
        alt: a.images_missing_alt || 0,
        images: a.total_images || 0,
      });
      setAuditIssues(a.issues || []);
      const imgs = a.detected_images || [];
      setAltTexts(imgs.map(function (img) { return { page: img.page_number, index: img.image_index, alt: img.alt_text || '' }; }));
    } catch (e) { console.error(e); }
  }, []);

  const fetchSpeech = useCallback(async (id) => {
    if (!id) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/accessibility/` + id + '/screen-reader');
      if (!r.ok) return;
      const d = await r.json();
      setSpeechText(d.full_document_speech || 'No readable text content.');
    } catch (e) { console.error(e); }
  }, []);

  var renderPdfPage = useCallback(function (pdf, num) {
    if (!pdf) return;
    pdf.getPage(num).then(function (page) {
      var vp = page.getViewport({ scale: 1.2 });
      var c = canvasRef.current;
      if (!c) return;
      c.width = vp.width;
      c.height = vp.height;
      page.render({ canvasContext: c.getContext('2d'), viewport: vp });
    });
  }, []);

  var loadPdf = useCallback(function (input) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    var task = typeof input === 'string'
      ? window.pdfjsLib.getDocument(input)
      : window.pdfjsLib.getDocument({ data: input });
    task.promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPdfPage(pdf, 1);
    }).catch(function (e) { console.error(e); });
  }, [renderPdfPage]);

  var handleUpload = useCallback(async function (file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please upload a valid PDF.'); return;
    }
    setUploadError('');
    setUploadStatus('Uploading ' + file.name + '...');
    setFileName(file.name);
    try { loadPdf(await file.arrayBuffer()); } catch (e) { console.error(e); }

    var fd = new FormData();
    fd.append('file', file);
    try {
      var r = await fetch(`${API_BASE_URL}/api/accessibility/upload`, { method: 'POST', body: fd });
      if (!r.ok) { var e = await r.json(); throw new Error(e.detail || 'Upload failed'); }
      var d = await r.json();
      setDocId(d.document_id);
      setTotalPages(d.page_count);
      setUploadStatus('Uploaded: ' + d.filename + ' (' + d.page_count + ' pages)');
      setActiveStep(1);
      markDone(0);
      await runAudit(d.document_id);
      await fetchSpeech(d.document_id);
    } catch (err) {
      setUploadError(err.message);
      setUploadStatus('');
    }
  }, [loadPdf, runAudit, fetchSpeech, markDone]);

  useEffect(function () {
    if (pdfDocRef.current) renderPdfPage(pdfDocRef.current, currentPage);
  }, [currentPage, renderPdfPage]);

  var handleProcess = useCallback(async function () {
    if (!docId) return;
    setIsProcessing(true);
    markDone(1);
    var payload = {
      settings: {
        title: title || undefined,
        language: language,
        author: author || undefined,
        color_mode: colorMode,
        auto_bookmarks: true,
        enable_screen_reader_tags: true,
        alt_texts: altTexts.map(function (a) { return { page_number: a.page, image_index: a.index, alt_text: a.alt }; }),
      },
    };
    try {
      var r = await fetch(`${API_BASE_URL}/api/accessibility/` + docId + '/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { var e = await r.json(); throw new Error(e.detail || 'Failed'); }
      var res = await r.json();
      setIsProcessed(true);
      setDownloadUrl(res.download_url);
      setActiveStep(4);
      markDone(2); markDone(3); markDone(4);
      loadPdf('/api/accessibility/' + docId + '/download');
      await runAudit();
      await fetchSpeech();
    } catch (err) { alert(err.message); }
    finally { setIsProcessing(false); }
  }, [docId, title, language, author, colorMode, altTexts, markDone, loadPdf, runAudit, fetchSpeech]);

  var handleSpeak = function () {
    var s = synthRef.current;
    if (!speechText || !s) return;
    if (s.speaking && s.paused) { s.resume(); return; }
    s.cancel();
    var u = new SpeechSynthesisUtterance(speechText);
    u.rate = ttsRate;
    s.speak(u);
  };

  var handlePause = function () { if (synthRef.current) synthRef.current.pause(); };
  var handleStop = function () { if (synthRef.current) { synthRef.current.cancel(); } };

  var scoreBadge = auditScore === null ? 'bg-white/20 text-white' : auditScore >= 90 ? 'bg-green-100 text-green-700' : auditScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Accessibility Support</h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Accessibility Tools</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10">

        {/* Upload Zone */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div
            onClick={function () { fileRef.current && fileRef.current.click(); }}
            onDrop={function (e) { e.preventDefault(); setIsDragging(false); var f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
            onDragOver={function (e) { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={function () { setIsDragging(false); }}
            className={"border-2 border-dashed rounded-2xl py-10 px-8 text-center cursor-pointer transition " + (isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30')}
          >
            <CloudUpload className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here for accessibility support analysis</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={function (e) { var f = e.target.files[0]; if (f) handleUpload(f); }} />
          {uploadStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: uploadStatus.includes('Uploaded') ? '#16a34a' : '#3b82f6' }}>{uploadStatus}</p>}
          {uploadError && <p className="m-0 mt-3 text-[13px] font-semibold text-center text-red-500">{uploadError}</p>}
        </div>

        <div
          className="rounded-xl p-6 text-white flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 10px 30px rgba(79, 70, 229, 0.2)',
          }}
        >
          <div className="flex-1 flex flex-col gap-3">
            <div className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit " + scoreBadge}>Audit: {complianceLevel}</div>
            <h2 className="text-lg font-bold">PDF Accessibility & UA Compliance</h2>
            <p className="text-xs text-white/70">{auditScore !== null ? 'Found ' + auditIssues.length + ' issues. Total images: ' + stats.images + '.' : 'Upload a PDF to run WCAG 2.1 AA and PDF/UA auditing.'}</p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-white/10 rounded-lg px-3 py-2"><div className="text-[10px] text-white/60">Title Tag</div><div className="text-sm font-bold">{stats.title}</div></div>
              <div className="bg-white/10 rounded-lg px-3 py-2"><div className="text-[10px] text-white/60">Language Tag</div><div className="text-sm font-bold">{stats.lang}</div></div>
              <div className="bg-white/10 rounded-lg px-3 py-2"><div className="text-[10px] text-white/60">Missing Alt Text</div><div className="text-sm font-bold">{stats.alt}</div></div>
            </div>
          </div>
          <button onClick={function () { runAudit(docId); }} disabled={!docId} className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">Re-Run Audit</button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <div className="text-sm font-semibold text-slate-700">Assistive Text-to-Speech (TTS) Reader</div>
          <div className="flex items-center gap-3">
            <button onClick={handleSpeak} className="w-10 h-10 rounded-full bg-[#1e2a52] hover:bg-[#16203e] text-white flex items-center justify-center cursor-pointer text-sm">Play</button>
            <button onClick={handlePause} className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer text-sm">Pause</button>
            <button onClick={handleStop} className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center cursor-pointer text-sm">Stop</button>
            <label className="text-xs text-slate-500 ml-2">Speed:</label>
            <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} onChange={function (e) { setTtsRate(parseFloat(e.target.value)); }} className="w-20" />
            <span className="text-xs font-semibold text-slate-600">{ttsRate.toFixed(1)}x</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 max-h-32 overflow-y-auto">{speechText || 'Upload document to extract screen-reader speech chunks...'}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-700 mb-3">Audit Issues & Recommendations</div>
          <div className="flex flex-col gap-2">
            {auditIssues.length === 0 ? (
              <div className="text-xs text-slate-500">No issues detected yet.</div>
            ) : auditIssues.map(function (iss, i) {
              var borderClass = iss.severity === 'Warning' ? 'border-l-4 border-yellow-400' : 'border-l-4 border-red-400';
              return (
                <div key={i} className={"p-3 bg-slate-50 border border-slate-200 rounded-lg " + borderClass}>
                  <div className="text-xs font-bold text-slate-800">[{iss.category}] {iss.message}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Recommendation: {iss.recommendation}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={function () { if (currentPage > 1) setCurrentPage(function (p) { return p - 1; }); }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer">Prev</button>
            <span className="text-sm font-semibold text-slate-700">Page {currentPage} of {totalPages || 1}</span>
            <button onClick={function () { if (currentPage < totalPages) setCurrentPage(function (p) { return p + 1; }); }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer">Next</button>
          </div>
          <canvas ref={canvasRef} className="max-w-full border border-slate-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
