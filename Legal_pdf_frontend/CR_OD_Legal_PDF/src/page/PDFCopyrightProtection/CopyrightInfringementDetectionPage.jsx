import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, ArrowLeft, X, AlertCircle, ShieldAlert, AlertTriangle, Info, Search, RefreshCw, FileSearch } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightInfringementDetectionPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState(null);
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Infringement Detection';
  const toolDesc = tool?.description || 'Analyze your PDF for potential copyright infringement indicators and risk factors.';
  
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
      setResult(null);
      analyze(valid[0].originalFile);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };
  
  const resetUpload = () => {
    setFiles([]);
    setError('');
    setResult(null);
  };

  const analyze = async (selectedFile) => {
    setIsLoading(true);
    setError('');
    setResult(null);
    
    const fd = new FormData();
    fd.append('file', selectedFile);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/infringement-detection/analyze`, { method: 'POST', body: fd });
      const data = await res.json();
      
      if (data.success) {
        setResult({
          riskSummary: data.risk_summary,
          totalFindings: data.total_findings,
          findings: data.findings || [],
          disclaimer: data.disclaimer || ''
        });
      } else {
        setError(data.error || 'Analysis failed');
        setFiles([]);
      }
    } catch (ex) {
      setError('Error: ' + ex.message);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColorClass = (riskSummary) => {
    if (riskSummary === 'Warnings Found') return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" /> };
    if (riskSummary === 'Potential Issues Detected') return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <ShieldAlert className="w-8 h-8 text-red-500 mb-3" /> };
    if (riskSummary === 'Minor Observations') return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Info className="w-8 h-8 text-blue-500 mb-3" /> };
    return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" /> };
  };

  const getFindingTypeClass = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };
  
  const getFindingIcon = (severity) => {
    switch (severity) {
      case 'high': return <ShieldAlert className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
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

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          
          {/* Upload Area */}
          {!result && (
            <>
              {!files.length && !isLoading && (
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
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Analyzing for Infringement Indicators…</p>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          {/* Result Area */}
          {result && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100">
                <h2 className="text-xl font-bold text-[#1e2a52] flex items-center gap-2">
                  <FileSearch className="w-5 h-5" /> Analysis Result
                </h2>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-500 truncate max-w-[150px]">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">{files[0]?.name}</span>
                  </div>
                  <button onClick={resetUpload} className="text-slate-400 hover:text-[#1e2a52] transition-colors p-1" title="Analyze Another">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {(() => {
                const statusStyle = getStatusColorClass(result.riskSummary);
                return (
                  <div className={`p-8 rounded-3xl flex flex-col items-center justify-center text-center border shadow-sm transition-all hover:shadow-md mb-8 ${statusStyle.bg} ${statusStyle.border}`}>
                    {statusStyle.icon}
                    <h3 className={`text-2xl font-black tracking-tight mb-2 uppercase ${statusStyle.text}`}>{result.riskSummary}</h3>
                    <div className={`text-sm sm:text-base font-bold opacity-90 ${statusStyle.text}`}>
                      {result.totalFindings} Finding{result.totalFindings !== 1 ? 's' : ''} Detected
                    </div>
                  </div>
                );
              })()}

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pl-2">Detailed Findings</h3>
                
                {result.totalFindings === 0 ? (
                  <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="text-sm font-bold text-slate-700">Clean Document</p>
                    <p className="text-xs mt-1 text-center max-w-sm">No potential copyright infringement indicators or high-risk factors were detected in this document.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {result.findings.map((finding, idx) => (
                      <div key={idx} className="p-5 bg-white border border-slate-200/80 rounded-2xl hover:border-[#1e2a52]/30 hover:shadow-md transition-all group">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getFindingTypeClass(finding.severity)}`}>
                              {getFindingIcon(finding.severity)}
                              {finding.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {finding.pages && finding.pages.length > 0 && (
                            <div className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 flex items-center gap-1 self-start sm:self-auto">
                              <FileText className="w-3 h-3" />
                              Pages: {finding.pages.join(', ')}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-sm font-bold text-slate-800 mb-3">
                          {finding.message}
                        </div>
                        
                        {finding.text_preview && (
                          <div className="text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 italic leading-relaxed shadow-inner font-medium">
                            "{finding.text_preview.substring(0, 150)}{finding.text_preview.length > 150 ? '...' : ''}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {result.disclaimer && (
                <div className="mt-8 text-[10px] sm:text-xs font-medium text-slate-500 text-center bg-slate-50 p-4 rounded-xl border border-slate-200/60 leading-relaxed">
                  {result.disclaimer}
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-slate-200/80 flex justify-center">
                <button 
                  onClick={resetUpload} 
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Analyze Another Document
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
