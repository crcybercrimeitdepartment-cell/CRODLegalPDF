import React, { useState, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, FileDown, Star, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

export default function AccessibilityReportExportPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showConfig, setShowConfig] = useState(false);
  var [showResults, setShowResults] = useState(false);

  var [reportTitle, setReportTitle] = useState('Accessibility Conformance & Audit Report');
  var [exportFormat, setExportFormat] = useState('pdf');

  var [score, setScore] = useState(0);
  var [statusText, setStatusText] = useState('Compliant');
  var [passedCount, setPassedCount] = useState(0);
  var [failedCount, setFailedCount] = useState(0);

  var [failedCriteria, setFailedCriteria] = useState([]);
  var [passedCriteria, setPassedCriteria] = useState([]);
  var [generating, setGenerating] = useState(false);
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
      await loadPreview(data.document_id);
    } catch (err) { setFileStatus('\u2717 Upload error: ' + err.message); }
  }, []);

  var loadPreview = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/wcag-checker/' + docId + '/scan');
      var data = await res.json();
      if (data.success) {
        setScore(data.overall_wcag_score);
        setPassedCount(data.passed_count);
        setFailedCount(data.failed_count);
        setFailedCriteria((data.criteria || []).filter(function (c) { return c.status === 'FAIL' || c.status === 'WARNING'; }));
        setPassedCriteria((data.criteria || []).filter(function (c) { return c.status === 'PASS'; }));

        var st = 'COMPLIANT';
        if (data.overall_wcag_score < 70) st = 'NON-COMPLIANT';
        else if (data.overall_wcag_score < 98 || data.failed_count > 0) st = 'PARTIALLY COMPLIANT';
        setStatusText(st);
        setShowConfig(true);
        setShowResults(true);
      }
    } catch (err) { console.error(err); }
  }, []);

  var generateReport = useCallback(async function () {
    if (!documentId) return;
    setGenerating(true);
    try {
      var res = await fetch(API_BASE + '/report-export/' + documentId + '/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          export_format: exportFormat, include_wcag_details: true, include_pdf_ua_details: true, company_title: reportTitle
        }),
      });
      var data = await res.json();
      if (data.success) { window.location.href = data.download_url; }
      else alert('Generation failed: ' + data.message);
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setGenerating(false); }
  }, [documentId, exportFormat, reportTitle]);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var isNonCompliant = statusText === 'NON-COMPLIANT';
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Accessibility Report Export Studio</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30 transition">
            <Upload className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here to scan & generate report</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {showConfig && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="m-0 mb-4 text-lg font-bold text-slate-900">Configure Audit Report Generation</h3>
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">Custom Report Title:</label>
                <input value={reportTitle} onChange={function (e) { setReportTitle(e.target.value); }}
                  className="w-full py-2.5 px-3 border border-slate-300 rounded-lg text-sm box-border focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="w-[200px]">
                <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">Export Format:</label>
                <select value={exportFormat} onChange={function (e) { setExportFormat(e.target.value); }}
                  className="w-full py-2.5 px-3 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500">
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="json">JSON Data (.json)</option>
                  <option value="html">Web Page (.html)</option>
                  <option value="csv">Spreadsheet CSV (.csv)</option>
                  <option value="txt">Plain Text (.txt)</option>
                </select>
              </div>
              <button onClick={generateReport} disabled={generating}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition">
                {generating ? <span className="animate-spin">{'\u23F3'}</span> : <Download className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate & Download'}
              </button>
            </div>
          </div>
        )}

        {showResults && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition">
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600"><Star className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Accessibility Score</div><div className="text-xl font-bold text-slate-800">{score}%</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-indigo-200 transition">
                <div className={"w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 " + (isNonCompliant ? "bg-red-50 text-red-600" : isPartial ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                  {isNonCompliant ? <XCircle className="w-5 h-5" /> : isPartial ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Conformance Status</div><div className="text-xl font-bold text-slate-800">{statusText}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition">
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Passed Checks</div><div className="text-xl font-bold text-slate-800">{passedCount}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-red-200 transition">
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50 text-red-600"><XCircle className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Failed Checks</div><div className="text-xl font-bold text-slate-800">{failedCount}</div></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 text-red-700 font-semibold text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Conformance Violations & Remediation Recommendations
              </div>
              <div className="overflow-x-auto">
                {failedCriteria.length === 0 ? (
                  <div className="text-center py-10 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                    <p className="m-0">No conformance violations detected!</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Category</th>
                        <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Status</th>
                        <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Severity</th>
                        <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Page</th>
                        <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Details</th>
                        <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Recommended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedCriteria.map(function (c, i) {
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-4 border-b border-slate-100 font-semibold text-slate-800">{c.name} ({c.id})</td>
                            <td className="py-2 px-4 border-b border-slate-100">
                              <span className={"inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold " + (c.status === 'FAIL' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{c.status}</span>
                            </td>
                            <td className="py-2 px-4 border-b border-slate-100">
                              <span className={"inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold " + (c.impact === 'Critical' || c.impact === 'High' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{c.impact}</span>
                            </td>
                            <td className="py-2 px-4 border-b border-slate-100 text-slate-600">Page {c.page_number || 1}</td>
                            <td className="py-2 px-4 border-b border-slate-100 text-slate-600">{c.description}</td>
                            <td className="py-2 px-4 border-b border-slate-100 italic text-slate-500">{c.recommendation || 'None'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 text-emerald-700 font-semibold text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Successfully Verified Accessibility Requirements
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Category</th>
                      <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Status</th>
                      <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Requirement</th>
                      <th className="text-left py-2.5 px-4 border-b-2 border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Verification Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passedCriteria.map(function (p, i) {
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-4 border-b border-slate-100 font-semibold text-slate-800">{p.name} ({p.id})</td>
                          <td className="py-2 px-4 border-b border-slate-100">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">PASS</span>
                          </td>
                          <td className="py-2 px-4 border-b border-slate-100 text-slate-600">Level {p.level} | {p.principle}</td>
                          <td className="py-2 px-4 border-b border-slate-100 text-slate-600">{p.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
