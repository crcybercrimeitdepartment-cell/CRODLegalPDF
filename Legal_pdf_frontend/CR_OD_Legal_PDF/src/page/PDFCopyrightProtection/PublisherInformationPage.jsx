import React, { useState, useRef } from 'react';
import { FileText, ArrowLeft, X, AlertCircle, Building2, CheckCircle2, DownloadCloud, Plus, User, Building, Calendar, Phone, Globe, Hash } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function PublisherInformationPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [readLoading, setReadLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', org: '', date: '', contact: '', website: '', refId: '' });
  const inputRef = useRef();

  const toolName = tool?.name || 'Publisher Information';
  const toolDesc = tool?.description || 'View and update publisher metadata in your PDF document.';
  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

  const addFiles = (newFiles) => {
    setError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setError('Only PDF files (.pdf) are accepted.'); return; }
    setFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setResult(null); setShowForm(false);
    readPublisher(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); };
  const handleFormChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const readPublisher = async (selectedFile) => {
    setReadLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', selectedFile);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/publisher/read`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        const pub = j.publisher_info || {};
        setFormData({ name: pub.publisher_name || '', org: pub.organization || '', date: pub.publication_date || '', contact: pub.contact_information || '', website: pub.publisher_website || '', refId: pub.publication_ref_id || '' });
        setShowForm(true);
      } else { setError(j.error || 'Upload failed'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setReadLoading(false); }
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    setUpdateLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      fd.append('publisher_name', formData.name.trim());
      fd.append('organization', formData.org.trim());
      fd.append('publication_date', formData.date.trim());
      fd.append('contact_information', formData.contact.trim());
      fd.append('publisher_website', formData.website.trim());
      fd.append('publication_ref_id', formData.refId.trim());
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/publisher/update`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        setResult({ message: j.message || '', outputFilename: j.output_filename || '', downloadUrl: '/api/pdf-copyright-protection/publisher/download/' + j.session_id });
        setShowForm(false);
      } else { setError(j.error || 'Failed to update'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setUpdateLoading(false); }
  };

  const resetAll = () => { setFiles([]); setError(''); setResult(null); setShowForm(false); setFormData({ name: '', org: '', date: '', contact: '', website: '', refId: '' }); };

  const fieldClass = "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-800 font-medium text-sm";
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
          {!files.length && !readLoading && (
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-teal-500 bg-teal-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-teal-400 hover:bg-teal-50/20'}`}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addFiles(e.target.files)} />
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 className="w-8 h-8 text-teal-600" /></div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Reads existing publisher info on upload</p>
            </div>
          )}
          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-xl">
              <div className="flex items-center gap-3 truncate"><FileText className="w-5 h-5 text-teal-500 shrink-0" /><span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span></div>
              <button onClick={resetAll} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={readLoading || updateLoading}><X className="w-5 h-5" /></button>
            </div>
          )}
          {readLoading && (
            <div className="flex flex-col items-center justify-center p-6 bg-teal-50/30 border border-teal-100 rounded-2xl mt-4 min-h-[160px]">
              <div className="speeder-loader-wrapper"><div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div><div className="longfazers"><span></span><span></span><span></span><span></span></div></div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Reading Publisher Info…</p>
            </div>
          )}
          {error && <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-sm font-bold text-[#1e2a52] mb-2 uppercase tracking-wider">Edit Publisher Information</h2>
            <p className="text-xs text-slate-500 mb-6 pb-4 border-b border-slate-100">Fields are pre-filled with existing values where available.</p>
            <form onSubmit={submitUpdate} className="space-y-4">
              <div><label className={labelClass}>Publisher Name</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="Publisher name" className={fieldClass + " pl-9"} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Organization</label>
                  <div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="org" value={formData.org} onChange={handleFormChange} placeholder="Organization" className={fieldClass + " pl-9"} />
                  </div>
                </div>
                <div><label className={labelClass}>Publication Date</label>
                  <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="date" value={formData.date} onChange={handleFormChange} placeholder="e.g. 2026-01-15" className={fieldClass + " pl-9"} />
                  </div>
                </div>
              </div>
              <div><label className={labelClass}>Contact Information</label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input type="text" name="contact" value={formData.contact} onChange={handleFormChange} placeholder="Email, phone, or address" className={fieldClass + " pl-9"} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Publisher Website</label>
                  <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="url" name="website" value={formData.website} onChange={handleFormChange} placeholder="https://..." className={fieldClass + " pl-9"} />
                  </div>
                </div>
                <div><label className={labelClass}>Reference ID</label>
                  <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" name="refId" value={formData.refId} onChange={handleFormChange} placeholder="Reference number" className={fieldClass + " pl-9"} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-center">
                {updateLoading ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-teal-50/30 border border-teal-100 rounded-2xl w-full min-h-[140px]">
                    <div className="speeder-loader-wrapper"><div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div><div className="longfazers"><span></span><span></span><span></span><span></span></div></div>
                    <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Updating Publisher Info…</p>
                  </div>
                ) : (
                  <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-teal-500/20 transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center">
                    <Building2 className="w-4 h-4" /> Save Publisher Information
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
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4 border border-teal-200"><CheckCircle2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-[#1e2a52] mb-1">Update Complete!</h3>
              <p className="text-sm text-slate-500 font-medium">{result.message}</p>
            </div>
            {result.outputFilename && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-6 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Output File</span>
                <span className="font-mono text-xs text-teal-600 break-all">{result.outputFilename}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href={`${API_BASE_URL}${result.downloadUrl}`} download className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                <DownloadCloud className="w-5 h-5" /> Download Updated PDF
              </a>
              <button onClick={resetAll} className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95 w-full sm:w-auto">
                <Plus className="w-4 h-4 inline mr-1" /> Edit Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
