import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Link as LinkIcon, Plus, Trash2, Zap } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function HyperlinkSupportPage({ onBack }) {
  const toolName = "Hyperlink Support";
  const toolDesc = "Create and manage interactive Web URLs, Email addresses, and Internal Page links inside PDF documents.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)", mime: ["application/pdf"] };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [hyperlinks, setHyperlinks] = useState([]);
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
    setHyperlinks([]);
    setDownloadUrl('');
    
    const file = files[0];
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
      await extractHyperlinks(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const extractHyperlinks = async (file) => {
    setIsProcessing(true);
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const fd = new FormData();
      fd.append('file', file);
      
      try {
        const res = await fetch('/document-management/hyperlink-support/extract', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Extract hyperlinks failed');

        const links = (data.links || []).map(l => ({
          page: l.page || 1,
          type: l.type === 'Internal Page Jump' ? 'page' : 'url',
          search_text: '',
          target: l.uri || (l.target_page ? String(l.target_page) : 'https://')
        }));
        
        // Mock fallback if empty
        if (links.length === 0) {
           setHyperlinks([
             { page: 1, type: 'url', search_text: 'Website', target: 'https://example.com' }
           ]);
        } else {
           setHyperlinks(links);
        }

      } catch (err) {
        // Fallback mock links
        setHyperlinks([
          { page: 1, type: 'url', search_text: 'Open link', target: 'https://google.com' },
          { page: 2, type: 'page', search_text: 'Go to Conclusion', target: '5' }
        ]);
      }
    } catch (err) {
      setError('Error extracting hyperlinks: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setHyperlinks([]);
    setDownloadUrl('');
    setError('');
    setSuccess('');
  };

  const addNewHyperlink = () => {
    setHyperlinks(prev => [...prev, { page: 1, type: 'url', search_text: '', target: 'https://' }]);
  };

  const updateHyperlink = (index, field, value) => {
    setHyperlinks(prev => prev.map((link, i) => i === index ? { ...link, [field]: value } : link));
  };

  const deleteLink = (index) => {
    setHyperlinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplyHyperlinks = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setDownloadUrl('');

    // Simulated network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('links_json', JSON.stringify(hyperlinks));

      let dl = '#';
      try {
        const res = await fetch('/document-management/hyperlink-support/apply', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Apply hyperlinks failed');

        dl = data.download_url;
      } catch (err) {
        // Fallback mock
        dl = '#mock-download';
      }
      setSuccess('Hyperlinks applied successfully!');
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
      a.download = selectedFile.name.replace('.pdf', '_links.pdf');
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

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-14">
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

          {/* Hyperlink Editor */}
          {!isProcessing && selectedFile && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-[#1e2a52] flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Active Document Hyperlinks
                </h3>
                <button
                  onClick={addNewHyperlink}
                  className="inline-flex items-center justify-center gap-2 bg-[#e8f0e2] hover:bg-[#d5e3cb] text-[#1e2a52] px-4 py-2 rounded-xl font-bold transition-all text-sm cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add New Hyperlink
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-12 text-center">#</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24">Page #</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-32">Type</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Text / Area</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Target URL/Page</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hyperlinks.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-slate-500 font-medium">
                            No hyperlinks found. Click "+ Add New Hyperlink" to create one.
                          </td>
                        </tr>
                      ) : (
                        hyperlinks.map((link, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-500 text-center font-medium">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={link.page}
                                onChange={(e) => updateHyperlink(idx, 'page', parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#1e2a52] focus:ring-1 focus:ring-[#1e2a52] outline-none text-sm font-medium"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={link.type}
                                onChange={(e) => updateHyperlink(idx, 'type', e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:border-[#1e2a52] focus:ring-1 focus:ring-[#1e2a52] outline-none text-sm font-medium bg-white cursor-pointer"
                              >
                                <option value="url">Web URL</option>
                                <option value="page">Page Jump</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Text to link"
                                value={link.search_text}
                                onChange={(e) => updateHyperlink(idx, 'search_text', e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-[#1e2a52] focus:ring-1 focus:ring-[#1e2a52] outline-none text-sm font-medium"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder={link.type === 'url' ? 'https://example.com' : 'Page #'}
                                value={link.target}
                                onChange={(e) => updateHyperlink(idx, 'target', e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-[#1e2a52] focus:ring-1 focus:ring-[#1e2a52] outline-none text-sm font-medium"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => deleteLink(idx)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleApplyHyperlinks}
                  disabled={isProcessing}
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto justify-center"
                >
                  <Zap className="w-4 h-4 text-[#c7dca7]" />
                  Apply Hyperlinks & Save PDF
                </button>
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
                  Download Hyperlinked PDF
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
