import React, { useState, useRef, useCallback, useMemo } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Star, Tag, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Search } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var PRINCIPLE_COLORS = {
  Perceivable: '#3b82f6',
  Operable: '#8b5cf6',
  Understandable: '#10b981',
  Robust: '#ec4899',
};

export default function WCAGComplianceCheckerPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showResults, setShowResults] = useState(false);

  var [score, setScore] = useState(0);
  var [statusText, setStatusText] = useState('Compliant');
  var [passedCount, setPassedCount] = useState(0);
  var [failedCount, setFailedCount] = useState(0);
  var [warningCount, setWarningCount] = useState(0);
  var [manualCount, setManualCount] = useState(0);

  var [allCriteria, setAllCriteria] = useState([]);

  var [filterPrinciple, setFilterPrinciple] = useState('ALL');
  var [filterStatus, setFilterStatus] = useState('ALL');
  var [filterLevel, setFilterLevel] = useState('ALL');
  var [sortBy, setSortBy] = useState('severity');
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
      await runScan(data.document_id);
    } catch (err) { setFileStatus('\u2717 Upload error: ' + err.message); }
  }, []);

  var runScan = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/wcag-checker/' + docId + '/scan');
      var data = await res.json();
      if (data.success) {
        var criteria = data.criteria || [];
        setAllCriteria(criteria);
        setScore(data.overall_wcag_score);
        setPassedCount(data.passed_count);
        setFailedCount(data.failed_count);
        setWarningCount(data.warning_count);
        setManualCount(criteria.filter(function (c) { return c.status === 'MANUAL_REVIEW'; }).length);

        var st = 'COMPLIANT';
        if (data.overall_wcag_score < 70) st = 'NON-COMPLIANT';
        else if (data.overall_wcag_score < 98 || data.failed_count > 0) st = 'PARTIALLY COMPLIANT';
        setStatusText(st);
        setShowResults(true);
      }
    } catch (err) { console.error(err); }
  }, []);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var principles = useMemo(function () {
    var ps = ['Perceivable', 'Operable', 'Understandable', 'Robust'];
    return ps.map(function (p) {
      var items = allCriteria.filter(function (c) { return c.principle === p; });
      var passed = items.filter(function (c) { return c.status === 'PASS'; }).length;
      var total = items.length;
      var pct = total > 0 ? Math.round((passed / total) * 100) : 0;
      return { name: p, passed: passed, total: total, pct: pct };
    });
  }, [allCriteria]);

  var filtered = useMemo(function () {
    var result = allCriteria.filter(function (c) {
      var mp = filterPrinciple === 'ALL' || c.principle === filterPrinciple;
      var ms = filterStatus === 'ALL' || c.status === filterStatus;
      var ml = filterLevel === 'ALL' || c.level === filterLevel;
      return mp && ms && ml;
    });
    result.sort(function (a, b) {
      if (sortBy === 'page') return (a.page_number || 9999) - (b.page_number || 9999);
      if (sortBy === 'id') return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      if (sortBy === 'status') {
        var so = { FAIL: 0, WARNING: 1, MANUAL_REVIEW: 2, PASS: 3 };
        return (so[a.status] ?? 4) - (so[b.status] ?? 4);
      }
      var io = { Critical: 0, High: 1, Medium: 2, Low: 3, INFO: 4 };
      return (io[a.impact] ?? 5) - (io[b.impact] ?? 5);
    });
    return result;
  }, [allCriteria, filterPrinciple, filterStatus, filterLevel, sortBy]);

  var isNon = statusText === 'NON-COMPLIANT';
  var isPartial = statusText === 'PARTIALLY COMPLIANT';

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">WCAG 2.1 Compliance Checker</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-slate-50 hover:border-amber-400 hover:bg-amber-50/30 transition">
            <Upload className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here to perform WCAG checklist scan</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {showResults && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600"><Star className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">WCAG Score</div><div className="text-lg font-bold text-slate-800">{score}%</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
                <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " + (isNon ? "bg-red-50 text-red-600" : isPartial ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                  {isNon ? <XCircle className="w-5 h-5" /> : isPartial ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Conformance</div><div className="text-lg font-bold text-slate-800">{statusText}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Passed</div><div className="text-lg font-bold text-slate-800">{passedCount}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50 text-red-600"><XCircle className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Failed</div><div className="text-lg font-bold text-slate-800">{failedCount}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-50 text-amber-600"><AlertTriangle className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Warnings</div><div className="text-lg font-bold text-slate-800">{warningCount}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600"><HelpCircle className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Manual Review</div><div className="text-lg font-bold text-slate-800">{manualCount}</div></div>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" /> Conformance by WCAG Principles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {principles.map(function (p) {
                return (
                  <div key={p.name} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                    style={{ borderLeft: '4px solid ' + PRINCIPLE_COLORS[p.name] }}>
                    <div className="font-semibold text-sm text-slate-800 mb-1">{p.name}</div>
                    <div className="text-[13px] text-slate-500">{p.passed} / {p.total}</div>
                    <div className="text-[12px] text-slate-400">{p.pct}% passed</div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 items-end mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Principle</label>
                <select value={filterPrinciple} onChange={function (e) { setFilterPrinciple(e.target.value); }}
                  className="py-1.5 px-3 border border-slate-300 rounded-lg text-[13px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-amber-500">
                  <option value="ALL">All Principles</option>
                  <option value="Perceivable">Perceivable</option>
                  <option value="Operable">Operable</option>
                  <option value="Understandable">Understandable</option>
                  <option value="Robust">Robust</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                <select value={filterStatus} onChange={function (e) { setFilterStatus(e.target.value); }}
                  className="py-1.5 px-3 border border-slate-300 rounded-lg text-[13px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-amber-500">
                  <option value="ALL">All Statuses</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="WARNING">WARNING</option>
                  <option value="MANUAL_REVIEW">MANUAL REVIEW</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">WCAG Level</label>
                <select value={filterLevel} onChange={function (e) { setFilterLevel(e.target.value); }}
                  className="py-1.5 px-3 border border-slate-300 rounded-lg text-[13px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-amber-500">
                  <option value="ALL">All Levels</option>
                  <option value="A">Level A</option>
                  <option value="AA">Level AA</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Sort By</label>
                <select value={sortBy} onChange={function (e) { setSortBy(e.target.value); }}
                  className="py-1.5 px-3 border border-slate-300 rounded-lg text-[13px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-amber-500">
                  <option value="severity">Severity (High to Low)</option>
                  <option value="page">Page Number</option>
                  <option value="id">WCAG Criterion ID</option>
                  <option value="status">Audit Status</option>
                </select>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-3">WCAG 2.1 AA Checklist Audit Findings</h3>
            <div className="flex flex-col gap-3">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No WCAG criteria matched the selected filters.</div>
              ) : filtered.map(function (c, i) {
                var sc = 'bg-indigo-50 text-indigo-700';
                if (c.status === 'PASS') sc = 'bg-emerald-50 text-emerald-700';
                else if (c.status === 'FAIL') sc = 'bg-red-50 text-red-700';
                else if (c.status === 'WARNING') sc = 'bg-amber-50 text-amber-700';
                var sevColor = c.impact === 'Critical' || c.impact === 'High' ? '#dc2626' : '#f59e0b';
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-[15px] text-slate-800">WCAG {c.id} - {c.name}</strong>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">Level {c.level}</span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{c.principle}</span>
                        <span className="text-[11px] font-bold" style={{ color: sevColor }}>[Severity: {c.impact}] {c.page_number ? '| Page ' + c.page_number : ''}</span>
                      </div>
                      <p className="m-1.5 mt-0 text-[13px] text-slate-600 font-medium">{c.description}</p>
                      {c.status !== 'PASS' && (
                        <p className="m-0 mt-0.5 text-xs text-red-600 italic font-semibold">Recommendation: {c.recommendation || 'None'}</p>
                      )}
                    </div>
                    <span className={"inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 " + sc}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
