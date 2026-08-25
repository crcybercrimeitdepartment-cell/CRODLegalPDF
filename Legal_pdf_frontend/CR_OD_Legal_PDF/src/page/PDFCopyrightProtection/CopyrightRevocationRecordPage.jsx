import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Trash2, Save, FileWarning, Calendar, FileMinus, History, AlertTriangle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightRevocationRecordPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [pendingRevocation, setPendingRevocation] = useState(null);
  
  const [showRecord, setShowRecord] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [resultData, setResultData] = useState(null);
  const [disclaimer, setDisclaimer] = useState('');
  
  const [formData, setFormData] = useState({
    date: '',
    reason: '',
    reference: '',
    description: '',
    notes: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Revocation Record';
  const toolDesc = tool?.description || 'Record and manage copyright revocation/cancellation information.';
  
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
      setShowRecord(false);
      setShowForm(false);
      setShowConfirm(false);
      setShowResult(false);
      setShowHistory(false);
      setPendingRevocation(null);
      setRecord(null);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };

  const loadRecord = async () => {
    if (!files.length) return;
    
    setLoading(true);
    setError('');
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/revocation/get-record`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Failed to load record');
      
      setRecord(d.record);
      setShowRecord(true);
      setShowForm(true);
      
      loadHistory(fd);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (fd) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/revocation/history`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (r.ok && d.revocations && d.revocations.length > 0) {
        setHistory(d.revocations);
        setShowHistory(true);
      } else {
        setHistory([]);
        setShowHistory(false);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const reviewRevocation = (e) => {
    e.preventDefault();
    if (!formData.date) { setError('Revocation date is required.'); return; }
    if (!formData.reason.trim()) { setError('Revocation reason is required.'); return; }
    
    setError('');
    setPendingRevocation({
      revocation_date: formData.date,
      revocation_reason: formData.reason.trim(),
      reference_number: formData.reference.trim(),
      description: formData.description.trim(),
      notes: formData.notes.trim()
    });
    
    setShowConfirm(true);
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
  };

  const cancelRevocation = () => {
    setPendingRevocation(null);
    setShowConfirm(false);
  };

  const confirmRevocation = async () => {
    if (!files.length || !pendingRevocation) return;
    
    setLoading(true);
    setError('');
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      Object.entries(pendingRevocation).forEach(([k, v]) => fd.append(k, v));
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/revocation/record`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Revocation failed');
      
      setResultData(d.revocation);
      setDisclaimer(d.disclaimer || '');
      
      setShowConfirm(false);
      setShowForm(false);
      setShowResult(true);
      setPendingRevocation(null);
      
      const histFd = new FormData();
      histFd.append('file', files[0].originalFile);
      loadHistory(histFd);
      
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!files.length) return;
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/revocation/report`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Report failed');
      
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'revocation-report.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setError('');
    setRecord(null);
    setHistory([]);
    setPendingRevocation(null);
    setShowRecord(false);
    setShowForm(false);
    setShowConfirm(false);
    setShowResult(false);
    setShowHistory(false);
    setResultData(null);
    setFormData({ date: '', reason: '', reference: '', description: '', notes: '' });
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
        
        {/* Upload Area */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 mb-6">
          {!showResult && !showConfirm && (
            <>
              {!files.length && !loading && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-red-500 bg-red-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
                >
                  <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                  <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-[#1e2a52]" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop file here or click to browse</p>
                  <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
                </div>
              )}

              {files.length > 0 && !showRecord && !loading && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-[#1e2a52] mb-1 truncate">{files[0].name}</h3>
                  <p className="text-xs text-slate-500 mb-6">{files[0].size}</p>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button 
                      onClick={loadRecord} 
                      className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-6 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer w-full sm:w-auto"
                    >
                      Load Copyright Record
                    </button>
                    <button 
                      onClick={resetUpload} 
                      className="bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 hover:border-red-200 px-6 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer w-full sm:w-auto"
                    >
                      Remove File
                    </button>
                  </div>
                </div>
              )}

              {files.length > 0 && showRecord && !showConfirm && !showResult && (
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span className="font-bold text-slate-700 text-sm truncate">{files[0].name}</span>
                  </div>
                  <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" title="Remove File">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {loading && !showConfirm && (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Loading Record…</p>
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

          {/* Current Record Info */}
          {showRecord && record && !showConfirm && !showResult && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-bold text-[#1e2a52] mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                <FileWarning className="w-4 h-4 text-amber-500" /> Current Copyright Record
              </h2>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-4 sm:p-6 text-sm mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200 sm:col-span-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Document Name</span>
                    <div className="font-bold text-slate-800 break-all">{record.document_name}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Author</span>
                    <div className="font-bold text-slate-800">{record.author || 'N/A'}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Creator</span>
                    <div className="font-bold text-slate-800">{record.creator || 'N/A'}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Previous Revocations</span>
                    <div className="font-bold text-slate-800">{record.previous_revocations}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Currently Revoked</span>
                    <div className="font-bold">
                      {record.is_revoked 
                        ? <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200"><AlertCircle className="w-3 h-3"/> Yes</span> 
                        : <span className="text-emerald-600">No</span>}
                    </div>
                  </div>
                </div>
              </div>

              {showForm && (
                <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm">
                  <h3 className="text-sm font-bold text-red-700 mb-5 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileMinus className="w-4 h-4" /> Enter Revocation Details
                  </h3>
                  
                  <form onSubmit={reviewRevocation} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Revocation Date <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input 
                            type="date" name="date" value={formData.date} onChange={handleFormChange} required
                            className="w-full sm:w-1/2 pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-800 font-medium text-sm" 
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Revocation Reason <span className="text-red-500">*</span></label>
                        <textarea 
                          name="reason" value={formData.reason} onChange={handleFormChange} required rows={3} placeholder="Reason for revocation"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-800 font-medium text-sm resize-y"
                        ></textarea>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Reference Number (Optional)</label>
                        <input 
                          type="text" name="reference" value={formData.reference} onChange={handleFormChange} placeholder="Reference document number"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-800 font-medium text-sm" 
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                        <textarea 
                          name="description" value={formData.description} onChange={handleFormChange} rows={2} placeholder="Additional description"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-800 font-medium text-sm resize-y"
                        ></textarea>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                        <textarea 
                          name="notes" value={formData.notes} onChange={handleFormChange} rows={2} placeholder="Additional notes"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-800 font-medium text-sm resize-y"
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-5 border-t border-red-100/50 flex justify-end">
                      <button 
                        type="submit" 
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                      >
                        Review Revocation
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
          
          {/* Confirmation Area */}
          {showConfirm && pendingRevocation && (
            <div className="bg-red-50 rounded-3xl border border-red-200 p-6 sm:p-10 shadow-lg relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider shadow-sm">
                Pending Confirmation
              </div>
              
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 border border-red-200">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-red-900">Confirm Revocation</h2>
                <p className="text-sm font-medium text-red-600/80 mt-1">Please review the details before finalizing.</p>
              </div>
              
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 sm:p-6 mb-8 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Revocation Date</span>
                    <div className="font-bold text-red-700">{pendingRevocation.revocation_date}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100 sm:col-span-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</span>
                    <div className="font-bold text-slate-800">{pendingRevocation.revocation_reason}</div>
                  </div>
                  {pendingRevocation.reference_number && (
                    <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reference</span>
                      <div className="font-medium text-slate-700">{pendingRevocation.reference_number}</div>
                    </div>
                  )}
                  {pendingRevocation.description && (
                    <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100 sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Description</span>
                      <div className="font-medium text-slate-700">{pendingRevocation.description}</div>
                    </div>
                  )}
                  {pendingRevocation.notes && (
                    <div className="flex flex-col space-y-1 sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</span>
                      <div className="font-medium text-slate-700">{pendingRevocation.notes}</div>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-6 bg-white border border-red-100 rounded-2xl overflow-hidden relative w-full">
                  <div className="animate-spin h-8 w-8 border-4 border-red-200 border-t-red-600 rounded-full mb-3"></div>
                  <p className="text-xs sm:text-sm font-bold text-red-800 animate-pulse">Applying Revocation… Please wait!</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button 
                    onClick={confirmRevocation}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4" /> Confirm & Apply Revocation
                  </button>
                  <button 
                    onClick={cancelRevocation}
                    className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center hover:scale-105 active:scale-95 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Result Area */}
          {showResult && resultData && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center mb-8">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">Revocation Record Applied</h2>
                <p className="text-sm font-medium text-slate-600">The copyright revocation has been permanently recorded.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-6 shadow-inner">
                <div className="space-y-4 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Revocation ID</span>
                    <div className="font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-800">
                      {resultData.revocation_id}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Document Name</span>
                    <div className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-[300px]">{resultData.document_name}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Revocation Date</span>
                    <div className="text-slate-800 font-bold">{resultData.revocation_date}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</span>
                    <div className="text-slate-800 font-bold max-w-[200px] sm:max-w-xs text-right truncate" title={resultData.revocation_reason}>{resultData.revocation_reason}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <div className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">{resultData.status}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</span>
                    <div className="text-slate-500 font-medium text-xs">{resultData.timestamp}</div>
                  </div>
                </div>
              </div>
              
              {disclaimer && (
                <div className="mb-8 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium italic text-center">
                  <AlertCircle className="w-4 h-4 inline-block mr-1.5 mb-0.5 text-amber-600" />
                  {disclaimer}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-200/80">
                <button 
                  onClick={downloadReport}
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" /> Download JSON Report
                </button>
                <button 
                  onClick={resetUpload}
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  Close & Reset
                </button>
              </div>
            </div>
          )}

        </div>
        
        {/* History Area */}
        {showHistory && history.length > 0 && !showConfirm && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-[#1e2a52] mb-6 flex items-center gap-2">
              <History className="w-5 h-5" /> Revocation History
            </h2>
            
            <div className="space-y-4">
              {history.map((h, i) => (
                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span>
                      <span className="font-bold text-slate-800">{h.revocation_date}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                      <span className="font-bold text-red-600">{h.status}</span>
                    </div>
                    <div className="flex flex-col sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</span>
                      <span className="font-medium text-slate-700">{h.revocation_reason}</span>
                    </div>
                    <div className="flex flex-col sm:col-span-2 mt-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 font-medium">Recorded on: {h.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
