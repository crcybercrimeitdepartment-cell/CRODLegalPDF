import React, { useState, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Flag, Tag, Link2, Shield, Download, CheckCircle2 } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

export default function SkipNavigationLinksPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showResults, setShowResults] = useState(false);

  var [mainTarget, setMainTarget] = useState('Not Set');
  var [taggedStatus, setTaggedStatus] = useState('No');
  var [targetsCount, setTargetsCount] = useState(0);
  var [targets, setTargets] = useState([]);

  var [injectBookmark, setInjectBookmark] = useState(true);
  var [injectLink, setInjectLink] = useState(true);
  var [injecting, setInjecting] = useState(false);
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
      var res = await fetch(API_BASE + '/skip-navigation/' + docId + '/targets');
      var data = await res.json();
      if (data.success) {
        var mainTgt = (data.targets || []).find(function (t) { return t.target_type === 'main_content'; });
        setMainTarget(mainTgt ? 'Page ' + mainTgt.page_number : 'Page 1');
        var isTagged = !data.message.includes('fallback');
        setTaggedStatus(isTagged ? 'Yes (StructTree)' : 'No (Layout Heuristics)');
        setTargetsCount(data.skip_targets_count || 0);
        setTargets(data.targets || []);
        setShowResults(true);
      }
    } catch (err) { console.error(err); }
  }, []);

  var injectLinks = useCallback(async function () {
    if (!documentId) return;
    setInjecting(true);
    try {
      var res = await fetch(API_BASE + '/skip-navigation/' + documentId + '/inject', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inject_main_content_link: injectLink, inject_heading_bookmarks: injectBookmark }),
      });
      var data = await res.json();
      if (data.success) { alert('Skip navigation targets injected!'); await runScan(documentId); }
      else alert('Failed to inject skip navigation links.');
    } catch (err) { console.error(err); }
    finally { setInjecting(false); }
  }, [documentId, injectBookmark, injectLink, runScan]);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Skip Navigation Links Studio</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-slate-50 hover:border-purple-400 hover:bg-purple-50/30 transition">
            <Upload className="w-10 h-10 text-purple-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here to scan landmarks</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {fileStatus && <p className="m-0 mt-3 text-[13px] font-semibold text-center" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#16a34a' : '#ef4444' }}>{fileStatus}</p>}
        </div>

        {showResults && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-purple-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50 text-purple-600"><Flag className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Main Content Target</div><div className="text-xl font-bold text-slate-800">{mainTarget}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-indigo-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600"><Tag className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Tagged PDF Tree</div><div className="text-xl font-bold text-slate-800">{taggedStatus}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600"><Link2 className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Landmarks Detected</div><div className="text-xl font-bold text-slate-800">{targetsCount}</div></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600"><Shield className="w-5 h-5" /></div>
                <div><div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Skip Navigation</div><div className="text-xl font-bold text-slate-800">Supported</div></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="m-0 text-[15px] font-semibold text-slate-800 pb-3 mb-4 border-b border-slate-200 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-purple-600" /> Link Options
                </h3>
                <p className="m-0 mb-4 text-[13px] text-slate-500 leading-relaxed">Select skip navigation mechanisms to inject. Dual-method injection is highly recommended for standard assistive readers.</p>

                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={injectBookmark} onChange={function (e) { setInjectBookmark(e.target.checked); }}
                    className="w-[18px] h-[18px] border-2 border-slate-300 rounded accent-purple-600 cursor-pointer" />
                  <div>
                    <strong className="text-[13px] text-slate-800 block">Inject Outlines / Bookmark Target</strong>
                    <span className="text-[11px] text-slate-400">Add 'Skip to Main Content' to the outlines tree</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer mb-6">
                  <input type="checkbox" checked={injectLink} onChange={function (e) { setInjectLink(e.target.checked); }}
                    className="w-[18px] h-[18px] border-2 border-slate-300 rounded accent-purple-600 cursor-pointer" />
                  <div>
                    <strong className="text-[13px] text-slate-800 block">Inject Invisible Link Annotation</strong>
                    <span className="text-[11px] text-slate-400">Inject an invisible hot-spot link at page 1 top</span>
                  </div>
                </label>

                <button onClick={injectLinks} disabled={injecting}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 cursor-pointer w-full mb-3 transition">
                  {injecting ? <span className="animate-spin">{'\u23F3'}</span> : <Link2 className="w-4 h-4" />}
                  {injecting ? 'Injecting...' : 'Inject Skip Links'}
                </button>
                <a href={API_BASE + '/' + documentId + '/download'}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 no-underline w-full transition shadow-sm">
                  <Download className="w-4 h-4" /> Save PDF
                </a>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="m-0 text-[15px] font-semibold text-slate-800 pb-3 mb-4 border-b border-slate-200 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-purple-600" /> Landmark Skip Targets
                </h3>
                <div className="max-h-[500px] overflow-y-auto pr-1.5">
                  {targets.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 m-0">No landmarks detected.</p>
                  ) : targets.map(function (t, i) {
                    var isMain = t.target_type === 'main_content';
                    return (
                      <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 mb-2.5 flex items-center gap-3 hover:shadow-md hover:border-purple-200 transition">
                        <div className="flex-1 min-w-0">
                          <strong className="text-[15px] text-slate-800 flex items-center gap-1.5">
                            <Flag className="w-3.5 h-3.5" style={{ color: isMain ? '#10b981' : '#7c3aed' }} />
                            {t.title}
                          </strong>
                          <span className="text-xs text-slate-400 ml-2">(Page {t.page_number})</span>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase whitespace-nowrap flex-shrink-0"
                          style={{ background: isMain ? '#dcfce7' : '#f3e8ff', color: isMain ? '#15803d' : '#6b21a8' }}>
                          {t.target_type}
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
