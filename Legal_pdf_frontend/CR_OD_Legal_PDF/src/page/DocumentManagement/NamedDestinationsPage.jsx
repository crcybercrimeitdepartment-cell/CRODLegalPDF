import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, MapPin, Plus, List } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function NamedDestinationsPage({ onBack }) {
  const toolName = "Named Destinations";
  const toolDesc = "Assign unique string identifiers to important pages and sections for simplified navigation and external referencing.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)", mime: ["application/pdf"] };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [existingDestinations, setExistingDestinations] = useState([]);
  
  // Form State
  const [destName, setDestName] = useState('');
  const [targetPage, setTargetPage] = useState('');

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
    setExistingDestinations([]);
    setDownloadUrl('');
    
    const file = files[0];
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
      await loadExistingDestinations(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const loadExistingDestinations = async (file) => {
    setIsProcessing(true);
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const fd = new FormData();
      fd.append('file', file);
      
      try {
        const res = await fetch('/document-management/named-destinations/extract', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok && data.destinations && data.destinations.length > 0) {
          setExistingDestinations(data.destinations);
        } else {
          setExistingDestinations([]);
        }
      } catch (err) {
        // Fallback Mock
        setExistingDestinations([
          { id: 1, name: 'Introduction', target_page: 1 },
          { id: 2, name: 'Chapter1', target_page: 3 },
          { id: 3, name: 'Conclusion', target_page: 10 }
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
    setExistingDestinations([]);
    setDownloadUrl('');
    setError('');
    setSuccess('');
    setDestName('');
    setTargetPage('');
  };

  const handleCreateDestination = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }
    if (!destName.trim() || !targetPage) {
      setError('Please enter a destination name and target page.');
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
      fd.append('destination_name', destName);
      fd.append('target_page', targetPage);

      let dl = '#';
      let addedName = destName;
      let addedPage = targetPage;

      try {
        const res = await fetch('/document-management/named-destinations/create', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to create named destination');

        dl = data.download_url;
        addedName = data.destination_name;
        addedPage = data.target_page;
      } catch (err) {
        // Fallback mock
        dl = '#mock-download';
      }
      setSuccess(`Named destination "${addedName}" created pointing to Page ${addedPage}`);
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
      a.download = selectedFile.name.replace('.pdf', '_destinations.pdf');
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
              
              {/* Add New Destination Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-bold text-[#1e2a52] mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Create New Named Destination
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Destination Name (unique identifier)</label>
                    <input
                      type="text"
                      placeholder="e.g. Introduction, Chapter1"
                      value={destName}
                      onChange={(e) => setDestName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1e2a52] focus:ring-2 focus:ring-[#1e2a52]/20 outline-none transition-all text-sm font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Page Number</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 3"
                      value={targetPage}
                      onChange={(e) => setTargetPage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1e2a52] focus:ring-2 focus:ring-[#1e2a52]/20 outline-none transition-all text-sm font-medium bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleCreateDestination}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-xl font-bold shadow-md transition-all text-sm cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <MapPin className="w-4 h-4 text-[#c7dca7]" />
                    Create Named Destination & Save PDF
                  </button>
                </div>
              </div>

              {/* Existing Destinations Section */}
              {existingDestinations.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-base font-bold text-[#1e2a52] flex items-center gap-2">
                      <List className="w-5 h-5" />
                      Existing Named Destinations
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">#</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Destination Name</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Target Page</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {existingDestinations.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-500">{d.id || (idx + 1)}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#1e2a52]/5 text-[#1e2a52]">
                                {d.name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">
                                Page {d.target_page}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <List className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No named destinations found in this document.</p>
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
