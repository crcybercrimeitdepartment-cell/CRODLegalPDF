import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Filter, CheckCircle2, AlertTriangle, XCircle, Download, Sparkles, Table } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

var STATUS_COLORS = { PASS: '#10b981', FAILED: '#ef4444', 'NEEDS REVIEW': '#f59e0b', NEEDS_REVIEW: '#f59e0b' };

export default function AccessibleTableValidationPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showWorkspace, setShowWorkspace] = useState(false);

  var [tables, setTables] = useState([]);
  var [activeTableId, setActiveTableId] = useState(null);
  var [overallScore, setOverallScore] = useState(0);
  var [totalTables, setTotalTables] = useState(0);
  var [passedTables, setPassedTables] = useState(0);
  var [filterVal, setFilterVal] = useState('ALL');

  var fileInputRef = useRef(null);

  var activeTable = tables.find(function (t) { return t.table_id === activeTableId; });

  var filteredTables = tables.filter(function (t) {
    if (filterVal === 'ALL') return true;
    return t.status === filterVal;
  });

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Uploading and scanning "' + file.name + '"...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      var data = await res.json();
      setDocumentId(data.document_id);
      setFileStatus('\u2713 Uploaded: ' + data.filename);
      setShowWorkspace(true);
      await runAudit(data.document_id);
    } catch (err) { setFileStatus('\u2717 Upload failed: ' + err.message); }
  }, []);

  var runAudit = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/table-validation/' + docId + '/audit');
      var data = await res.json();
      if (data.success) {
        setTables(data.tables || []);
        setOverallScore(data.overall_table_score || 0);
        setTotalTables(data.total_tables_count || 0);
        setPassedTables(data.compliant_tables_count || 0);
        if (data.tables && data.tables.length > 0) setActiveTableId(data.tables[0].table_id);
      }
    } catch (err) { console.error(err); }
  }, []);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var applyAutoFix = useCallback(async function () {
    if (!documentId || !activeTable) return;
    try {
      var res = await fetch(API_BASE + '/table-validation/' + documentId + '/fix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: activeTableId, page_number: activeTable.page_number, set_header_row: true, set_header_col: false, table_summary: 'Descriptive data table detailing logical values.' }),
      });
      var data = await res.json();
      if (data.success) { alert('Table headers and summaries applied!'); await runAudit(documentId); }
    } catch (err) { alert('Fix failed: ' + err.message); }
  }, [documentId, activeTableId, activeTable, runAudit]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">{'\uD83E\uDD28'} Accessible Table Validation Studio</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        {!showWorkspace && (
          <>
            <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
              className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-white hover:border-teal-400 hover:bg-teal-50/30 transition mb-6">
              <Upload className="w-10 h-10 text-teal-500 mx-auto mb-3" />
              <h3 className="m-0 mb-1.5 text-slate-800">Click to upload PDF Document</h3>
              <p className="m-0 text-[13px] text-slate-500">Supports PDF files up to 50MB</p>
              {fileStatus && <div className="mt-3 font-semibold text-sm" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#059669' : '#ef4444' }}>{fileStatus}</div>}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            {!fileStatus && (
              <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl">
                <Table className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-500 font-medium">Upload a PDF to validate data tables.</h3>
              </div>
            )}
          </>
        )}

        {showWorkspace && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-5">
              <div className="text-center py-5 bg-teal-50 border border-teal-200 rounded-xl">
                <div className="text-xs font-semibold text-teal-700 mb-1">Overall Accessibility Score</div>
                <div className="text-4xl font-extrabold text-teal-600">{overallScore}%</div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-md transition">
                  <Table className="w-5 h-5 text-teal-600" />
                  <div>
                    <div className="text-[11px] text-slate-500">Total Tables Found</div>
                    <div className="font-bold text-slate-800">{totalTables}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-md transition">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="text-[11px] text-slate-500">Passed Tables</div>
                    <div className="font-bold text-slate-800">{passedTables}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="m-0 mb-2.5 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-teal-600" /> Filter Tables
                </h4>
                <select value={filterVal} onChange={function (e) { setFilterVal(e.target.value); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-teal-400">
                  <option value="ALL">All Detected Tables</option>
                  <option value="PASS">Passed Tables</option>
                  <option value="FAILED">Failed Tables</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                </select>
              </div>

              <div>
                <h4 className="m-0 mb-2.5 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-teal-600" /> Detected Tables
                </h4>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {filteredTables.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No tables match this filter.</p>}
                  {filteredTables.map(function (t) {
                    var sc = STATUS_COLORS[t.status] || '#10b981';
                    return (
                      <div key={t.table_id} onClick={function () { setActiveTableId(t.table_id); }}
                        className={'bg-white border rounded-xl px-4 py-3 cursor-pointer transition-all flex justify-between items-center ' + (t.table_id === activeTableId ? 'border-teal-400 shadow-md' : 'border-slate-200 hover:shadow-md')}>
                        <div>
                          <h5 className="m-0 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <Table className="w-3.5 h-3.5 text-teal-600" /> {t.table_id}
                          </h5>
                          <span className="text-[11px] text-slate-500">Page {t.page_number} | {t.rows_count}x{t.cols_count}</span>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: sc + '1A', color: sc }}>{t.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-800">{activeTable ? 'Table: ' + activeTable.table_id : 'No Table Selected'}</h3>
                    <p className="m-0 mt-1 text-[13px] text-slate-500">
                      {activeTable ? 'Page ' + activeTable.page_number + ' | ' + activeTable.rows_count + ' Rows x ' + activeTable.cols_count + ' Columns | ' + activeTable.status : 'Select a table from the list'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href={documentId ? API_BASE + '/table-validation/' + documentId + '/report/txt' : '#'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 no-underline">
                      <Download className="w-3.5 h-3.5" /> Export TXT
                    </a>
                    <a href={documentId ? API_BASE + '/table-validation/' + documentId + '/report/json' : '#'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 no-underline">
                      <Download className="w-3.5 h-3.5" /> Export JSON
                    </a>
                    {activeTable && activeTable.issues && activeTable.issues.some(function (i) { return i.issue_type === 'missing_headers' || i.issue_type === 'missing_summary'; }) && (
                      <button onClick={applyAutoFix}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 cursor-pointer">
                        <Sparkles className="w-3.5 h-3.5" /> Apply Safe Fix
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="mt-0 mb-3 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Accessibility Checks
                </h4>
                <div className="flex flex-col gap-2.5">
                  {!activeTable || !activeTable.issues || activeTable.issues.length === 0 ? (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 px-4 py-3 rounded-md text-[13px]">
                      <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                      <strong>Passed!</strong> This table fully complies with PDF accessibility standards.
                    </div>
                  ) : activeTable.issues.map(function (iss, i) {
                    var sevColor = iss.severity === 'Error' ? '#ef4444' : iss.severity === 'Warning' ? '#f59e0b' : '#3b82f6';
                    return (
                      <div key={i} className="flex flex-col gap-1.5 px-4 py-3 border border-slate-100 rounded-lg bg-white hover:bg-slate-50 hover:border-teal-200 transition">
                        <div className="flex justify-between items-center">
                          <strong className="text-sm text-slate-800 flex items-center gap-1.5">
                            <span className="text-teal-600">{'\u26A0'}</span> {iss.title || iss.issue_type}
                          </strong>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{iss.severity.toUpperCase()}</span>
                        </div>
                        <div className="text-[13px] text-slate-600"><strong>Description:</strong> {iss.description}</div>
                        <div className="text-[13px] text-slate-500"><strong>Why this matters:</strong> {iss.explanation || 'Provides logical data mappings for screen readers.'}</div>
                        <div className="text-[13px] text-teal-600 font-semibold"><strong>Recommended:</strong> {iss.recommended_action || 'Review tagging structure.'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="mt-0 mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Table className="w-4 h-4 text-teal-600" /> Visual Table Reconstruction
                </h3>
                <div className="overflow-auto">
                  {activeTable && activeTable.grid_preview && activeTable.grid_preview.length > 0 ? (
                    <table className="w-full border-collapse text-sm border border-slate-200 rounded-lg overflow-hidden">
                      <tbody>
                        {activeTable.grid_preview.map(function (row, ri) {
                          return (
                            <tr key={ri}>
                              {row.map(function (cell, ci) {
                                return ri === 0
                                  ? <th key={ci} className="text-left px-3 py-2.5 bg-slate-50 border-b-2 border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider">{cell}</th>
                                  : <td key={ci} className="px-3 py-2 border-b border-slate-100 hover:bg-slate-50">{cell}</td>;
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-400 m-0">Select a table to preview structure.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
