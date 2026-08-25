import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Shield, ShieldCheck, Lock, User, Building, Calendar, Info, DownloadCloud, Plus, Hash } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function DigitalCopyrightSealPage({ tool, onBack }) {
  // Generate State
  const [genFiles, setGenFiles] = useState([]);
  const [isGenDragging, setIsGenDragging] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [genResult, setGenResult] = useState(null);
  
  const [formData, setFormData] = useState({
    owner: '',
    org: '',
    year: '',
    sealInfo: ''
  });
  
  // Verify State
  const [verifyFiles, setVerifyFiles] = useState([]);
  const [isVerifyDragging, setIsVerifyDragging] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const genInputRef = useRef();
  const verifyInputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Digital Copyright Seal';
  const toolDesc = tool?.description || 'Generate a cryptographic SHA-256 seal for your PDF to prove document integrity and ownership.';

  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

  // --- Generate Handlers ---
  const addGenFiles = (newFiles) => {
    setGenError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setGenError('Only PDF files (.pdf) are accepted.'); return; }
    setGenFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setGenResult(null);
  };

  const handleGenDrop = (e) => { e.preventDefault(); setIsGenDragging(false); if (e.dataTransfer.files?.length) addGenFiles(e.dataTransfer.files); };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generate = async (e) => {
    e.preventDefault();
    if (!genFiles.length) return;
    if (!formData.owner.trim()) { setGenError('Copyright Owner is required.'); return; }
    
    setGenLoading(true);
    setGenError('');
    
    try {
      const fd = new FormData();
      fd.append('file', genFiles[0].originalFile);
      fd.append('owner', formData.owner.trim());
      fd.append('organization', formData.org.trim());
      fd.append('year', formData.year.trim());
      fd.append('seal_info', formData.sealInfo.trim());
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/digital-seal/generate`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setGenResult({
          message: j.message || '',
          documentHash: j.document_hash || '',
          owner: j.owner || '',
          filename: j.saved_filename || '',
          downloadUrl: '/api/pdf-copyright-protection/digital-seal/download/' + j.session_id
        });
      } else {
        setGenError(j.error || j.detail || 'Failed to generate seal');
      }
    } catch (ex) {
      setGenError('Error: ' + ex.message);
    } finally {
      setGenLoading(false);
    }
  };

  const resetGen = () => {
    setGenFiles([]);
    setGenError('');
    setGenResult(null);
    setFormData({ owner: '', org: '', year: '', sealInfo: '' });
  };

  // --- Verify Handlers ---
  const addVerifyFiles = (newFiles) => {
    setVerifyError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setVerifyError('Only PDF files (.pdf) are accepted.'); return; }
    setVerifyFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setVerifyResult(null);
    verifySeal(file);
  };

  const handleVerifyDrop = (e) => { e.preventDefault(); setIsVerifyDragging(false); if (e.dataTransfer.files?.length) addVerifyFiles(e.dataTransfer.files); };

  const verifySeal = async (file) => {
    setVerifyLoading(true);
    setVerifyError('');
    
    try {
      const fd = new FormData();
      fd.append('file', file);
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/digital-seal/verify`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setVerifyResult(j.data);
      } else {
        setVerifyError(j.error || 'Verification failed');
      }
    } catch (ex) {
      setVerifyError('Error: ' + ex.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetVerify = () => {
    setVerifyFiles([]);
    setVerifyError('');
    setVerifyResult(null);
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

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14 space-y-6">

        {/* ── GENERATE SECTION ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          <h2 className="text-sm font-bold text-[#1e2a52] mb-6 flex items-center gap-2 uppercase tracking-wider">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            Generate Copyright Seal
          </h2>

          {/* Upload Zone */}
          {!genFiles.length && !genResult && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsGenDragging(true); }}
              onDragLeave={() => setIsGenDragging(false)}
              onDrop={handleGenDrop}
              onClick={() => genInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isGenDragging ? 'border-rose-500 bg-rose-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-rose-400 hover:bg-rose-50/20'}`}
            >
              <input ref={genInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addGenFiles(e.target.files)} />
              <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-rose-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
            </div>
          )}

          {genError && !genFiles.length && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{genError}</span>
            </div>
          )}

          {/* File Selected → Form */}
          {genFiles.length > 0 && !genResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl mb-6">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="font-bold text-slate-700 text-sm truncate">{genFiles[0].name} <span className="text-slate-400 font-normal ml-1">({genFiles[0].size})</span></span>
                </div>
                <button onClick={resetGen} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={genLoading}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={generate} className="space-y-4 bg-rose-50/30 p-5 rounded-2xl border border-rose-100/50">
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Owner <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="owner" value={formData.owner} onChange={handleFormChange} required placeholder="e.g. John Smith"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white text-slate-800 font-medium text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input type="text" name="org" value={formData.org} onChange={handleFormChange} placeholder="Optional"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white text-slate-800 font-medium text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Year</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input type="text" name="year" value={formData.year} onChange={handleFormChange} placeholder="e.g. 2026" maxLength={4}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white text-slate-800 font-medium text-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Seal / Reference Info</label>
                  <div className="relative">
                    <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="sealInfo" value={formData.sealInfo} onChange={handleFormChange} placeholder="Optional seal details"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white text-slate-800 font-medium text-sm" />
                  </div>
                </div>

                {genError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{genError}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-rose-100/60 flex justify-center">
                  {genLoading ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-white border border-rose-100 rounded-2xl w-full min-h-[140px]">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Generating Seal…</p>
                    </div>
                  ) : (
                    <button type="submit"
                      className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-rose-500/20 transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center">
                      <Shield className="w-4 h-4" /> Generate Copyright Seal
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Generate Result */}
          {genResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-inner border border-rose-200">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#1e2a52] mb-1">Seal Generated!</h3>
                <p className="text-sm text-slate-500 font-medium">{genResult.message}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6 space-y-3 text-sm">
                <div className="flex flex-col space-y-1 pb-3 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Seal Hash (SHA-256)</span>
                  <div className="font-mono text-xs text-rose-600 break-all bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">{genResult.documentHash}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner</span>
                  <span className="font-bold text-slate-800">{genResult.owner}</span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Output File</span>
                  <span className="text-slate-600 text-xs text-right break-all">{genResult.filename}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a href={`${API_BASE_URL}${genResult.downloadUrl}`} download
                  className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md shadow-rose-500/20 transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                  <DownloadCloud className="w-5 h-5" /> Download Sealed PDF
                </a>
                <button onClick={resetGen}
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Process Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── VERIFY SECTION ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          <h2 className="text-sm font-bold text-[#1e2a52] mb-6 flex items-center gap-2 uppercase tracking-wider">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            Verify Seal
          </h2>

          {!verifyFiles.length && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsVerifyDragging(true); }}
              onDragLeave={() => setIsVerifyDragging(false)}
              onDrop={handleVerifyDrop}
              onClick={() => verifyInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isVerifyDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-emerald-400 hover:bg-emerald-50/20'}`}
            >
              <input ref={verifyInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addVerifyFiles(e.target.files)} />
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF to Verify</p>
              <p className="text-xs sm:text-sm text-slate-500">Auto-verifies seal on upload</p>
            </div>
          )}

          {verifyError && !verifyFiles.length && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{verifyError}</span>
            </div>
          )}

          {verifyFiles.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-700 text-sm truncate">{verifyFiles[0].name} <span className="text-slate-400 font-normal ml-1">({verifyFiles[0].size})</span></span>
                </div>
                <button onClick={resetVerify} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={verifyLoading}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {verifyLoading && (
                <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/30 border border-emerald-100 rounded-2xl w-full min-h-[140px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Verifying Seal…</p>
                </div>
              )}

              {verifyError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{verifyError}</span>
                </div>
              )}

              {verifyResult && !verifyLoading && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Status Banner */}
                  {verifyResult.has_seal ? (
                    <div className={`flex items-center gap-3 p-4 rounded-2xl mb-5 border ${verifyResult.verification_result === 'valid' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${verifyResult.verification_result === 'valid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {verifyResult.verification_result === 'valid' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className={`font-black text-sm ${verifyResult.verification_result === 'valid' ? 'text-emerald-800' : 'text-amber-800'}`}>
                          Seal {verifyResult.verification_result === 'valid' ? 'Valid ✓' : 'Invalid ✗'}
                        </p>
                        <p className={`text-xs font-medium ${verifyResult.verification_result === 'valid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {verifyResult.verification_result === 'valid' ? 'Document integrity verified successfully.' : 'Seal could not be validated.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-2xl mb-5 bg-slate-50 border border-slate-200">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-700">No Seal Found</p>
                        <p className="text-xs font-medium text-slate-500">This document does not contain a copyright seal.</p>
                      </div>
                    </div>
                  )}

                  {verifyResult.has_seal && verifyResult.seal_data && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner</span>
                        <span className="font-bold text-slate-800">{verifyResult.seal_data.owner || '—'}</span>
                      </div>
                      <div className="flex flex-col space-y-1 pb-3 border-b border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Seal Hash</span>
                        <div className="font-mono text-xs text-slate-600 break-all bg-white px-3 py-2 rounded-lg border border-slate-200">{verifyResult.seal_data.seal_hash || '—'}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Algorithm</span>
                        <span className="font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 text-xs">{verifyResult.seal_data.algorithm || '—'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center mt-5">
                    <button onClick={resetVerify}
                      className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95">
                      <Plus className="w-4 h-4" /> Verify Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
