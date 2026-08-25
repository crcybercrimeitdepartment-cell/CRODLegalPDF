import React, { useState, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Sparkles, Zap, Brain, Download } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

export default function AccessibilityFixSuggestionsAIPage({ onBack }) {
  var [suggestions, setSuggestions] = useState([]);
  var [loading, setLoading] = useState(false);
  var [applying, setApplying] = useState(false);
  var [isDragOver, setIsDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');
  var [downloadUrl, setDownloadUrl] = useState('');
  var [uploadedFile, setUploadedFile] = useState(null);
  var fileInputRef = useRef(null);

  var uploadAndAnalyze = useCallback(async function (file) {
    setFileStatus('Uploading ' + file.name + '...');
    setLoading(true);
    setUploadedFile(file);
    setSuggestions([]);
    setDownloadUrl('');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/fix-suggestions', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Analysis failed');
      var data = await res.json();
      if (data.success) {
        setSuggestions((data.suggestions || []).map(function (s) {
          return Object.assign({}, s, { checked: true });
        }));
        setFileStatus('\u2713 Analysis complete: ' + file.name);
      } else {
        setFileStatus('\u2717 No suggestions available for this document');
      }
    } catch (err) {
      setFileStatus('\u2717 Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    setIsDragOver(false);
    var f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') uploadAndAnalyze(f);
  }, [uploadAndAnalyze]);

  var handleFileSelect = useCallback(function (e) {
    var f = e.target.files[0];
    if (f) uploadAndAnalyze(f);
  }, [uploadAndAnalyze]);

  var toggleCheck = useCallback(function (id) {
    setSuggestions(function (prev) {
      return prev.map(function (s) {
        return s.suggestion_id === id ? Object.assign({}, s, { checked: !s.checked }) : s;
      });
    });
  }, []);

  var applyAll = useCallback(async function () {
    var selected = suggestions.filter(function (s) { return s.checked; });
    if (selected.length === 0) { alert('Please select at least one recommendation.'); return; }
    if (!uploadedFile) { alert('Please upload a PDF first.'); return; }
    setApplying(true);
    try {
      var formData = new FormData();
      formData.append('file', uploadedFile);
      var selectedIds = selected.map(function (s) { return s.suggestion_id; });
      formData.append('selected_suggestion_ids', JSON.stringify(selectedIds));
      var res = await fetch(API_BASE + '/fix-suggestions', {
        method: 'POST',
        body: formData,
      });
      var data = await res.json();
      if (data.success) {
        alert('Applied ' + selected.length + ' AI fix recommendations!');
        if (data.download_url) {
          setDownloadUrl(data.download_url);
        }
        var formData2 = new FormData();
        formData2.append('file', uploadedFile);
        var res2 = await fetch(API_BASE + '/fix-suggestions', { method: 'POST', body: formData2 });
        var data2 = await res2.json();
        if (data2.success) {
          setSuggestions((data2.suggestions || []).map(function (s) {
            return Object.assign({}, s, { checked: true });
          }));
        }
      } else {
        alert('Apply failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Apply failed: ' + err.message);
    } finally {
      setApplying(false);
    }
  }, [suggestions, uploadedFile]);

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      <div className="absolute top-1.5 left-4 sm:top-5 sm:left-8 md:left-12 z-50 flex items-center w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] min-h-[40px]">
        <div className="absolute left-0 z-10">
          {onBack && (
            <button onClick={onBack}
              className="text-slate-700 hover:text-[#1e2a52] font-bold flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center pointer-events-none w-full px-20">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Accessibility Fix Suggestions (AI)</h1>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={function () { setIsDragOver(false); }}
            className={"border-2 border-dashed rounded-2xl py-10 px-8 text-center cursor-pointer transition " + (isDragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/30')}
          >
            <Upload className="w-10 h-10 text-teal-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here for AI accessibility fix suggestions</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {suggestions.length > 0 && (
          <div className="flex justify-between items-center mb-5">
            <h3 className="m-0 text-base font-bold text-slate-900">AI Context-Aware Recommendations ({suggestions.length})</h3>
            <div className="flex items-center gap-3">
              {downloadUrl && (
                <a href={downloadUrl} download
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition">
                  <Download className="w-4 h-4" /> Download Fixed PDF
                </a>
              )}
              <button onClick={applyAll} disabled={applying || loading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 cursor-pointer transition">
                {applying ? <span className="animate-spin">{'\u23F3'}</span> : <Zap className="w-4 h-4" />}
                {applying ? 'Applying...' : 'Auto-Apply Selected AI Fixes'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-semibold">Analyzing document for accessibility issues...</p>
          </div>
        )}

        {!loading && suggestions.length === 0 && !fileStatus && (
          <div className="text-center py-16 text-slate-400">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-slate-600">Upload a PDF to get AI-powered fix suggestions</p>
            <p className="text-sm mt-1">AI will analyze your document and suggest accessibility improvements</p>
          </div>
        )}

        {!loading && suggestions.length === 0 && fileStatus && !fileStatus.includes('\u2717') && (
          <div className="text-center py-12 text-slate-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No accessibility issues found. Your document looks great!</p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-4">
            {suggestions.map(function (s) {
              var isChecked = s.checked !== false;
              return (
                <div key={s.suggestion_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-teal-200 transition">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" checked={isChecked} onChange={function () { toggleCheck(s.suggestion_id); }}
                        className="w-[18px] h-[18px] cursor-pointer accent-teal-600" />
                      <strong className="text-[16px] text-slate-800">{s.issue_title}</strong>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{s.category}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700">
                      <Brain className="w-3.5 h-3.5" /> {Math.round((s.confidence_score || 0.8) * 100)}% AI Match
                    </span>
                  </div>
                  <p className="m-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-md border-l-[3px] border-teal-500">
                    <strong>AI Recommendation:</strong> {s.ai_recommendation}
                  </p>
                  {s.proposed_value && (
                    <div className="text-xs text-slate-500 mt-1.5">
                      Proposed Property Value: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-teal-700 font-bold">{s.proposed_value}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
