import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Download, CheckCheck, CheckCircle, AlertTriangle, XCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, GripVertical, Keyboard, ArrowDown01, X } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

export default function AccessibleFormsPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('Ready');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [scale, setScale] = useState(1.0);

  var [fieldsData, setFieldsData] = useState([]);
  var [selectedFieldId, setSelectedFieldId] = useState(null);
  var [isTestMode, setIsTestMode] = useState(false);

  var [showValidation, setShowValidation] = useState(false);
  var [validationResults, setValidationResults] = useState([]);

  var [dragOver, setDragOver] = useState(false);

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var overlayRef = useRef(null);
  var pdfDocRef = useRef(null);

  var selectedField = fieldsData.find(function (f) { return f.id === selectedFieldId; });

  var uploadAndExtract = useCallback(async function (file) {
    setFileStatus('Uploading and Extracting...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var upRes = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var upData = await upRes.json();
      if (!upRes.ok || !upData.success) throw new Error(upData.error || upData.detail || 'Upload failed');

      setDocumentId(upData.document_id);

      var exRes = await fetch(API_BASE + '/accessible-forms/' + upData.document_id + '/extract', { method: 'POST' });
      var exData = await exRes.json();
      if (!exRes.ok || !exData.success) throw new Error(exData.error || exData.detail || 'Extract failed');

      if (!exData.has_forms) {
        setFileStatus('Ready');
        alert('No interactive form fields detected in this PDF.');
        return;
      }

      setFieldsData(exData.fields || []);

      var fileUrl = URL.createObjectURL(file);
      if (typeof window !== 'undefined' && window.pdfjsLib) {
        var pdf = await window.pdfjsLib.getDocument(fileUrl).promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      }

      setFileStatus('Ready');
    } catch (err) {
      setFileStatus('Error');
      alert('Failed to load PDF or extract fields: ' + err.message);
    }
  }, []);

  var renderPage = useCallback(async function () {
    if (!pdfDocRef.current) return;
    try {
      var page = await pdfDocRef.current.getPage(currentPage);
      var viewport = page.getViewport({ scale: scale });
      var c = canvasRef.current;
      if (!c) return;
      var ctx = c.getContext('2d');
      c.width = viewport.width;
      c.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    } catch (err) {
      console.error('Render error:', err);
    }
  }, [currentPage, scale]);

  useEffect(function () {
    renderPage();
  }, [renderPage]);

  var renderOverlays = useCallback(function () {
    if (!overlayRef.current) return;
    overlayRef.current.innerHTML = '';
    var pageFields = fieldsData.filter(function (f) { return f.page_num === currentPage; });
    pageFields.forEach(function (field) {
      var div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.border = '2px solid ' + (field.id === selectedFieldId ? '#0d9488' : '#3b82f6');
      div.style.background = field.id === selectedFieldId ? 'rgba(13,148,136,0.2)' : 'rgba(59,130,246,0.1)';
      div.style.borderRadius = '2px';
      div.style.pointerEvents = 'auto';
      div.style.cursor = 'pointer';
      div.style.transition = 'all 0.2s';
      var b = field.bbox;
      div.style.left = (b[0] * scale) + 'px';
      div.style.top = (b[1] * scale) + 'px';
      div.style.width = ((b[2] - b[0]) * scale) + 'px';
      div.style.height = ((b[3] - b[1]) * scale) + 'px';
      if (field.id === selectedFieldId) {
        div.style.boxShadow = '0 0 0 2px #fff, 0 0 0 4px #0d9488';
      }
      div.addEventListener('click', function () { setSelectedFieldId(field.id); });
      if (isTestMode) {
        div.tabIndex = field.tab_order || 0;
      }
      overlayRef.current.appendChild(div);
    });
  }, [fieldsData, currentPage, selectedFieldId, isTestMode, scale]);

  useEffect(function () {
    renderOverlays();
  }, [renderOverlays]);

  var goToPage = useCallback(function (p) {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  }, [totalPages]);

  var updateFieldLabel = useCallback(function (val) {
    if (!selectedFieldId) return;
    setFieldsData(function (prev) {
      return prev.map(function (f) {
        return f.id === selectedFieldId ? Object.assign({}, f, { accessible_label: val }) : f;
      });
    });
  }, [selectedFieldId]);

  var updateFieldRequired = useCallback(function (checked) {
    if (!selectedFieldId) return;
    setFieldsData(function (prev) {
      return prev.map(function (f) {
        return f.id === selectedFieldId ? Object.assign({}, f, { is_required: checked }) : f;
      });
    });
  }, [selectedFieldId]);

  var updateFieldReadOnly = useCallback(function (checked) {
    if (!selectedFieldId) return;
    setFieldsData(function (prev) {
      return prev.map(function (f) {
        return f.id === selectedFieldId ? Object.assign({}, f, { is_read_only: checked }) : f;
      });
    });
  }, [selectedFieldId]);

  var autoGenerateTabOrder = useCallback(function () {
    var pages = [];
    var seen = {};
    fieldsData.forEach(function (f) { if (!seen[f.page_num]) { seen[f.page_num] = true; pages.push(f.page_num); } });
    var idx = 1;
    var next = [];
    pages.forEach(function (p) {
      var pf = fieldsData.filter(function (f) { return f.page_num === p; });
      pf.sort(function (a, b) {
        var yd = a.bbox[1] - b.bbox[1];
        if (Math.abs(yd) < 15) return a.bbox[0] - b.bbox[0];
        return yd;
      });
      pf.forEach(function (f) {
        next.push(Object.assign({}, f, { tab_order: idx++ }));
      });
    });
    setFieldsData(next);
    alert('Tab order auto-generated based on visual position.');
  }, [fieldsData]);

  var performUpdate = useCallback(async function () {
    if (!documentId) return null;
    var res = await fetch(API_BASE + '/accessible-forms/' + documentId + '/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updated_fields: fieldsData, auto_tab_order: false }),
    });
    return await res.json();
  }, [documentId, fieldsData]);

  var runValidation = useCallback(async function () {
    if (!documentId) return;
    setFileStatus('Validating...');
    try {
      await performUpdate();
      var res = await fetch(API_BASE + '/accessible-forms/' + documentId + '/validate', { method: 'POST' });
      var data = await res.json();
      setValidationResults(data.issues || []);
      setShowValidation(true);
      setFileStatus('Ready');
    } catch (err) {
      setFileStatus('Validation Failed');
    }
  }, [documentId, performUpdate]);

  var saveAccessiblePdf = useCallback(async function () {
    if (!documentId) return;
    setFileStatus('Saving Accessible PDF...');
    try {
      var data = await performUpdate();
      if (data && data.success && data.download_url) {
        window.location.href = data.download_url;
      }
      setFileStatus('Ready');
    } catch (err) {
      setFileStatus('Save Failed');
    }
  }, [documentId, performUpdate]);

  var getFieldIcon = function (field) {
    var t = (field.field_type_string || '').toLowerCase();
    if (t.includes('check')) return '\u2611';
    if (t.includes('radio')) return '\u25CB';
    if (t.includes('combo') || t.includes('list')) return '\u25BC';
    return '\u270E';
  };

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Accessible Forms Studio</h1>
        </div>

        {/* Right Actions */}
        <div className="absolute right-0 z-10 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" /> {fileStatus}
          </span>
          <button
            onClick={function () { setIsTestMode(!isTestMode); }}
            className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border ' + (isTestMode ? 'bg-teal-50 border-teal-400 text-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm')}
          >
            <Keyboard className="w-3.5 h-3.5" /> Test Nav
          </button>
          <button
            onClick={autoGenerateTabOrder}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <ArrowDown01 className="w-3.5 h-3.5" /> Auto Tab Order
          </button>
          <button
            onClick={runValidation}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Validate
          </button>
          <label
            onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" /> Open
          </label>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={function (e) { var f = e.target.files[0]; if (f) uploadAndExtract(f); }} />
          <button
            onClick={saveAccessiblePdf}
            disabled={!documentId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer text-white disabled:opacity-50 shadow-sm"
            style={{ backgroundColor: '#0d9488' }}
          >
            <Download className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <aside className="w-full lg:w-[300px] lg:min-w-[300px] bg-white lg:border-r border-slate-200 flex flex-col z-10 lg:h-full">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold text-sm text-slate-800 bg-slate-50">
            Form Fields
          </div>
          <div className="flex-1 overflow-y-auto p-3 bg-slate-50">
            {fieldsData.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">No fields detected.</div>
            ) : (
              fieldsData
                .slice()
                .sort(function (a, b) { return a.page_num !== b.page_num ? a.page_num - b.page_num : a.tab_order - b.tab_order; })
                .map(function (field) {
                  return (
                    <div
                      key={field.id}
                      onClick={function () { goToPage(field.page_num); setSelectedFieldId(field.id); }}
                      className={
                        'bg-white border rounded-md px-3 py-2.5 mb-2 cursor-pointer flex items-center gap-2.5 transition-all ' +
                        (field.id === selectedFieldId
                          ? 'border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-200'
                          : 'border-slate-200 hover:border-slate-300 shadow-sm')
                      }
                    >
                      <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-base flex-shrink-0">{getFieldIcon(field)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-slate-800 truncate">{field.accessible_label || field.field_name || 'Unnamed Field'}</div>
                        <div className="text-[11px] text-slate-500 uppercase">Pg {field.page_num} {'\u2022'} {field.field_type_string}</div>
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                        {field.tab_order === 999 ? '-' : field.tab_order}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 z-50">
            <div className="bg-white border border-slate-200 rounded-full shadow-md flex items-center p-1">
              <button onClick={function () { goToPage(currentPage - 1); }} disabled={currentPage <= 1} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-[13px] font-medium text-slate-600">
                Page{' '}
                <input
                  type="number"
                  value={currentPage}
                  min={1}
                  max={totalPages}
                  onChange={function (e) { goToPage(parseInt(e.target.value) || 1); }}
                  className="w-10 text-center border border-slate-300 rounded px-1 py-0.5 text-[13px]"
                />
                {' '} / {totalPages}
              </span>
              <button onClick={function () { goToPage(currentPage + 1); }} disabled={currentPage >= totalPages} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-full shadow-md flex items-center p-1">
              <button onClick={function () { setScale(function (s) { var ns = s - 0.25; return ns < 0.25 ? 0.25 : ns; }); }} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer">
                <ZoomOut className="w-4 h-4" />
              </button>
              <select
                value={scale}
                onChange={function (e) { setScale(parseFloat(e.target.value)); }}
                className="border-none bg-transparent text-[13px] font-medium text-slate-600 px-2 outline-none"
              >
                <option value={0.5}>50%</option>
                <option value={0.75}>75%</option>
                <option value={1.0}>100%</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
                <option value={2.0}>200%</option>
              </select>
              <button onClick={function () { setScale(function (s) { var ns = s + 0.25; return ns > 3.0 ? 3.0 : ns; }); }} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto pt-20 pb-5 flex justify-center px-5">
            {!documentId ? (
              <div
                onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
                onDrop={function (e) { e.preventDefault(); setDragOver(false); var f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') uploadAndExtract(f); }}
                onDragOver={function (e) { e.preventDefault(); setDragOver(true); }}
                onDragLeave={function () { setDragOver(false); }}
                className={
                  'border-2 border-dashed rounded-xl p-10 text-center max-w-[450px] bg-white shadow-sm cursor-pointer transition-all ' +
                  (dragOver ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400')
                }
              >
                <span className="text-5xl block mb-4">{'\uD83D\uDCCB'}</span>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Upload Interactive PDF Form</h2>
                <p className="text-slate-500 text-sm mb-6">Detect AcroForms, assign accessible labels, and manage logical tab orders.</p>
                <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor: '#0d9488' }}>
                  <Upload className="w-4 h-4" /> Select File
                </button>
              </div>
            ) : (
              <div className="relative inline-block">
                <canvas ref={canvasRef} className="block max-w-full" />
                <div ref={overlayRef} className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        <aside className="w-[320px] min-w-[320px] bg-white border-l border-slate-200 flex flex-col overflow-y-auto z-10">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold text-sm text-slate-800 bg-slate-50">
            Field Properties
          </div>
          <div className="p-4 flex flex-col gap-4">
            {!selectedField ? (
              <div className="text-center text-slate-400 text-sm py-8">Select a field to edit properties.</div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Field Name (Internal)</label>
                  <input
                    type="text"
                    value={selectedField.field_name || ''}
                    readOnly={!!selectedField.group_name}
                    title={selectedField.group_name ? 'Part of a group' : ''}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md text-[13px] focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200 read-only:bg-slate-100 read-only:cursor-not-allowed read-only:text-slate-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Accessible Label (Tooltip)</label>
                  <input
                    type="text"
                    value={selectedField.accessible_label || ''}
                    onChange={function (e) { updateFieldLabel(e.target.value); }}
                    placeholder="e.g. First Name"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md text-[13px] focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                  <small className="text-[11px] text-slate-500">Read by Screen Readers</small>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Field Type</label>
                  <input
                    type="text"
                    value={selectedField.field_type_string || ''}
                    readOnly
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md text-[13px] bg-slate-100 cursor-not-allowed text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={!!selectedField.is_required}
                    onChange={function (e) { updateFieldRequired(e.target.checked); }}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                  />
                  <label className="text-[13px] font-medium text-slate-700 cursor-pointer">Required Field</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!selectedField.is_read_only}
                    onChange={function (e) { updateFieldReadOnly(e.target.checked); }}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                  />
                  <label className="text-[13px] font-medium text-slate-700 cursor-pointer">Read Only</label>
                </div>
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[13px] font-semibold text-slate-700">Tab Order Index</label>
                  <input
                    type="text"
                    value={selectedField.tab_order === 999 ? 'Auto/End' : selectedField.tab_order}
                    readOnly
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md text-[13px] bg-slate-100 cursor-not-allowed text-slate-500"
                  />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {showValidation && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999]">
          <div className="bg-white w-[600px] max-w-[90vw] rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0">Accessibility Validation Report</h3>
              <button onClick={function () { setShowValidation(false); }} className="text-2xl text-slate-400 hover:text-slate-800 cursor-pointer bg-transparent border-none">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {validationResults.length === 0 ? (
                <div className="text-center text-slate-500 py-4">No issues found.</div>
              ) : (
                validationResults.map(function (issue, i) {
                  var level = (issue.level || '').toLowerCase();
                  var bg = level === 'error' ? 'bg-red-50 border-l-red-500' : level === 'warning' ? 'bg-amber-50 border-l-amber-500' : 'bg-emerald-50 border-l-emerald-500';
                  var icon = level === 'error' ? <XCircle className="w-4 h-4 text-red-600" /> : level === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />;
                  var textColor = level === 'error' ? 'text-red-800' : level === 'warning' ? 'text-amber-800' : 'text-emerald-800';
                  return (
                    <div key={i} className={'p-3 rounded-lg mb-3 border-l-4 flex flex-col gap-1.5 ' + bg}>
                      <h4 className={'m-0 text-sm font-semibold flex items-center gap-2 ' + textColor}>
                        {icon} {issue.issue}
                      </h4>
                      <p className="m-0 text-[13px] text-slate-600 leading-relaxed">{issue.suggestion}</p>
                      {issue.field_ids && issue.field_ids.length > 0 && (
                        <p className="m-0 text-[11px] text-slate-500 mt-1">Affected Fields: {issue.field_ids.length}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
