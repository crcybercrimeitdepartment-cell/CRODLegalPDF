import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import {  ArrowLeft, CloudUpload, Download, CheckCheck, ChevronLeft, ChevronRight, Volume2, Sparkles , SlidersHorizontal } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Open PDF',
  'Select Image',
  'Choose Alt Text Option',
  'Enter Description',
  'Verify Audio',
  'Save PDF',
];

export default function AlternativeTextAltTextPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [dragOver, setDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);

  var [extractedImages, setExtractedImages] = useState([]);
  var [selectedImage, setSelectedImage] = useState(null);
  var [altTextAssignments, setAltTextAssignments] = useState({});
  var [altTextInput, setAltTextInput] = useState('');
  var [isDecorative, setIsDecorative] = useState(false);

  var [applying, setApplying] = useState(false);
  var [applied, setApplied] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var pdfDocRef = useRef(null);

  var currentStep = !documentId ? 1 : !selectedImage ? 3 : !applied ? 5 : 6;

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

  var fetchImages = useCallback(async function () {
    if (!documentId) return;
    try {
      var res = await fetch(API_BASE + '/alt-text/' + documentId + '/images');
      if (!res.ok) throw new Error('Image extraction failed');
      var data = await res.json();
      setExtractedImages(data.images || []);
    } catch (err) {
      setExtractedImages([]);
    }
  }, [documentId]);

  useEffect(function () {
    if (documentId) {
      fetchImages();
    }
  }, [documentId, fetchImages]);

  var selectImage = useCallback(function (img) {
    setSelectedImage(img);
    var entry = altTextAssignments[img.image_id];
    if (entry) {
      setAltTextInput(entry.alt_text || '');
      setIsDecorative(entry.is_decorative || false);
    } else {
      setAltTextInput(img.current_alt_text || img.suggested_alt_text || '');
      setIsDecorative(false);
    }
    setCurrentPage(img.page_number);
    if (pdfDocRef.current) renderPage(pdfDocRef.current, img.page_number);
  }, [altTextAssignments, renderPage]);

  var saveAltEntry = useCallback(function (text, decorative) {
    if (!selectedImage) return;
    setAltTextAssignments(function (prev) {
      var next = Object.assign({}, prev);
      next[selectedImage.image_id] = {
        image_id: selectedImage.image_id,
        xref: selectedImage.xref,
        alt_text: decorative ? '[Decorative Artifact]' : (text || ''),
        is_decorative: decorative,
      };
      return next;
    });
  }, [selectedImage]);

  var handleAutoSuggest = useCallback(function () {
    if (!selectedImage) return;
    var suggested = selectedImage.suggested_alt_text || '';
    if (suggested) {
      setAltTextInput(suggested);
      setIsDecorative(false);
      saveAltEntry(suggested, false);
    }
  }, [selectedImage, saveAltEntry]);

  var handleTestAudio = useCallback(function () {
    var text = isDecorative ? 'Decorative figure artifact. Skipped by screen reader.' : (altTextInput || 'No alt text provided.');
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      var utt = new SpeechSynthesisUtterance('Image Alternative Text: ' + text);
      utt.rate = 1.0;
      window.speechSynthesis.speak(utt);
    }
  }, [altTextInput, isDecorative]);

  var applyAltText = useCallback(async function () {
    if (!documentId) return;
    setApplying(true);
    try {
      var entriesList = Object.values(altTextAssignments);
      if (entriesList.length === 0 && extractedImages.length > 0) {
        extractedImages.forEach(function (img) {
          entriesList.push({
            image_id: img.image_id,
            xref: img.xref,
            alt_text: img.current_alt_text || img.suggested_alt_text || 'Figure on page ' + img.page_number,
            is_decorative: false,
          });
        });
      }
      var payload = { entries: entriesList };
      var res = await fetch(API_BASE + '/alt-text/' + documentId + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Processing failed');
      var data = await res.json();
      setApplied(true);
      setDownloadUrl(data.download_url || '');
      if (data.preview_page_url) {
        loadCanvasFromUrl(data.preview_page_url + '?t=' + Date.now());
      }
    } catch (err) {
      alert('Alt text embedding error: ' + err.message);
    } finally {
      setApplying(false);
    }
  }, [documentId, altTextAssignments, extractedImages, loadCanvasFromUrl]);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Alternative Text (Alt Text)</h1>
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
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50')
              }
            >
              <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm" style={{ color: '#5b21b6' }}>
                Click or Drag PDF File
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#8b5cf6' }}>
                Image &amp; Graphic Accessibility Manager
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
              <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : fileStatus.indexOf('\u2717') >= 0 ? '#ef4444' : '#8b5cf6' }}>
                {fileStatus}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2 &amp; 3. Extracted Figures &amp; Charts
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {extractedImages.length === 0 ? (
                <div className="col-span-2 text-[12px] text-slate-500 text-center py-5">
                  {documentId ? 'No inline images detected.' : 'Upload a PDF to extract images.'}
                </div>
              ) : (
                extractedImages.map(function (img) {
                  var isSelected = selectedImage && selectedImage.image_id === img.image_id;
                  var hasAlt = altTextAssignments[img.image_id] && altTextAssignments[img.image_id].alt_text;
                  return (
                    <div
                      key={img.image_id}
                      onClick={function () { selectImage(img); }}
                      className={
                        'border-2 rounded-lg overflow-hidden cursor-pointer transition-all ' +
                        (isSelected
                          ? 'border-purple-500 shadow-md ring-2 ring-purple-200'
                          : 'border-slate-200 hover:border-purple-300')
                      }
                    >
                      {img.thumbnail_base64 && (
                        <img src={img.thumbnail_base64} alt="" className="w-full aspect-square object-cover bg-slate-100" />
                      )}
                      <div className="p-1.5">
                        <div className="text-[11px] font-bold text-slate-800">Page {img.page_number}</div>
                        <div className="text-[10px] text-slate-500">{img.width}x{img.height}px</div>
                        <div className="text-[10px] font-bold text-purple-600 truncate">
                          {altTextAssignments[img.image_id]
                            ? (altTextAssignments[img.image_id].alt_text || 'Untagged')
                            : (img.current_alt_text || 'Untagged')}
                        </div>
                      </div>
                      {hasAlt && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                          {'\u2713'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              4. Enter Descriptive Alt Text
            </div>
            <textarea
              value={altTextInput}
              onChange={function (e) { setAltTextInput(e.target.value); saveAltEntry(e.target.value, isDecorative); }}
              disabled={!selectedImage}
              rows={3}
              placeholder="Enter descriptive text explaining image context for screen readers..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDecorative}
                  disabled={!selectedImage}
                  onChange={function (e) { setIsDecorative(e.target.checked); saveAltEntry(altTextInput, e.target.checked); }}
                  className="accent-purple-600"
                />
                Mark as Decorative Figure
              </label>
              <button
                onClick={handleAutoSuggest}
                disabled={!selectedImage}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', border: '1px solid #c084fc' }}
              >
                <Sparkles className="w-3 h-3" /> Auto-Suggest
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              5. Verify Audio Screen Reader
            </div>
            <button
              onClick={handleTestAudio}
              disabled={!selectedImage}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#faf5ff', color: '#7c3aed', border: '1px solid #c084fc' }}
            >
              <Volume2 className="w-3.5 h-3.5" /> Test Screen Reader Audio Speech
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={applyAltText}
              disabled={!documentId || applying}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: applying ? '#94a3b8' : applied ? '#10b981' : '#8b5cf6' }}
            >
              <CheckCheck className="w-4 h-4" /> {applying ? 'Embedding Alt Text...' : applied ? '\u2713 Alt Text Embedded!' : 'Embed Alt Text into PDF'}
            </button>
            {downloadUrl && (
              <a
                href={downloadUrl}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Accessible PDF
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
              <span className="text-[13px] font-bold" style={{ color: '#5b21b6' }}>
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
              <canvas ref={canvasRef} className="max-w-full block" />
              {!documentId && (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Upload a PDF to add alternative text to images.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
