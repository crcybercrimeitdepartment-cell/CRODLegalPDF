import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, List, XCircle, AlertTriangle, BarChart3, CheckCircle2, Sparkles, Download, ChevronRight, FileText } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

var LEVEL_STYLES = {
  1: { bg: '#eef2ff', color: '#4f46e5' },
  2: { bg: '#f0fdf4', color: '#16a34a' },
  3: { bg: '#fffbeb', color: '#d97706' },
  4: { bg: '#fef2f2', color: '#dc2626' },
  5: { bg: '#f5f3ff', color: '#7c3aed' },
  6: { bg: '#f0f9ff', color: '#0284c7' },
};

export default function HeadingStructureValidationPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showResults, setShowResults] = useState(false);

  var [headings, setHeadings] = useState([]);
  var [issues, setIssues] = useState([]);
  var [totalHeadings, setTotalHeadings] = useState(0);
  var [errorCount, setErrorCount] = useState(0);
  var [warningCount, setWarningCount] = useState(0);
  var [structureScore, setStructureScore] = useState(100);

  var [fixing, setFixing] = useState(false);

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
      await runAudit(data.document_id);
    } catch (err) { setFileStatus('\u2717 Upload error: ' + err.message); }
  }, []);

  var runAudit = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/heading-validation/' + docId + '/audit');
      var data = await res.json();
      if (data.success) {
        setHeadings(data.headings || []);
        setIssues(data.issues || []);
        setTotalHeadings(data.total_headings_count || 0);
        setStructureScore(data.structure_score || 100);
        var errs = (data.issues || []).filter(function (i) { return i.severity.toLowerCase() === 'error'; }).length;
        var warns = (data.issues || []).filter(function (i) { return i.severity.toLowerCase() === 'warning'; }).length;
        setErrorCount(errs);
        setWarningCount(warns);
        setShowResults(true);
      }
    } catch (err) { console.error(err); }
  }, []);

  var fixHeadings = useCallback(async function () {
    if (!documentId) return;
    setFixing(true);
    try {
      var res = await fetch(API_BASE + '/heading-validation/' + documentId + '/fix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_correct_skipped_levels: true, ensure_single_h1: true }),
      });
      var data = await res.json();
      if (data.success) { alert('Heading hierarchy corrected!'); await runAudit(documentId); }
      else alert('Could not auto-correct.');
    } catch (err) { console.error(err); }
    finally { setFixing(false); }
  }, [documentId, runAudit]);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">{'\uD83D\uDCC8'} Heading Structure Validation</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30 transition">
            <Upload className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here to validate</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {showResults && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-indigo-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-indigo-50 text-indigo-600"><List className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Total Headings</div><div className="text-xl font-bold text-slate-800">{totalHeadings}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-red-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-red-50 text-red-600"><XCircle className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Errors</div><div className="text-xl font-bold text-slate-800">{errorCount}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-amber-50 text-amber-600"><AlertTriangle className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Warnings</div><div className="text-xl font-bold text-slate-800">{warningCount}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-emerald-50 text-emerald-600"><BarChart3 className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Hierarchy Score</div><div className="text-xl font-bold text-slate-800">{structureScore}%</div></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <h3 className="m-0 text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                    <span className="text-indigo-600">{'\uD83D\uDDC2'}</span> Logical Heading Outline
                  </h3>
                  <button onClick={fixHeadings} disabled={fixing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                    {fixing ? <span className="animate-spin">{'\u23F3'}</span> : <Sparkles className="w-3.5 h-3.5" />}
                    {fixing ? 'Fixing...' : 'Auto-Fix'}
                  </button>
                </div>
                <div className="max-h-[500px] overflow-y-auto pr-1.5">
                  {headings.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 m-0">No headings detected.</p>
                  ) : headings.map(function (h, i) {
                    var ls = LEVEL_STYLES[h.level] || LEVEL_STYLES[6];
                    return (
                      <div key={i} className="flex items-center gap-2.5 py-2 px-3 rounded-md hover:bg-slate-50 transition cursor-default"
                        style={{ marginLeft: Math.max(0, (h.level - 1) * 20) }}>
                        <span className="inline-flex items-center justify-center w-8 h-6 text-[11px] font-bold rounded flex-shrink-0"
                          style={{ background: ls.bg, color: ls.color }}>H{h.level}</span>
                        <span className="text-sm font-semibold text-slate-800">{h.text}</span>
                        <span className="text-[11px] text-slate-400 ml-1">(Page {h.page_number})</span>
                        <span className="ml-auto flex-shrink-0">
                          {h.is_skipped_level
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                                <AlertTriangle className="w-3 h-3" /> Skipped
                              </span>
                            : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <h3 className="m-0 text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                    <span className="text-amber-600">{'\u26A0'}</span> Structural Audit Findings
                  </h3>
                  {showResults && (
                    <a href={API_BASE + '/' + documentId + '/download'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 no-underline">
                      <Download className="w-3.5 h-3.5" /> Save PDF
                    </a>
                  )}
                </div>
                <div className="max-h-[500px] overflow-y-auto pr-1.5">
                  {issues.length === 0 ? (
                    <div className="text-center py-12 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      <p className="m-0">Heading hierarchy is completely valid! No structural issues found.</p>
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="text-left py-2.5 px-3 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Page</th>
                          <th className="text-left py-2.5 px-3 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Severity</th>
                          <th className="text-left py-2.5 px-3 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Issue Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issues.map(function (iss, i) {
                          var isError = iss.severity.toLowerCase() === 'error';
                          return (
                            <tr key={i} className="hover:bg-slate-50 transition">
                              <td className="py-2 px-3 border-b border-slate-100 font-semibold text-slate-800">Page {iss.page_number}</td>
                              <td className="py-2 px-3 border-b border-slate-100">
                                <span className={"inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold " + (isError ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
                                  {iss.severity}
                                </span>
                              </td>
                              <td className="py-2 px-3 border-b border-slate-100 text-slate-600">{iss.description}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
