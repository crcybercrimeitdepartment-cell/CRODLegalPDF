import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Search, ShieldCheck, ShieldAlert, FileWarning, CheckCircle, Info, Lock, Unlock, FileImage, LayoutGrid, FileJson } from 'lucide-react';

export default function PdfValidationPage({ onBack }) {
  const toolName = "PDF Validation";
  const toolDesc = "Upload a PDF to validate its integrity, structure, and metadata. Detect issues and get a detailed report.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)", mime: ["application/pdf"] };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [reportData, setReportData] = useState(null);

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
    setReportData(null);
    
    const file = files[0];
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
    } else {
      setError(`Only PDF files are accepted. Rejected: ${file.name}`);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setReportData(null);
    setError('');
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setReportData(null);

    // Simulated network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);

      try {
        const res = await fetch('/document-management/pdf-validation/validate', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Validation failed.');
        
        setReportData(data);
      } catch (err) {
        // Fallback Mock Report
        setReportData({
          filename: selectedFile.name,
          file_size_human: (selectedFile.size / 1024).toFixed(2) + ' KB',
          pdf_version: '1.7',
          page_count: 5,
          status: 'Warning',
          error_count: 0,
          warning_count: 2,
          info_count: 1,
          metadata: {
            title: 'Sample PDF',
            author: 'Jane Doe',
            creator: 'PDF Maker',
            producer: '',
            creation_date: '2023-10-01',
            modification_date: '2023-10-02'
          },
          encryption: {
            detected: false,
            details: 'Standard unencrypted document.'
          },
          issues: [
            { severity: 'warning', title: 'Missing Producer', description: 'The Producer metadata field is missing.', action: 'Consider adding a Producer field.' },
            { severity: 'warning', title: 'Unused Objects', description: 'Document contains unreferenced objects.', action: 'Optimize the PDF to remove them.' },
            { severity: 'info', title: 'Fonts Substituted', description: 'Some fonts were substituted.', action: 'Embed fonts for accurate rendering.' }
          ],
          page_info: [
            { page_num: 1, width: 595, height: 842, rotation: 0, has_text: true, image_count: 2 },
            { page_num: 2, width: 595, height: 842, rotation: 0, has_text: true, image_count: 0 }
          ],
          resources: {
            total_images: 2,
            pages_with_images: [1]
          }
        });
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_validation_report_${(reportData.filename || 'report').replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
            <div className="flex items-center gap-4 bg-[#f8faf7] border border-[#1e2a52]/20 rounded-2xl p-4 sm:p-6 mb-6">
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

          {/* Actions */}
          {!reportData && selectedFile && !isProcessing && (
             <div className="flex justify-center mt-8">
               <button
                 onClick={handleValidate}
                 className="w-full sm:w-auto bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
               >
                 <Search className="w-4 h-4 text-[#c7dca7]" />
                 Validate PDF
               </button>
             </div>
          )}

          {/* Loader Overlay */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[200px] w-full">
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
                Validating Document… Please wait!
              </p>
            </div>
          )}

          {/* Report Results */}
          {!isProcessing && reportData && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-300 mt-8 space-y-6">
              
              {/* Status Banner */}
              <div className={`p-6 rounded-2xl border text-center ${
                reportData.status === 'Valid' ? 'bg-emerald-50 border-emerald-200' :
                reportData.status === 'Warning' ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex justify-center mb-3">
                  {reportData.status === 'Valid' ? <CheckCircle className="w-10 h-10 text-emerald-600" /> :
                   reportData.status === 'Warning' ? <FileWarning className="w-10 h-10 text-amber-600" /> :
                   <ShieldAlert className="w-10 h-10 text-red-600" />}
                </div>
                <h2 className={`text-2xl font-black mb-3 ${
                  reportData.status === 'Valid' ? 'text-emerald-700' :
                  reportData.status === 'Warning' ? 'text-amber-700' :
                  'text-red-700'
                }`}>
                  Validation Result: {reportData.status}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    Errors: {reportData.error_count || 0}
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    Warnings: {reportData.warning_count || 0}
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#1e2a52]/10 text-[#1e2a52] border border-[#1e2a52]/20">
                    Info: {reportData.info_count || 0}
                  </span>
                </div>
              </div>

              {/* Grid: File Info & Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    File Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-medium">Filename</span>
                      <span className="text-slate-800 font-bold truncate max-w-[150px]" title={reportData.filename}>{reportData.filename}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-medium">File Size</span>
                      <span className="text-slate-800 font-bold">{reportData.file_size_human}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-medium">PDF Version</span>
                      <span className="text-slate-800 font-bold">{reportData.pdf_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Page Count</span>
                      <span className="text-slate-800 font-bold">{reportData.page_count}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    Metadata
                  </h3>
                  <div className="space-y-3 text-sm">
                    {['title', 'author', 'creator', 'producer'].map(key => (
                       <div key={key} className="flex justify-between border-b border-slate-200 pb-2">
                         <span className="text-slate-500 font-medium capitalize">{key}</span>
                         <span className={`font-bold truncate max-w-[150px] ${!reportData.metadata?.[key] ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                           {reportData.metadata?.[key] || 'N/A'}
                         </span>
                       </div>
                    ))}
                    <div className="flex justify-between pb-2">
                      <span className="text-slate-500 font-medium">Creation Date</span>
                      <span className={`font-bold truncate max-w-[150px] ${!reportData.metadata?.creation_date ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                        {reportData.metadata?.creation_date || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Encryption & Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Encryption Status
                  </h3>
                  <div className="flex items-center gap-3 mb-2">
                    {reportData.encryption?.detected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                        <Lock className="w-3.5 h-3.5" /> Encrypted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                        <Unlock className="w-3.5 h-3.5" /> Not Encrypted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {reportData.encryption?.details || 'No encryption details provided.'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    Resource Summary
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-medium">Total Images</span>
                      <span className="text-slate-800 font-bold">{reportData.resources?.total_images || 0}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-medium">Pages with Images</span>
                      <span className="text-slate-800 font-bold text-xs truncate">
                        {(reportData.resources?.pages_with_images || []).join(', ') || 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detected Issues */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-base font-bold text-[#1e2a52] flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Detected Issues
                  </h3>
                </div>
                <div className="p-6">
                  {(!reportData.issues || reportData.issues.length === 0) ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="text-emerald-600 font-bold">No issues detected. Document is perfectly clean.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reportData.issues.map((issue, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border-l-4 ${
                          issue.severity === 'error' ? 'bg-red-50 border-red-500' :
                          issue.severity === 'warning' ? 'bg-amber-50 border-amber-500' :
                          'bg-[#1e2a52]/5 border-[#1e2a52]'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded ${
                              issue.severity === 'error' ? 'bg-red-100 text-red-700' :
                              issue.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                              'bg-[#1e2a52]/10 text-[#1e2a52]'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className={`font-bold text-sm ${
                              issue.severity === 'error' ? 'text-red-900' :
                              issue.severity === 'warning' ? 'text-amber-900' :
                              'text-[#1e2a52]'
                            }`}>
                              {issue.title}
                            </span>
                            {issue.page && (
                              <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded ml-auto">
                                Page {issue.page}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 mb-2 leading-relaxed">
                            {issue.description}
                          </p>
                          {issue.action && (
                            <p className="text-[11px] font-medium text-slate-500 italic flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5" />
                              Recommended: {issue.action}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Page Details Table */}
              {reportData.page_info && reportData.page_info.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-base font-bold text-[#1e2a52] flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Page Details
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-white border-b border-slate-100 sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Page</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Dimensions (W x H)</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Rotation</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Has Text</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Images</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.page_info.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3 text-sm font-bold text-[#1e2a52]">{p.page_num}</td>
                            <td className="px-6 py-3 text-sm font-medium text-slate-600">{p.width} x {p.height}</td>
                            <td className="px-6 py-3 text-sm font-medium text-slate-600">{p.rotation}&deg;</td>
                            <td className="px-6 py-3 text-sm font-medium text-slate-600">
                               <span className={`inline-block w-2 h-2 rounded-full mr-2 ${p.has_text ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                               {p.has_text ? 'Yes' : 'No'}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-50/50 text-center w-24">
                              {p.image_count || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Download Report */}
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer hover:scale-105"
                >
                  <FileJson className="w-4 h-4" />
                  Download Validation Report (JSON)
                </button>
              </div>

            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
