import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function ContentOwnershipValidationPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [claimedOwner, setClaimedOwner] = useState('');
  const [result, setResult] = useState(null);
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Content Ownership Validation';
  const toolDesc = tool?.description || 'Validate ownership information by comparing PDF metadata with existing copyright records.';
  
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
      setResult(null);
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
    setResult(null);
    setError(''); 
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    setError('');
    setResult(null);

    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    fd.append('claimed_owner', claimedOwner.trim());

    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/ownership-validation/validate`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) {
        throw new Error(d.detail || 'Validation failed');
      }
      
      setResult(d);
      setIsDone(true);
    } catch (ex) {
      setError('Error: ' + ex.message);
      setIsDone(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ownership-validation-report.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e.message);
    }
  };

  const getStatusClass = (status) => {
    if (status === 'Ownership Verified') return 'bg-green-100 text-green-800';
    if (status === 'Partially Verified') return 'bg-yellow-100 text-yellow-800';
    if (status === 'Ownership Mismatch') return 'bg-red-100 text-red-800';
    if (status === 'Ownership Information Missing') return 'bg-slate-100 text-slate-800';
    if (status?.includes('Available')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-orange-100 text-orange-800';
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
                  
                  {/* Claimed Owner Input */}
                  <div className="pt-4 space-y-1.5 text-left">
                    <label className="block text-sm font-semibold text-slate-700">Claimed Owner Name (optional)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] transition-all bg-white text-slate-900" 
                      placeholder="Enter the claimed copyright owner name to validate against"
                      value={claimedOwner}
                      onChange={(e) => setClaimedOwner(e.target.value)}
                    />
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
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Validating ownership… Please wait!</p>
                    </div>
                  ) : (
                    <button onClick={handleProcess} className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95">
                      Validate Ownership
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result Area */}
          {isDone && result && result.validation && (
            <div className="w-full text-left">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm mb-6">
                <CheckCircle2 className="w-5 h-5" />
                Done! Validation complete.
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-6">Validation Result</h2>
              
              <div className="text-center mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusClass(result.validation.status)}`}>
                  {result.validation.status}
                </span>
              </div>
              
              <p className="text-center text-slate-500 mb-6">{result.validation.explanation}</p>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Document Information</h3>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
                  <div className="text-slate-500 font-medium">Title</div>
                  <div className="sm:col-span-2 text-slate-900">{result.validation.document_info.title || 'Not Available'}</div>
                  
                  <div className="text-slate-500 font-medium">Author</div>
                  <div className="sm:col-span-2 text-slate-900">{result.validation.document_info.author || 'Not Available'}</div>
                  
                  <div className="text-slate-500 font-medium">Creator</div>
                  <div className="sm:col-span-2 text-slate-900">{result.validation.document_info.creator || 'Not Available'}</div>
                  
                  <div className="text-slate-500 font-medium">Pages</div>
                  <div className="sm:col-span-2 text-slate-900">{result.validation.document_info.total_pages}</div>
                  
                  <div className="text-slate-500 font-medium">File Size</div>
                  <div className="sm:col-span-2 text-slate-900">{(result.validation.document_info.file_size / 1024 / 1024).toFixed(2)} MB</div>
                  
                  <div className="text-slate-500 font-medium">Document Hash</div>
                  <div className="sm:col-span-2 text-slate-900 font-mono break-all text-xs bg-white p-2 rounded border border-slate-200">
                    {result.validation.document_hash}
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Evidence Summary</h3>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm text-center">
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="text-2xl font-bold text-slate-800">{result.validation.summary.total_fields}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Fields</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="text-2xl font-bold text-slate-800">{result.validation.summary.found}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Found</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 shadow-sm">
                    <div className="text-2xl font-bold text-green-700">{result.validation.summary.matched}</div>
                    <div className="text-xs text-green-600 uppercase tracking-wide mt-1">Matched</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 shadow-sm">
                    <div className="text-2xl font-bold text-red-700">{result.validation.summary.mismatched}</div>
                    <div className="text-xs text-red-600 uppercase tracking-wide mt-1">Mismatched</div>
                  </div>
                </div>
              </div>

              {result.validation.matched_fields && result.validation.matched_fields.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Matched Fields</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr><th className="px-4 py-3">Field</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Source</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.validation.matched_fields.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-700">{f.field}</td>
                            <td className="px-4 py-3 text-green-600 font-medium">{f.value || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-500">{f.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.validation.mismatched_fields && result.validation.mismatched_fields.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Mismatched Fields</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr><th className="px-4 py-3">Field</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Source</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.validation.mismatched_fields.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-700">{f.field}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">{f.value || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-500">{f.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.validation.missing_fields && result.validation.missing_fields.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Missing Fields</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr><th className="px-4 py-3">Field</th><th className="px-4 py-3">Source</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.validation.missing_fields.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-500 font-medium">{f.field}</td>
                            <td className="px-4 py-3 text-slate-500">{f.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {result.disclaimer && (
                <div className="text-xs text-slate-500 text-center italic bg-slate-50 p-3 rounded-lg border border-slate-100 mb-6">
                  {result.disclaimer}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={downloadReport} className="inline-flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer hover:scale-105">
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
                <button onClick={() => { setIsDone(false); setFiles([]); setResult(null); setClaimedOwner(''); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105">
                  Start Over
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
