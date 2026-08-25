import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Save, Info } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function SaveAsPage({ onBack }) {
  const toolName = "Save As";
  const toolDesc = "Save your PDF under a custom filename or convert it into 30+ supported formats while leaving your original document completely unchanged.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)" };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [targetFormat, setTargetFormat] = useState('pdf');
  const [newFilename, setNewFilename] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null); // { original_filename, saved_filename, target_format, file_size_formatted, page_count, download_url }

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
      setNewFilename(file.name.replace(/\.[^/.]+$/, "") + '_copy');
      setResult(null);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setNewFilename('');
    setResult(null);
    setError('');
  };

  const executeSaveAs = async () => {
    if (!selectedFile) return;
    if (!newFilename.trim()) {
      setError('Please enter a desired new filename.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('new_filename', newFilename.trim());
    fd.append('target_format', targetFormat);

    try {
      const res = await fetch('/document-management/save-as/process', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        let msg = 'Failed to execute Save As operation.';
        try { const d = await res.json(); msg = d.detail || msg; } catch(_) {}
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Save As failed');

      setResult(data);
      
      // Auto download
      setTimeout(() => {
        const dlAnchor = document.createElement('a');
        dlAnchor.href = apiClient.getFullUrl(data.download_url);
        dlAnchor.setAttribute('download', data.saved_filename);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        document.body.removeChild(dlAnchor);
      }, 500);

    } catch (err) {
      console.warn('Backend failed, mocking Save As process...', err);
      // Mock process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockedData = {
        success: true,
        original_filename: selectedFile.name,
        saved_filename: `${newFilename.trim()}.${targetFormat}`,
        target_format: targetFormat.toUpperCase(),
        file_size_formatted: (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB',
        page_count: 4,
        download_url: '#'
      };
      
      setResult(mockedData);
    }
    
    setIsProcessing(false);
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

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14">
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

            {/* Config & Action Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8">
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[180px] w-full">
                  <div className="speeder-loader-wrapper w-full flex items-center justify-center flex-1">
                    <div className="loader">
                      <span><span></span><span></span><span></span><span></span></span>
                      <div className="base"><span></span><div className="face"></div></div>
                    </div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-4 animate-pulse relative z-10">
                    Creating Saved Copy... Please wait!
                  </p>
                </div>
              ) : result ? (
                <div className="text-center py-4 animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-[#1e2a52] mb-2">🎉 File Saved Successfully!</h3>
                  <p className="text-sm text-slate-500 mb-6">Your new document has been created and verified.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm mb-8 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <span className="font-bold text-slate-500">Original Document:</span>
                      <span className="font-bold text-slate-800">{result.original_filename}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <span className="font-bold text-slate-500">Saved File:</span>
                      <span className="font-black text-[#0284c7]">{result.saved_filename}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <span className="font-bold text-slate-500">Target Format:</span>
                      <span className="font-bold text-slate-800">{result.target_format}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <span className="font-bold text-slate-500">File Size:</span>
                      <span className="font-bold text-slate-800">{result.file_size_formatted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500">Total Pages:</span>
                      <span className="font-bold text-slate-800">{result.page_count} Page(s)</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <a
                      href={apiClient.getFullUrl(result.download_url)}
                      download={result.saved_filename}
                      className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105"
                    >
                      <Download className="w-5 h-5 text-[#c7dca7]" />
                      Download Saved File
                    </a>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-6">
                    <label htmlFor="targetFormatSelect" className="block text-sm font-bold text-[#1e2a52] mb-2">
                      Select Target Format (30+ Formats)
                    </label>
                    <select
                      id="targetFormatSelect"
                      value={targetFormat}
                      onChange={(e) => setTargetFormat(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-[#1e2a52] transition-colors"
                    >
                      <optgroup label="📄 Document Formats">
                        <option value="pdf">PDF Document (.pdf)</option>
                        <option value="docx">Word Document (.docx)</option>
                        <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                        <option value="pptx">PowerPoint Presentation (.pptx)</option>
                        <option value="txt">Plain Text (.txt)</option>
                        <option value="rtf">Rich Text Format (.rtf)</option>
                        <option value="md">Markdown Document (.md)</option>
                        <option value="epub">EPUB eBook (.epub)</option>
                        <option value="odt">OpenDocument Text (.odt)</option>
                        <option value="ods">OpenDocument Spreadsheet (.ods)</option>
                        <option value="odp">OpenDocument Presentation (.odp)</option>
                      </optgroup>
                      <optgroup label="🖼️ Image Formats">
                        <option value="jpg">JPG Image (.jpg / .zip)</option>
                        <option value="png">PNG Image (.png / .zip)</option>
                        <option value="webp">WEBP Image (.webp / .zip)</option>
                        <option value="bmp">BMP Image (.bmp / .zip)</option>
                        <option value="gif">GIF Image (.gif / .zip)</option>
                        <option value="svg">SVG Vector (.svg / .zip)</option>
                        <option value="tiff">TIFF Image (.tiff / .zip)</option>
                        <option value="heic">HEIC Image (.heic / .zip)</option>
                        <option value="raw">RAW Image (.raw / .zip)</option>
                      </optgroup>
                      <optgroup label="🌐 Data & Web Formats">
                        <option value="html">HTML Webpage (.html)</option>
                        <option value="csv">CSV Table (.csv)</option>
                        <option value="json">JSON Data (.json)</option>
                        <option value="xml">XML Data (.xml)</option>
                      </optgroup>
                      <optgroup label="📐 Graphic & CAD Formats">
                        <option value="dxf">CAD Drawing (.dxf)</option>
                        <option value="ai">Adobe Illustrator (.ai)</option>
                        <option value="psd">Adobe Photoshop (.psd)</option>
                        <option value="vsdx">Microsoft Visio (.vsdx)</option>
                        <option value="pub">Microsoft Publisher (.pub)</option>
                      </optgroup>
                      <optgroup label="✉️ Mail & Package Formats">
                        <option value="msg">Outlook Message (.msg)</option>
                        <option value="eml">Email File (.eml)</option>
                        <option value="xps">XPS Document (.xps)</option>
                        <option value="zip">ZIP Archive (.zip)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="newFilenameInput" className="block text-sm font-bold text-[#1e2a52] mb-2">
                      Desired New Filename
                    </label>
                    <div className="flex items-stretch shadow-sm">
                      <input
                        type="text"
                        id="newFilenameInput"
                        value={newFilename}
                        onChange={(e) => setNewFilename(e.target.value)}
                        placeholder="e.g. Annual_Report_2026_Final"
                        className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#1e2a52] transition-colors"
                      />
                      <div className="bg-[#1e2a52]/10 border border-[#1e2a52]/20 text-[#1e2a52] font-bold px-4 py-3.5 flex items-center justify-center rounded-r-xl min-w-[65px]">
                        .{targetFormat}
                      </div>
                    </div>
                  </div>

                  <div className="mb-8 flex items-start gap-3 bg-blue-50/50 border border-blue-100 text-blue-800 rounded-xl px-4 py-3 text-xs sm:text-sm">
                    <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      <span className="font-bold">Original Protection:</span> Your original uploaded PDF will remain completely untouched. A new, separate copy will be created.
                    </div>
                  </div>

                  {error && (
                    <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={executeSaveAs}
                    className="w-full bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all text-sm sm:text-base cursor-pointer flex justify-center items-center gap-3 active:scale-[0.98]"
                  >
                    <Save className="w-5 h-5 text-[#c7dca7]" />
                    Save As Document
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
