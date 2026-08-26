import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import {  ArrowLeft, CloudUpload, Download, Wand2, ChevronLeft, ChevronRight, Tag, FolderTree , SlidersHorizontal } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Open PDF',
  'Select Tagged PDF Tool',
  'Generate / Verify Tags',
  'Add Missing Tags',
  'Validate Structure',
  'Save Tagged PDF',
];

export default function TaggedPDFSupportPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [dragOver, setDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);

  var [structureTree, setStructureTree] = useState(null);
  var [treeLoading, setTreeLoading] = useState(false);

  var [autoHeadings, setAutoHeadings] = useState(true);
  var [tagTables, setTagTables] = useState(true);
  var [tagFigures, setTagFigures] = useState(true);
  var [markInfo, setMarkInfo] = useState(true);

  var [generating, setGenerating] = useState(false);
  var [generated, setGenerated] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var pdfDocRef = useRef(null);

  var currentStep = !documentId ? 1 : !structureTree ? 3 : !generated ? 5 : 6;

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Loading ' + file.name + '...');
    try {
      var buffer = await file.arrayBuffer();
      loadCanvasFromBuffer(buffer);
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      var data = await res.json();
      if (res.ok) {
        setDocumentId(data.document_id);
        setTotalPages(data.page_count || 1);
        setCurrentPage(1);
        setFileStatus('\u2713 Loaded: ' + data.filename + ' (' + (data.page_count || 1) + ' pages)');
      } else {
        setFileStatus('\u2717 Upload error: ' + (data.error || 'Failed'));
      }
    } catch (err) {
      setFileStatus('\u2717 Upload error: ' + err.message);
    }
  }, []);

  var handleDrop = useCallback(function (e) {
    e.preventDefault();
    setDragOver(false);
    var file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      uploadPdf(file);
    } else {
      alert('Please upload a PDF file.');
    }
  }, [uploadPdf]);

  var handleDragOver = useCallback(function (e) {
    e.preventDefault();
    setDragOver(true);
  }, []);

  var handleDragLeave = useCallback(function () {
    setDragOver(false);
  }, []);

  var handleFileSelect = useCallback(function (e) {
    var file = e.target.files[0];
    if (file) uploadPdf(file);
  }, [uploadPdf]);

  var loadCanvasFromBuffer = useCallback(function (buffer) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    window.pdfjsLib.getDocument({ data: buffer }).promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPage(pdf, 1);
    }).catch(function (e) {
      console.error('PDF load error:', e);
    });
  }, []);

  var loadCanvasFromUrl = useCallback(function (url) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    window.pdfjsLib.getDocument(url).promise.then(function (pdf) {
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      renderPage(pdf, 1);
    }).catch(function (e) {
      console.error('PDF load error:', e);
    });
  }, []);

  var renderPage = useCallback(function (pdf, num) {
    if (!pdf) return;
    pdf.getPage(num).then(function (page) {
      var vp = page.getViewport({ scale: 1.2 });
      var c = canvasRef.current;
      if (!c) return;
      var ctx = c.getContext('2d');
      c.width = vp.width;
      c.height = vp.height;
      page.render({ canvasContext: ctx, viewport: vp });
    });
  }, []);

  var prevPage = useCallback(function () {
    if (currentPage > 1 && pdfDocRef.current) {
      var p = currentPage - 1;
      setCurrentPage(p);
      renderPage(pdfDocRef.current, p);
    }
  }, [currentPage, renderPage]);

  var nextPage = useCallback(function () {
    if (currentPage < totalPages && pdfDocRef.current) {
      var p = currentPage + 1;
      setCurrentPage(p);
      renderPage(pdfDocRef.current, p);
    }
  }, [currentPage, totalPages, renderPage]);

  var fetchStructureTree = useCallback(async function () {
    if (!documentId) return;
    setTreeLoading(true);
    try {
      var res = await fetch(API_BASE + '/tagged-pdf/' + documentId + '/tree');
      if (!res.ok) throw new Error('Tree fetch failed');
      var data = await res.json();
      setStructureTree(data.structure_tree || null);
    } catch (err) {
      setStructureTree(null);
    } finally {
      setTreeLoading(false);
    }
  }, [documentId]);

  useEffect(function () {
    if (documentId && !structureTree) {
      fetchStructureTree();
    }
  }, [documentId, structureTree, fetchStructureTree]);

  var handleTagNodeClick = useCallback(function (tag) {
    var pageNum = tag.page_number || 1;
    setCurrentPage(pageNum);
    if (pdfDocRef.current) renderPage(pdfDocRef.current, pageNum);
  }, [renderPage]);

  var generateTags = useCallback(async function () {
    if (!documentId) return;
    setGenerating(true);
    try {
      var payload = {
        add_missing_tags: true,
        auto_heading_detection: autoHeadings,
        tag_tables: tagTables,
        tag_figures: tagFigures,
        mark_info_flag: markInfo,
      };
      var res = await fetch(API_BASE + '/tagged-pdf/' + documentId + '/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Tag generation failed');
      var data = await res.json();
      setGenerated(true);
      setDownloadUrl(data.download_url || '');
      if (data.tree_summary) {
        setStructureTree(data.tree_summary);
      }
      if (data.preview_page_url) {
        loadCanvasFromUrl(data.preview_page_url + '?t=' + Date.now());
      }
    } catch (err) {
      alert('Tag generation error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }, [documentId, autoHeadings, tagTables, tagFigures, markInfo, loadCanvasFromUrl]);

  function getTagBadgeClass(tagType) {
    if (tagType === 'H1') return 'bg-blue-100 text-blue-700';
    if (tagType === 'H2') return 'bg-indigo-100 text-indigo-700';
    if (tagType === 'Table') return 'bg-amber-100 text-amber-700';
    if (tagType === 'Figure') return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  }

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Tagged PDF Support</h1>
                  </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        <div className="w-full lg:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5 z-20">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Open PDF Document
            </div>
            <div
              onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ' +
                (dragOver
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50')
              }
            >
              <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm" style={{ color: '#064e3b' }}>
                Click or Drag PDF File
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#059669' }}>
                PDF/UA Logical Structure Engine
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            {fileStatus && (
              <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : fileStatus.indexOf('\u2717') >= 0 ? '#ef4444' : '#0d9488' }}>
                {fileStatus}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Logical Structure Tree
            </div>
            <div className="border border-slate-200 rounded-xl p-3 max-h-[260px] overflow-y-auto flex flex-col gap-1">
              {treeLoading ? (
                <div className="text-[12px] text-slate-500 text-center py-5">Loading structure tree...</div>
              ) : structureTree && structureTree.tags_tree && structureTree.tags_tree.length > 0 ? (
                <React.Fragment>
                  <div className="flex items-center gap-2 font-bold text-[13px] mb-2" style={{ color: '#064e3b' }}>
                    <FolderTree className="w-4 h-4" />
                    Document Structure ({structureTree.total_tags_count || 0} Tags)
                  </div>
                  {structureTree.tags_tree.map(function (tag, i) {
                    return (
                      <div
                        key={i}
                        onClick={function () { handleTagNodeClick(tag); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-50 transition-all"
                      >
                        <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold ' + getTagBadgeClass(tag.tag_type)}>
                          {tag.tag_type}
                        </span>
                        <span className="text-[11px] text-slate-600 truncate">
                          p.{tag.page_number} - {tag.title}
                        </span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ) : (
                <div className="text-[12px] text-slate-500 text-center py-5">
                  No structure tags detected. Click 'Generate &amp; Apply Structure Tags'.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              4 &amp; 5. Structure Validation Settings
            </div>
            <div className="flex flex-col gap-2 text-[12px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoHeadings} onChange={function (e) { setAutoHeadings(e.target.checked); }} className="accent-emerald-600" />
                Auto-Detect Headings (H1, H2, H3)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={tagTables} onChange={function (e) { setTagTables(e.target.checked); }} className="accent-emerald-600" />
                Tag Tables &amp; Table Headers (Table, TH, TD)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={tagFigures} onChange={function (e) { setTagFigures(e.target.checked); }} className="accent-emerald-600" />
                Tag Graphics &amp; Figures (Figure, Alt Text)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={markInfo} onChange={function (e) { setMarkInfo(e.target.checked); }} className="accent-emerald-600" />
                Set PDF Catalog /MarkInfo &amp; /Tabs /S
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2">
            <button
              onClick={generateTags}
              disabled={!documentId || generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: generated ? '#10b981' : '#0d9488' }}
            >
              <Wand2 className="w-4 h-4" />
              {generating ? 'Generating PDF/UA Tags...' : generated ? 'Structure Tags Applied!' : 'Generate & Apply Structure Tags'}
            </button>
            {generated && downloadUrl && (
              <a
                href={downloadUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Tagged PDF (PDF/UA)
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 border-l border-slate-200 relative min-w-0 p-4 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                <ChevronLeft className="w-4 h-4 inline mr-0.5" /> Prev
              </button>
              <span className="text-[13px] font-bold" style={{ color: '#064e3b' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= totalPages}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                Next <ChevronRight className="w-4 h-4 inline ml-0.5" />
              </button>
            </div>

            <div className="rounded-lg p-2.5 bg-white">
              <canvas
                ref={canvasRef}
                className="max-w-full block"
              />
              {!documentId && (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Upload a PDF to view and tag document structure.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
