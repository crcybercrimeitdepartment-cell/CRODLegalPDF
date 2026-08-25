import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, FileKey, Save, RefreshCw, LayoutTemplate, ShieldCheck } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightPolicyTemplatesPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [readLoading, setReadLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyError, setApplyError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [templates, setTemplates] = useState({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  
  const [formData, setFormData] = useState({
    holder: '',
    year: '',
    usage: '',
    attribution: '',
    distribution: '',
    modification: '',
    commercial: '',
    additional: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Policy Templates';
  const toolDesc = tool?.description || 'Apply predefined or custom copyright policies to your PDF document.';
  
  const templateDescriptions = {
    all_rights_reserved: 'No use without permission',
    personal_use_only: 'Personal non-commercial use only',
    educational_use: 'For educational purposes',
    non_commercial_use: 'Non-commercial use with attribution',
    attribution_required: 'Free use with attribution',
    custom: 'Create your own policy'
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
      setFiles([valid[0]]);
      setShowResult(false);
      setShowForm(false);
      setShowTemplates(false);
      loadAndRead(valid[0].originalFile);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };
  
  const loadAndRead = async (selectedFile) => {
    setError('');
    setReadLoading(true);
    
    let loadedTemplates = {};
    try {
      const pr = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/policy/templates`, { method: 'GET' });
      const pj = await pr.json();
      if (pj.success) {
        loadedTemplates = pj.templates || {};
        setTemplates(loadedTemplates);
      }
    } catch (ex) {
      console.error('Failed to load templates:', ex);
    }
    
    const fd = new FormData();
    fd.append('file', selectedFile);
    
    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/policy/read`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setShowTemplates(true);
        setShowForm(true);
        
        if (j.has_policy && j.policy) {
          populateForm(j.policy);
        } else if (Object.keys(loadedTemplates).length > 0) {
          const firstKey = Object.keys(loadedTemplates)[0];
          selectTemplate(firstKey, loadedTemplates[firstKey]);
        }
      } else {
        setError(j.error || j.detail || 'Failed to read policy');
        setFiles([]);
      }
    } catch (ex) {
      setError('Error: ' + ex.message);
      setFiles([]);
    } finally {
      setReadLoading(false);
    }
  };

  const populateForm = (policy) => {
    setFormData({
      holder: policy.copyright_holder || '',
      year: policy.copyright_year || '',
      usage: policy.usage_restrictions || '',
      attribution: policy.attribution_text || '',
      distribution: policy.distribution_rules || '',
      modification: policy.modification_rules || '',
      commercial: policy.commercial_use_rules || '',
      additional: policy.additional_policy || ''
    });
  };

  const selectTemplate = (key, template) => {
    setSelectedTemplateKey(key);
    populateForm(template);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const applyPolicy = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    
    setApplyLoading(true);
    setApplyError('');
    
    const templateName = selectedTemplateKey && templates[selectedTemplateKey] 
      ? templates[selectedTemplateKey].template_name 
      : 'Custom Policy';
      
    const policyData = {
      template_name: templateName,
      copyright_holder: formData.holder,
      copyright_year: formData.year,
      usage_restrictions: formData.usage,
      attribution_text: formData.attribution,
      distribution_rules: formData.distribution,
      modification_rules: formData.modification,
      commercial_use_rules: formData.commercial,
      additional_policy: formData.additional,
    };
    
    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    fd.append('policy_json', JSON.stringify(policyData));
    
    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/policy/apply`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        let verified = false;
        try {
          const vr = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/policy/verify/` + j.session_id, { method: 'GET' });
          const vj = await vr.json();
          verified = vj.verified;
        } catch (ex) {
          console.error('Verification failed', ex);
        }
        
        setResultData({
          message: j.message,
          templateName: j.template_name,
          verified: verified ? 'Yes' : 'No',
          downloadUrl: '/api/pdf-copyright-protection/policy/download/' + j.session_id
        });
        
        setShowForm(false);
        setShowTemplates(false);
        setShowResult(true);
        window.scrollTo(0, 0);
      } else {
        setApplyError(j.error || j.detail || 'Failed to apply policy');
      }
    } catch (ex) {
      setApplyError('Error: ' + ex.message);
    } finally {
      setApplyLoading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setError('');
    setApplyError('');
    setShowTemplates(false);
    setShowForm(false);
    setShowResult(false);
    setResultData(null);
    setSelectedTemplateKey(null);
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
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Reading Existing Policy…</p>
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
          {(showTemplates || showForm) && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-[#1e2a52] flex items-center gap-2">
                  <FileKey className="w-5 h-5" /> Policy Configuration
                </h2>
                {files.length > 0 && (
                  <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" title="Remove File">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {showTemplates && Object.keys(templates).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-[#1e2a52] mb-4 flex items-center gap-1.5">
                    <LayoutTemplate className="w-4 h-4 text-indigo-500" /> Select Policy Template
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(templates).map(([key, template]) => (
                      <div 
                        key={key}
                        onClick={() => selectTemplate(key, template)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-center ${
                          selectedTemplateKey === key 
                            ? 'border-[#1e2a52] bg-[#1e2a52]/5 shadow-sm' 
                            : 'border-slate-200 bg-white hover:border-[#1e2a52]/30 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`text-sm font-bold mb-1 ${selectedTemplateKey === key ? 'text-[#1e2a52]' : 'text-slate-800'}`}>
                          {template.template_name || key}
                        </div>
                        <div className={`text-xs font-medium ${selectedTemplateKey === key ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {templateDescriptions[key] || ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showForm && (
                <form onSubmit={applyPolicy} className="space-y-5">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
                      Policy Details {selectedTemplateKey && templates[selectedTemplateKey] ? `— ${templates[selectedTemplateKey].template_name}` : ''}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Holder</label>
                        <input 
                          type="text" name="holder" value={formData.holder} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                          placeholder="Holder name" 
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Copyright Year</label>
                        <input 
                          type="text" name="year" value={formData.year} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                          placeholder="e.g. 2026" 
                        />
                      </div>
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Usage Restrictions</label>
                        <textarea 
                          name="usage" value={formData.usage} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm min-h-[80px]" 
                          placeholder="What usage is restricted"
                        ></textarea>
                      </div>
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Attribution Text</label>
                        <input 
                          type="text" name="attribution" value={formData.attribution} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                          placeholder="Attribution requirements" 
                        />
                      </div>
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Distribution Rules</label>
                        <textarea 
                          name="distribution" value={formData.distribution} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm min-h-[80px]" 
                          placeholder="How the document can be distributed"
                        ></textarea>
                      </div>
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Modification Rules</label>
                        <textarea 
                          name="modification" value={formData.modification} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm min-h-[80px]" 
                          placeholder="How the document can be modified"
                        ></textarea>
                      </div>
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Commercial Use Rules</label>
                        <textarea 
                          name="commercial" value={formData.commercial} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm min-h-[80px]" 
                          placeholder="Commercial use terms"
                        ></textarea>
                      </div>
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Policy</label>
                        <textarea 
                          name="additional" value={formData.additional} onChange={handleFormChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm min-h-[80px]" 
                          placeholder="Any additional policy text"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  
                  {applyError && (
                    <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{applyError}</span>
                    </div>
                  )}
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                    {applyLoading ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] w-full">
                        <div className="speeder-loader-wrapper">
                          <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                          <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Applying Policy… Please wait!</p>
                      </div>
                    ) : (
                      <button 
                        type="submit" 
                        className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                      >
                        <Save className="w-4 h-4" /> Apply Policy to PDF
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Result Area */}
          {showResult && resultData && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">Policy Applied</h2>
                <p className="text-sm font-medium text-slate-600">The copyright policy has been successfully attached to the document.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-8 shadow-inner">
                <div className="space-y-5 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verification
                    </span>
                    <div className="text-slate-800 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                      Verified: <span className={resultData.verified === 'Yes' ? 'text-emerald-600' : 'text-red-600'}>{resultData.verified}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Template Applied</span>
                    <div className="text-slate-800 font-bold">{resultData.templateName}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status Message</span>
                    <div className="text-slate-800 font-medium italic">{resultData.message}</div>
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
