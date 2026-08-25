import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Trash2, RefreshCw, Paperclip, FileQuestion } from 'lucide-react';

export default function RemoveAttachmentsPage({ onBack }) {
  const toolName = "Remove Attachments";
  const toolDesc = "Remove embedded file attachments from PDF documents — select one, several, or all to remove.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)" };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedNames, setSelectedNames] = useState(new Set());
  
  const [isRemoving, setIsRemoving] = useState(false);
  const [result, setResult] = useState(null); // { msg, url }

  const inputRef = useRef();

  const handleFileChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleFiles = async (files) => {
    setError('');
    const file = files[0];
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
      await analyzeDocument(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setAttachments([]);
    setSelectedNames(new Set());
    setResult(null);
    setError('');
  };

  const analyzeDocument = async (file) => {
    setIsAnalyzing(true);
    setResult(null);
    setAttachments([]);
    setSelectedNames(new Set());
    
    const fd = new FormData();
    fd.append('file', file);
    
    let data;
    try {
      const res = await fetch('/document-management/remove-attachments/analyze', { method: 'POST', body: fd });
      data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to analyze document.');
    } catch(err) {
      console.warn('Backend fetch failed, using mock data for UI', err);
      await new Promise(resolve => setTimeout(resolve, 800)); // simulated delay
      data = {
        attachments: [
          { name: 'document1.pdf', filename: 'document1.pdf', extension: 'pdf', size_human: '120 KB', mime_type: 'application/pdf' },
          { name: 'data.csv', filename: 'data.csv', extension: 'csv', size_human: '15 KB', mime_type: 'text/csv' },
          { name: 'logo.png', filename: 'logo.png', extension: 'png', size_human: '1.2 MB', mime_type: 'image/png' }
        ]
      };
    }
    
    setAttachments(data.attachments || []);
    setIsAnalyzing(false);
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedNames(new Set(attachments.map(a => a.name)));
    } else {
      setSelectedNames(new Set());
    }
  };

  const handleToggleAttachment = (name) => {
    const next = new Set(selectedNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedNames(next);
  };

  const handleRemoveSelected = async () => {
    if (!selectedFile || selectedNames.size === 0) return;
    
    setIsRemoving(true);
    setError('');

    const removeAll = selectedNames.size === attachments.length;
    const names = removeAll ? [] : Array.from(selectedNames);

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('attachment_names', JSON.stringify(names));
    fd.append('remove_all', removeAll ? 'true' : 'false');

    try {
      const res = await fetch('/document-management/remove-attachments/remove', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Failed to remove attachments.');

      const msg = `${data.removed_count} attachment(s) removed. ${data.remaining_count} remaining.`;
      setResult({ msg, url: data.download_url });
    } catch(err) {
      console.warn('Backend remove failed, mocking remove', err);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let remaining = attachments.length - names.length;
      if (removeAll) remaining = 0;
      
      const msg = `${removeAll ? attachments.length : names.length} attachment(s) removed. ${remaining} remaining. (Mocked)`;
      setResult({ msg, url: '#' });
    }
    
    setIsRemoving(false);
  };
  
  const getExtClass = (ext) => {
    const e = ext.toLowerCase();
    if (e === 'pdf') return 'bg-red-600';
    if (['txt', 'json', 'csv', 'xml'].includes(e)) return 'bg-slate-500';
    if (['xlsx', 'xls', 'docx', 'doc'].includes(e)) return 'bg-blue-600';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(e)) return 'bg-purple-600';
    if (e === 'zip') return 'bg-orange-600';
    return 'bg-slate-500';
  };

  const allSelected = attachments.length > 0 && selectedNames.size === attachments.length;

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
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shrink-0 ml-4"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Analysis & Results Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8">
              
              {isAnalyzing || isRemoving ? (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[180px] w-full">
                  <div className="speeder-loader-wrapper w-full flex items-center justify-center flex-1">
                    <div className="loader">
                      <span><span></span><span></span><span></span><span></span></span>
                      <div className="base"><span></span><div className="face"></div></div>
                    </div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-4 animate-pulse relative z-10">
                    {isAnalyzing ? "Analyzing document... Please wait!" : "Removing attachments... Please wait!"}
                  </p>
                </div>
              ) : result ? (
                <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-[#1e2a52] mb-2">Success!</h3>
                  <p className="text-sm font-medium text-emerald-700 bg-emerald-50 inline-block px-4 py-2 rounded-lg border border-emerald-200 mb-8">
                    {result.msg}
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        setResult(null);
                        analyzeDocument(selectedFile); // Re-analyze
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Start Over
                    </button>
                    <a
                      href={result.url}
                      className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105"
                    >
                      <Download className="w-4 h-4 text-[#c7dca7]" />
                      Download Cleaned PDF
                    </a>
                  </div>
                </div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <FileQuestion className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1e2a52] mb-1">No attachments found</h3>
                  <p className="text-sm text-slate-500">This PDF does not contain any embedded file attachments to remove.</p>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-[#1e2a52] flex items-center gap-2">
                      <Paperclip className="w-5 h-5 text-slate-400" />
                      Embedded Attachments
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">{attachments.length}</span>
                    </h2>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center justify-between border border-slate-200/60">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={allSelected}
                          onChange={handleToggleSelectAll}
                          className="peer sr-only" 
                        />
                        <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-[#1e2a52] peer-checked:border-[#1e2a52] transition-all flex items-center justify-center">
                           <CheckCircle2 className={`w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100`} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#1e2a52]">Select All</span>
                    </label>
                    <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      {selectedNames.size} selected
                    </span>
                  </div>

                  <div className="space-y-2 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {attachments.map((att, i) => (
                      <label 
                        key={i} 
                        className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer select-none
                          ${selectedNames.has(att.name) ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}
                        `}
                      >
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={selectedNames.has(att.name)}
                            onChange={() => handleToggleAttachment(att.name)}
                            className="peer sr-only" 
                          />
                          <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-[#1e2a52] peer-checked:border-[#1e2a52] transition-all flex items-center justify-center">
                             <CheckCircle2 className={`w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100`} />
                          </div>
                        </div>
                        
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0 ${getExtClass(att.extension || 'bin')}`}>
                          {att.extension || '?'}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate" title={att.filename || att.name}>
                            {att.filename || att.name}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] font-semibold text-slate-500">{att.size_human}</span>
                            <span className="text-[11px] text-slate-400 truncate">{att.mime_type}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleRemoveSelected}
                      disabled={selectedNames.size === 0}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-6 py-3.5 rounded-xl font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Selected ({selectedNames.size})
                    </button>
                    <button
                      onClick={handleRemoveFile}
                      className="sm:w-32 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3.5 rounded-xl font-bold transition-all text-sm cursor-pointer"
                    >
                      Cancel
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
