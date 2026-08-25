import React, { useState, useRef } from 'react';
import { FileText, ArrowLeft, X, AlertCircle, Award, CheckCircle2, DownloadCloud, Plus, User, Building, Calendar, Hash, FileText as FileDesc, Link } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function OwnershipCertificatePage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({ owner: '', org: '', title: '', pubDate: '', copyrightInfo: '', description: '', refId: '' });
  const inputRef = useRef();

  const toolName = tool?.name || 'Ownership Certificate';
  const toolDesc = tool?.description || 'Generate a professional ownership certificate for your PDF document.';
  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

  const addFiles = (newFiles) => {
    setError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setError('Only PDF files (.pdf) are accepted.'); return; }
    setFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setResult(null);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); };
  const handleFormChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const generate = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    if (!formData.owner.trim()) { setError('Owner Name is required.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      fd.append('owner', formData.owner.trim());
      fd.append('organization', formData.org.trim());
      fd.append('doc_title', formData.title.trim());
      fd.append('pub_date', formData.pubDate.trim());
      fd.append('copyright_info', formData.copyrightInfo.trim());
      fd.append('description', formData.description.trim());
      fd.append('ref_id', formData.refId.trim());
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/ownership-certificate/generate`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        setResult({ message: j.message || '', certificateId: j.certificate_id || '', documentHash: j.document_hash || '', downloadUrl: '/api/pdf-copyright-protection/ownership-certificate/download/' + j.session_id });
      } else { setError(j.error || j.detail || 'Failed to generate certificate'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setLoading(false); }
  };

  const resetAll = () => { setFiles([]); setError(''); setResult(null); setFormData({ owner: '', org: '', title: '', pubDate: '', copyrightInfo: '', description: '', refId: '' }); };

  const fieldClass = "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-800 font-medium text-sm";
  const labelClass = "block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5";

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
        {/* Upload */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          {!files.length && (
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-orange-500 bg-orange-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-orange-400 hover:bg-orange-50/20'}`}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addFiles(e.target.files)} />
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Award className="w-8 h-8 text-orange-600" /></div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
            </div>
          )}
          {files.length > 0 && !result && (
            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl mb-6">
              <div className="flex items-center gap-3 truncate"><FileText className="w-5 h-5 text-orange-500 shrink-0" /><span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span></div>
              <button onClick={resetAll} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={loading}><X className="w-5 h-5" /></button>
            </div>
          )}
          {error && <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        </div>

        {/* Form */}
        {files.length > 0 && !result && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-sm font-bold text-[#1e2a52] mb-6 uppercase tracking-wider">Certificate Information</h2>
            <form onSubmit={generate} className="space-y-4">
              <div className="space-y-1.5"><label className={labelClass}>Owner Name <span className="text-red-500">*</span></label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input type="text" name="owner" value={formData.owner} onChange={handleFormChange} required placeholder="e.g. John Smith" className={fieldClass + " pl-9"} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Organization</label>
                  <div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="org" value={formData.org} onChange={handleFormChange} placeholder="Optional" className={fieldClass + " pl-9"} />
                  </div>
                </div>
                <div><label className={labelClass}>Document Title</label>
                  <div className="relative"><FileDesc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="title" value={formData.title} onChange={handleFormChange} placeholder="Title of the document" className={fieldClass + " pl-9"} />
                  </div>
                </div>
                <div><label className={labelClass}>Publication Date</label>
                  <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="pubDate" value={formData.pubDate} onChange={handleFormChange} placeholder="e.g. 2026-01-15" className={fieldClass + " pl-9"} />
                  </div>
                </div>
                <div><label className={labelClass}>Copyright Info</label>
                  <div className="relative"><Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="copyrightInfo" value={formData.copyrightInfo} onChange={handleFormChange} placeholder="Copyright details" className={fieldClass + " pl-9"} />
                  </div>
                </div>
                <div><label className={labelClass}>Reference ID</label>
                  <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="refId" value={formData.refId} onChange={handleFormChange} placeholder="Optional reference" className={fieldClass + " pl-9"} />
                  </div>
                </div>
              </div>
              <div><label className={labelClass}>Description</label><input type="text" name="description" value={formData.description} onChange={handleFormChange} placeholder="Brief description" className={fieldClass} /></div>

              <div className="pt-4 border-t border-slate-100 flex justify-center">
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-orange-50/30 border border-orange-100 rounded-2xl w-full min-h-[140px]">
                    <div className="speeder-loader-wrapper"><div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div><div className="longfazers"><span></span><span></span><span></span><span></span></div></div>
                    <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Generating Certificate…</p>
                  </div>
                ) : (
                  <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-orange-500/20 transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center">
                    <Award className="w-4 h-4" /> Generate Ownership Certificate
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 border border-orange-200"><Award className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-[#1e2a52] mb-1">Certificate Generated!</h3>
              <p className="text-sm text-slate-500 font-medium">{result.message}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6 space-y-3 text-sm">
              <div className="flex flex-col space-y-1 pb-3 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Certificate ID</span>
                <div className="font-mono text-xs text-orange-600 break-all bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">{result.certificateId}</div>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Document Fingerprint</span>
                <div className="font-mono text-xs text-slate-600 break-all bg-white px-3 py-2 rounded-lg border border-slate-200">{result.documentHash}</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href={`${API_BASE_URL}${result.downloadUrl}`} download className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                <DownloadCloud className="w-5 h-5" /> Download Certificate
              </a>
              <button onClick={resetAll} className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95 w-full sm:w-auto">
                <Plus className="w-4 h-4 inline mr-1" /> Generate Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
