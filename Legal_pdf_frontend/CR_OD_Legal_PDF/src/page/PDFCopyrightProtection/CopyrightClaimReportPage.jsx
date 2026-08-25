import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, ArrowLeft, X, AlertCircle, FileBarChart, ShieldCheck, AlertTriangle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightClaimReportPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [reportData, setReportData] = useState(null);
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Claim Report';
  const toolDesc = tool?.description || 'Generate a professional copyright claim report from your PDF document.';
  
  const addFiles = (newFiles) => {
    setError('');
    const valid = [];
    const invalid = [];

    Array.from(newFiles).forEach(f => {
      if (f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf') {
        valid.push({
          name: f.name,
          size: f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: f.type,
          originalFile: f
        });
      } else {
        invalid.push(f.name);
      }
    });

    if (invalid.length > 0) setError(`Only PDF files (.pdf) are accepted. Rejected: ${invalid.join(', ')}`);
    if (valid.length > 0) {
      setFiles([valid[0]]);
      setIsDone(false);
      setReportData(null);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };
  
  const handleRemove = (idx) => { 
    setFiles([]); 
    setIsDone(false); 
    setReportData(null);
    setError(''); 
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    setError('');
    setReportData(null);

    const fd = new FormData();
    fd.append('file', files[0].originalFile);

    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/claim-report/generate`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok || !d.success) {
        throw new Error(d.error || d.detail || 'Failed to generate report');
      }
      
      setReportData(d);
      setIsDone(true);
    } catch (ex) {
      setError('Error: ' + ex.message);
      setIsDone(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen">
      {/* Back button */}
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">{toolName}</h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{toolDesc}</p>
      </div>

      {/* Upload Card */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          
          {!isDone && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-[#1e2a52] bg-[#e8f0e2]' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
              >
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop file here or click to browse</p>
                <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-6 space-y-2.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">File selected</p>
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1e2a52]/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#1e2a52]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400">{file.size}</p>
                      </div>
                      <button onClick={() => handleRemove(idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Action area */}
              {files.length > 0 && (
                <div className="mt-8 text-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Generating Report… Please wait!</p>
                    </div>
                  ) : (
                    <button onClick={handleProcess} className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95">
                      <FileBarChart className="w-4 h-4" /> Generate Claim Report
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result Area */}
          {isDone && reportData && reportData.report && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm mb-6">
                <CheckCircle2 className="w-5 h-5" />
                Done! Claim Report Generated.
              </div>
              
              <h2 className="text-2xl font-black text-[#1e2a52] mb-8 border-b-2 border-[#1e2a52]/10 pb-4">Report Data</h2>
              
              <div className="space-y-8">
                {reportData.report.sections?.document_info && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">Document Information</h3>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
                        <div className="text-slate-500 font-medium">Title</div>
                        <div className="sm:col-span-2 text-slate-900 font-bold">{reportData.report.sections.document_info.title}</div>
                        
                        <div className="text-slate-500 font-medium">Author</div>
                        <div className="sm:col-span-2 text-slate-900 font-bold">{reportData.report.sections.document_info.author}</div>
                        
                        <div className="text-slate-500 font-medium">Creator</div>
                        <div className="sm:col-span-2 text-slate-900 font-bold">{reportData.report.sections.document_info.creator}</div>
                        
                        <div className="text-slate-500 font-medium">Producer</div>
                        <div className="sm:col-span-2 text-slate-900 font-bold">{reportData.report.sections.document_info.producer}</div>
                        
                        <div className="text-slate-500 font-medium">Pages</div>
                        <div className="sm:col-span-2 text-slate-900 font-bold">{reportData.report.sections.document_info.total_pages}</div>
                      </div>
                    </div>
                  </div>
                )}

                {reportData.report.sections?.holder_info?.count > 0 && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">
                      Copyright Holders ({reportData.report.sections.holder_info.count})
                    </h3>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                      {reportData.report.sections.holder_info.holders.map((h, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 last:border-0 last:pb-0">
                          <span className="font-bold text-[#1e2a52]">{h.name}</span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {h.holder_type || 'Unknown Type'}
                            {h.ownership_percentage ? ` - ${h.ownership_percentage}%` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.report.sections?.license_info && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">License Information</h3>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
                        <div className="text-slate-500 font-medium">Name</div>
                        <div className="sm:col-span-2 text-slate-900 font-bold">{reportData.report.sections.license_info.license_name || 'N/A'}</div>
                        
                        <div className="text-slate-500 font-medium">Type</div>
                        <div className="sm:col-span-2 text-slate-900 font-bold">{reportData.report.sections.license_info.license_type || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {reportData.report.verification && reportData.report.verification.length > 0 && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">Verification Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reportData.report.verification.map((v, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                          {v.status === 'found' ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            </div>
                          )}
                          <div>
                            <span className="block text-sm font-bold text-slate-900">{v.item}</span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${v.status === 'found' ? 'text-emerald-600' : 'text-red-600'}`}>{v.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.report.missing_fields && reportData.report.missing_fields.length > 0 && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">Missing Information</h3>
                    <div className="space-y-2">
                      {reportData.report.missing_fields.map((f, i) => (
                        <div key={i} className="p-4 bg-amber-50/50 text-amber-900 border border-amber-200/50 rounded-2xl text-sm flex items-center gap-3 font-medium">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.report.warnings && reportData.report.warnings.length > 0 && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">Warnings</h3>
                    <div className="space-y-2">
                      {reportData.report.warnings.map((w, i) => (
                        <div key={i} className="p-4 bg-red-50/50 text-red-900 border border-red-200/50 rounded-2xl text-sm flex items-center gap-3 font-medium">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.report.claim_summary && (
                  <div>
                     <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">Claim Summary</h3>
                    <div className="bg-[#1e2a52]/5 border border-[#1e2a52]/10 p-6 rounded-3xl text-[#1e2a52] text-sm leading-relaxed font-bold shadow-inner">
                      {reportData.report.claim_summary}
                    </div>
                  </div>
                )}
              </div>
              
              {reportData.disclaimer && (
                <div className="mt-10 text-xs font-medium text-slate-500 text-center bg-slate-50 p-5 rounded-2xl border border-slate-200/60 leading-relaxed">
                  {reportData.disclaimer}
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <button onClick={() => { setIsDone(false); setFiles([]); setReportData(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105">
                  Generate Another Report
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
