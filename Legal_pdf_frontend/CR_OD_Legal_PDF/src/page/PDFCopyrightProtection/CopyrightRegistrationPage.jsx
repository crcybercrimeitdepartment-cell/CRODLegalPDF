import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Lock, ShieldPlus, Save, RefreshCw, AlertTriangle, Fingerprint } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightRegistrationPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [existingReg, setExistingReg] = useState(null);
  const [showFormCard, setShowFormCard] = useState(false);
  const [showLockCard, setShowLockCard] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);
  const [resultData, setResultData] = useState(null);
  
  const [formData, setFormData] = useState({
    owner: '',
    author: '',
    org: '',
    year: '',
    regNum: '',
    regDate: '',
    notice: '',
    notes: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Registration';
  const toolDesc = tool?.description || 'Embed copyright registration details into a PDF document as a formal ownership record.';
  
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
      setExistingReg(null);
      setShowFormCard(false);
      setShowLockCard(false);
      setShowResultCard(false);
      checkExistingRegistration(valid[0].originalFile);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };

  const checkExistingRegistration = async (selectedFile) => {
    setCheckLoading(true);
    const fd = new FormData();
    fd.append('file', selectedFile);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/registration/check`, { method: 'POST', body: fd });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Check failed.');
      
      if (data.registered) {
        setExistingReg(data);
        setShowLockCard(true);
        setFormData(prev => ({ ...prev, owner: data.original_owner || '' }));
      }
      
      setShowFormCard(true);
    } catch (err) {
      setError('Error: ' + err.message);
      setFiles([]);
    } finally {
      setCheckLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError('Please select a PDF file first.');
      return;
    }
    
    const owner = formData.owner.trim();
    const author = formData.author.trim();
    
    if (!owner) { setError('Copyright Owner is required.'); return; }
    if (!author) { setError('Author / Creator is required.'); return; }
    
    const year = formData.year.trim();
    if (year && !/^\d{4}$/.test(year)) { 
      setError('Copyright Year must be a 4-digit year.'); 
      return; 
    }
    
    if (existingReg && owner.toLowerCase() !== (existingReg.original_owner || '').toLowerCase()) {
      setError(`Cannot change original owner. Registered to "${existingReg.original_owner}".`);
      return;
    }
    
    setError('');
    setLoading(true);
    
    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    fd.append('copyright_owner', owner);
    fd.append('author', author);
    fd.append('organization', formData.org.trim());
    fd.append('copyright_year', year);
    fd.append('registration_number', formData.regNum.trim());
    fd.append('registration_date', formData.regDate);
    fd.append('copyright_notice', formData.notice.trim());
    fd.append('notes', formData.notes.trim());
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/registration`, { method: 'POST', body: fd });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Registration failed.');
      
      setResultData(data);
      setShowFormCard(false);
      setShowLockCard(false);
      setShowResultCard(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setExistingReg(null);
    setError('');
    setShowFormCard(false);
    setShowLockCard(false);
    setShowResultCard(false);
    setResultData(null);
    setFormData({ owner: '', author: '', org: '', year: '', regNum: '', regDate: '', notice: '', notes: '' });
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
          {!showResultCard && !showFormCard && (
            <>
              {!files.length && !checkLoading && (
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

              {checkLoading && (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Checking Registration Status…</p>
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

          {/* Configuration Area */}
          {(showFormCard || showLockCard) && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-[#1e2a52] flex items-center gap-2">
                  <ShieldPlus className="w-5 h-5" /> {existingReg ? 'Update Registration Details' : 'Registration Details'}
                </h2>
                <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" title="Remove File">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {showLockCard && existingReg && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Existing Registration
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-500" /> Protected Registration Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">Original Copyright Owner</span>
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        {existingReg.original_owner || 'Unknown'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">Registration ID</span>
                      <div className="font-mono text-sm text-amber-950 font-semibold">{existingReg.registration_id || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">Registration Date</span>
                      <div className="text-amber-950 font-medium">{existingReg.registration_timestamp || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">Document Status</span>
                      <div className="text-emerald-700 font-bold">Registered</div>
                    </div>
                  </div>
                  
                  {existingReg.fingerprint && (
                    <div className="mb-4 p-3 bg-white rounded-xl border border-amber-200/60 shadow-sm">
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">Document Fingerprint</span>
                      <code className="text-[10px] sm:text-xs text-amber-900 break-all font-medium">{existingReg.fingerprint}</code>
                    </div>
                  )}
                  
                  <div className="text-xs sm:text-sm text-amber-800 bg-white p-3 sm:p-4 rounded-xl border border-amber-200/60 shadow-sm space-y-1.5 font-medium leading-relaxed">
                    <p className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <span><strong>Notice:</strong> Original owner cannot be changed here. Use <strong>Holder Management</strong> for additional holders.</span>
                    </p>
                  </div>
                </div>
              )}

              {showFormCard && (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Owner <span className="text-red-500">*</span></label>
                      <input 
                        type="text" name="owner" value={formData.owner} onChange={handleFormChange} required readOnly={!!existingReg}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-bold transition-all ${existingReg ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] text-slate-800'}`} 
                        placeholder="Owner name" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Author / Creator <span className="text-red-500">*</span></label>
                      <input 
                        type="text" name="author" value={formData.author} onChange={handleFormChange} required
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        placeholder="Author name" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</label>
                      <input 
                        type="text" name="org" value={formData.org} onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        placeholder="Organization name" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Year</label>
                      <input 
                        type="text" name="year" value={formData.year} onChange={handleFormChange} maxLength={4}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        placeholder="e.g. 2026" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Reg / Ref Number</label>
                      <input 
                        type="text" name="regNum" value={formData.regNum} onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        placeholder="Reference #" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Date</label>
                      <input 
                        type="date" name="regDate" value={formData.regDate} onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Notice</label>
                      <input 
                        type="text" name="notice" value={formData.notice} onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                        placeholder="Notice text" 
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Notes / Description</label>
                      <textarea 
                        name="notes" value={formData.notes} onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm min-h-[80px]" 
                        placeholder="Optional notes"
                      ></textarea>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] w-full">
                        <div className="speeder-loader-wrapper">
                          <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                          <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Registering Copyright… Please wait!</p>
                      </div>
                    ) : (
                      <button 
                        type="submit" 
                        className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                      >
                        <Save className="w-4 h-4" /> {existingReg ? 'Update Registration' : 'Register Copyright'}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Result Area */}
          {showResultCard && resultData && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center mb-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ${resultData.is_new_registration ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {resultData.is_new_registration ? <ShieldPlus className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">
                  {resultData.is_new_registration ? 'Registration Created' : 'Registration Updated'}
                </h2>
                <p className="text-sm font-medium text-slate-600">
                  {resultData.is_new_registration 
                    ? 'Registration record created. Original owner is now locked.' 
                    : 'Registration details updated successfully.'}
                </p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-8 shadow-inner">
                {resultData.is_new_registration && (
                  <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200/60 rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-[10px] sm:text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-4 h-4" /> Locked Owner
                    </span>
                    <span className="font-bold text-indigo-900">{resultData.registered_metadata?.original_owner || ''}</span>
                  </div>
                )}
                
                <h3 className="text-sm font-bold text-[#1e2a52] mb-5 uppercase tracking-wider border-b border-slate-200 pb-2">Registration Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Registration ID</span>
                    <div className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm self-start">{resultData.registration_id || 'N/A'}</div>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span>
                    <div className="font-bold text-slate-800">{resultData.registration_timestamp || 'N/A'}</div>
                  </div>
                  
                  {resultData.registered_metadata?.author && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Author</span>
                      <div className="font-bold text-slate-800">{resultData.registered_metadata.author}</div>
                    </div>
                  )}
                  
                  {resultData.registered_metadata?.copyright_year && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Year</span>
                      <div className="font-bold text-slate-800">{resultData.registered_metadata.copyright_year}</div>
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Pages</span>
                    <div className="font-bold text-slate-800">{resultData.total_pages || '?'}</div>
                  </div>
                </div>
              </div>

              {resultData.document_fingerprint && (
                <div className="mb-8 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Document Fingerprint</span>
                  </div>
                  <code className="block text-[10px] sm:text-xs text-slate-700 break-all font-medium mb-4">{resultData.document_fingerprint}</code>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {resultData.is_new_registration ? 'Record Created' : 'Record Updated'}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-200/80">
                <a 
                  href={ resultData.download_url ? `${API_BASE_URL}${resultData.download_url}` : '#' }
                  download
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  Download Registered PDF
                </a>
                <button 
                  onClick={resetUpload} 
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Register Another
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
