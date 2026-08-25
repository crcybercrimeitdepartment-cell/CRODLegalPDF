import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Edit3, Save, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightInformationEditorPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [readLoading, setReadLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    owner: '',
    author: '',
    organization: '',
    year: '',
    regNum: '',
    notice: '',
    notes: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Information Editor';
  const toolDesc = tool?.description || 'Read existing copyright information from a PDF, edit it, and save the updated document.';
  
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
      setShowResult(false);
      setShowForm(false);
      readCopyrightInfo(valid[0].originalFile);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };
  
  const resetUpload = () => {
    setFiles([]);
    setError('');
    setUpdateError('');
    setShowForm(false);
    setShowResult(false);
    setResultData(null);
    setFormData({ owner: '', author: '', organization: '', year: '', regNum: '', notice: '', notes: '' });
  };

  const readCopyrightInfo = async (selectedFile) => {
    setReadLoading(true);
    setError('');
    
    const fd = new FormData();
    fd.append('file', selectedFile);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/information-editor/read`, { method: 'POST', body: fd });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Failed to read copyright information.');
      
      const info = data.copyright_info || {};
      setFormData({
        owner: info.copyright_owner || '',
        author: info.author || '',
        organization: info.organization || '',
        year: info.copyright_year || '',
        regNum: info.registration_number || '',
        notice: info.copyright_notice || '',
        notes: info.notes || ''
      });
      
      setShowForm(true);
    } catch (err) {
      setError('Error: ' + err.message);
      setFiles([]);
    } finally {
      setReadLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    
    if (!files.length) {
      setError('Please select a PDF file first.');
      return;
    }
    
    const yearTrim = formData.year.trim();
    if (yearTrim && !/^\d{4}$/.test(yearTrim)) {
      setUpdateError('Copyright Year must be a 4-digit year.');
      return;
    }
    
    setUpdateError('');
    setUpdateLoading(true);
    
    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    fd.append('copyright_owner', formData.owner.trim());
    fd.append('author', formData.author.trim());
    fd.append('organization', formData.organization.trim());
    fd.append('copyright_year', yearTrim);
    fd.append('copyright_notice', formData.notice.trim());
    fd.append('registration_number', formData.regNum.trim());
    fd.append('notes', formData.notes.trim());
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/information-editor/update`, { method: 'POST', body: fd });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Update failed.');
      
      setResultData({
        info: data.updated_copyright_info || {},
        totalPages: data.total_pages,
        filename: data.saved_filename,
        downloadUrl: data.download_url
      });
      
      setShowForm(false);
      setShowResult(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setUpdateError('Error: ' + err.message);
    } finally {
      setUpdateLoading(false);
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
          {!showResult && !showForm && (
            <>
              {!files.length && !readLoading && (
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

              {readLoading && (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Reading Copyright Information…</p>
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

          {/* Form Area */}
          {showForm && !showResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-[#1e2a52] flex items-center gap-2">
                  <Edit3 className="w-5 h-5" /> Edit Copyright Info
                </h2>
                {files.length > 0 && (
                  <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" title="Remove File">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="bg-[#1e2a52]/5 rounded-xl p-4 mb-8 border border-[#1e2a52]/10 text-xs sm:text-sm font-medium text-[#1e2a52]">
                Fields below are pre-filled with existing values from the PDF. Edit any field and save.
              </div>

              <form onSubmit={submitUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Owner</label>
                    <input 
                      type="text" id="owner"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                      placeholder="Owner name" value={formData.owner} onChange={handleFormChange}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Author / Creator</label>
                    <input 
                      type="text" id="author"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                      placeholder="Author name" value={formData.author} onChange={handleFormChange}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</label>
                    <input 
                      type="text" id="organization"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                      placeholder="Organization name" value={formData.organization} onChange={handleFormChange}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Year</label>
                    <input 
                      type="text" id="year"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                      placeholder="e.g. 2024" maxLength={4} value={formData.year} onChange={handleFormChange}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Number</label>
                    <input 
                      type="text" id="regNum"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                      placeholder="Reference number" value={formData.regNum} onChange={handleFormChange}
                    />
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Notice</label>
                    <input 
                      type="text" id="notice"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium" 
                      placeholder="Copyright notice text" value={formData.notice} onChange={handleFormChange}
                    />
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                    <textarea 
                      id="notes"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium min-h-[100px] resize-y" 
                      placeholder="Additional notes" value={formData.notes} onChange={handleFormChange}
                    ></textarea>
                  </div>
                </div>
                
                {updateError && (
                  <div className="mt-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{updateError}</span>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                  {updateLoading ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] w-full">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Saving Changes… Please wait!</p>
                    </div>
                  ) : (
                    <button 
                      type="submit" 
                      className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                    >
                      <Save className="w-4 h-4" /> Save Updated Information
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Result Area */}
          {showResult && resultData && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">Update Complete</h2>
                <p className="text-sm font-medium text-slate-600">The copyright information has been successfully embedded into the PDF.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-8 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                  <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Copyright Owner</span>
                    <div className="text-slate-800 font-bold">{resultData.info.copyright_owner || '-'}</div>
                  </div>
                  
                  <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Author</span>
                    <div className="text-slate-800 font-bold">{resultData.info.author || '-'}</div>
                  </div>
                  
                  {resultData.info.organization && (
                    <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Organization</span>
                      <div className="text-slate-800 font-bold">{resultData.info.organization}</div>
                    </div>
                  )}
                  
                  {resultData.info.copyright_year && (
                    <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Year</span>
                      <div className="text-slate-800 font-bold">{resultData.info.copyright_year}</div>
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-1 pb-4 sm:pb-0 border-b sm:border-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Pages</span>
                    <div className="text-slate-800 font-bold">{resultData.totalPages || '?'}</div>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Filename</span>
                    <div className="text-slate-800 font-bold break-all">{resultData.filename}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-200/80">
                <a 
                  href={ resultData.downloadUrl ? `${API_BASE_URL}${resultData.downloadUrl}` : '#' }
                  download
                  className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  Download Updated PDF
                </a>
                <button 
                  onClick={resetUpload} 
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Edit Another PDF
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
