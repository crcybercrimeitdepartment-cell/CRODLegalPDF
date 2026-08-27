import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import {  ArrowLeft, CloudUpload, Play, Pause, Square, SkipBack, SkipForward , SlidersHorizontal } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Open PDF',
  'Select Feature',
  'Choose Voice',
  'Start Playback',
  'Controls',
  'Close Session',
];

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'ja-JP', label: 'Japanese' },
];

const SPEED_PRESETS = [0.8, 1.0, 1.2, 1.5, 2.0];

export default function ReadAloudPage({ onBack }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [readingMode, setReadingMode] = useState('full');
  const [manifest, setManifest] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeBbox, setActiveBbox] = useState(null);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const voicesRef = useRef([]);
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  const currentStep = !documentId ? 1 : !manifest ? 2 : 3;
  const postPdf = useCallback(async function (endpoint, file) {
    if (!file) return null;
    var formData = new FormData();
    formData.append('file', file);
    var res = await fetch(API_BASE + endpoint, { method: 'POST', body: formData });

    if (!res.ok) {
      var message = 'Request failed (' + res.status + ')';
      try {
        var errData = await res.json();
        message = errData.detail || errData.error || errData.message || message;
      } catch (parseError) {
        console.error(parseError);
        try {
          var text = await res.text();
          if (text) message = text;
        } catch (textError) {
          console.error(textError);
        }
      }
      throw new Error(message);
    }

    return res.json();
  }, []);

  const fetchManifest = useCallback(async function () {
    if (!pdfFile) return;
    try {
      var data = await postPdf('/read-aloud', pdfFile);
      var readAloud = data && data.read_aloud ? data.read_aloud : {};
      var text = readAloud.text || '';
      var blocks = text
        .split(/\n+/)
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .map(function (line, index) {
          return {
            id: index + 1,
            page_number: 1,
            text: line,
            bbox: null,
          };
        });
      var words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      var generatedManifest = {
        blocks: blocks,
        total_words: words,
        estimated_duration_sec: words > 0 ? Math.ceil((words / Math.max(speed, 0.1)) * 0.45) : 0,
        language: language,
      };

      setManifest(generatedManifest);
      setSentences(blocks);
      setEstimatedDuration(generatedManifest.estimated_duration_sec || 0);
      setTotalWords(generatedManifest.total_words || 0);
      setCurrentIndex(0);
      setActiveBbox(null);
    } catch (err) {
      alert('Manifest error: ' + err.message);
    }
  }, [pdfFile, speed, language, postPdf]);

  useEffect(function () {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    function loadVoices() {
      var v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        voicesRef.current = v;
        setVoices(v);
      }
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return function () {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(function () {
    if (documentId && !manifest) {
      fetchManifest();
    }
  }, [documentId, manifest, fetchManifest]);

  useEffect(function () {
    return function () {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(function () {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(function () {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const uploadPdf = useCallback(async function (file) {
    setLoading(true);
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var data = await res.json();
      if (res.ok) {
        setDocumentId(data.document_id);
        setPdfFile(file);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setLoading(false);
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

  var filteredVoices = voices.filter(function (v) {
    return v.lang === language || v.lang.startsWith(language.split('-')[0]);
  });

  var handleLanguageChange = useCallback(function (e) {
    setLanguage(e.target.value);
    setSelectedVoice(null);
    setManifest(null);
  }, []);

  var handleVoiceChange = useCallback(function (e) {
    var voice = voices.find(function (v) { return v.name === e.target.value; });
    setSelectedVoice(voice || null);
  }, [voices]);

  var handleSpeedChange = useCallback(function (e) {
    setSpeed(parseFloat(e.target.value));
    setManifest(null);
  }, []);

  var handlePitchChange = useCallback(function (e) {
    setPitch(parseFloat(e.target.value));
  }, []);

  var handleSpeedPreset = useCallback(function (val) {
    setSpeed(val);
    setManifest(null);
  }, []);

  var renderPdfPage = useCallback(function (pdf, num, bbox) {
    if (!pdf) return;
    pdf.getPage(num).then(function (page) {
      var vp = page.getViewport({ scale: 1.2 });
      var c = canvasRef.current;
      if (!c) return;
      c.width = vp.width;
      c.height = vp.height;
      var ctx = c.getContext('2d');
      page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        if (bbox && num === bbox.page_number) {
          var b = bbox;
          ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
          ctx.strokeStyle = '#7c3aed';
          ctx.lineWidth = 2;
          ctx.fillRect(b.x, b.y, b.width, b.height);
          ctx.strokeRect(b.x, b.y, b.width, b.height);
        }
      });
    });
  }, []);

  var loadPdf = useCallback(function (input) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    var task =
      typeof input === 'string'
        ? window.pdfjsLib.getDocument(input)
        : window.pdfjsLib.getDocument({ data: input });
    task.promise
      .then(function (pdf) {
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        renderPdfPage(pdf, 1, null);
      })
      .catch(function (e) {
        console.error(e);
      });
  }, [renderPdfPage]);

  var goToPage = useCallback(
    function (page) {
      if (page < 1 || page > totalPages) return;
      setCurrentPage(page);
      if (pdfDocRef.current) {
        renderPdfPage(pdfDocRef.current, page, activeBbox);
      }
    },
    [totalPages, renderPdfPage, activeBbox]
  );

  useEffect(
    function () {
      if (pdfDocRef.current) renderPdfPage(pdfDocRef.current, currentPage, activeBbox);
    },
    [currentPage, renderPdfPage, activeBbox]
  );

  useEffect(
    function () {
      if (documentId && pdfFile) {
        pdfFile.arrayBuffer().then(function (buf) {
          loadPdf(buf);
        });
      }
    },
    [documentId, pdfFile, loadPdf]
  );

  useEffect(
    function () {
      if (manifest && sentences.length > 0 && pdfDocRef.current) {
        var block = sentences[currentIndex];
        if (block && block.page_number) {
          setCurrentPage(block.page_number);
          setActiveBbox(block.bbox ? { ...block.bbox, page_number: block.page_number } : null);
        }
      }
    },
    [currentIndex, sentences, manifest]
  );

  var speakSentence = useCallback(function (idx) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (idx < 0 || idx >= sentences.length) return;

    var block = sentences[idx];
    if (!block) return;

    var bboxData = block.bbox ? { ...block.bbox, page_number: block.page_number } : null;
    setActiveBbox(bboxData);

    var utt = new SpeechSynthesisUtterance(block.text);
    utt.rate = speed;
    utt.pitch = pitch;
    utt.lang = language;
    if (selectedVoice) utt.voice = selectedVoice;

    utt.onend = function () {
      if (!isPlayingRef.current) return;
      var nextIdx = currentIndexRef.current + 1;
      if (nextIdx < sentences.length) {
        setCurrentIndex(nextIdx);
        speakSentence(nextIdx);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentIndex(0);
        setActiveBbox(null);
      }
    };

    utt.onerror = function () {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }, [sentences, speed, pitch, language, selectedVoice]);

  var play = useCallback(function () {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (sentences.length === 0) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    var idx = currentIndex >= sentences.length ? 0 : currentIndex;
    setCurrentIndex(idx);
    setIsPlaying(true);
    setIsPaused(false);
    speakSentence(idx);
  }, [sentences, currentIndex, isPaused, speakSentence]);

  var pause = useCallback(function () {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  var stop = useCallback(function () {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setActiveBbox(null);
  }, []);

  var prevSentence = useCallback(function () {
    if (currentIndex > 0) {
      var newIdx = currentIndex - 1;
      setCurrentIndex(newIdx);
      if (isPlaying) {
        speakSentence(newIdx);
      }
    }
  }, [currentIndex, isPlaying, speakSentence]);

  var nextSentence = useCallback(function () {
    if (currentIndex < sentences.length - 1) {
      var newIdx = currentIndex + 1;
      setCurrentIndex(newIdx);
      if (isPlaying) {
        speakSentence(newIdx);
      }
    }
  }, [currentIndex, sentences.length, isPlaying, speakSentence]);

  var progressPercent = sentences.length > 0
    ? ((currentIndex + 1) / sentences.length) * 100
    : 0;

  var closeSession = useCallback(function () {
    stop();
    setManifest(null);
    setSentences([]);
    setCurrentIndex(0);
    setDocumentId(null);
    setPdfFile(null);
    setEstimatedDuration(0);
    setTotalWords(0);
    setActiveBbox(null);
    if (pdfDocRef.current) pdfDocRef.current = null;
    if (canvasRef.current) {
      var ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [stop]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Read Aloud</h1>
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
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50')
              }
            >
              <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm text-slate-800">
                Click or Drag PDF Document
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                High-Quality Natural Voice Reader
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            {loading && (
              <div className="text-xs font-semibold text-purple-600">Uploading...</div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Language &amp; Natural Voice
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600">Language</label>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
              >
                {LANGUAGES.map(function (lang) {
                  return (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600">Voice Engine</label>
              <select
                value={selectedVoice ? selectedVoice.name : ''}
                onChange={handleVoiceChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
              >
                <option value="">Default Voice</option>
                {filteredVoices.map(function (v) {
                  return (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600">
                Speed: {speed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={speed}
                onChange={handleSpeedChange}
                className="w-full accent-purple-600"
              />
              <div className="flex items-center gap-1 mt-1">
                {SPEED_PRESETS.map(function (val) {
                  return (
                    <button
                      key={val}
                      onClick={function () { handleSpeedPreset(val); }}
                      className={
                        'px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-all ' +
                        (Math.abs(speed - val) < 0.01
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }
                    >
                      {val}x
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600">
                Pitch: {pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={handlePitchChange}
                className="w-full accent-purple-600"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reading Mode Selection
            </div>
            <select
              value={readingMode}
              onChange={function (e) { setReadingMode(e.target.value); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
            >
              <option value="full">Full Document</option>
              <option value="page">Current Page</option>
              <option value="selection">Selected Text</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2">
            <button
              onClick={play}
              disabled={!manifest || sentences.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7c3aed' }}
            >
              <Play className="w-4 h-4" />
              Start Read Aloud Playback
            </button>
            <button
              onClick={closeSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
            >
              Close Session
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 border-l border-slate-200 relative min-w-0 p-4 sm:p-6">
          <div
            className="rounded-xl p-5 text-white flex flex-col gap-4"
            style={{ background: 'linear-gradient(to right, #7c3aed, #4c1d95)' }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={prevSentence}
                disabled={currentIndex === 0 || sentences.length === 0}
                className="w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={function () { isPlaying ? pause() : play(); }}
                disabled={!manifest || sentences.length === 0}
                className="w-11 h-11 flex items-center justify-center bg-white rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                style={{ color: '#7c3aed' }}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                onClick={stop}
                disabled={!manifest || sentences.length === 0}
                className="w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={nextSentence}
                disabled={currentIndex >= sentences.length - 1 || sentences.length === 0}
                className="w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <div className="flex flex-col ml-2">
                <span className="text-xs font-medium text-white/90">
                  {sentences.length > 0
                    ? 'Sentence ' + (currentIndex + 1) + ' of ' + sentences.length
                    : 'No document loaded'}
                </span>
                <span className="text-[10px] text-white/60">
                  {totalWords > 0 ? totalWords + ' words' : ''}{' '}
                  {estimatedDuration > 0 ? ' ~ ' + Math.round(estimatedDuration) + 's' : ''}
                </span>
              </div>
            </div>
            <div className="w-full">
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: progressPercent + '%' }}
                />
              </div>
              <div className="text-[10px] text-white/60 mt-1 text-right">
                {Math.round(progressPercent)}%
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">
              Real-Time Synchronized Text Transcript
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {sentences.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  Upload a PDF document to see the transcript.
                </div>
              ) : (
                sentences.map(function (block, i) {
                  return (
                    <div
                      key={i}
                      className={
                        'p-2 border-b border-slate-100 text-xs cursor-pointer transition-all ' +
                        (i === currentIndex
                          ? 'border-l-4 border-l-purple-600 bg-purple-50'
                          : 'border-l-4 border-l-transparent hover:bg-slate-50')
                      }
                      onClick={function () {
                        setCurrentIndex(i);
                        if (isPlaying) {
                          speakSentence(i);
                        }
                      }}
                    >
                      <span className="font-bold text-purple-600 mr-2">
                        p.{block.page_number || 1}
                      </span>
                      <span className="text-slate-700">{block.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={function () { if (currentPage > 1) goToPage(currentPage - 1); }}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-slate-700">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={function () { if (currentPage < totalPages) goToPage(currentPage + 1); }}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                Next
              </button>
            </div>
            <canvas
              ref={canvasRef}
              className="max-w-full border border-slate-200 rounded-lg"
            />
            {!pdfFile && (
              <div className="text-xs text-slate-500 py-4 text-center">
                No PDF loaded. Upload a document to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
