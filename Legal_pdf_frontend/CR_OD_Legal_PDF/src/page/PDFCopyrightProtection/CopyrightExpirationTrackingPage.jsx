import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, CalendarClock, ShieldCheck, ShieldAlert, ShieldX, Calendar } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightExpirationTrackingPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [reportData, setReportData] = useState(null);
  
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [copyrightHolder, setCopyrightHolder] = useState('');
  const [thresholdDays, setThresholdDays] = useState(90);

  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Expiration Tracking';
  const toolDesc = tool?.description || 'Track and calculate the current copyright validity status based on available information.';
  
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
    if (effectiveDate) fd.append('effective_date', effectiveDate);
    if (expirationDate) fd.append('expiration_date', expirationDate);
    if (copyrightHolder) fd.append('copyright_holder', copyrightHolder.trim());
    fd.append('expiration_threshold_days', thresholdDays);

    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/expiration/track`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) {
        throw new Error(d.detail || 'Tracking failed');
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
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/expiration/report`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) {
        throw new Error(d.detail || 'Report failed');
      }
      
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'expiration-report.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e.message);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'Active') return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: <ShieldCheck className="w-12 h-12 text-emerald-500 mb-3" /> };
    if (status === 'Expiring Soon') return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: <ShieldAlert className="w-12 h-12 text-amber-500 mb-3" /> };
    if (status === 'Expired') return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: <ShieldX className="w-12 h-12 text-red-500 mb-3" /> };
    return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', icon: <CalendarClock className="w-12 h-12 text-slate-400 mb-3" /> };
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

              {/* File list & Form */}
              {files.length > 0 && (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">File selected</p>
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

                  <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200">
                    <h3 className="text-sm font-bold text-[#1e2a52] mb-4 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4" /> Tracking Parameters
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Effective Date <span className="text-slate-400 font-medium">(optional)</span></label>
                        <input 
                          type="date" 
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-700 text-sm font-medium transition-all"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Expiration Date <span className="text-slate-400 font-medium">(optional)</span></label>
                        <input 
                          type="date" 
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-700 text-sm font-medium transition-all"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Copyright Holder <span className="text-slate-400 font-medium">(optional)</span></label>
                        <input 
                          type="text" 
                          placeholder="E.g., John Doe"
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-700 text-sm font-medium transition-all"
                          value={copyrightHolder}
                          onChange={(e) => setCopyrightHolder(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Threshold Days</label>
                        <input 
                          type="number" 
                          min="1"
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-700 text-sm font-medium transition-all"
                          value={thresholdDays}
                          onChange={(e) => setThresholdDays(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">Days before expiration to trigger a warning.</p>
                      </div>
                    </div>
                  </div>
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
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Tracking Expiration… Please wait!</p>
                    </div>
                  ) : (
                    <button onClick={handleProcess} className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95">
                      <CalendarClock className="w-4 h-4" /> Track Expiration
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result Area */}
          {isDone && reportData && reportData.tracking && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm mb-6">
                <CheckCircle2 className="w-5 h-5" />
                Done! Tracking Complete.
              </div>
              
              <h2 className="text-2xl font-black text-[#1e2a52] mb-8 border-b-2 border-[#1e2a52]/10 pb-4">Expiration Status</h2>
              
              <div className="space-y-8 mt-6">
                
                {(() => {
                  const style = getStatusStyle(reportData.tracking.status);
                  return (
                    <div className={`p-8 rounded-3xl flex flex-col items-center justify-center text-center border shadow-sm transition-all hover:shadow-md ${style.bg} ${style.border}`}>
                      {style.icon}
                      <h3 className={`text-2xl font-black tracking-tight mb-2 uppercase ${style.text}`}>{reportData.tracking.status}</h3>
                      <div className={`text-sm sm:text-base font-bold opacity-90 ${style.text}`}>
                        {reportData.tracking.days_remaining !== null 
                          ? `${reportData.tracking.days_remaining} day(s) remaining` 
                          : reportData.tracking.expired_duration || 'Time status unavailable'}
                      </div>
                    </div>
                  );
                })()}
                
                {reportData.tracking.explanation && (
                  <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-slate-700 text-center leading-relaxed font-semibold text-sm shadow-inner">
                    {reportData.tracking.explanation}
                  </div>
                )}
                
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <th className="py-4 px-6 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 w-1/3">Document</th>
                        <td className="py-4 px-6 text-sm font-semibold text-[#1e2a52]">{reportData.tracking.document_name}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <th className="py-4 px-6 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Copyright Holder</th>
                        <td className="py-4 px-6 text-sm font-semibold text-[#1e2a52]">
                          {reportData.tracking.copyright_holder || <span className="text-slate-400 italic font-medium">Not available</span>}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <th className="py-4 px-6 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Effective Date</th>
                        <td className="py-4 px-6 text-sm font-semibold text-[#1e2a52] flex flex-wrap items-center gap-2">
                          {reportData.tracking.effective_date ? (
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400"/> {reportData.tracking.effective_date}</span>
                          ) : (
                            <span className="text-slate-400 italic font-medium">Not available</span>
                          )}
                          {reportData.tracking.effective_date_source && (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2.5 py-1 rounded-full border border-indigo-100">
                              Source: {reportData.tracking.effective_date_source}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <th className="py-4 px-6 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Expiration Date</th>
                        <td className="py-4 px-6 text-sm font-semibold text-[#1e2a52] flex flex-wrap items-center gap-2">
                          {reportData.tracking.expiration_date ? (
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400"/> {reportData.tracking.expiration_date}</span>
                          ) : (
                            <span className="text-slate-400 italic font-medium">Not available</span>
                          )}
                          {reportData.tracking.expiration_date_source && (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2.5 py-1 rounded-full border border-indigo-100">
                              Source: {reportData.tracking.expiration_date_source}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <th className="py-4 px-6 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Last Checked</th>
                        <td className="py-4 px-6 text-sm font-semibold text-slate-600">{reportData.tracking.last_checked}</td>
                      </tr>
                      
                      {reportData.tracking.threshold_warning && (
                        <tr className="bg-amber-50/80">
                          <th className="py-4 px-6 text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">Warning</th>
                          <td className="py-4 px-6 text-sm text-amber-800 font-bold flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            Expiration is approaching the configured threshold.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
