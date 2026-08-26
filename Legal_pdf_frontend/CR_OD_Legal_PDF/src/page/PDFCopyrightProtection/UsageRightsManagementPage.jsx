import React, { useState, useRef } from 'react';
import { FileText, ArrowLeft, X, AlertCircle, Sliders, CheckCircle2, XCircle, DownloadCloud, Plus, Lock, Eye, EyeOff, Printer, Copy, Edit3, MessageSquare } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function UsageRightsManagementPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [readLoading, setReadLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showPerms, setShowPerms] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [permissionFields, setPermissionFields] = useState([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const inputRef = useRef();

  const toolName = tool?.name || 'Usage Rights Management';
  const toolDesc = tool?.description || 'Control what users can do with your PDF — printing, copying, editing, and more.';
  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';

  const addFiles = (newFiles) => {
    setError('');
    const file = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!file) { setError('Only PDF files (.pdf) are accepted.'); return; }
    setFiles([{ name: file.name, size: fmtSize(file), originalFile: file }]);
    setResult(null); setShowPerms(false); setPassword(''); setConfirmPassword('');
    readPerms(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); };

  const readPerms = async (selectedFile) => {
    setReadLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', selectedFile);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/usage-rights/read`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        const perms = j.permissions || {};
        setPermissions(perms); setOriginalPermissions(JSON.parse(JSON.stringify(perms)));
        setPermissionFields(j.permission_fields || []); setShowPerms(true);
      } else { setError(j.error || 'Failed to read permissions'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setReadLoading(false); }
  };

  const togglePerm = (key, val) => setPermissions(prev => ({ ...prev, [key]: val }));
  const enableAll = () => setPermissions(prev => { const n = { ...prev }; Object.keys(n).forEach(k => n[k] = true); return n; });
  const disableAll = () => setPermissions(prev => { const n = { ...prev }; Object.keys(n).forEach(k => n[k] = false); return n; });
  const resetPerms = () => setPermissions(JSON.parse(JSON.stringify(originalPermissions)));

  const saveToPdf = async () => {
    if (!files.length) return;
    if (password && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSaveLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', files[0].originalFile);
      fd.append('permissions_json', JSON.stringify(permissions));
      if (password) fd.append('password', password);
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/usage-rights/save`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        let verified = 'No';
        try { const vr = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/usage-rights/verify/` + j.session_id); const vj = await vr.json(); verified = vj.verified ? 'Yes' : 'No'; } catch (_) {}
        setResult({ message: j.message, granted: j.granted_permissions || [], denied: j.denied_permissions || [], passwordProtected: j.password_protected ? 'Yes' : 'No', verified, downloadUrl: '/api/pdf-copyright-protection/usage-rights/download/' + j.session_id });
        setShowPerms(false);
      } else { setError(j.error || 'Failed to save'); }
    } catch (ex) { setError('Error: ' + ex.message); }
    finally { setSaveLoading(false); }
  };

  const resetAll = () => { setFiles([]); setError(''); setResult(null); setShowPerms(false); setPassword(''); setConfirmPassword(''); };

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
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-indigo-400 hover:bg-indigo-50/20'}`}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.length && addFiles(e.target.files)} />
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Sliders className="w-8 h-8 text-indigo-600" /></div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop PDF here or click to browse</p>
              <p className="text-xs sm:text-sm text-slate-500">Reads existing permissions on upload</p>
            </div>
          )}
          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-3 truncate"><FileText className="w-5 h-5 text-indigo-500 shrink-0" /><span className="font-bold text-slate-700 text-sm truncate">{files[0].name} <span className="text-slate-400 font-normal ml-1">({files[0].size})</span></span></div>
              <button onClick={resetAll} className="text-slate-400 hover:text-red-500 transition-colors p-1.5" disabled={readLoading || saveLoading}><X className="w-5 h-5" /></button>
            </div>
          )}
          {readLoading && (
            <div className="flex flex-col items-center justify-center p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl mt-4 min-h-[160px]">
              <div className="speeder-loader-wrapper"><div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div><div className="longfazers"><span></span><span></span><span></span><span></span></div></div>
              <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Reading Permissions…</p>
            </div>
          )}
          {error && !saveLoading && !readLoading && <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        </div>

        {/* Permissions */}
        {showPerms && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <h2 className="text-sm font-bold text-[#1e2a52] uppercase tracking-wider">Permission Settings</h2>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
              <button onClick={enableAll} className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer">Enable All</button>
              <button onClick={disableAll} className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">Disable All</button>
              <button onClick={resetPerms} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer">Reset</button>
            </div>

            {/* Toggle List */}
            <div className="space-y-3">
              {permissionFields.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="pr-4 flex-1">
                    <div className="font-bold text-slate-900 text-sm">{f.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{f.description}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={permissions[f.key] || false} onChange={(e) => togglePerm(f.key, e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>

            {/* Password */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#1e2a52] mb-0.5">Optional Password Protection</h3>
                <p className="text-xs text-slate-500">Set an owner password to enforce restricted permissions.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Owner Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Optional" autoComplete="new-password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-800 font-medium text-sm" />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" autoComplete="new-password"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-800 font-medium text-sm" />

                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

            <div className="pt-4 border-t border-slate-100 flex justify-center">
              {saveLoading ? (
                <div className="flex flex-col items-center justify-center p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl w-full min-h-[140px]">
                  <div className="speeder-loader-wrapper"><div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div><div className="longfazers"><span></span><span></span><span></span><span></span></div></div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Saving Permissions…</p>
                </div>
              ) : (
                <button onClick={saveToPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-indigo-500/20 transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center">
                  <Sliders className="w-4 h-4" /> Save Permissions to PDF
                </button>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 border border-indigo-200"><CheckCircle2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-[#1e2a52] mb-1">Permissions Saved!</h3>
              <p className="text-sm text-slate-500 font-medium">{result.message}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6 space-y-3 text-sm">
              {result.granted.length > 0 && (
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Granted Permissions</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.granted.map((p, i) => <span key={i} className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">{p}</span>)}
                  </div>
                </div>
              )}
              {result.denied.length > 0 && (
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Denied Permissions</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.denied.map((p, i) => <span key={i} className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">{p}</span>)}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Protected</span>
                <span className={`font-black text-xs px-2.5 py-1 rounded-full ${result.passwordProtected === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{result.passwordProtected}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified</span>
                <span className={`font-black text-xs px-2.5 py-1 rounded-full ${result.verified === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{result.verified}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href={`${API_BASE_URL}${result.downloadUrl}`} download className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto">
                <DownloadCloud className="w-5 h-5" /> Download PDF
              </a>
              <button onClick={resetAll} className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105 active:scale-95 w-full sm:w-auto">
                <Plus className="w-4 h-4 inline mr-1" /> Process Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
