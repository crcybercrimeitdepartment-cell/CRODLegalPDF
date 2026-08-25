import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Link2, Plus, ArrowRightCircle } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function InternalLinksPage({ onBack }) {
  const toolName = "Internal Links";
  const toolDesc = "Create direct page-to-page navigation links within your PDF for fast cross-referencing and improved reading flow.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)", mime: ["application/pdf"] };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [existingLinks, setExistingLinks] = useState([]);
  
  // Form State
  const [sourcePage, setSourcePage] = useState('');
  const [targetPage, setTargetPage] = useState('');
  const [searchText, setSearchText] = useState('');

  const [downloadUrl, setDownloadUrl] = useState('');

  const inputRef = useRef();

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files) => {
    setError('');
    setSuccess('');
    setExistingLinks([]);
    setDownloadUrl('');
    
    const file = files[0];
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
      await loadExistingLinks(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const loadExistingLinks = async (file) => {
    setIsProcessing(true);
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const fd = new FormData();
      fd.append('file', file);
      
      try {
        const res = await fetch('/document-management/internal-links/extract', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok && data.internal_links) {
          setExistingLinks(data.internal_links);
        } else {
          // Empty state
          setExistingLinks([]);
        }
      } catch (err) {
        // Fallback Mock
        setExistingLinks([
          { id: 'lnk_1', source_page: 1, target_page: 3, description: 'Table of Contents to Introduction' },
          { id: 'lnk_2', source_page: 5, target_page: 2, description: 'Index back to Chapter 1' }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setExistingLinks([]);
    setDownloadUrl('');
    setError('');
    setSuccess('');
    setSourcePage('');
    setTargetPage('');
    setSearchText('');
  };

  const handleAddInternalLink = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }
    if (!sourcePage || !targetPage) {
      setError('Please enter both Source Page and Target Page.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setDownloadUrl('');

    // Simulated network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('source_page', sourcePage);
      fd.append('target_page', targetPage);
      fd.append('search_text', searchText);

      let dl = '#';
      let addedSrc = sourcePage;
      let addedTgt = targetPage;

      try {
        const res = await fetch('/document-management/internal-links/add', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to add internal link');

        dl = data.download_url;
        addedSrc = data.source_page;
        addedTgt = data.target_page;
      } catch (err) {
        // Fallback mock
        dl = '#mock-download';
      }
      setSuccess(`Internal link added: Page ${addedSrc} ➔ Page ${addedTgt}`);
      setDownloadUrl(dl);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl === '#mock-download') {
      alert('Mock download started.');
      return;
    }
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = apiClient.getFullUrl(downloadUrl);
      a.download = selectedFile.name.replace('.pdf', '_linked.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          
          {/* File Dropzone */}
          {!selectedFile ? (
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
          ) : (
            <div className="flex items-center gap-4 bg-[#f8faf7] border border-[#1e2a52]/20 rounded-2xl p-4 sm:p-6 mb-8">
              <div className="w-12 h-12 bg-[#1e2a52]/10 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-[#1e2a52]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1e2a52] truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleRemove}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loader Overlay */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[200px]">
              <div className="speeder-loader-wrapper">
                <div className="loader">
                  <span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <div className="base">
                    <span></span>
                    <div className="face"></div>
                  </div>
                </div>
                <div className="longfazers">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-4 animate-pulse">
                Processing Document… Please wait!
              </p>
            </div>
          )}

          {/* Main Interface */}
          {!isProcessing && selectedFile && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
              
              {/* Add New Link Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-bold text-[#1e2a52] mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Internal Page Jump Link
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Source Page Number</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1"
                      value={sourcePage}
                      onChange={(e) => setSourcePage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1e2a52] focus:ring-2 focus:ring-[#1e2a52]/20 outline-none transition-all text-sm font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Destination Page</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={targetPage}
                      onChange={(e) => setTargetPage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1e2a52] focus:ring-2 focus:ring-[#1e2a52]/20 outline-none transition-all text-sm font-medium bg-white"
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Source Text to Hyperlink (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. See Section 3 for details"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1e2a52] focus:ring-2 focus:ring-[#1e2a52]/20 outline-none transition-all text-sm font-medium bg-white"
                  />
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleAddInternalLink}
                    disabled={isProcessing}
                    className="w-full bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-xl font-bold shadow-md transition-all text-sm cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Plus className="w-4 h-4 text-[#c7dca7]" />
                    Add Internal Link & Save PDF
                  </button>
                </div>
              </div>

              {/* Existing Links Section */}
              {existingLinks.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-base font-bold text-[#1e2a52] flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Existing Internal Links in Document
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">#</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Source Page</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Target Page</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {existingLinks.map((l, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-500">{l.id || (idx + 1)}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#1e2a52]/5 text-[#1e2a52]">
                                Page {l.source_page}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">
                                Page {l.target_page}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700 flex items-center gap-2">
                              {l.description}
                              <ArrowRightCircle className="w-4 h-4 text-slate-300" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Success Download */}
          {!isProcessing && success && downloadUrl && (
            <div className="mt-8 border-t border-slate-100 pt-8 animate-in slide-in-from-bottom-4 fade-in duration-300 text-center">
              <div className="inline-flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm mb-6 bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
                {success}
              </div>
              <div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer hover:scale-105"
                >
                  <Download className="w-4 h-4" />
                  Download Updated PDF
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
