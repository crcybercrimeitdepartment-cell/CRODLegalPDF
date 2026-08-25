import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Search, Zap } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function FindReplacePage({ onBack }) {
  const toolName = "Find & Replace";
  const toolDesc = "Search for specific words or text patterns in your PDF document and replace them automatically.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)", mime: ["application/pdf"] };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);

  // Results State
  const [searchResults, setSearchResults] = useState(null);
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

  const handleFiles = (files) => {
    setError('');
    setSuccess('');
    setSearchResults(null);
    setDownloadUrl('');
    
    const file = files[0];
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setSearchResults(null);
    setDownloadUrl('');
    setError('');
    setSuccess('');
  };

  const handleFindMatches = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }
    if (!searchQuery.trim()) {
      setError('Please enter search text.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setSearchResults(null);
    setDownloadUrl('');

    // Simulated network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('search_query', searchQuery);
      fd.append('case_sensitive', caseSensitive ? 'true' : 'false');
      fd.append('match_whole_word', matchWholeWord ? 'true' : 'false');

      try {
        const res = await fetch('/document-management/find-replace/search', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Search failed');

        setSearchResults({
          title: `Found ${data.total_matches} match(es) for "${data.query}"`,
          matches: data.matches || []
        });
      } catch (err) {
        // Fallback Mock Result
        setSearchResults({
          title: `Found 3 match(es) for "${searchQuery}" (Mocked)`,
          matches: [
            { page: 1, snippet: `...example of the word ${searchQuery} in a sentence...` },
            { page: 2, snippet: `...another instance of ${searchQuery} here...` },
            { page: 4, snippet: `...finally, ${searchQuery} appears at the end...` },
          ]
        });
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteReplace = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }
    if (!searchQuery.trim()) {
      setError('Please enter search text.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setSearchResults(null);
    setDownloadUrl('');

    // Simulated network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('search_query', searchQuery);
      fd.append('replacement_text', replaceText);
      fd.append('replace_all', 'true');
      fd.append('case_sensitive', caseSensitive ? 'true' : 'false');

      let dl = '#';
      try {
        const res = await fetch('/document-management/find-replace/replace', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Replacement failed');

        setSuccess(`Successfully replaced ${data.total_replacements} occurrence(s)!`);
        dl = data.download_url;
      } catch (err) {
        // Fallback Mock Result
        setSuccess(`Successfully replaced 3 occurrence(s)! (Mocked)`);
        dl = '#mock-download';
      }
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
      a.download = selectedFile.name.replace('.pdf', '_replaced.pdf');
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
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Controls */}
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-[#1e2a52] mb-2">Search Text Query</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Confidential, Draft"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1e2a52] focus:ring-2 focus:ring-[#1e2a52]/20 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1e2a52] mb-2">Replacement Text</label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="e.g. Official, Approved"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1e2a52] focus:ring-2 focus:ring-[#1e2a52]/20 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="w-4 h-4 text-[#1e2a52] rounded border-slate-300 focus:ring-[#1e2a52]"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-[#1e2a52] transition-colors">Case Sensitive Match</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={matchWholeWord}
                  onChange={(e) => setMatchWholeWord(e.target.checked)}
                  className="w-4 h-4 text-[#1e2a52] rounded border-slate-300 focus:ring-[#1e2a52]"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-[#1e2a52] transition-colors">Match Whole Word Only</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleFindMatches}
                disabled={isProcessing || !selectedFile}
                className="bg-[#e8f0e2] hover:bg-[#d5e3cb] text-[#1e2a52] px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Search className="w-4 h-4" />
                Find Matches
              </button>
              
              <button
                onClick={handleExecuteReplace}
                disabled={isProcessing || !selectedFile}
                className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Zap className="w-4 h-4 text-[#c7dca7]" />
                Replace All & Save
              </button>
            </div>
          </div>

          {/* Loader Overlay */}
          {isProcessing && (
            <div className="mt-8 flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
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
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">
                Processing {toolName}… Please wait!
              </p>
            </div>
          )}

          {/* Results Display */}
          {!isProcessing && searchResults && (
            <div className="mt-8 border-t border-slate-100 pt-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="bg-[#f8faf7] border border-[#1e2a52]/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#1e2a52] mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  {searchResults.title}
                </h3>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.matches.length > 0 ? (
                    searchResults.matches.map((m, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-sm">
                        <span className="inline-block px-2 py-1 bg-[#1e2a52]/5 text-[#1e2a52] font-bold rounded mb-2 text-xs">
                          Page {m.page}
                        </span>
                        <p className="text-slate-700 italic">"...{m.snippet}..."</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-500 font-medium">
                      No matches found in the document.
                    </div>
                  )}
                </div>
              </div>
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
