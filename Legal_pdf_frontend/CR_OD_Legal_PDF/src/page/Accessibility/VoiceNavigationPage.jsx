import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Mic, MicOff, Upload, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Volume2 } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var commandGroups = [
  {
    title: 'Navigation & Code Jumps:',
    commands: ['"go to page 5"', '"next page" / "agla"', '"previous page" / "pichhla"', '"first page" / "pehla page"', '"last page" / "aakhri page"'],
  },
  {
    title: 'Scrolling:',
    commands: ['"scroll up" / "upro"', '"scroll down" / "niche"', '"go to top"', '"go to bottom"'],
  },
  {
    title: 'Zoom & View:',
    commands: ['"zoom in" / "bada karo"', '"zoom out" / "chhota karo"', '"reset zoom"', '"fit page"', '"fit width"', '"fullscreen"'],
  },
];

export default function VoiceNavigationPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [fileName, setFileName] = useState('');

  var [isListening, setIsListening] = useState(false);
  var [micStatus, setMicStatus] = useState('Voice Navigation is off');
  var [transcript, setTranscript] = useState('Click microphone to enable Voice Navigation');
  var [feedback, setFeedback] = useState('');
  var [feedbackType, setFeedbackType] = useState('success');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [zoomLevel, setZoomLevel] = useState(120);

  var fileInputRef = useRef(null);
  var canvasViewportRef = useRef(null);
  var recognitionRef = useRef(null);

  var processCommand = useCallback(async function (text) {
    try {
      var res = await fetch(API_BASE + '/voice-navigation/process-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, current_page: currentPage, total_pages: totalPages }),
      });
      if (!res.ok) throw new Error('API failed');
      var data = await res.json();
      setFeedback(data.feedback_speech || '');
      setFeedbackType(data.executed ? 'success' : 'error');

      if (data.executed) executeAction(data);
      if (data.feedback_speech && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var utt = new SpeechSynthesisUtterance(data.feedback_speech);
        utt.rate = 1.0;
        window.speechSynthesis.speak(utt);
      }
    } catch (err) {
      console.error('Voice command error:', err);
    }
  }, [currentPage, totalPages]);

  var executeAction = useCallback(function (data) {
    setMicStatus('Command: ' + data.action);
    switch (data.action) {
      case 'next_page': setCurrentPage(function (p) { return Math.min(p + 1, totalPages); }); break;
      case 'prev_page': setCurrentPage(function (p) { return Math.max(p - 1, 1); }); break;
      case 'first_page': setCurrentPage(1); break;
      case 'last_page': setCurrentPage(totalPages); break;
      case 'jump_section': case 'jump_page':
        if (data.target_page) setCurrentPage(Math.min(Math.max(1, data.target_page), totalPages));
        break;
      case 'zoom_in': setZoomLevel(function (z) { return Math.min(300, z + 25); }); break;
      case 'zoom_out': setZoomLevel(function (z) { return Math.max(50, z - 25); }); break;
      case 'zoom_reset': case 'fit_page': setZoomLevel(100); break;
      case 'fit_width': setZoomLevel(150); break;
      case 'scroll_up': canvasViewportRef.current && canvasViewportRef.current.scrollBy({ top: -250, behavior: 'smooth' }); break;
      case 'scroll_down': canvasViewportRef.current && canvasViewportRef.current.scrollBy({ top: 250, behavior: 'smooth' }); break;
      case 'scroll_top': canvasViewportRef.current && canvasViewportRef.current.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'scroll_bottom': canvasViewportRef.current && canvasViewportRef.current.scrollTo({ top: canvasViewportRef.current.scrollHeight, behavior: 'smooth' }); break;
      case 'fullscreen': if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () { }); break;
      case 'exit_fullscreen': if (document.fullscreenElement) document.exitFullscreen().catch(function () { }); break;
      default: break;
    }
  }, [totalPages]);

  useEffect(function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicStatus('Voice Navigation is not supported in this browser.');
      setTranscript('Web Speech API missing. Please use Chrome, Edge, or Safari.');
      return;
    }
    var recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onstart = function () {
      setIsListening(true);
      setMicStatus('Listening for commands...');
      setTranscript('Speak a command (e.g., "Next page", "Go to page 3", "Zoom in")');
    };

    recog.onend = function () {
      if (isListening) { try { recog.start(); } catch (e) { } }
      else {
        setIsListening(false);
        setMicStatus('Voice Navigation is off');
        setTranscript('Click microphone to enable Voice Navigation');
        setFeedback('');
      }
    };

    recog.onerror = function (e) {
      if (e.error === 'not-allowed') {
        setMicStatus('Microphone permission required');
        setTranscript('Please allow microphone access in your browser.');
        setIsListening(false);
      } else if (e.error === 'no-speech') {
        setMicStatus('Listening for commands...');
      }
    };

    recog.onresult = function (e) {
      var last = e.results[e.results.length - 1];
      if (last.isFinal) {
        var text = last[0].transcript.trim();
        setTranscript('"' + text + '"');
        processCommand(text);
      }
    };

    recognitionRef.current = recog;
  }, [isListening, processCommand]);

  var toggleMic = useCallback(function () {
    if (!recognitionRef.current) return;
    if (isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    } else {
      try { recognitionRef.current.start(); } catch (e) { }
    }
  }, [isListening]);

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Loading ' + file.name + '...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var data = await res.json();
      if (res.ok) {
        setDocumentId(data.document_id);
        setFileName(data.filename);
        setTotalPages(data.page_count || 1);
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

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-purple-600 cursor-pointer mb-4">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span> to Dashboard
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-purple-600" /> Voice Navigation Studio
            </h1>
            <p className="text-sm text-slate-500 mt-1">Control PDF page navigation, scrolling, zoom levels, and viewer actions using natural voice commands.</p>
          </div>
          <span className="px-4 py-1.5 rounded-full text-[13px] font-semibold" style={{ background: isListening ? '#059669' : 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
            Voice Control: {isListening ? 'ON' : 'OFF'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
            <div
              onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-slate-300 hover:border-purple-400 hover:bg-purple-50/50"
            >
              <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h4 className="m-0 text-sm font-semibold text-slate-800">Upload PDF Document</h4>
              <p className="m-0 text-[11px] text-slate-500">Click or Drag & Drop PDF here</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            {fileStatus && <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#059669' : '#ef4444' }}>{fileStatus}</div>}

            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-slate-50 border border-slate-200">
              <button onClick={toggleMic}
                className={'w-[72px] h-[72px] rounded-full border-none text-white text-2xl cursor-pointer flex items-center justify-center transition-all shadow-lg ' +
                  (isListening ? 'bg-red-600 animate-pulse' : 'bg-purple-600 hover:bg-purple-700 hover:scale-105')
                } style={{ boxShadow: isListening ? '0 0 0 0 rgba(220,38,38,0.35)' : '0 4px 16px rgba(124,58,237,0.3)' }}>
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <h3 className="text-sm font-medium text-slate-600 text-center m-0">{micStatus}</h3>
              <p className="text-sm text-slate-800 italic p-3 rounded-lg bg-white border border-slate-200 min-h-[48px] w-full text-center m-0">{transcript}</p>
              {feedback && (
                <span className={'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ' + (feedbackType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                  <Volume2 className="w-3 h-3" /> {feedback}
                </span>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="m-0 mb-3 text-[13px] font-semibold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="text-purple-600">{'\u2611'}</span> Supported Commands</span>
              </h4>
              <div className="text-xs">
                {commandGroups.map(function (group, gi) {
                  return (
                    <div key={gi} className="mb-2">
                      <strong className="block text-slate-600 mb-1">{group.title}</strong>
                      <div className="flex flex-wrap gap-1.5">
                        {group.commands.map(function (cmd, ci) {
                          return <span key={ci} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border border-slate-200 bg-white text-slate-800 whitespace-nowrap shadow-sm hover:border-purple-400 hover:bg-purple-50 hover:text-purple-600 transition">{cmd}</span>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[600px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white min-h-[52px] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button onClick={function () { setCurrentPage(function (p) { return Math.max(1, p - 1); }); }} disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-[13px] font-bold text-blue-800">Page {currentPage} of {totalPages}</span>
                <button onClick={function () { setCurrentPage(function (p) { return Math.min(p + 1, totalPages); }); }} disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={function () { setZoomLevel(function (z) { return Math.max(50, z - 25); }); }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[13px] font-bold text-slate-700 min-w-[40px] text-center">{zoomLevel}%</span>
                <button onClick={function () { setZoomLevel(function (z) { return Math.min(300, z + 25); }); }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={function () { setZoomLevel(150); }}
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Fit Width</button>
                <button onClick={function () { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () { }); else document.exitFullscreen().catch(function () { }); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                </button>
              </div>
            </div>
            <div ref={canvasViewportRef} className="flex-1 overflow-auto p-8 bg-slate-50 flex justify-center">
              <div className="max-w-[720px] w-full rounded-xl border border-slate-200 shadow-md bg-white min-h-[400px] flex items-center justify-center p-8">
                {!documentId ? (
                  <div className="text-center text-slate-400">
                    <Mic className="w-10 h-10 mx-auto mb-3 text-purple-400" />
                    <p className="text-sm">Upload a PDF and enable voice commands to navigate hands-free.</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-600 font-semibold">{fileName}</p>
                    <p className="text-xs text-slate-400 mt-1">Page {currentPage} of {totalPages} | Zoom {zoomLevel}%</p>
                    <p className="text-xs text-slate-400 mt-2 italic">Voice commands active - speak to navigate</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
