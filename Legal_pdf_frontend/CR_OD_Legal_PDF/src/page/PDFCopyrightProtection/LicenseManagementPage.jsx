import React, { useState, useRef } from 'react';
import { FileText, ArrowLeft, X, AlertCircle, Key, CheckCircle2, DownloadCloud, Plus, User, Building, Calendar, Shield, ChevronDown } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function LicenseManagementPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [readLoading, setReadLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [presets, setPresets] = useState({});
  const [result, setResult] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'Custom', licensor: '', licensee: '', status: 'Active',
    effDate: '', expDate: '', usage: '', dist: 'Yes', commercial: 'Yes',
    modify: 'Yes', attribution: '', conditions: '', notes: ''
  });

  const inputRef = useRef();
  const toolName = tool?.name || 'License Management';
  const toolDesc = tool?.description || 'Create and manage licensing information for your PDF document.';
  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

  const addFiles = (newFiles) => {
    setError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setError('Only PDF files (.pdf) are accepted.'); return; }
    setFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setResult(null); setShowForm(false); setActivePreset(null);
    loadPresetsAndRead(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); };
  const handleFormChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const populateForm = (d) => setFormData({
    name: d.license_name || '', type: d.license_type || 'Custom', licensor: d.licensor || '',
    licensee: d.licensee || '', status: d.license_status || 'Active', effDate: d.effective_date || '',
    expDate: d.expiry_date || '', usage: d.usage_permissions || '', dist: d.distribution_permission || 'Yes',
    commercial: d.commercial_use_permission || 'Yes', modify: d.modification_permission || 'Yes',
    attribution: d.attribution_requirement || '', conditions: d.license_conditions || '', notes: d.notes || ''
  });

  const loadPresetsAndRead = async (selectedFile) => {
    setReadLoading(true); setError('');
    try {
      const pr = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/license/presets`, { method: 'GET' });
      const pj = await pr.json();
      if (pj.success) setPresets(pj.presets || {});
    } catch (_) {}
    try {
      const fd = new FormData(); fd.append('file', selectedFile);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/license/read`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) { if (j.has_license && j.license_info) populateForm(j.license_info); setShowForm(true); }
      else { setError(j.error || 'Failed to read license'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setReadLoading(false); }
  };

  const applyPreset = (key) => { const p = presets[key]; if (!p) return; populateForm(p); setActivePreset(key); };

  const saveLicense = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    setSaveLoading(true); setError('');
    const data = {
      license_name: formData.name, license_type: formData.type, licensor: formData.licensor,
      licensee: formData.licensee, license_status: formData.status, effective_date: formData.effDate,
      expiry_date: formData.expDate, usage_permissions: formData.usage, distribution_permission: formData.dist,
      commercial_use_permission: formData.commercial, modification_permission: formData.modify,
      attribution_requirement: formData.attribution, license_conditions: formData.conditions, notes: formData.notes,
    };
    try {
      const fd = new FormData(); fd.append('file', files[0].originalFile); fd.append('license_json', JSON.stringify(data));
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/license/save`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        let verified = 'No';
        try { const vr = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/license/verify/` + j.session_id); const vj = await vr.json(); verified = vj.verified ? 'Yes' : 'No'; } catch (_) {}
        setResult({ message: j.message, licenseName: j.license_info?.license_name || 'N/A', licenseType: j.license_info?.license_type || 'N/A', verified, downloadUrl: '/api/pdf-copyright-protection/license/download/' + j.session_id });
        setShowForm(false);
      } else { setError(j.error || 'Failed to save'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setSaveLoading(false); }
  };

  const resetUpload = () => { setFiles([]); setError(''); setResult(null); setShowForm(false); setActivePreset(null); };

  const fieldClass = "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-slate-800 font-medium text-sm";
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
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-amber-500 bg-amber-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-amber-400 hover:bg-amber-50/20'}`}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addFiles(e.target.files)} />
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Key className="w-8 h-8 text-amber-600" /></div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Auto-reads existing license on upload</p>
            </div>
          )}
          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="flex items-center gap-3 truncate"><FileText className="w-5 h-5 text-amber-500 shrink-0" /><span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span></div>
              <button onClick={resetUpload} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={readLoading || saveLoading}><X className="w-5 h-5" /></button>
            </div>
          )}
          {readLoading && (
            <div className="flex flex-col items-center justify-center p-6 bg-amber-50/30 border border-amber-100 rounded-2xl mt-4 min-h-[160px]">
              <div className="speeder-loader-wrapper"><div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div><div className="longfazers"><span></span><span></span><span></span><span></span></div></div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Reading License Information…</p>
            </div>
          )}
          {error && <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        </div>

        {/* Presets */}
        {showForm && Object.keys(presets).length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-sm font-bold text-[#1e2a52] mb-4 uppercase tracking-wider">License Presets</h2>
            <p className="text-xs text-slate-500 mb-5">Select a preset to pre-fill the form</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.keys(presets).map((key) => {
                const p = presets[key];
                return (
                  <div key={key} onClick={() => applyPreset(key)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${activePreset === key ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/40'}`}>
                    <div className={`font-black text-xs ${activePreset === key ? 'text-amber-700' : 'text-slate-800'}`}>{p.license_name}</div>
                    <div className={`text-[10px] mt-0.5 ${activePreset === key ? 'text-amber-500' : 'text-slate-400'}`}>{p.license_type}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-sm font-bold text-[#1e2a52] mb-6 uppercase tracking-wider">License Information</h2>
            <form onSubmit={saveLicense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>License Name</label><input type="text" name="name" value={formData.name} onChange={handleFormChange} className={fieldClass} placeholder="e.g. MIT License" /></div>
                <div><label className={labelClass}>License Type</label>
                  <div className="relative"><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select name="type" value={formData.type} onChange={handleFormChange} className={fieldClass + " appearance-none"}>
                      {['MIT','Apache-2.0','GPL-3.0','CC-BY-4.0','CC-BY-NC-4.0','Proprietary','Custom'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={labelClass}>Licensor / Copyright Holder</label><input type="text" name="licensor" value={formData.licensor} onChange={handleFormChange} className={fieldClass} placeholder="Who grants the license" /></div>
                <div><label className={labelClass}>Licensee</label><input type="text" name="licensee" value={formData.licensee} onChange={handleFormChange} className={fieldClass} placeholder="Who receives the license" /></div>
                <div><label className={labelClass}>License Status</label>
                  <div className="relative"><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select name="status" value={formData.status} onChange={handleFormChange} className={fieldClass + " appearance-none"}>
                      {['Active','Expired','Pending','Revoked'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={labelClass}>Effective Date</label><input type="date" name="effDate" value={formData.effDate} onChange={handleFormChange} className={fieldClass} /></div>
                <div><label className={labelClass}>Expiry Date</label><input type="date" name="expDate" value={formData.expDate} onChange={handleFormChange} className={fieldClass} /></div>
                <div><label className={labelClass}>Distribution Permission</label>
                  <div className="relative"><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select name="dist" value={formData.dist} onChange={handleFormChange} className={fieldClass + " appearance-none"}>
                      {['Yes','Yes (non-commercial only)','Yes (under same license)','No'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={labelClass}>Commercial Use</label>
                  <div className="relative"><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select name="commercial" value={formData.commercial} onChange={handleFormChange} className={fieldClass + " appearance-none"}>
                      {['Yes','No','With restrictions'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={labelClass}>Modification Permission</label>
                  <div className="relative"><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select name="modify" value={formData.modify} onChange={handleFormChange} className={fieldClass + " appearance-none"}>
                      {['Yes','Yes (derivative works must use same license)','No'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sm:col-span-2"><label className={labelClass}>Usage Permissions</label><textarea name="usage" value={formData.usage} onChange={handleFormChange} className={fieldClass + " min-h-[80px] resize-none"} placeholder="What usage is permitted" /></div>
                <div><label className={labelClass}>Attribution Requirement</label><input type="text" name="attribution" value={formData.attribution} onChange={handleFormChange} className={fieldClass} placeholder="What attribution is needed" /></div>
                <div className="sm:col-span-2"><label className={labelClass}>License Conditions</label><textarea name="conditions" value={formData.conditions} onChange={handleFormChange} className={fieldClass + " min-h-[80px] resize-none"} placeholder="Additional conditions or terms" /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Additional Notes</label><textarea name="notes" value={formData.notes} onChange={handleFormChange} className={fieldClass + " min-h-[80px] resize-none"} placeholder="Any additional notes" /></div>
              </div>

              {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

              <div className="pt-4 border-t border-slate-100 flex justify-center">
                {saveLoading ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-amber-50/30 border border-amber-100 rounded-2xl w-full min-h-[140px]">
                    <div className="speeder-loader-wrapper"><div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div><div className="longfazers"><span></span><span></span><span></span><span></span></div></div>
                    <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Saving License to PDF…</p>
                  </div>
                ) : (
                  <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-amber-500/20 transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center">
                    <Key className="w-4 h-4" /> Save License to PDF
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
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4 border border-amber-200"><CheckCircle2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-[#1e2a52] mb-1">License Saved!</h3>
              <p className="text-sm text-slate-500 font-medium">{result.message}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6 space-y-3 text-sm">
              {[{ l: 'License Name', v: result.licenseName }, { l: 'Type', v: result.licenseType }].map((r, i) => (
                <div key={i} className={`flex items-center justify-between ${i === 0 ? 'pb-3 border-b border-slate-200' : ''}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{r.l}</span>
                  <span className="font-bold text-slate-800">{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified</span>
                <span className={`font-black text-xs px-2.5 py-1 rounded-full ${result.verified === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{result.verified}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href={`${API_BASE_URL}${result.downloadUrl}`} download className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                <DownloadCloud className="w-5 h-5" /> Download PDF
              </a>
              <button onClick={resetUpload} className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95 w-full sm:w-auto">
                <Plus className="w-4 h-4 inline mr-1" /> Process Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
