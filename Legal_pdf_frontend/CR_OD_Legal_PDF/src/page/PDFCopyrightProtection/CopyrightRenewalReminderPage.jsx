import React, { useState, useRef } from 'react';
import { Upload, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Clock, Save, Activity, CalendarDays, Settings2, BellRing, FileText } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightRenewalReminderPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [status, setStatus] = useState(null);
  const [presets, setPresets] = useState([]);
  
  const [showStatus, setShowStatus] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [disclaimer, setDisclaimer] = useState('');
  
  const [formData, setFormData] = useState({
    enabled: true,
    expirationDate: '',
    customDays: '30',
    description: ''
  });
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Renewal Reminder';
  const toolDesc = tool?.description || 'Configure renewal reminders for copyright records with known expiration dates.';
  
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
      setShowStatus(false);
      setShowConfig(false);
      setShowResult(false);
      setStatus(null);
      setResult(null);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };

  const loadStatus = async () => {
    if (!files.length) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (presets.length === 0) {
        try {
          const presetsR = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/renewal/presets`);
          const presetsD = await presetsR.json();
          if (presetsD.presets) setPresets(presetsD.presets);
        } catch (ex) {
          console.error('Failed to load presets', ex);
        }
      }
      
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/renewal/status`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Failed to load status');
      
      setStatus(d.status);
      
      if (d.status && d.status.has_reminder) {
        setFormData(prev => ({
          ...prev,
          enabled: d.status.enabled,
          expirationDate: d.status.expiration_date || '',
          customDays: d.status.reminder_days ? String(d.status.reminder_days) : '30'
        }));
      }
      
      setShowStatus(true);
      setShowConfig(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePresetClick = (days) => {
    setFormData(prev => ({ ...prev, customDays: String(days) }));
  };

  const saveReminder = async () => {
    if (!files.length) return;
    
    setLoading(true);
    setError('');
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      fd.append('enabled', formData.enabled);
      fd.append('reminder_days', formData.customDays);
      fd.append('expiration_date', formData.expirationDate);
      fd.append('custom_description', formData.description.trim());
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/renewal/configure`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Failed to save configure');
      
      setResult(d);
      setDisclaimer(d.disclaimer || '');
      setShowResult(true);
      setShowConfig(false);
      setShowStatus(false);
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
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/renewal/report`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) throw new Error(d.detail || 'Report failed');
      
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'renewal-report.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setError('');
    setShowStatus(false);
    setShowConfig(false);
    setShowResult(false);
    setStatus(null);
    setResult(null);
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

              {files.length > 0 && !showConfig && !showStatus && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h3 className="font-bold text-[#1e2a52] mb-1 truncate">{files[0].name}</h3>
                  <p className="text-xs text-slate-500 mb-6">{files[0].size}</p>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1e2a52]/10 text-[#1e2a52] rounded-full font-bold text-sm w-full sm:w-auto">
                        <div className="animate-spin h-4 w-4 border-2 border-[#1e2a52]/30 border-t-[#1e2a52] rounded-full"></div>
                        <span>Loading Status...</span>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={loadStatus} 
                          className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-6 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer w-full sm:w-auto"
                        >
                          Load Reminder Status
                        </button>
                        <button 
                          onClick={resetUpload} 
                          className="bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 hover:border-red-200 px-6 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer w-full sm:w-auto"
                        >
                          Remove File
                        </button>
                      </>
                    )}
                  </div>
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

          {/* Status & Config Area */}
          {(showStatus || showConfig) && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-[#1e2a52] flex items-center gap-2">
                  <BellRing className="w-5 h-5" /> Renewal Configuration
                </h2>
                <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" title="Remove File">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {showStatus && status && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-[#1e2a52] mb-4 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-500" /> Current Reminder Status
                  </h3>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-4 sm:p-6 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                      <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Has Reminder</span>
                        <div className="font-bold text-slate-800">{status.has_reminder ? 'Yes' : 'No'}</div>
                      </div>
                      
                      {status.has_reminder && (
                        <>
                          <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Enabled</span>
                            <div className={`font-bold ${status.enabled ? 'text-emerald-600' : 'text-slate-500'}`}>{status.enabled ? 'Yes' : 'No'}</div>
                          </div>
                          
                          <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reminder Days</span>
                            <div className="font-bold text-slate-800">{status.reminder_days} days before</div>
                          </div>
                          
                          <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Expiration Date</span>
                            <div className="font-bold text-slate-800">{status.expiration_date || 'N/A'}</div>
                          </div>
                          
                          <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Next Reminder</span>
                            <div className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 self-start">{status.next_reminder_date || 'N/A'}</div>
                          </div>
                          
                          {status.days_until_reminder !== null && (
                            <div className="flex flex-col space-y-1 pb-3 sm:pb-0 border-b sm:border-0 border-slate-200">
                              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Days Until Reminder</span>
                              <div className="font-bold text-slate-800">{status.days_until_reminder}</div>
                            </div>
                          )}
                          
                          <div className="flex flex-col space-y-1 sm:col-span-2">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                            <div className={`font-bold ${status.is_due ? 'text-red-600' : 'text-emerald-600'}`}>
                              {status.renewal_status}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showConfig && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#1e2a52] mb-4 flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-indigo-500" /> Configure Reminder
                  </h3>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                    
                    <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" name="enabled" checked={formData.enabled} onChange={handleFormChange}
                        className="w-5 h-5 text-[#1e2a52] border-slate-300 rounded focus:ring-[#1e2a52] accent-[#1e2a52]" 
                      />
                      <span className="font-bold text-slate-800">Enable Reminder Alert</span>
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Expiration Date</label>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input 
                            type="date" name="expirationDate" value={formData.expirationDate} onChange={handleFormChange}
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Interval (Days Before)</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input 
                            type="number" name="customDays" value={formData.customDays} onChange={handleFormChange} min="1"
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm" 
                          />
                        </div>
                      </div>
                      
                      {presets.length > 0 && (
                        <div className="space-y-2 sm:col-span-2 mt-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Intervals</label>
                          <div className="flex flex-wrap gap-2">
                            {presets.map(p => (
                              <button
                                key={p.days} type="button" onClick={() => handlePresetClick(p.days)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                  formData.customDays === String(p.days)
                                    ? 'bg-[#1e2a52] text-white border border-[#1e2a52]'
                                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-1.5 sm:col-span-2 mt-2">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Description (Optional)</label>
                        <textarea 
                          name="description" value={formData.description} onChange={handleFormChange} placeholder="e.g. License renewal for Acme Corp." rows={2}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-800 font-medium text-sm resize-y"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] w-full">
                        <div className="speeder-loader-wrapper">
                          <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                          <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Saving Reminder Settings…</p>
                      </div>
                    ) : (
                      <button 
                        onClick={saveReminder} 
                        className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                      >
                        <Save className="w-4 h-4" /> Save Reminder Configuration
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result Area */}
          {showResult && result && (
            <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-[#1e2a52] mb-2">Reminder Configured</h2>
                <p className="text-sm font-medium text-emerald-600">{result.message}</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-6 shadow-inner">
                <div className="space-y-4 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Alert Status</span>
                    <div className={`font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm ${result.reminder?.enabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {result.reminder?.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Reminder Interval</span>
                    <div className="text-slate-800 font-bold">{result.reminder?.reminder_days} days before</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Expiration Date</span>
                    <div className="text-slate-800 font-bold">{result.reminder?.expiration_date || 'Not set'}</div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Next Reminder Due</span>
                    <div className="text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                      {result.reminder?.next_reminder_date || 'Not calculated'}
                    </div>
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
                  onClick={() => { setShowResult(false); setShowStatus(true); setShowConfig(true); }}
                  className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Settings2 className="w-4 h-4" /> Edit Reminder
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
