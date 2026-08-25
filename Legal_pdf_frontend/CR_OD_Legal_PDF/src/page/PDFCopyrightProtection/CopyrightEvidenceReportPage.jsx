import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, ShieldCheck, FolderSearch } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightEvidenceReportPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [reportData, setReportData] = useState(null);
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Evidence Report';
  const toolDesc = tool?.description || 'Collect all available copyright-related evidence from your PDF document.';
  
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
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/evidence-report/collect`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) {
        throw new Error(d.detail || 'Collection failed');
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

  const downloadReport = async () => {
    if (!files.length) return;
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/evidence-report/generate`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) {
        throw new Error(d.detail || 'Download failed');
      }
      
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'evidence-report.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e.message);
    }
  };

  const formatKey = (k) => {
    return k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderValue = (v) => {
    if (v === null || v === 'Not Available') {
      return <span className="text-slate-400 italic text-[10px] sm:text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">Not Available</span>;
    }
    if (typeof v === 'object') {
      return (
        <pre className="text-[10px] sm:text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 overflow-x-auto whitespace-pre-wrap max-w-full">
          {JSON.stringify(v, null, 2)}
        </pre>
      );
    }
    if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
      return <a href={v} target="_blank" rel="noopener noreferrer" className="text-[#1e2a52] hover:text-[#16203e] underline break-all font-bold">{v}</a>;
    }
    return <span className="text-slate-800 font-bold break-words">{v}</span>;
  };

  const sections = [
    { key: 'document_info', title: 'Document Information' },
    { key: 'ownership_evidence', title: 'Ownership Evidence' },
    { key: 'copyright_info', title: 'Copyright Information' },
    { key: 'registration_evidence', title: 'Registration Evidence' },
    { key: 'metadata_evidence', title: 'Metadata Evidence' },
    { key: 'integrity_info', title: 'Integrity Information' },
    { key: 'verification_info', title: 'Verification Information' },
  ];

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
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Collecting Evidence… Please wait!</p>
                    </div>
                  ) : (
                    <button onClick={handleProcess} className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95">
                      <FolderSearch className="w-4 h-4" /> Collect Evidence
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
                Done! Evidence Collected.
              </div>
              
              <h2 className="text-2xl font-black text-[#1e2a52] mb-8 border-b-2 border-[#1e2a52]/10 pb-4">Evidence Report</h2>
              
              <div className="space-y-8 mt-6">
                {sections.map(s => {
                  const sec = reportData.report.evidence[s.key];
                  if (!sec) return null;
                  
                  return (
                    <div key={s.key}>
                      <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2 flex items-center gap-2">
                        {s.title}
                      </h3>
                      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6 text-sm">
                          {Object.entries(sec).filter(([k]) => k !== 'status').map(([k, v]) => (
                            <div key={k} className="flex flex-col space-y-1.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0 md:last:border-b md:last:pb-3 md:even:border-0 md:even:pb-0">
                              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{formatKey(k)}</span>
                              <div className="mt-1">
                                {renderValue(v)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {reportData.report.evidence.timeline && reportData.report.evidence.timeline.length > 0 && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2 flex items-center gap-2">
                      Timeline
                    </h3>
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#1e2a52]"></div>
                      <div className="space-y-6 pl-2">
                        {reportData.report.evidence.timeline.map((t, i) => (
                          <div key={i} className="relative pl-6 sm:pl-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden">
                            <div className="absolute left-0 top-1 w-6 h-6 bg-[#e8f0e2] border-4 border-white rounded-full flex items-center justify-center z-10 shadow-sm">
                              <div className="w-2 h-2 bg-[#1e2a52] rounded-full"></div>
                            </div>
                            <div className="font-bold text-[#1e2a52] text-sm sm:text-base">{t.event}</div>
                            <div className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                              <span className="text-[#1e2a52] bg-[#1e2a52]/5 px-2 py-0.5 rounded">{t.timestamp}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span>{t.source}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {reportData.report.summary && (
                  <div className="bg-[#1e2a52]/5 rounded-2xl p-5 border border-[#1e2a52]/10 shadow-inner">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Summary</h3>
                    <p className="text-xs sm:text-sm font-bold text-[#1e2a52] leading-relaxed">
                      <span className="inline-flex items-center justify-center bg-white border border-slate-200 px-2 py-0.5 rounded-full mr-2 shadow-sm text-slate-800">{reportData.report.summary.available_sections}</span> sections available
                      <span className="mx-3 text-slate-300">|</span>
                      <span className="inline-flex items-center justify-center bg-white border border-slate-200 px-2 py-0.5 rounded-full mr-2 shadow-sm text-slate-800">{reportData.report.summary.missing_sections}</span> sections missing
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t border-slate-200/80">
                <button 
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto" 
                  onClick={downloadReport}
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
                <button 
                  onClick={() => { setIsDone(false); setFiles([]); setReportData(null); }} 
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  Start Over
                </button>
              </div>
              
              {reportData.disclaimer && (
                <div className="mt-8 text-[10px] sm:text-xs font-medium text-slate-500 text-center bg-slate-50 p-4 rounded-xl border border-slate-200/60 leading-relaxed">
                  {reportData.disclaimer}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
