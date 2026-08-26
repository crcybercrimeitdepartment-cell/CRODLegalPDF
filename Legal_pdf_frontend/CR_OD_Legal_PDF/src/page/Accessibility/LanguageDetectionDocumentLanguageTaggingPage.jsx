import React, { useState, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Globe, Tag, BarChart3, AlertTriangle, Download, CheckCircle2 } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

var LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'or', name: 'Odia' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

export default function LanguageDetectionDocumentLanguageTaggingPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showResults, setShowResults] = useState(false);

  var [detectedLang, setDetectedLang] = useState({ name: '', code: '' });
  var [currentTag, setCurrentTag] = useState('Not Tagged');
  var [confidence, setConfidence] = useState(0);
  var [tagStatus, setTagStatus] = useState('Review Required');
  var [selectedLang, setSelectedLang] = useState('en');
  var [segments, setSegments] = useState([]);

  var [applying, setApplying] = useState(false);
  var fileInputRef = useRef(null);

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Uploading ' + file.name + '...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      var data = await res.json();
      setDocumentId(data.document_id);
      setFileStatus('\u2713 Uploaded: ' + data.filename);
      await runDetection(data.document_id);
    } catch (err) { setFileStatus('\u2717 Upload error: ' + err.message); }
  }, []);

  var runDetection = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/language-detection/' + docId + '/detect');
      var data = await res.json();
      if (data.success) {
        setDetectedLang({ name: data.primary_language_name, code: data.primary_language_code });
        setCurrentTag(data.current_pdf_lang_tag || 'Not Tagged');
        setConfidence(Math.round(data.confidence * 100));
        setSelectedLang(data.primary_language_code);
        setSegments(data.segments || []);

        var statusText = 'Review Required';
        if (data.is_tag_matching) statusText = 'Tag Matches';
        else if (!data.current_pdf_lang_tag) statusText = 'Untagged';
        else statusText = 'Tag Mismatch';
        if (data.confidence < 0.60) statusText = 'Review Required';
        setTagStatus(statusText);
        setShowResults(true);
      }
    } catch (err) { console.error(err); }
  }, []);

  var applyTag = useCallback(async function () {
    if (!documentId) return;
    setApplying(true);
    try {
      var res = await fetch(API_BASE + '/language-detection/' + documentId + '/apply-tag', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_lang_code: selectedLang, apply_to_all_pages: true }),
      });
      var data = await res.json();
      if (data.success) {
        alert("ISO language tag '" + selectedLang + "' written to PDF catalog!");
        await runDetection(documentId);
      } else alert('Failed to apply language tag.');
    } catch (err) { console.error(err); }
    finally { setApplying(false); }
  }, [documentId, selectedLang, runDetection]);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var isTagMatch = tagStatus === 'Tag Matches';
  var isUntagged = tagStatus === 'Untagged';

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Language Detection & Tagging Studio</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30 transition">
            <Upload className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here to detect language</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {showResults && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600"><Globe className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Detected Language</div><div className="text-xl font-bold text-slate-800">{detectedLang.name} ({detectedLang.code})</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-indigo-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600"><Tag className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Existing PDF Tag</div><div className="text-xl font-bold text-slate-800">{currentTag}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600"><BarChart3 className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Confidence</div><div className="text-xl font-bold text-slate-800">{confidence}%</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition">
                <div className={"w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 " + (isTagMatch ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                  {isTagMatch ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Status</div><div className="text-xl font-bold text-slate-800">{tagStatus}</div></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="m-0 text-[15px] font-semibold text-slate-800 pb-3 mb-4 border-b border-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Language Tagging
                </h3>
                <p className="m-0 mb-3 text-[13px] text-slate-500 leading-relaxed">Confirm the detected primary language, or select a different one manually to update the PDF catalog's <code className="bg-slate-100 px-1 rounded text-xs">/Lang</code> field.</p>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Language Code:</label>
                <select value={selectedLang} onChange={function (e) { setSelectedLang(e.target.value); }}
                  className="w-full py-1.5 px-2.5 border border-slate-300 rounded text-[13px] bg-white text-slate-800 cursor-pointer mb-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-blue-400 transition">
                  {LANGUAGES.map(function (lang) {
                    return <option key={lang.code} value={lang.code}>{lang.name} ({lang.code})</option>;
                  })}
                </select>
                <button onClick={applyTag} disabled={applying}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer w-full mb-3 transition">
                  {applying ? <span className="animate-spin">{'\u23F3'}</span> : <Tag className="w-4 h-4" />}
                  {applying ? 'Tagging...' : 'Confirm & Tag PDF'}
                </button>
                <a href={API_BASE + '/' + documentId + '/download'}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 no-underline w-full transition shadow-sm">
                  <Download className="w-4 h-4" /> Save PDF
                </a>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="m-0 text-[15px] font-semibold text-slate-800 pb-3 mb-4 border-b border-slate-200 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" /> Passage & Part-Level Language Analysis
                </h3>
                <div className="max-h-[500px] overflow-y-auto pr-1.5">
                  {segments.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 m-0">No passage segments detected.</p>
                  ) : segments.map(function (seg, i) {
                    return (
                      <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 mb-2.5 hover:shadow-md hover:border-blue-200 transition flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-800">Page {seg.page_number} Segment:</div>
                          <p className="m-1 mt-0.5 text-[13px] text-slate-600 italic">"{seg.text_snippet}"</p>
                        </div>
                        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 whitespace-nowrap flex-shrink-0">
                          {seg.detected_lang_name} ({seg.detected_lang_code})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
