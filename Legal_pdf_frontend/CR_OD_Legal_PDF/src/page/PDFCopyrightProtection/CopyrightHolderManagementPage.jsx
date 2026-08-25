import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Users, Plus, Edit2, Trash2, Building, User, Mail, MapPin, Percent, Save, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightHolderManagementPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  
  const [holders, setHolders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [formValidation, setFormValidation] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    holder_type: 'Individual',
    email: '',
    organization: '',
    address: '',
    ownership_percentage: '',
    notes: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Holder Management';
  const toolDesc = tool?.description || 'Manage multiple copyright holders for your PDF document.';
  
  const addFiles = async (newFiles) => {
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
      setShowResult(false);
      setShowForm(false);
      await readHolders(valid[0].originalFile);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };

  const readHolders = async (f) => {
    setIsLoading(true);
    setError('');
    
    const fd = new FormData();
    fd.append('file', f);
    
    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/holder-management/read`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setHolders(j.holders || []);
      } else {
        setError(j.error || 'Failed to read holders');
        setFiles([]); // Reset if read fails
      }
    } catch (ex) {
      setError('Error: ' + ex.message);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setHolders([]);
    setError('');
    setSaveError('');
    setShowResult(false);
    setShowForm(false);
  };

  // Form Handlers
  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const showAddForm = () => {
    setEditIndex(-1);
    setFormData({ name: '', holder_type: 'Individual', email: '', organization: '', address: '', ownership_percentage: '', notes: '' });
    setFormValidation('');
    setShowForm(true);
  };

  const editHolder = (index) => {
    const h = holders[index];
    if (!h) return;
    setEditIndex(index);
    setFormData({
      name: h.name || '',
      holder_type: h.holder_type || 'Individual',
      email: h.email || '',
      organization: h.organization || '',
      address: h.address || '',
      ownership_percentage: h.ownership_percentage || '',
      notes: h.notes || ''
    });
    setFormValidation('');
    setShowForm(true);
  };

  const deleteHolder = (index) => {
    if (!window.confirm('Remove this holder from the list?')) return;
    setHolders(prev => prev.filter((_, i) => i !== index));
  };

  const cancelForm = () => {
    setShowForm(false);
    setFormValidation('');
  };

  const saveHolder = (e) => {
    e.preventDefault();
    const { name, holder_type, email, organization, address, ownership_percentage, notes } = formData;
    
    const nameTrim = name.trim();
    const emailTrim = email.trim();
    const pctTrim = ownership_percentage.toString().trim();
    
    const errors = [];
    if (!nameTrim) errors.push('Holder name is required.');
    if (emailTrim && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrim)) errors.push('Invalid email address format.');
    if (pctTrim && (isNaN(parseFloat(pctTrim)) || parseFloat(pctTrim) < 0 || parseFloat(pctTrim) > 100)) {
      errors.push('Ownership percentage must be between 0 and 100.');
    }
    
    if (errors.length > 0) {
      setFormValidation(errors.join(' '));
      return;
    }
    
    setFormValidation('');
    
    const holder = {
      name: nameTrim,
      holder_type,
      email: emailTrim,
      organization: organization.trim(),
      address: address.trim(),
      ownership_percentage: pctTrim,
      notes: notes.trim()
    };
    
    if (editIndex >= 0) {
      setHolders(prev => {
        const newHolders = [...prev];
        newHolders[editIndex] = holder;
        return newHolders;
      });
    } else {
      setHolders(prev => [...prev, holder]);
    }
    setShowForm(false);
  };

  const saveToPdf = async () => {
    if (!files.length || holders.length === 0) return;
    
    setIsSaving(true);
    setSaveError('');
    
    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    fd.append('holders_json', JSON.stringify(holders));
    
    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/holder-management/save`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        let verified = 'Unknown';
        try {
          const verifyR = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/holder-management/verify/` + j.session_id, { method: 'GET' });
          if (verifyR.ok) {
            const verifyJ = await verifyR.json();
            verified = verifyJ.verified ? 'Yes' : 'No';
          }
        } catch (vErr) {
          console.error("Verification failed", vErr);
        }
        
        setResultData({
          message: j.message,
          count: j.holders_count,
          total: j.total_ownership,
          verified: verified,
          downloadUrl: '/api/pdf-copyright-protection/holder-management/download/' + j.session_id
        });
        
        setShowResult(true);
      } else {
        setSaveError(j.error || 'Failed to save');
      }
    } catch (ex) {
      setSaveError('Error: ' + ex.message);
    } finally {
      setIsSaving(false);
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
          {!showResult && (
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

              {files.length > 0 && !isLoading && (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 mb-6">
                  <div className="w-9 h-9 rounded-lg bg-[#1e2a52]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#1e2a52]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{files[0].name}</p>
                    <p className="text-[10px] sm:text-xs text-slate-400">{files[0].size}</p>
                  </div>
                  <button onClick={resetUpload} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Reading Holders… Please wait!</p>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          {/* Management Area */}
          {files.length > 0 && !isLoading && !showResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
              {!showForm ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-[#1e2a52] flex items-center gap-2">
                      <Users className="w-5 h-5" /> Copyright Holders
                    </h2>
                    <button 
                      className="px-5 py-2.5 bg-[#1e2a52]/10 text-[#1e2a52] hover:bg-[#1e2a52]/20 font-bold rounded-xl transition-all shadow-sm text-xs sm:text-sm flex items-center justify-center gap-2 hover:scale-105 active:scale-95" 
                      onClick={showAddForm}
                    >
                      <Plus className="w-4 h-4" /> Add Holder
                    </button>
                  </div>
                  
                  {holders.length === 0 ? (
                    <div className="text-center p-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500">
                      <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-slate-700 mb-1">No holders found</p>
                      <p className="text-xs sm:text-sm">Click "Add Holder" to begin adding copyright owners.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {holders.map((h, i) => (
                        <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-[#1e2a52]/50 hover:shadow-md transition-all group flex flex-col sm:flex-row justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="text-base sm:text-lg font-bold text-slate-900">{h.name}</div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${h.holder_type === 'Organization' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                {h.holder_type === 'Organization' ? <Building className="w-3 h-3"/> : <User className="w-3 h-3"/>}
                                {h.holder_type || 'Individual'}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-600 font-medium">
                              {h.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {h.email}</span>}
                              {h.organization && <span className="flex items-center gap-1.5"><Building className="w-4 h-4 text-slate-400" /> {h.organization}</span>}
                              {h.ownership_percentage && <span className="flex items-center gap-1.5 text-[#1e2a52] font-bold"><Percent className="w-4 h-4" /> {h.ownership_percentage}%</span>}
                              {h.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {h.address}</span>}
                            </div>
                            
                            {h.notes && (
                              <div className="mt-3 text-xs sm:text-sm text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                "{h.notes}"
                              </div>
                            )}
                          </div>
                          
                          <div className="flex sm:flex-col justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                            <button className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-xs font-bold inline-flex justify-center items-center gap-1.5" onClick={() => editHolder(i)}>
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors text-xs font-bold inline-flex justify-center items-center gap-1.5" onClick={() => deleteHolder(i)}>
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {holders.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-slate-200/80 text-center">
                      {isSaving ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                          <div className="speeder-loader-wrapper">
                            <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                            <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Saving to PDF… Please wait!</p>
                        </div>
                      ) : (
                        <button 
                          className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                          onClick={saveToPdf}
                        >
                          <Save className="w-4 h-4" /> Save Holders to PDF
                        </button>
                      )}
                      
                      {saveError && (
                        <div className="mt-4 flex items-start justify-center gap-2 text-red-600 text-xs sm:text-sm font-bold">
                          <AlertCircle className="w-4 h-4" />
                          <span>{saveError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Form Area */
                <div className="bg-slate-50/80 rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-inner">
                  <h2 className="text-xl font-bold text-[#1e2a52] mb-6 border-b border-slate-200 pb-4 flex items-center gap-2">
                    {editIndex >= 0 ? <Edit2 className="w-5 h-5"/> : <Plus className="w-5 h-5"/>} 
                    {editIndex >= 0 ? 'Edit Copyright Holder' : 'Add Copyright Holder'}
                  </h2>
                  <form onSubmit={saveHolder}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          id="name"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                          placeholder="Full name" 
                          required 
                          value={formData.name}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Holder Type <span className="text-red-500">*</span></label>
                        <select 
                          id="holder_type"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium"
                          value={formData.holder_type}
                          onChange={handleFormChange}
                        >
                          <option value="Individual">Individual</option>
                          <option value="Organization">Organization</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                        <input 
                          type="email" 
                          id="email"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                          placeholder="email@example.com" 
                          value={formData.email}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</label>
                        <input 
                          type="text" 
                          id="organization"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                          placeholder="Company name" 
                          value={formData.organization}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                        <input 
                          type="text" 
                          id="address"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                          placeholder="Mailing address" 
                          value={formData.address}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Ownership %</label>
                        <input 
                          type="number" 
                          id="ownership_percentage"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                          placeholder="0-100" 
                          min="0" max="100" step="0.1" 
                          value={formData.ownership_percentage}
                          onChange={handleFormChange}
                        />
                      </div>
                      
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                        <textarea 
                          id="notes"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium min-h-[100px] resize-y" 
                          placeholder="Additional notes"
                          value={formData.notes}
                          onChange={handleFormChange}
                        ></textarea>
                      </div>
                    </div>
                    
                    {formValidation && (
                      <div className="mt-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{formValidation}</span>
                      </div>
                    )}
                    
                    <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200">
                      <button 
                        type="button" 
                        className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-colors shadow-sm focus:ring-2 focus:ring-slate-200 text-sm"
                        onClick={cancelForm}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-8 py-3 bg-[#1e2a52] text-white font-bold rounded-xl hover:bg-[#16203e] transition-colors shadow-md focus:ring-2 focus:ring-[#1e2a52] focus:ring-offset-2 text-sm inline-flex items-center gap-2 justify-center"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Save Holder
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Result Area */}
          {showResult && resultData && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">Save Complete</h2>
                <p className="text-sm font-medium text-slate-600">Copyright holders have been successfully embedded in the PDF.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-8 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                  <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status Message</span>
                    <div className="text-slate-800 font-bold">{resultData.message}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Holders Saved</span>
                    <div className="text-slate-800 font-bold text-lg">{resultData.count}</div>
                  </div>
                  <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ownership</span>
                    <div className="text-slate-800 font-bold text-lg">{resultData.total}%</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Format</span>
                    <div className={`font-bold flex items-center gap-1.5 ${resultData.verified === 'Yes' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {resultData.verified === 'Yes' ? <CheckCircle2 className="w-4 h-4"/> : null}
                      {resultData.verified}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-200/80">
                <a 
                  href={`${API_BASE_URL}${resultData.downloadUrl}`}
                  download
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
                <button 
                  onClick={resetUpload} 
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Process Another
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
