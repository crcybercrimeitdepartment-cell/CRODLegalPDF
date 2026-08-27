import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, ArrowLeft, X, AlertCircle, FileCode2, Copy, CheckCircle2 } from 'lucide-react';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function XmpMetadataSupportPage({ onBack }) {
  const toolName = "XMP Metadata";
  const toolDesc = "Extract and view raw XMP (Extensible Metadata Platform) XML data embedded inside your PDF document.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)" };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [xmpData, setXmpData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState('');
  
  const inputRef = useRef();

  const handleFileChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleFiles = (files) => {
    setError('');
    const file = files[0];
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPdfObjectUrl(url);
      extractXMP(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setXmpData(null);
    setError('');
    setCopied(false);
    if (pdfObjectUrl) {
      URL.revokeObjectURL(pdfObjectUrl);
      setPdfObjectUrl('');
    }
  };

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  const extractXMP = async (file) => {
    setIsProcessing(true);
    setXmpData(null);
    setError('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const meta = await pdf.getMetadata();
      
      let rawXmp = '';
      if (meta && meta.metadata) {
        // Depending on pdfjs version, getRaw() might be available, or we might need to stringify
        if (typeof meta.metadata.getRaw === 'function') {
          rawXmp = meta.metadata.getRaw();
        } else if (meta.metadata._metadata) {
           // Fallback for some internal pdfjs structures
           const domParser = new XMLSerializer();
           rawXmp = domParser.serializeToString(meta.metadata._metadata);
        }
      }
      
      if (!rawXmp || rawXmp.trim() === '') {
        // If there is no real XMP but we have info, we can create a simple one or just show empty.
        // The UI will show "No XMP Metadata found" if we return a simple empty skeleton.
        rawXmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <!-- No XMP metadata was embedded in this PDF -->
</x:xmpmeta>
<?xpacket end="w"?>`;
      }
      
      setXmpData(rawXmp);
    } catch (err) {
      console.warn('Frontend PDF parsing failed', err);
      setError('Could not extract XMP data from this PDF. It might be encrypted or corrupted.');
    }
    
    setIsProcessing(false);
  };

  const handleCopy = () => {
    if (!xmpData) return;
    navigator.clipboard.writeText(xmpData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
          {toolName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          {toolDesc}
        </p>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-14">
        {!selectedFile ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#1e2a52] bg-[#e8f0e2]'
                  : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={accepted.accept}
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-[#1e2a52]" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">
                Drop PDF here or click to browse
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Accepted: <span className="font-semibold text-[#1e2a52]">{accepted.label}</span>
              </p>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start min-w-0">
            
            {/* Left Column - XMP Info */}
            <div className="lg:col-span-5 space-y-6 flex flex-col h-full min-w-0">
              {/* File Header Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-[#1e2a52]/10 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-[#1e2a52]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1e2a52] text-sm sm:text-base truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isProcessing}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shrink-0 ml-4 disabled:opacity-50"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 sm:p-6 flex-1 flex flex-col min-h-[400px]">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative flex-1 w-full">
                    <div className="speeder-loader-wrapper w-full flex items-center justify-center flex-1">
                      <div className="loader">
                        <span><span></span><span></span><span></span><span></span></span>
                        <div className="base"><span></span><div className="face"></div></div>
                      </div>
                      <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-4 animate-pulse relative z-10">
                      Extracting XMP Metadata... Please wait!
                    </p>
                  </div>
                ) : xmpData ? (
                  <div className="animate-in fade-in zoom-in duration-300 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 shrink-0">
                      <h2 className="text-base sm:text-lg font-bold text-[#1e2a52] flex items-center gap-2">
                        <FileCode2 className="w-5 h-5 text-slate-400" />
                        Raw XMP Data
                      </h2>
                      <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1e2a52] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col shadow-inner flex-1 overflow-hidden min-h-[250px]">
                      <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
                        <div className="flex space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        </div>
                        <div className="mx-auto text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                          xmp_metadata.xml
                        </div>
                      </div>
                      <div className="p-4 overflow-auto custom-scrollbar flex-1">
                        <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap word-break-all">
                          <code>{xmpData}</code>
                        </pre>
                      </div>
                    </div>
                    
                    {!xmpData.includes('<x:xmpmeta') && (
                      <div className="mt-4 shrink-0 text-center py-3 text-xs sm:text-sm font-semibold text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                        No XMP Metadata found.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right Column - PDF Preview */}
            <div className="lg:col-span-7 min-w-0 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-[550px] sm:h-[700px] lg:h-[calc(100vh-12rem)] lg:min-h-[600px]">
              {/* Viewer Toolbar */}
              <div className="bg-[#1e2a52] px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-white/70 shrink-0" />
                  <strong className="text-white text-sm font-bold truncate max-w-[200px] sm:max-w-xs">{selectedFile.name}</strong>
                  <span className="text-white/60 text-xs font-medium ml-2 shrink-0">Live Preview</span>
                </div>
              </div>
              
              <div className="text-center py-2 bg-slate-50 border-b border-slate-200 shrink-0">
                <a href={pdfObjectUrl} target="_blank" rel="noreferrer" className="text-xs text-[#1e2a52] hover:text-[#0284c7] font-bold underline">
                  Open Preview in Full Screen (For Zoom)
                </a>
              </div>
              
              <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
                <iframe
                  title="PDF Viewer"
                  src={`${pdfObjectUrl}#view=FitH&toolbar=0&navpanes=0`}
                  style={{ width: '100%', height: '100%', minHeight: '600px', border: 'none', display: 'block' }}
                  className="max-sm:!min-h-0 max-sm:!h-[400px]"
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
