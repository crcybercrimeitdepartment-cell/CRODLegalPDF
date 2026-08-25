import React, { useState, useRef } from 'react';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'https://cr-od-legal-pdf-backend.onrender.com');

const ROTATION_OPTIONS = [
  { label: '90° Clockwise', value: 90 },
  { label: '180°', value: 180 },
  { label: '90° Counter-Clockwise', value: 270 },
];

export default function RotatePDFPage() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rotation, setRotation] = useState(90);
  const [pages, setPages] = useState('all');
  const [customPages, setCustomPages] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };
  const handleFiles = (fileList) => {
    const valid = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (valid.length > 0) setFiles([valid[0]]);
  };
  const removeFile = () => {
    setFiles([]); setIsSuccess(false); setIsProcessing(false);
    setDownloadUrl(null); setErrorMsg(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsFlying(true);
    setErrorMsg(null);
    setTimeout(async () => {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('rotation', rotation);
        formData.append('pages', pages === 'custom' ? customPages : pages);
        const response = await fetch(`${API_BASE_URL}/api/pdf/rotate`, { method: 'POST', body: formData });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          let errorMessage = `Server error: ${response.status}`;
          if (errData.detail) {
            if (typeof errData.detail === 'string') {
              errorMessage = errData.detail;
            } else if (Array.isArray(errData.detail)) {
              errorMessage = errData.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
            } else {
              errorMessage = JSON.stringify(errData.detail);
            }
          }
          throw new Error(errorMessage);
        }
        const contentType = response.headers.get('content-type') || '';
        let dlUrl;
        if (contentType.includes('application/json')) {
          const data = await response.json();
          const downloadPath = data.download_url || data.url;
          if (!downloadPath) throw new Error('No download URL in response');
          const fileRes = await fetch(`${API_BASE_URL}${downloadPath}`);
          if (!fileRes.ok) throw new Error('Failed to download processed file');
          const blob = await fileRes.blob();
          dlUrl = URL.createObjectURL(blob);
        } else {
          const blob = await response.blob();
          dlUrl = URL.createObjectURL(blob);
        }
        setDownloadUrl(dlUrl);
        setIsSuccess(true);
      } catch (err) {
        console.error('Rotate API error:', err);
        setErrorMsg(err.message || 'An error occurred. Please try again.');
      } finally {
        setIsProcessing(false);
        setIsFlying(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 flex flex-col items-center">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="w-full max-w-4xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
          <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">Rotate PDF</h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">Rotate pages in your PDF by 90 degrees, 180 degrees, or 270 degrees instantly.</p>
        </div>

        {!isProcessing && !isSuccess && (
          <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-10 max-w-4xl mx-auto w-full">
            {errorMsg && (
              <div className="mb-5 p-4 text-red-700 bg-red-50 border border-red-200 rounded-xl text-sm font-medium">{errorMsg}</div>
            )}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${isDragOver ? 'border-indigo-500 bg-indigo-100' : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50'} group`}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept=".pdf" hidden ref={fileInputRef} onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
              <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <p className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-900">{files.length > 0 ? files[0].name : 'Drag & Drop your PDF here'}</p>
              <p className="text-sm text-slate-500">or <span className="font-semibold text-indigo-600 group-hover:underline">click to browse</span></p>
            </div>

            {files.length > 0 && (
              <>
                <div className="mt-6 flex items-center justify-between p-4 bg-white/80 border border-slate-200 rounded-xl shadow-sm">
                  <span className="font-medium text-slate-700 truncate">{files[0].name}</span>
                  <button onClick={removeFile} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Rotation Angle</label>
                    <div className="grid grid-cols-3 gap-3">
                      {ROTATION_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setRotation(opt.value)}
                          className={`py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all ${rotation === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Apply To</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[['all', 'All Pages'], ['odd', 'Odd Pages'], ['even', 'Even Pages'], ['custom', 'Custom']].map(([val, label]) => (
                        <button key={val} onClick={() => setPages(val)}
                          className={`py-3 px-2 rounded-xl font-semibold text-sm border-2 transition-all ${pages === val ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {pages === 'custom' && (
                      <input type="text" placeholder="e.g. 1,3,5-8" value={customPages}
                        onChange={e => setCustomPages(e.target.value)}
                        className="mt-3 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
                    )}
                  </div>
                  <button onClick={handleProcess} disabled={isFlying}
                    className={`w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-4 px-12 rounded-xl shadow-xl shadow-indigo-200 transform transition-all duration-300 flex items-center justify-center gap-2 mx-auto ${isFlying ? 'scale-95 opacity-80' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
                    <span>Rotate PDF</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-12 bg-white/70 border border-white shadow-2xl rounded-3xl backdrop-blur-xl min-h-[400px] max-w-4xl mx-auto w-full mt-6">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8" />
            <h3 className="text-xl font-bold text-[#1e2a52] mb-2">Rotating PDF...</h3>
            <p className="text-slate-500 text-center text-sm">Please wait while we process your file.</p>
          </div>
        )}

        {isSuccess && (
          <div className="mt-6 p-10 text-center w-full max-w-4xl mx-auto bg-emerald-50 rounded-3xl border border-emerald-100 shadow-2xl min-h-[400px] flex flex-col justify-center items-center gap-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-sm border border-emerald-200">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 className="text-2xl font-extrabold text-emerald-800">Done!</h3>
            <a href={downloadUrl} download={files[0] ? `rotated_${files[0].name}` : 'rotated_output.pdf'}
              className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Rotated PDF
            </a>
            <button onClick={() => { setFiles([]); setIsSuccess(false); setDownloadUrl(null); }}
              className="w-full max-w-sm bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2">
              Rotate Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
