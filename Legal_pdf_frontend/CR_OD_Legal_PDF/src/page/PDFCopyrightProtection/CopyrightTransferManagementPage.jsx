import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, ArrowRightLeft, User, Building, Calendar, ClipboardList, Info, FileEdit, History, RefreshCcw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightTransferManagementPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [currentOwner, setCurrentOwner] = useState(null);
  const [history, setHistory] = useState([]);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  
  const [showOwner, setShowOwner] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [resultData, setResultData] = useState(null);
  const [disclaimer, setDisclaimer] = useState('');
  
  const [formData, setFormData] = useState({
    currentName: '',
    currentOrg: '',
    newName: '',
    newOrg: '',
    newContact: '',
    effectiveDate: '',
    reason: '',
    reference: '',
    notes: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Transfer Management';
  const toolDesc = tool?.description || 'Transfer copyright ownership from one party to another with a complete audit trail.';
  
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
      setShowOwner(false);
      setShowForm(false);
      setShowConfirm(false);
      setShowResult(false);
      setShowHistory(false);
      setPendingTransfer(null);
      setCurrentOwner(null);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };

  const loadOwner = async () => {
    if (!files.length) return;
    
    setLoading(true);
    setError('');
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/transfer/get-current-owner`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Failed to load owner');
      
      const owner = d.current_owner;
      setCurrentOwner(owner);
      
      setFormData(prev => ({
        ...prev,
        currentName: owner.name || owner || '',
        currentOrg: owner.organization || ''
      }));
      
      setShowOwner(true);
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
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/transfer/history`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (r.ok && d.transfers && d.transfers.length > 0) {
        setHistory(d.transfers);
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

  const reviewTransfer = (e) => {
    e.preventDefault();
    if (!formData.newName.trim()) { setError('New owner name is required.'); return; }
    if (!formData.effectiveDate) { setError('Effective date is required.'); return; }
    
    setError('');
    setPendingTransfer({
      current_owner_name: formData.currentName.trim(),
      current_owner_org: formData.currentOrg.trim(),
      new_owner_name: formData.newName.trim(),
      new_owner_org: formData.newOrg.trim(),
      new_owner_contact: formData.newContact.trim(),
      effective_date: formData.effectiveDate,
      transfer_reason: formData.reason.trim(),
      supporting_reference: formData.reference.trim(),
      notes: formData.notes.trim()
    });
    
    setShowConfirm(true);
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
  };

  const cancelTransfer = () => {
    setPendingTransfer(null);
    setShowConfirm(false);
  };

  const confirmTransfer = async () => {
    if (!files.length || !pendingTransfer) return;
    
    setLoading(true);
    setError('');
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      Object.entries(pendingTransfer).forEach(([k, v]) => fd.append(k, v));
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/transfer/execute`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Transfer failed');
      
      setResultData(d.transfer);
      setDisclaimer(d.disclaimer || '');
      
      setShowConfirm(false);
      setShowForm(false);
      setShowResult(true);
      setPendingTransfer(null);
      
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
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/transfer/report`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Report failed');
      
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transfer-report.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setError('');
    setCurrentOwner(null);
    setHistory([]);
    setPendingTransfer(null);
    setShowOwner(false);
    setShowForm(false);
    setShowConfirm(false);
    setShowResult(false);
    setShowHistory(false);
    setResultData(null);
    setFormData({ currentName: '', currentOrg: '', newName: '', newOrg: '', newContact: '', effectiveDate: '', reason: '', reference: '', notes: '' });
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

              {files.length > 0 && !showOwner && !loading && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h3 className="font-bold text-[#1e2a52] mb-1 truncate">{files[0].name}</h3>
                  <p className="text-xs text-slate-500 mb-6">{files[0].size}</p>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button 
                      onClick={loadOwner} 
                      className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-6 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer w-full sm:w-auto"
                    >
                      Load Current Owner
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

              {files.length > 0 && showOwner && !showConfirm && !showResult && (
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
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Processing Transfer Data…</p>
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

          {/* Current Owner & Transfer Form */}
          {showOwner && currentOwner && !showConfirm && !showResult && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-bold text-[#1e2a52] mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-4 h-4 text-indigo-500" /> Current Copyright Owner
              </h2>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-4 sm:p-6 text-sm mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200 sm:col-span-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Name</span>
                    <div className="font-bold text-slate-800 break-all">{currentOwner.name || currentOwner || 'Unknown'}</div>
                  </div>
                  {currentOwner.organization && (
                    <div className="flex flex-col space-y-1 sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Organization</span>
                      <div className="font-medium text-slate-800">{currentOwner.organization}</div>
                    </div>
                  )}
                </div>
              </div>

              {showForm && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
                  <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-700 border-b border-l border-indigo-100 px-3 py-1.5 rounded-bl-xl rounded-tr-xl flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                  </div>
                  <h3 className="text-sm font-bold text-[#1e2a52] mb-5 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileEdit className="w-4 h-4 text-indigo-500" /> Transfer Details
                  </h3>
                  
                  <form onSubmit={reviewTransfer} className="space-y-6">
                    
                    {/* FROM */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px]">1</span> From
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Current Owner Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input 
                              type="text" name="currentName" value={formData.currentName} onChange={handleFormChange} placeholder="Current owner name" 
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Current Organization</label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input 
                              type="text" name="currentOrg" value={formData.currentOrg} onChange={handleFormChange} placeholder="Organization (optional)" 
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TO */}
                    <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
                      <h4 className="text-[10px] sm:text-xs font-black text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[8px]">2</span> To
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-indigo-800 uppercase tracking-wider">New Owner Name <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                            <input 
                              type="text" name="newName" value={formData.newName} onChange={handleFormChange} required placeholder="New owner name" 
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-800 font-medium text-sm" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">New Organization</label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input 
                              type="text" name="newOrg" value={formData.newOrg} onChange={handleFormChange} placeholder="Organization (optional)" 
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">New Contact</label>
                          <div className="relative">
                            <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input 
                              type="text" name="newContact" value={formData.newContact} onChange={handleFormChange} placeholder="Contact info (optional)" 
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DETAILS */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px]">3</span> Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Effective Date <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input 
                              type="date" name="effectiveDate" value={formData.effectiveDate} onChange={handleFormChange} required
                              className="w-full sm:w-1/2 pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer Reason</label>
                          <textarea 
                            name="reason" value={formData.reason} onChange={handleFormChange} rows={2} placeholder="Reason for transfer"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm resize-y"
                          ></textarea>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Supporting Reference</label>
                          <div className="relative">
                            <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input 
                              type="text" name="reference" value={formData.reference} onChange={handleFormChange} placeholder="Reference document number (optional)" 
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                          <textarea 
                            name="notes" value={formData.notes} onChange={handleFormChange} rows={2} placeholder="Additional notes"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm resize-y"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
                      <button 
                        type="submit" 
                        className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                      >
                        Review Transfer
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
          
          {/* Confirmation Area */}
          {showConfirm && pendingTransfer && (
            <div className="bg-indigo-50 rounded-3xl border border-indigo-200 p-6 sm:p-10 shadow-lg relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] sm:text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider shadow-sm">
                Pending Confirmation
              </div>
              
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 border border-indigo-200 shadow-sm">
                  <ArrowRightLeft className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-indigo-900">Confirm Transfer</h2>
                <p className="text-sm font-medium text-indigo-600/80 mt-1">Please verify the transfer details before executing.</p>
              </div>
              
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 sm:p-6 mb-8 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Previous Owner</span>
                    <div className="font-bold text-slate-600">{pendingTransfer.current_owner_name || 'Unknown'}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100">
                    <span className="text-[10px] sm:text-xs font-bold text-indigo-500 uppercase tracking-wider">New Owner</span>
                    <div className="font-black text-indigo-700 text-base">{pendingTransfer.new_owner_name}</div>
                  </div>
                  {pendingTransfer.new_owner_org && (
                    <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100 sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">New Organization</span>
                      <div className="font-medium text-slate-800">{pendingTransfer.new_owner_org}</div>
                    </div>
                  )}
                  <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100 sm:col-span-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Effective Date</span>
                    <div className="font-bold text-slate-800">{pendingTransfer.effective_date}</div>
                  </div>
                  {pendingTransfer.transfer_reason && (
                    <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100 sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</span>
                      <div className="font-medium text-slate-700">{pendingTransfer.transfer_reason}</div>
                    </div>
                  )}
                  {pendingTransfer.supporting_reference && (
                    <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-100 sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reference</span>
                      <div className="font-medium text-slate-700">{pendingTransfer.supporting_reference}</div>
                    </div>
                  )}
                  {pendingTransfer.notes && (
                    <div className="flex flex-col space-y-1 sm:col-span-2">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</span>
                      <div className="font-medium text-slate-700">{pendingTransfer.notes}</div>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-6 bg-white border border-indigo-100 rounded-2xl overflow-hidden relative w-full">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mb-3"></div>
                  <p className="text-xs sm:text-sm font-bold text-indigo-800 animate-pulse">Executing Transfer… Please wait!</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button 
                    onClick={confirmTransfer}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                  >
                    <RefreshCcw className="w-4 h-4" /> Confirm & Execute Transfer
                  </button>
                  <button 
                    onClick={cancelTransfer}
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
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">Transfer Successful</h2>
                <p className="text-sm font-medium text-slate-600">The copyright ownership transfer has been completed.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-6 shadow-inner">
                <div className="space-y-4 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Transfer ID</span>
                    <div className="font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-800">
                      {resultData.transfer_id}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Previous Owner</span>
                    <div className="text-slate-500 font-medium line-through decoration-slate-300">{resultData.previous_owner?.name || 'Unknown'}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">New Owner</span>
                    <div className="text-indigo-700 font-black text-base">{resultData.new_owner?.name}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Effective Date</span>
                    <div className="text-slate-800 font-bold">{resultData.effective_date}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <div className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{resultData.validation_status}</div>
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
                  Close & Start Over
                </button>
              </div>
            </div>
          )}

        </div>
        
        {/* History Area */}
        {showHistory && history.length > 0 && !showConfirm && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-[#1e2a52] mb-6 flex items-center gap-2">
              <History className="w-5 h-5" /> Transfer History
            </h2>
            
            <div className="space-y-4">
              {history.map((t, i) => (
                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex flex-col sm:col-span-2 md:col-span-1">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        From <ArrowRightLeft className="w-3 h-3 rotate-180" />
                      </span>
                      <span className="font-semibold text-slate-500 line-through decoration-slate-300">{t.previous_owner?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex flex-col sm:col-span-2 md:col-span-1">
                      <span className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3" /> To
                      </span>
                      <span className="font-black text-indigo-700 text-base">{t.new_owner?.name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Effective Date</span>
                      <span className="font-bold text-slate-800">{t.effective_date}</span>
                    </div>
                    <div className="flex flex-col mt-2 pt-2 border-t border-slate-200 sm:col-span-2 md:col-span-1 md:border-t-0 md:pt-0">
                      <span className="text-[10px] text-slate-400 font-medium self-start md:self-end mt-auto">Recorded: {t.timestamp}</span>
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
