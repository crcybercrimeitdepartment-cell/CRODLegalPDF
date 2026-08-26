import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, FolderOpen, CheckCircle, AlertTriangle, XCircle, Shield, Lightbulb } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

export default function PDFUACompliancePage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('Ready');

  var [score, setScore] = useState(null);
  var [passedChecks, setPassedChecks] = useState(0);
  var [warningCount, setWarningCount] = useState(0);
  var [errorCount, setErrorCount] = useState(0);
  var [issues, setIssues] = useState([]);
  var [filteredIssues, setFilteredIssues] = useState([]);
  var [currentFilter, setCurrentFilter] = useState('all');
  var [validated, setValidated] = useState(false);

  var fileInputRef = useRef(null);

  var uploadAndValidate = useCallback(async function (file) {
    setFileStatus('Uploading & Validating...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var upRes = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var upData = await upRes.json();
      if (!upRes.ok || !upData.success) throw new Error(upData.error || upData.detail || 'Upload failed');

      var docId = upData.document_id;

      var valRes = await fetch(API_BASE + '/pdf-ua/' + docId + '/validate', { method: 'POST' });
      var valData = await valRes.json();
      if (!valRes.ok) throw new Error(valData.detail || 'Validation failed');

      setDocumentId(docId);
      setScore(valData.score);
      setPassedChecks(valData.passed_checks);
      var warns = valData.issues.filter(function (i) { return i.level === 'WARNING'; }).length;
      var errs = valData.issues.filter(function (i) { return i.level === 'ERROR'; }).length;
      setWarningCount(warns);
      setErrorCount(errs);
      setIssues(valData.issues || []);
      setFilteredIssues(valData.issues || []);
      setValidated(true);
      setFileStatus('Validation Complete');
    } catch (err) {
      setFileStatus('Validation Failed');
      alert(err.message);
    }
  }, []);

  var handleFileSelect = useCallback(function (e) {
    var file = e.target.files[0];
    if (file) uploadAndValidate(file);
  }, [uploadAndValidate]);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') uploadAndValidate(file);
  }, [uploadAndValidate]);

  var handleDragOver = useCallback(function (e) { e.preventDefault(); }, []);

  var filterIssues = useCallback(function (filter) {
    setCurrentFilter(filter);
    if (filter === 'all') {
      setFilteredIssues(issues);
    } else {
      setFilteredIssues(issues.filter(function (i) { return i.level === filter; }));
    }
  }, [issues]);

  var getScoreColor = function (s) {
    if (s >= 80) return '#10b981';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  };

  var getScoreSubtext = function (s) {
    if (s === 100) return 'Fully Compliant';
    if (s >= 80) return 'Almost Compliant';
    return 'Needs Improvement';
  };

  var getIssueIcon = function (level) {
    if (level === 'PASS') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    if (level === 'WARNING') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  var getIssueBorderColor = function (level) {
    if (level === 'PASS') return 'border-l-emerald-500';
    if (level === 'WARNING') return 'border-l-amber-500';
    return 'border-l-red-500';
  };

  var filters = [
    { key: 'all', label: 'All' },
    { key: 'ERROR', label: 'Errors' },
    { key: 'WARNING', label: 'Warnings' },
    { key: 'PASS', label: 'Passed' },
  ];

  var scoreDeg = (score || 0) * 3.6;

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      
      <div className="absolute top-1.5 left-4 sm:top-5 sm:left-8 md:left-12 z-50 flex items-center w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] min-h-[40px] justify-between">
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight flex items-center justify-center gap-2">
            <Shield className="w-6 h-6" style={{ color: '#3b82f6' }} /> PDF/UA Compliance
          </h1>
        </div>

        <div className="absolute right-0 z-10 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            <CheckCircle className="w-3 h-3" /> {fileStatus}
          </span>
          <label
            onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Open
          </label>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 mt-12 sm:mt-16 lg:mt-20 relative z-10 w-full max-w-[1920px] mx-auto">
        {!validated ? (
          <div className="flex items-center justify-center h-full">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-[500px] cursor-pointer transition-all hover:border-blue-400 hover:shadow-lg"
            >
              <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: '#3b82f6' }} />
              <h2 className="text-xl font-bold text-slate-800 mb-2">PDF/UA Validation Tool</h2>
              <p className="text-slate-500 text-sm mb-4">Verify document structure, tags, metadata, and accessibility standards for Universal Accessibility.</p>
              <button
                onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
                style={{ backgroundColor: '#3b82f6' }}
              >
                <FolderOpen className="w-4 h-4" /> Select File to Validate
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 max-w-[1200px] mx-auto">
            <div className="w-full lg:w-[350px] flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 text-center mb-6">Overall Compliance</h3>
                <div className="relative mx-auto" style={{ width: 160, height: 160 }}>
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    <circle cx="80" cy="80" r="70" fill="none" stroke={getScoreColor(score)} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${scoreDeg} ${440 - scoreDeg}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-slate-800">{score}%</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 text-center mt-4">{getScoreSubtext(score)}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-0">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-emerald-500" /> Passed Checks</span>
                  <strong className="text-lg font-bold text-slate-800">{passedChecks}</strong>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><AlertTriangle className="w-4 h-4 text-amber-500" /> Warnings</span>
                  <strong className="text-lg font-bold text-slate-800">{warningCount}</strong>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><XCircle className="w-4 h-4 text-red-500" /> Errors</span>
                  <strong className="text-lg font-bold text-slate-800">{errorCount}</strong>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 m-0">Compliance Report</h2>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                  {filters.map(function (f) {
                    return (
                      <button
                        key={f.key}
                        onClick={function () { filterIssues(f.key); }}
                        className={
                          'px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer border-none transition-all ' +
                          (currentFilter === f.key
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'bg-transparent text-slate-500 hover:text-slate-700')
                        }
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">No issues found for this filter.</div>
                ) : (
                  filteredIssues.map(function (issue, i) {
                    return (
                      <div
                        key={i}
                        className={
                          'border border-slate-200 rounded-xl p-4 flex gap-4 bg-white transition-all hover:translate-x-1 border-l-4 ' +
                          getIssueBorderColor(issue.level)
                        }
                      >
                        <div className="pt-1">{getIssueIcon(issue.level)}</div>
                        <div className="flex-1">
                          <h4 className="m-0 mb-2 text-base font-semibold text-slate-800">{issue.title}</h4>
                          <p className="m-0 mb-2 text-sm text-slate-600 leading-relaxed">{issue.description}</p>
                          <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-[13px] text-slate-600 flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>{issue.suggestion}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
