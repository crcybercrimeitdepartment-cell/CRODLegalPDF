import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Mic, MicOff, Settings2, Play, FileText, Download, RotateCcw, Upload, Layers } from 'lucide-react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility/speech-to-text';

var exampleCommands = [
  'Page 3 par Introduction ke baad ye text add karo: Hello World.',
  'Page 5 par Rahul ko Rohan se replace karo.',
  'Page 4 par temporary text delete karo.',
  'Page 2 par note add karo: Check this section.',
  'Page 1 ke start mein ye text add karo: Document Title.',
];

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes';
  var units = ['Bytes', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

function parseCommandLocally(command) {
  var text = command.trim();
  var operation = 'insert';
  if (/\b(delete|remove)\b/i.test(text)) operation = 'delete';
  else if (/\b(replace|change)\b/i.test(text)) operation = 'replace';
  else if (/\b(comment)\b/i.test(text)) operation = 'comment';
  else if (/\b(note)\b/i.test(text)) operation = 'note';

  var pageMatch = text.match(/\bpage\s+(\d+)\b/i);
  var page = pageMatch ? parseInt(pageMatch[1], 10) : 1;

  var position = 'cursor';
  if (/\bafter\b/i.test(text)) position = 'after';
  else if (/\b(before|prior to)\b/i.test(text)) position = 'before';
  else if (/\b(end of|bottom of|last)\b/i.test(text)) position = 'page_end';
  else if (/\b(beginning|start|top)\b/i.test(text)) position = 'page_start';

  var replaceMatch = text.match(/\b(?:replace|change)\s+["']?(.+?)["']?\s+(?:with|to)\s+["']?(.+?)["']?\.?$/i);
  var oldText = replaceMatch ? replaceMatch[1].trim() : null;
  var newText = replaceMatch ? replaceMatch[2].trim() : null;

  var colonIndex = text.indexOf(':');
  var insertText = colonIndex !== -1 ? text.substring(colonIndex + 1).trim() : '';

  return { operation: operation, page: page, target: null, position: position, insert_text: insertText, old_text: oldText, new_text: newText, original_command: text };
}

export default function SpeechtoTextInputPage({ onBack }) {
  var [file, setFile] = useState(null);
  var [fileName, setFileName] = useState('');
  var [fileSize, setFileSize] = useState('');
  var [documentId, setDocumentId] = useState(null);

  var [isDictating, setIsDictating] = useState(false);
  var [isPaused, setIsPaused] = useState(false);
  var [speechStatus, setSpeechStatus] = useState('Upload a PDF to begin voice-controlled editing.');
  var [confidence, setConfidence] = useState(0);

  var [speechLang, setSpeechLang] = useState('en-US');
  var [targetPage, setTargetPage] = useState(1);
  var [autoFormat, setAutoFormat] = useState(true);
  var [targetField, setTargetField] = useState('sticky_note');

  var [textarea, setTextarea] = useState('');
  var [showCommand, setShowCommand] = useState(false);
  var [parsedCmd, setParsedCmd] = useState(null);
  var [showPreview, setShowPreview] = useState(false);
  var [previewHtml, setPreviewHtml] = useState('No preview generated yet.');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [zoomLevel, setZoomLevel] = useState(100);

  var [commandHistory, setCommandHistory] = useState([]);

  var recognitionRef = useRef(null);
  var finalTranscriptRef = useRef('');
  var fileInputRef = useRef(null);

  var setStatus = useCallback(function (msg, listening) {
    setSpeechStatus(msg);
  }, []);

  var initRecognition = useCallback(function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechStatus('Speech recognition not supported. Use Chrome, Edge, or Safari.');
      return;
    }
    var recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 3;
    recog.lang = speechLang;

    recog.onstart = function () {
      setIsDictating(true);
      setIsPaused(false);
      setSpeechStatus('Listening... Speak your PDF command.');
    };

    recog.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var result = e.results[i];
        var t = result[0] ? result[0].transcript || '' : '';
        if (result.isFinal) finalTranscriptRef.current += t + ' ';
        else interim += t;
        if (result[0] && typeof result[0].confidence === 'number' && result[0].confidence > 0) {
          setConfidence(Math.round(result[0].confidence * 100));
        }
      }
      setTextarea((finalTranscriptRef.current + interim).trim());
      setSpeechStatus('Listening... transcription being generated.', true);
    };

    recog.onerror = function (e) {
      if (e.error === 'not-allowed') setSpeechStatus('Microphone permission denied.');
      else if (e.error === 'no-speech') setSpeechStatus('No speech detected. Try again.');
      else setSpeechStatus('Speech error: ' + e.error);
    };

    recog.onend = function () {
      setIsDictating(false);
      setIsPaused(false);
      if (textarea.trim()) setStatus('Dictation finished. Review your command.');
      else setStatus('Ready. Click Start Listening.');
    };

    recognitionRef.current = recog;
  }, [speechLang, textarea, setStatus]);

  useEffect(function () { initRecognition(); }, []);

  var toggleDictation = useCallback(function () {
    if (!recognitionRef.current) { initRecognition(); return; }
    if (isDictating) { recognitionRef.current.stop(); return; }
    finalTranscriptRef.current = '';
    setTextarea('');
    recognitionRef.current.lang = speechLang;
    try { recognitionRef.current.start(); } catch (e) { }
  }, [isDictating, speechLang, initRecognition]);

  var togglePause = useCallback(function () {
    if (!recognitionRef.current || !isDictating) return;
    if (!isPaused) { recognitionRef.current.stop(); setIsPaused(true); setStatus('Dictation paused.'); }
    else { try { recognitionRef.current.start(); setIsPaused(false); setStatus('Listening...'); } catch (e) { } }
  }, [isDictating, isPaused, setStatus]);

  var clearText = useCallback(function () {
    finalTranscriptRef.current = '';
    setTextarea('');
    setShowCommand(false);
    setShowPreview(false);
    setConfidence(0);
    setStatus('Command cleared. Ready for new command.');
  }, [setStatus]);

  var uploadPdf = useCallback(async function (f) {
    setStatus('Uploading PDF...');
    try {
      var formData = new FormData();
      formData.append('file', f);
      var res = await fetch(API_BASE + '/upload-pdf', { method: 'POST', body: formData });
      var data = await res.json();
      if (data.success) {
        setDocumentId(data.file_id || data.document_id || data.id);
        setFileName(f.name);
        setFileSize(formatFileSize(f.size));
        setFile(f);
        setTotalPages(data.page_count || 1);
        setStatus('PDF uploaded. Ready for voice commands.');
      } else { setStatus('PDF upload failed.'); }
    } catch (err) { setStatus('PDF upload failed.'); }
  }, [setStatus]);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    var f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') uploadPdf(f);
  }, [uploadPdf]);

  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var removeFile = useCallback(function () {
    setFile(null); setDocumentId(null); setFileName(''); setFileSize('');
    setShowCommand(false); setShowPreview(false);
    setStatus('PDF removed. Upload a PDF to continue.');
  }, [setStatus]);

  var parseCommand = useCallback(async function () {
    var cmd = textarea.trim();
    if (!cmd) { alert('Enter a voice command first.'); return; }
    setStatus('Understanding your command...');
    var parsed = null;
    try {
      var res = await fetch(API_BASE + '/parse-command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, page_number: targetPage, file_id: documentId }),
      });
      if (res.ok) { var data = await res.json(); if (data.success && data.command) parsed = data.command; }
    } catch (e) { }
    if (!parsed) parsed = parseCommandLocally(cmd);
    setParsedCmd(parsed);
    setShowCommand(true);
    if (parsed.page) setCurrentPage(parsed.page);
    await requestPreview(parsed);
  }, [textarea, targetPage, documentId, setStatus]);

  var requestPreview = useCallback(async function (cmd) {
    setStatus('Preparing preview...');
    try {
      var res = await fetch(API_BASE + '/preview-edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, file_id: documentId, command: cmd.original_command, page_number: cmd.page, operation: cmd.operation, target_text: cmd.target, position: cmd.position, insert_text: cmd.insert_text, old_text: cmd.old_text, new_text: cmd.new_text }),
      });
      if (res.ok) { var data = await res.json(); if (data.success) { setPreviewHtml(data.preview_html || data.preview_text || 'Preview ready.'); setShowPreview(true); setStatus('Preview ready. Confirm to modify PDF.'); return; } }
    } catch (e) { }
    var html = '<strong>Operation:</strong> ' + cmd.operation + '<br><strong>Page:</strong> ' + (cmd.page || '-') + '<br><strong>Position:</strong> ' + (cmd.position || 'cursor');
    if (cmd.insert_text) html += '<br><strong>Text:</strong> ' + cmd.insert_text;
    setPreviewHtml(html);
    setShowPreview(true);
    setStatus('Command understood. Review before applying.');
  }, [documentId, setStatus]);

  var applyChange = useCallback(async function () {
    if (!parsedCmd) { alert('No command ready.'); return; }
    setStatus('Applying change...');
    try {
      var res = await fetch(API_BASE + '/apply-edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: documentId, page_number: parsedCmd.page, operation: parsedCmd.operation, target_text: parsedCmd.target, position: parsedCmd.position, insert_text: parsedCmd.insert_text, old_text: parsedCmd.old_text, new_text: parsedCmd.new_text }),
      });
      if (!res.ok) throw new Error('Failed');
      var data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      setCommandHistory(function (h) { return [...h, { command: parsedCmd, result: data }]; });
      setStatus('PDF change applied successfully.');
      if (data.download_url) setPreviewHtml(function (h) { return h + '<br><a href="' + data.download_url + '" target="_blank">Open Updated PDF</a>'; });
    } catch (err) { setStatus('Failed to apply change.'); }
  }, [parsedCmd, documentId, setStatus]);

  var cancelChange = useCallback(function () {
    setParsedCmd(null); setShowPreview(false); setShowCommand(false);
    setStatus('Change cancelled.');
  }, [setStatus]);

  var undoChange = useCallback(async function () {
    if (commandHistory.length === 0) { alert('Nothing to undo.'); return; }
    var last = commandHistory[commandHistory.length - 1];
    try {
      var res = await fetch(API_BASE + '/undo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: documentId, operation_id: last.result.operation_id || last.result.id || null }),
      });
      if (!res.ok) throw new Error('Undo failed');
      var data = await res.json();
      if (!data.success) throw new Error(data.message || 'Undo failed');
      setCommandHistory(function (h) { return h.slice(0, -1); });
      setStatus('Last change undone.');
    } catch (err) { alert('Unable to undo: ' + err.message); }
  }, [commandHistory, documentId, setStatus]);

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      
      {/* Header Area */}
      <div className="absolute top-1.5 left-4 sm:top-5 sm:left-8 md:left-12 z-50 flex items-center w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] min-h-[40px] justify-between">
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Speech-to-Text Studio</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10">

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-6 rounded-2xl mb-6 shadow-lg flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold flex items-center gap-3"><Mic className="w-6 h-6" /> Speech-to-Text & Voice PDF Editing Studio</h1>
          <p className="m-0 mt-1 text-sm opacity-90">Dictate text annotations or perform voice-directed PDF text insertion, replacement, deletion, and commenting.</p>
        </div>
        <span className="px-4 py-1.5 rounded-full text-[13px] font-semibold" style={{ background: isDictating ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)' }}>
          {isDictating ? 'Listening...' : 'Ready'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="m-0 mb-3 text-base font-semibold text-slate-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" /> Section 1: Upload PDF Document
            </h3>
            <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }} onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
              className="border-2 border-dashed border-emerald-300 rounded-xl p-6 text-center cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition">
              <FileText className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h4 className="m-0 text-sm font-semibold text-slate-800">Upload PDF for Voice Editing</h4>
              <p className="m-0 text-xs text-slate-500">Click or drag and drop PDF file here</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            {file && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-3 text-[13px] text-emerald-800">
                <span><FileText className="w-3.5 h-3.5 inline mr-1.5" /><strong>{fileName}</strong> ({fileSize})</span>
                <button onClick={removeFile} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 cursor-pointer">Remove</button>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="m-0 mb-3 text-base font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-emerald-600">{'\u2699'}</span> Speech Controls & Settings
            </h3>
            <div className="flex gap-2 flex-wrap mb-4">
              <button onClick={toggleDictation}
                className={'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition ' + (isDictating ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-white hover:bg-emerald-600')}>
                <Mic className="w-4 h-4" /> {isDictating ? 'Stop Listening' : 'Start Listening'}
              </button>
              <button onClick={togglePause} disabled={!isDictating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-500 text-white hover:bg-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />} {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={clearText}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-500 text-white hover:bg-slate-600 cursor-pointer">
                <Eraser className="w-4 h-4" /> Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Speech Language:</label>
                <select value={speechLang} onChange={function (e) { setSpeechLang(e.target.value); }} className="w-full p-2 rounded-lg border border-slate-300 text-sm">
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">Hindi (India)</option>
                  <option value="en-IN">English (India)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Target Page Number:</label>
                <input type="number" min={1} value={targetPage} onChange={function (e) { setTargetPage(parseInt(e.target.value) || 1); }} className="w-full p-2 rounded-lg border border-slate-300 text-sm box-border" />
              </div>
              <div className="col-span-2 mt-1">
                <label className="font-semibold text-slate-600 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoFormat} onChange={function (e) { setAutoFormat(e.target.checked); }} className="w-4 h-4 accent-emerald-600" /> Auto-Format Spoken Punctuation
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="m-0 mb-3 text-base font-semibold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" /> Dictated Speech Transcript</span>
              <span className="text-xs font-semibold text-slate-500">Confidence: {confidence}%</span>
            </h3>
            <div className="mb-2">
              <label className="font-semibold text-[13px] text-slate-600">Dictation Target Type:</label>
              <select value={targetField} onChange={function (e) { setTargetField(e.target.value); }} className="ml-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-[13px]">
                <option value="sticky_note">Sticky Note Annotation</option>
                <option value="comment">Review Comment Thread</option>
                <option value="form_field">PDF AcroForm Field</option>
                <option value="free_text">Free Text Annotation</option>
              </select>
            </div>
            <textarea value={textarea} onChange={function (e) { setTextarea(e.target.value); }}
              placeholder="Spoken words or voice commands will appear here automatically..."
              className="w-full h-40 p-3.5 rounded-lg border border-slate-300 text-sm font-inherit mt-3 box-border resize-y" />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="m-0 mb-3 text-base font-semibold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" /> PDF Live Preview Studio</span>
              <span className="text-[13px] font-bold text-blue-800">Page {currentPage} of {totalPages}</span>
            </h3>
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-200 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <button onClick={function () { setCurrentPage(function (p) { return Math.max(1, p - 1); }); }} disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"><ChevronLeft className="w-3 h-3" /> Prev</button>
                <button onClick={function () { setCurrentPage(function (p) { return Math.min(p + 1, totalPages); }); }} disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40">Next <ChevronRight className="w-3 h-3" /></button>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={function () { setZoomLevel(function (z) { return Math.max(50, z - 25); }); }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"><ZoomOut className="w-3.5 h-3.5" /></button>
                <span className="text-xs font-bold text-slate-700 min-w-[35px] text-center">{zoomLevel}%</span>
                <button onClick={function () { setZoomLevel(function (z) { return Math.min(300, z + 25); }); }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={function () { setZoomLevel(125); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Fit Width</button>
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 min-h-[520px] flex justify-center items-start overflow-auto">
              {!file ? (
                <div className="text-slate-400 text-center py-32">
                  <Upload className="w-10 h-10 mx-auto mb-3 opacity-60" />
                  <p className="text-sm">Upload a PDF to view live preview and voice edits</p>
                </div>
              ) : (
                <div className="bg-white rounded shadow-lg p-4 max-w-full text-center text-sm text-slate-600">
                  <p className="font-semibold">{fileName}</p>
                  <p className="text-xs text-slate-400 mt-1">Page {currentPage} of {totalPages} | Zoom {zoomLevel}%</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="m-0 mb-2.5 text-base font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-amber-500">{'\uD83D\uDCA1'}</span> Section 4: Voice Command Examples
            </h3>
            <p className="text-xs text-slate-500 m-0 mb-2.5">Click an example to test voice parsing:</p>
            <div className="flex flex-wrap gap-2">
              {exampleCommands.map(function (cmd, i) {
                return (
                  <span key={i} onClick={function () { setTextarea(cmd); }}
                    className="inline-block bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer hover:bg-sky-200 transition">{cmd}</span>
                );
              })}
            </div>
          </div>

          {showCommand && parsedCmd && (
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-4">
              <h4 className="m-0 mb-2.5 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="text-blue-600">{'\u2699'}</span> Section 5: Detected Voice Command
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[13px]">
                <div><strong>Operation:</strong> <span className="text-blue-600 font-bold">{parsedCmd.operation || '-'}</span></div>
                <div><strong>Target Page:</strong> <span className="font-bold">{parsedCmd.page || '-'}</span></div>
                <div><strong>Target Text:</strong> <span className="font-bold">{parsedCmd.target || 'Page / cursor'}</span></div>
                <div><strong>Position:</strong> <span className="font-bold">{parsedCmd.position || 'cursor'}</span></div>
              </div>
            </div>
          )}

          {showPreview && (
            <div className="bg-blue-50 border border-blue-300 rounded-xl p-4">
              <h4 className="m-0 mb-2.5 text-sm font-semibold text-blue-800 flex items-center gap-2">
                <span className="text-blue-600">{'\uD83D\uDC41'}</span> Section 6: PDF Change Preview
              </h4>
              <div className="text-[13px] text-slate-800 bg-white p-3 rounded-lg border border-blue-300 mb-3.5 min-h-[50px]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              <div className="flex gap-2 flex-wrap">
                <button onClick={applyChange}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
                  <CheckCircle className="w-4 h-4" /> Apply Change
                </button>
                <button onClick={cancelChange}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-500 text-white hover:bg-slate-600 cursor-pointer">
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
                <button onClick={undoChange} disabled={commandHistory.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <RotateCcw className="w-4 h-4" /> Undo Last Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
