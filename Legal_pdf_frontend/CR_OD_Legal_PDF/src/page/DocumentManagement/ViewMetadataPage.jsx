import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowLeft, X, AlertCircle, Info, Copy, CheckCircle2 } from 'lucide-react';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ViewMetadataPage({ onBack }) {
  const toolName = "View Metadata";
  const toolDesc = "Instantly extract and view hidden properties and metadata embedded inside your PDF document.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)" };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [copied, setCopied] = useState(false);
  
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
      extractMetadata(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setMetadata(null);
    setError('');
    setCopied(false);
  };

  // Helper to parse PDF date strings like "D:20201026113614Z"
  const parsePdfDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return dateString;
    const clean = dateString.replace(/^D:/, '').replace(/'/g, '');
    if (clean.length >= 14) {
      const y = clean.substring(0, 4);
      const m = clean.substring(4, 6);
      const d = clean.substring(6, 8);
      const h = clean.substring(8, 10);
      const min = clean.substring(10, 12);
      const s = clean.substring(12, 14);
      return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`).toLocaleString();
    }
    return dateString;
  };

  const extractMetadata = async (file) => {
    setIsProcessing(true);
    setMetadata(null);
    setError('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const meta = await pdf.getMetadata();
      
      const info = meta.info || {};
      
      setMetadata({
        'File Name': file.name,
        'File Size': (file.size / 1024).toFixed(2) + ' KB',
        'Title': info.Title || '',
        'Author': info.Author || '',
        'Subject': info.Subject || '',
        'Keywords': info.Keywords || '',
        'Creator': info.Creator || '',
        'Producer': info.Producer || '',
        'Creation Date': info.CreationDate ? parsePdfDate(info.CreationDate) : '',
        'Modification Date': info.ModDate ? parsePdfDate(info.ModDate) : '',
        'Page Count': pdf.numPages
      });
    } catch (err) {
      console.warn('Frontend PDF parsing failed', err);
      setError('Could not extract metadata from this PDF. It might be encrypted or corrupted.');
    }
    
    setIsProcessing(false);
  };

  const handleCopy = () => {
    if (!metadata) return;
    const text = Object.entries(metadata)
      .map(([key, val]) => `${key}: ${val}`)
      .join('\n');
    navigator.clipboard.writeText(text);
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

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-14">
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
          <div className="space-y-6">
            
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
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8">
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[220px] w-full">
                  <div className="speeder-loader-wrapper w-full flex items-center justify-center flex-1">
                    <div className="loader">
                      <span><span></span><span></span><span></span><span></span></span>
                      <div className="base"><span></span><div className="face"></div></div>
                    </div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-4 animate-pulse relative z-10">
                    Extracting Metadata... Please wait!
                  </p>
                </div>
              ) : metadata ? (
                <div className="animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-[#1e2a52] flex items-center gap-2">
                      <Info className="w-5 h-5 text-slate-400" />
                      Document Properties
                    </h2>
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1e2a52] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Info'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(metadata).map(([key, val], idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 transition-colors hover:border-slate-200 hover:bg-white hover:shadow-sm">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{key}</div>
                        <div className="text-sm font-bold text-[#1e2a52] break-words">
                          {val || <span className="text-slate-300 italic">Not specified</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {Object.keys(metadata).length === 0 && (
                    <div className="text-center py-8 text-sm font-semibold text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                      No standard metadata found in this document.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
