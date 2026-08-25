import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowLeft, X, AlertCircle, EyeOff, ShieldCheck, User, Hash, Calendar, FileKey2, DownloadCloud, Plus, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function InvisibleCopyrightWatermarkPage({ tool, onBack }) {
  // Embed State
  const [embedFiles, setEmbedFiles] = useState([]);
  const [isEmbedDragging, setIsEmbedDragging] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedError, setEmbedError] = useState('');
  const [embedResult, setEmbedResult] = useState(null);
  const [formData, setFormData] = useState({ owner: '', reference: '', year: '', licenseText: '' });

  // Verify State
  const [verifyFiles, setVerifyFiles] = useState([]);
  const [isVerifyDragging, setIsVerifyDragging] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const embedInputRef = useRef();
  const verifyInputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Invisible Copyright Watermark';
  const toolDesc = tool?.description || 'Embed hidden copyright identification into a PDF without changing its appearance. Verify ownership anytime.';

  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

  // --- Embed ---
  const addEmbedFiles = (newFiles) => {
    setEmbedError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setEmbedError('Only PDF files (.pdf) are accepted.'); return; }
    setEmbedFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setEmbedResult(null);
  };

  const handleEmbedDrop = (e) => { e.preventDefault(); setIsEmbedDragging(false); if (e.dataTransfer.files?.length) addEmbedFiles(e.dataTransfer.files); };
  const handleFormChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const embed = async (e) => {
    e.preventDefault();
    if (!embedFiles.length) return;
    if (!formData.owner.trim()) { setEmbedError('Copyright Owner is required.'); return; }
    setEmbedLoading(true); setEmbedError('');
    try {
      const fd = new FormData();
      fd.append('file', embedFiles[0].originalFile);
      fd.append('owner', formData.owner.trim());
      fd.append('reference', formData.reference.trim());
      fd.append('year', formData.year.trim());
      fd.append('license_text', formData.licenseText.trim());
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/invisible-watermark/embed`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        setEmbedResult({ fingerprint: j.fingerprint || '', message: j.message || '', downloadUrl: '/api/pdf-copyright-protection/invisible-watermark/download/' + j.session_id });
      } else { setEmbedError(j.error || j.detail || 'Failed to embed watermark'); }
    } catch (ex) { setEmbedError('Error: ' + ex.message); }
    finally { setEmbedLoading(false); }
  };

  const resetEmbed = () => { setEmbedFiles([]); setEmbedError(''); setEmbedResult(null); setFormData({ owner: '', reference: '', year: '', licenseText: '' }); };

  // --- Verify ---
  const addVerifyFiles = (newFiles) => {
    setVerifyError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setVerifyError('Only PDF files (.pdf) are accepted.'); return; }
    setVerifyFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setVerifyResult(null);
    verifyWatermark(file);
  };

  const handleVerifyDrop = (e) => { e.preventDefault(); setIsVerifyDragging(false); if (e.dataTransfer.files?.length) addVerifyFiles(e.dataTransfer.files); };

  const verifyWatermark = async (file) => {
    setVerifyLoading(true); setVerifyError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/invisible-watermark/verify`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) { setVerifyResult(j); }
      else { setVerifyError(j.error || j.detail || 'Verification failed'); }
    } catch (ex) { setVerifyError('Error: ' + ex.message); }
    finally { setVerifyLoading(false); }
  };

  const resetVerify = () => { setVerifyFiles([]); setVerifyError(''); setVerifyResult(null); };

  return (
    <div className="flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">{toolName}</h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{toolDesc}</p>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14 space-y-6">

        {/* ── EMBED SECTION ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          <h2 className="text-sm font-bold text-[#1e2a52] mb-6 flex items-center gap-2 uppercase tracking-wider">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <EyeOff className="w-4 h-4" />
            </div>
            Add Invisible Watermark
          </h2>

          {!embedFiles.length && !embedResult && (
            <div onDragOver={(e) => { e.preventDefault(); setIsEmbedDragging(true); }} onDragLeave={() => setIsEmbedDragging(false)} onDrop={handleEmbedDrop}
              onClick={() => embedInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isEmbedDragging ? 'border-violet-500 bg-violet-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-violet-400 hover:bg-violet-50/20'}`}>
              <input ref={embedInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addEmbedFiles(e.target.files)} />
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <EyeOff className="w-8 h-8 text-violet-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
            </div>
          )}

          {embedError && !embedFiles.length && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{embedError}</span>
            </div>
          )}

          {embedFiles.length > 0 && !embedResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-100 rounded-xl mb-6">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-5 h-5 text-violet-500 shrink-0" />
                  <span className="font-bold text-slate-700 text-sm truncate">{embedFiles[0].name} <span className="text-slate-400 font-normal ml-1">({embedFiles[0].size})</span></span>
                </div>
                <button onClick={resetEmbed} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={embedLoading}><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={embed} className="space-y-4 bg-violet-50/30 p-5 rounded-2xl border border-violet-100/50">
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Owner <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="owner" value={formData.owner} onChange={handleFormChange} required placeholder="e.g. John Smith"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-slate-800 font-medium text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Reference / ID</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input type="text" name="reference" value={formData.reference} onChange={handleFormChange} placeholder="Optional"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-slate-800 font-medium text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Year</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input type="text" name="year" value={formData.year} onChange={handleFormChange} placeholder="e.g. 2026" maxLength={4}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-slate-800 font-medium text-sm" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">License Text</label>
                  <div className="relative">
                    <FileKey2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="licenseText" value={formData.licenseText} onChange={handleFormChange} placeholder="Optional license info"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-slate-800 font-medium text-sm" />
                  </div>
                </div>

                {embedError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{embedError}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-violet-100/60 flex justify-center">
                  {embedLoading ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-white border border-violet-100 rounded-2xl w-full min-h-[140px]">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Embedding Watermark…</p>
                    </div>
                  ) : (
                    <button type="submit"
                      className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-violet-500/20 transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center">
                      <EyeOff className="w-4 h-4" /> Add Invisible Watermark
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {embedResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-4 shadow-inner border border-violet-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#1e2a52] mb-1">Watermark Embedded!</h3>
                <p className="text-sm text-slate-500 font-medium">{embedResult.message}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6 space-y-3 text-sm">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Fingerprint</span>
                  <div className="font-mono text-xs text-violet-600 break-all bg-violet-50 px-3 py-2 rounded-lg border border-violet-100">{embedResult.fingerprint}</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a href={`${API_BASE_URL}${embedResult.downloadUrl}`} download
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md shadow-violet-500/20 transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                  <DownloadCloud className="w-5 h-5" /> Download PDF
                </a>
                <button onClick={resetEmbed}
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
            Verify Invisible Watermark
          </h2>

          {!verifyFiles.length && (
            <div onDragOver={(e) => { e.preventDefault(); setIsVerifyDragging(true); }} onDragLeave={() => setIsVerifyDragging(false)} onDrop={handleVerifyDrop}
              onClick={() => verifyInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isVerifyDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-emerald-400 hover:bg-emerald-50/20'}`}>
              <input ref={verifyInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addVerifyFiles(e.target.files)} />
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF to Verify</p>
              <p className="text-xs sm:text-sm text-slate-500">Auto-verifies on upload</p>
            </div>
          )}

          {verifyFiles.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-700 text-sm truncate">{verifyFiles[0].name} <span className="text-slate-400 font-normal ml-1">({verifyFiles[0].size})</span></span>
                </div>
                <button onClick={resetVerify} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={verifyLoading}><X className="w-5 h-5" /></button>
              </div>

              {verifyLoading && (
                <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/30 border border-emerald-100 rounded-2xl min-h-[140px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Verifying Watermark…</p>
                </div>
              )}

              {verifyError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{verifyError}</span>
                </div>
              )}

              {verifyResult && !verifyLoading && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Status */}
                  <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border mb-5 ${verifyResult.found ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    {verifyResult.found ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <EyeOff className="w-5 h-5 text-slate-500" />}
                    <span className={`font-black text-base ${verifyResult.found ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {verifyResult.found ? 'Invisible Watermark Found ✓' : 'No Watermark Found'}
                    </span>
                  </div>

                  {verifyResult.found && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-sm">
                      {[
                        { label: 'Copyright Owner', value: verifyResult.owner, icon: <User className="w-3 h-3" /> },
                        { label: 'Year', value: verifyResult.year, icon: <Calendar className="w-3 h-3" /> },
                        { label: 'Status', value: verifyResult.verification_status, icon: <ShieldCheck className="w-3 h-3" /> },
                      ].map((r, i) => r.value && (
                        <div key={i} className={`flex items-center justify-between ${i < 2 ? 'pb-3 border-b border-slate-200' : ''}`}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">{r.icon}{r.label}</span>
                          <span className="font-bold text-slate-800 text-sm">{r.value}</span>
                        </div>
                      ))}
                      {verifyResult.fingerprint && (
                        <div className="pt-3 border-t border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2"><Hash className="w-3 h-3" />Fingerprint</span>
                          <div className="font-mono text-xs text-slate-600 break-all bg-white px-3 py-2 rounded-lg border border-slate-200">{verifyResult.fingerprint}</div>
                        </div>
                      )}
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
