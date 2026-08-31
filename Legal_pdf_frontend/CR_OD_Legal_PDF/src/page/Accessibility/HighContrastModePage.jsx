import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import {  ArrowLeft, CloudUpload, Download, Wand2, ChevronLeft, ChevronRight , SlidersHorizontal } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Open PDF',
  'High Contrast Enable',
  'Contrast Settings',
  'Review Display',
  'Read Document',
  'Save / Download',
];

const PRESETS = [
  { key: 'black_on_yellow', label: 'Black on Yellow', desc: 'Peak Low Vision Legibility', bg: '#FFFF00', fg: '#000000', badge: 'bg-yellow-400 text-black' },
  { key: 'white_on_black', label: 'White on Black', desc: 'Inverted Dark Mode', bg: '#000000', fg: '#FFFFFF', badge: 'bg-black text-white' },
  { key: 'yellow_on_black', label: 'Yellow on Black', desc: 'Photophobia & Anti-Glare', bg: '#000000', fg: '#FACC15', badge: 'bg-black text-yellow-400' },
  { key: 'green_on_black', label: 'Green on Black', desc: 'Reduced Eye Strain', bg: '#000000', fg: '#22C55E', badge: 'bg-black text-green-500' },
];

function getLuminanceContrastRatio(hex1, hex2) {
  function getLum(hex) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16) / 255.0;
    var g = parseInt(hex.substring(2, 4), 16) / 255.0;
    var b = parseInt(hex.substring(4, 6), 16) / 255.0;
    var rL = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    var gL = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    var bL = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
  }
  var l1 = getLum(hex1);
  var l2 = getLum(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export default function HighContrastModePage({ onBack }) {
  var [pdfFile, setPdfFile] = useState(null);
  var [documentId, setDocumentId] = useState(null);
  var [dragOver, setDragOver] = useState(false);
  var [fileStatus, setFileStatus] = useState('');

  var [hcEnabled, setHcEnabled] = useState(true);
  var [selectedPreset, setSelectedPreset] = useState('black_on_yellow');
  var [activeBg, setActiveBg] = useState('#FFFF00');
  var [activeFg, setActiveFg] = useState('#000000');

  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [contrastRatio, setContrastRatio] = useState(19.5);

  var [applying, setApplying] = useState(false);
  var [applied, setApplied] = useState(false);
  var [downloadUrl, setDownloadUrl] = useState('');

  var fileInputRef = useRef(null);
  var canvasRef = useRef(null);
  var pdfDocRef = useRef(null);
  var downloadUrlRef = useRef(null);

  var currentStep = !documentId ? 1 : !applied ? 3 : 6;

  var wcagLabel = '';
  var wcagColor = '';
  if (contrastRatio >= 7.0) {
    wcagLabel = '\u2713 WCAG 2.1 AAA Compliant (Passes 7.0:1)';
    wcagColor = '#10b981';
  } else if (contrastRatio >= 4.5) {
    wcagLabel = '\u2713 WCAG 2.1 AA Compliant (Passes 4.5:1)';
    wcagColor = '#3b82f6';
  } else {
    wcagLabel = '\u2717 Fails WCAG Contrast Minimum';
    wcagColor = '#ef4444';
  }

  useEffect(function () {
    var ratio = getLuminanceContrastRatio(activeBg, activeFg);
    setContrastRatio(ratio);
  }, [activeBg, activeFg]);

  var hexToRgb = useCallback(function (hex) {
    var clean = hex.replace('#', '');
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }, []);

  var applyHighContrastToCanvas = useCallback(function (canvas, bgHex, fgHex, enabled) {
    if (!canvas || !enabled) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var pixels = imageData.data;
    var bg = hexToRgb(bgHex);
    var fg = hexToRgb(fgHex);

    for (var i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      var luminance = (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255;
      var edgeWeight = 1 - luminance;
      var eased = Math.pow(Math.max(0, Math.min(1, edgeWeight)), 1.35);
      pixels[i] = Math.round(bg.r + (fg.r - bg.r) * eased);
      pixels[i + 1] = Math.round(bg.g + (fg.g - bg.g) * eased);
      pixels[i + 2] = Math.round(bg.b + (fg.b - bg.b) * eased);
      pixels[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [hexToRgb]);

  var postPdf = useCallback(async function (endpoint, file) {
    if (!file) return null;
    var formData = new FormData();
    formData.append('file', file);
    var res = await fetch(API_BASE + endpoint, { method: 'POST', body: formData });

    if (!res.ok) {
      var message = 'Request failed (' + res.status + ')';
      try {
        var errData = await res.json();
        message = errData.detail || errData.error || errData.message || message;
      } catch (parseError) {
        console.error(parseError);
        try {
          var text = await res.text();
          if (text) message = text;
        } catch (textError) {
          console.error(textError);
        }
      }
      throw new Error(message);
    }

    return res.json();
  }, []);

  var handlePresetChange = useCallback(function (preset) {
    setSelectedPreset(preset.key);
    setActiveBg(preset.bg);
    setActiveFg(preset.fg);
  }, []);

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
        setPdfFile(file);
        setCurrentPage(1);
        setApplied(false);
        setDownloadUrl('');
        setFileStatus('\u2713 Loaded: ' + file.name + ' (' + (pdfDocRef.current ? pdfDocRef.current.numPages : 1) + ' pages)');
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
  }, [renderPage]);

  var renderPage = useCallback(function (pdf, num) {
    if (!pdf) return;
    pdf.getPage(num).then(function (page) {
      var outputScale = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      var renderScale = Math.max(2, outputScale * 1.8);
      var vp = page.getViewport({ scale: renderScale });
      var displayVp = page.getViewport({ scale: 1.2 });
      var c = canvasRef.current;
      if (!c) return;
      var ctx = c.getContext('2d');
      c.width = vp.width;
      c.height = vp.height;
      c.style.width = displayVp.width + 'px';
      c.style.height = displayVp.height + 'px';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        applyHighContrastToCanvas(c, activeBg, activeFg, hcEnabled);
      });
    });
  }, [activeBg, activeFg, hcEnabled, applyHighContrastToCanvas]);

  var prevPage = useCallback(function () {
    if (currentPage > 1 && pdfDocRef.current) {
      var newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(pdfDocRef.current, newPage);
    }
  }, [currentPage, renderPage]);

  var nextPage = useCallback(function () {
    if (currentPage < totalPages && pdfDocRef.current) {
      var newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(pdfDocRef.current, newPage);
    }
  }, [currentPage, totalPages, renderPage]);

  useEffect(function () {
    if (pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage);
    }
  }, [activeBg, activeFg, hcEnabled, currentPage, renderPage]);

  var buildHighContrastPdf = useCallback(async function () {
    if (!pdfDocRef.current) return null;
    var sourcePdf = pdfDocRef.current;
    var outputPdf = await PDFDocument.create();

    for (var pageNumber = 1; pageNumber <= sourcePdf.numPages; pageNumber += 1) {
      var sourcePage = await sourcePdf.getPage(pageNumber);
      var viewport = sourcePage.getViewport({ scale: 2.8 });
      var pageCanvas = document.createElement('canvas');
      pageCanvas.width = Math.ceil(viewport.width);
      pageCanvas.height = Math.ceil(viewport.height);
      var pageCtx = pageCanvas.getContext('2d');
      pageCtx.imageSmoothingEnabled = true;
      pageCtx.imageSmoothingQuality = 'high';

      await sourcePage.render({ canvasContext: pageCtx, viewport: viewport }).promise;
      applyHighContrastToCanvas(pageCanvas, activeBg, activeFg, hcEnabled);

      var embeddedImage = await outputPdf.embedPng(pageCanvas.toDataURL('image/png'));
      var outputPage = outputPdf.addPage([viewport.width, viewport.height]);
      outputPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }

    return outputPdf.save();
  }, [activeBg, activeFg, hcEnabled, applyHighContrastToCanvas]);

  var processHighContrast = useCallback(async function (isSilent) {
    if (!pdfFile) return;
    if (!isSilent) setApplying(true);
    try {
      var data = await postPdf('/high-contrast-mode', pdfFile);
      var issues = data && data.color_contrast ? data.color_contrast.issues || [] : [];
      if (issues.length > 0) {
        console.warn('Color contrast issues detected:', issues);
      }
      setApplied(true);
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
      var pdfBytes = await buildHighContrastPdf();
      if (!pdfBytes) throw new Error('Unable to generate high contrast PDF');
      var objectUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
      downloadUrlRef.current = objectUrl;
      setApplied(true);
      setDownloadUrl(objectUrl);
      if (pdfDocRef.current) {
        renderPage(pdfDocRef.current, currentPage);
      }
    } catch (err) {
      if (!isSilent) alert('Processing error: ' + err.message);
    } finally {
      if (!isSilent) setApplying(false);
    }
  }, [pdfFile, postPdf, buildHighContrastPdf, renderPage, currentPage]);

  useEffect(function () {
    if (documentId && hcEnabled) {
      processHighContrast(true);
    }
  }, [documentId, hcEnabled, processHighContrast]);

  useEffect(function () {
    return function () {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, []);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">High Contrast Mode</h1>
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
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/50')
              }
            >
              <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm" style={{ color: '#422006' }}>
                Click or Drag PDF File
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#a16207' }}>
                Low-Vision Accessibility Reader
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
              <div className="text-xs font-semibold" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#10b981' : fileStatus.indexOf('\u2717') >= 0 ? '#ef4444' : '#eab308' }}>
                {fileStatus}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2. Enable High Contrast
            </div>
            <div className="flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
              <span className="font-bold text-[13px] text-slate-900">Enable High Contrast Mode</span>
              <input
                type="checkbox"
                checked={hcEnabled}
                onChange={function (e) { setHcEnabled(e.target.checked); }}
                className="w-[18px] h-[18px] cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Choose High Contrast Theme
            </div>

            <div className="flex flex-col gap-2">
              {PRESETS.map(function (preset) {
                return (
                  <div
                    key={preset.key}
                    onClick={function () { handlePresetChange(preset); }}
                    className={
                      'flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ' +
                      (selectedPreset === preset.key
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-amber-300 hover:shadow-sm')
                    }
                  >
                    <div>
                      <div className="font-bold text-[13px] text-slate-900">{preset.label}</div>
                      <div className="text-[11px] text-slate-500">{preset.desc}</div>
                    </div>
                    <span className={'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border border-slate-200 ' + preset.badge}>
                      Aa
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-600">Luminance Contrast Ratio</span>
                <span className="text-sm font-bold" style={{ color: '#422006' }}>{contrastRatio.toFixed(1)} : 1</span>
              </div>
              <div className="text-[11px] font-bold" style={{ color: wcagColor }}>
                {wcagLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2">
            <button
              onClick={function () { processHighContrast(false); }}
              disabled={!documentId || applying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: applied ? '#10b981' : '#eab308', color: applied ? '#ffffff' : '#422006' }}
            >
              <Wand2 className="w-4 h-4" />
              {applying ? 'Processing...' : applied ? 'High Contrast Applied!' : 'Apply & Process PDF'}
            </button>
            {applied && downloadUrl && (
              <a
                href={downloadUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download High Contrast PDF
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
              <span className="text-[13px] font-bold" style={{ color: '#422006' }}>
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

            <div className="rounded-xl overflow-hidden border border-slate-200" style={{ backgroundColor: hcEnabled ? activeBg : '#ffffff', transition: 'background-color 0.3s ease' }}>
              <canvas
                ref={canvasRef}
                className="max-w-full block"
                style={{ transition: 'opacity 0.3s ease' }}
              />
              {!documentId && (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Upload a PDF to preview high contrast rendering.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
