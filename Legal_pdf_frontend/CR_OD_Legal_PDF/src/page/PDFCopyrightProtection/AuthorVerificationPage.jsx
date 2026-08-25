import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function AuthorVerificationPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [readLoading, setReadLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  
  const [claimedAuthor, setClaimedAuthor] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Author Verification';
  const toolDesc = tool?.description || 'Verify claimed authorship against PDF metadata. Metadata confirms document-embedded information, not legal identity.';
  
  const readMetadata = async (selectedFile) => {
    setReadLoading(true);
    setError('');
    setMetadata(null);
    setVerificationResult(null);
    setVerifyError(null);

    const fd = new FormData();
    fd.append('file', selectedFile);

    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/author-verification/extract`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setMetadata(j.metadata || {});
      } else {
        setError(j.error || j.detail || 'Upload failed');
      }
    } catch (ex) {
      setError('Upload failed: ' + ex.message);
    } finally {
      setReadLoading(false);
    }
  };

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
      // Just take the first valid file
      setFiles([valid[0]]);
      readMetadata(valid[0].originalFile);
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
    setMetadata(null);
    setVerificationResult(null);
    setError(''); 
    setVerifyError('');
    setClaimedAuthor('');
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!files.length) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setVerificationResult(null);

    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    fd.append('claimed_author', claimedAuthor);

    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/author-verification/verify`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setVerificationResult(j);
      } else {
        setVerifyError(j.error || j.detail || 'Failed');
      }
    } catch (ex) {
      setVerifyError('Error: ' + ex.message);
    } finally {
      setVerifyLoading(false);
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
          
          {files.length === 0 && (
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
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-2 space-y-2.5">
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
          
          {readLoading && (
             <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] mt-6">
                <div className="speeder-loader-wrapper">
                  <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                  <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Reading metadata… Please wait!</p>
             </div>
          )}

          {metadata && (
            <div className="mt-8 text-left">
              <h2 className="text-xl font-bold text-[#1e2a52] mb-6">Detected Author Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                {[['Author', metadata.author], ['Creator', metadata.creator], ['Producer', metadata.producer], ['Title', metadata.title], ['Subject', metadata.subject], ['Keywords', metadata.keywords]].map(([lbl, val], idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{lbl}</span>
                    <span className={`text-sm font-medium text-slate-900 break-words ${val ? '' : 'text-slate-400 italic'}`}>
                      {val || 'Not found'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-slate-200/80 pt-8">
                <h2 className="text-xl font-bold text-[#1e2a52] mb-6">Verify Author</h2>
                <form onSubmit={verify}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Claimed Author Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] transition-all bg-white text-slate-900" 
                        placeholder="Enter the author name to verify" 
                        required 
                        value={claimedAuthor}
                        onChange={(e) => setClaimedAuthor(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {verifyLoading && (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] mt-6">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Verifying author… Please wait!</p>
                    </div>
                  )}
                  
                  {verifyError && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
                      {verifyError}
                    </div>
                  )}

                  {!verifyLoading && !verificationResult && (
                    <div className="mt-6 text-center">
                      <button type="submit" className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95">
                        Verify Author
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {verificationResult && (
            <div className="mt-8 pt-8 border-t border-slate-200/80 text-left">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm mb-6">
                <CheckCircle2 className="w-5 h-5" />
                Done! Verification complete.
              </div>
              <h2 className="text-xl font-bold text-[#1e2a52] mb-6">Verification Result</h2>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-sm space-y-2 text-slate-700">
                <div><strong>Claimed Author:</strong> {verificationResult.claimed_author || ''}</div>
                <div>
                  <strong>Match Status:</strong>{' '}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    verificationResult.verification_result?.indexOf('match') !== -1 
                      ? (verificationResult.verification_result?.indexOf('exact') !== -1 || verificationResult.verification_result?.indexOf('creator') !== -1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
                      : (verificationResult.verification_result === 'mismatch' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800')
                  }`}>
                    {(verificationResult.verification_result || 'insufficient').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div><strong>PDF Author:</strong> {(verificationResult.metadata && verificationResult.metadata.author) ? verificationResult.metadata.author : '—'}</div>
                <div><strong>Details:</strong> {verificationResult.details || '—'}</div>
              </div>
              <div className="mt-8 flex justify-center gap-4">
                <button onClick={() => { handleRemove(0); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105">
                  Verify Another File
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
