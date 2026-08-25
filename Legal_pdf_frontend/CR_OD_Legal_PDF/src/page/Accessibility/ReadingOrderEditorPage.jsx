import React, { useState, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, ArrowDown01, CheckCheck, RotateCcw, Download, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, AlertTriangle } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var TAG_STYLES = {
  heading: { bg: '#dbeafe', color: '#1e40af' },
  paragraph: { bg: '#d1fae5', color: '#065f46' },
  figure: { bg: '#fef3c7', color: '#92400e' },
  caption: { bg: '#e0e7ff', color: '#3730a3' },
};

export default function ReadingOrderEditorPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showDisclaimer, setShowDisclaimer] = useState(false);
  var [showResults, setShowResults] = useState(false);

  var [originalBlocks, setOriginalBlocks] = useState([]);
  var [blocks, setBlocks] = useState([]);
  var [selectedId, setSelectedId] = useState(null);
  var [saving, setSaving] = useState(false);
  var [downloadEnabled, setDownloadEnabled] = useState(false);
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
      await loadBlocks(data.document_id);
    } catch (err) { setFileStatus('\u2717 Upload error: ' + err.message); }
  }, []);

  var loadBlocks = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/reading-order/' + docId + '/blocks');
      var data = await res.json();
      if (data.success) {
        var b = data.blocks || [];
        setOriginalBlocks(JSON.parse(JSON.stringify(b)));
        setBlocks(b);
        setSelectedId(null);
        setShowDisclaimer(true);
        setShowResults(true);
        setDownloadEnabled(false);
      }
    } catch (err) { console.error(err); }
  }, []);

  var saveOrder = useCallback(async function () {
    if (!documentId) return;
    setSaving(true);
    try {
      var reorderedIds = blocks.map(function (b) { return b.block_id; });
      var res = await fetch(API_BASE + '/reading-order/' + documentId + '/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_number: 1, reordered_block_ids: reorderedIds }),
      });
      var data = await res.json();
      if (data.success) { alert('Reading order saved!'); setDownloadEnabled(true); }
      else alert('Save failed: ' + data.message);
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }, [documentId, blocks]);

  var resetOrder = useCallback(function () {
    if (confirm('Restore original sequence order?')) {
      setBlocks(JSON.parse(JSON.stringify(originalBlocks)));
      setSelectedId(null);
    }
  }, [originalBlocks]);

  var moveBlock = useCallback(function (dir) {
    setBlocks(function (prev) {
      var arr = prev.slice();
      var idx = arr.findIndex(function (b) { return b.block_id === selectedId; });
      if (idx === -1) return arr;
      if (dir === 'up' && idx > 0) { var t = arr[idx]; arr[idx] = arr[idx - 1]; arr[idx - 1] = t; }
      else if (dir === 'down' && idx < arr.length - 1) { var t = arr[idx]; arr[idx] = arr[idx + 1]; arr[idx + 1] = t; }
      else if (dir === 'top' && idx > 0) { arr.unshift(arr.splice(idx, 1)[0]); }
      else if (dir === 'bottom' && idx < arr.length - 1) { arr.push(arr.splice(idx, 1)[0]); }
      return arr;
    });
  }, [selectedId]);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var selectedBlock = blocks.find(function (b) { return b.block_id === selectedId; });

  function escapeHtml(str) { return str.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Reading Order Editor Studio</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-slate-50 hover:border-sky-400 hover:bg-sky-50/30 transition">
            <Upload className="w-10 h-10 text-sky-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here to inspect reading sequence</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {showDisclaimer && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg mb-6">
            <h4 className="m-0 mb-1 text-[14px] font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Reading Order Editor Operations Disclaimer
            </h4>
            <p className="m-0 text-xs text-amber-700 leading-relaxed">Modifying reading order in PDF files updates the document's page tab navigation sequence keys (`/Tabs /S`) to match logical structural mapping. Visual rewrite of the content streams is constrained to ensure document integrity.</p>
          </div>
        )}

        {showResults && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="m-0 text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                  <span className="text-sky-600">{'\uD83D\uDDC2'}</span> Logical Block Sequence List
                </h3>
                <div className="flex gap-2">
                  <button onClick={resetOrder}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 cursor-pointer transition">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                  <button onClick={saveOrder} disabled={saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 cursor-pointer transition">
                    {saving ? <span className="animate-spin">{'\u23F3'}</span> : <CheckCheck className="w-3.5 h-3.5" />}
                    {saving ? 'Saving...' : 'Save Stream'}
                  </button>
                  {downloadEnabled && (
                    <a href={API_BASE + '/' + documentId + '/download'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 no-underline transition">
                      <Download className="w-3.5 h-3.5" /> Save PDF
                    </a>
                  )}
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto p-3 flex flex-col gap-2">
                {blocks.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 m-0">No blocks detected.</p>
                ) : blocks.map(function (b, idx) {
                  var isSelected = b.block_id === selectedId;
                  var ts = TAG_STYLES[b.block_type] || TAG_STYLES.paragraph;
                  return (
                    <div key={b.block_id} onClick={function () { setSelectedId(b.block_id); }}
                      className={"flex items-center gap-3.5 p-3 rounded-lg border cursor-pointer transition " + (isSelected ? "border-sky-400 bg-sky-50/50 shadow-md" : "border-slate-200 bg-white hover:shadow-md hover:border-sky-200")}>
                      <span className="text-lg font-bold text-sky-600 w-8 text-center flex-shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <strong className="text-[13px] text-slate-800 block truncate">{escapeHtml(b.text_content)}</strong>
                        <span className="text-[11px] text-slate-400">Page {b.page_number} | BBox: [{b.bbox.map(function (n) { return Math.round(n); }).join(', ')}]</span>
                      </div>
                      <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase flex-shrink-0"
                        style={{ background: ts.bg, color: ts.color }}>{b.block_type}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="m-0 text-[15px] font-semibold text-slate-800 pb-3 mb-4 border-b border-slate-200 flex items-center gap-2">
                <span className="text-sky-600">{'\u2139'}</span> Block Details Inspector
              </h3>
              {!selectedBlock ? (
                <div className="text-center text-slate-400 py-10">
                  <p className="m-0 text-[13px]">Select a block from the list to inspect.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-2 py-2 border-b border-slate-100">
                    <span className="text-[13px] text-slate-400 min-w-[100px]">Block ID:</span>
                    <span className="text-sm font-semibold text-slate-800">{selectedBlock.block_id}</span>
                  </div>
                  <div className="flex items-baseline gap-2 py-2 border-b border-slate-100">
                    <span className="text-[13px] text-slate-400 min-w-[100px]">Page:</span>
                    <span className="text-sm font-semibold text-slate-800">Page {selectedBlock.page_number}</span>
                  </div>
                  <div className="flex items-baseline gap-2 py-2 border-b border-slate-100">
                    <span className="text-[13px] text-slate-400 min-w-[100px]">Type:</span>
                    <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase"
                      style={{ background: (TAG_STYLES[selectedBlock.block_type] || TAG_STYLES.paragraph).bg, color: (TAG_STYLES[selectedBlock.block_type] || TAG_STYLES.paragraph).color }}>
                      {selectedBlock.block_type}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 py-2 border-b border-slate-100">
                    <span className="text-[13px] text-slate-400 min-w-[100px]">BBox:</span>
                    <span className="text-sm text-slate-700">[{selectedBlock.bbox.map(function (n) { return Math.round(n); }).join(', ')}]</span>
                  </div>
                  <div className="py-2 border-b border-slate-100">
                    <span className="text-[13px] text-slate-400 block mb-1">Text Content:</span>
                    <div className="text-sm text-slate-700 max-h-[120px] overflow-y-auto whitespace-pre-wrap bg-slate-50 p-2 rounded">{selectedBlock.text_content}</div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-5 mb-2.5">Reordering Controls:</h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={function () { moveBlock('up'); }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 cursor-pointer transition">
                      <ArrowUp className="w-3.5 h-3.5" /> Move Up
                    </button>
                    <button onClick={function () { moveBlock('down'); }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 cursor-pointer transition">
                      <ArrowDown className="w-3.5 h-3.5" /> Move Down
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={function () { moveBlock('top'); }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 cursor-pointer transition">
                      <ChevronsUp className="w-3.5 h-3.5" /> Move to Top
                    </button>
                    <button onClick={function () { moveBlock('bottom'); }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 cursor-pointer transition">
                      <ChevronsDown className="w-3.5 h-3.5" /> Move to Bottom
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
