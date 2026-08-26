import React, { useState, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function ScantoPDFPage() {
  const [imageFiles, setImageFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };
  const handleFiles = (fileList) => {
    const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (valid.length > 0) setImageFiles(prev => [...prev, ...valid]);
  };
  const removeFile = (idx) => setImageFiles(prev => prev.filter((_, i) => i !== idx));
  const resetAll = () => { setImageFiles([]); setIsSuccess(false); setDownloadUrl(null); setErrorMsg(null); };

  const handleProcess = async () => {
    if (imageFiles.length === 0) { setErrorMsg('Please select at least one image.'); return; }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      // Step 1: Create scan session
      const createRes = await fetch(`${API_BASE_URL}/api/pdf/scan/create`, { method: 'POST' });
      if (!createRes.ok) throw new Error('Failed to create scan session');
      const createData = await createRes.json();
      const requestId = createData.request_id;

      // Step 2: Upload each image
      for (const imgFile of imageFiles) {
        const uploadForm = new FormData();
        uploadForm.append('files', imgFile); // Fixed: backend expects 'files'
        uploadForm.append('request_id', requestId);
        const uploadRes = await fetch(`${API_BASE_URL}/api/pdf/scan/upload`, { method: 'POST', body: uploadForm });
        if (!uploadRes.ok) throw new Error(`Failed to upload ${imgFile.name}`);
      }

      // Step 3: Generate PDF
      const generateForm = new FormData();
      generateForm.append('request_id', requestId);
      generateForm.append('page_size', pageSize);
      generateForm.append('orientation', orientation);
      const generateRes = await fetch(`${API_BASE_URL}/api/pdf/scan/generate`, { method: 'POST', body: generateForm });
      if (!generateRes.ok) throw new Error('Failed to generate PDF');
      const generateData = await generateRes.json();

      // Step 4: Download
      const filename = generateData.filename || 'scan.pdf';
      const fileRes = await fetch(`${API_BASE_URL}/api/pdf/scan/download/${requestId}/${filename}`);
      if (!fileRes.ok) throw new Error('Failed to download PDF');
      const blob = await fileRes.blob();
      setDownloadUrl(URL.createObjectURL(blob));
      setIsSuccess(true);
    } catch (err) {
      console.error('Scan to PDF error:', err);
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 flex flex-col items-center">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="w-full max-w-4xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
          <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">Scan to PDF</h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">Upload scanned images and convert them into a single, professional PDF document.</p>
        </div>

        {!isProcessing && !isSuccess && (
          <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-10 max-w-4xl mx-auto w-full">
            {errorMsg && (
              <div className="mb-5 p-4 text-red-700 bg-red-50 border border-red-200 rounded-xl text-sm font-medium">{errorMsg}</div>
            )}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${isDragOver ? 'border-violet-500 bg-violet-100' : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50'} group`}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept="image/*" multiple hidden ref={fileInputRef} onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
              <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-900">{imageFiles.length > 0 ? `${imageFiles.length} image(s) selected` : 'Drag & Drop scanned images here'}</p>
              <p className="text-sm text-slate-500">Supports JPG, PNG, TIFF, BMP and more</p>
            </div>

            {imageFiles.length > 0 && (
              <div className="mt-6 space-y-3 max-h-60 overflow-y-auto pr-2">
                {imageFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/80 border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                        </svg>
                      </div>
                      <span className="font-medium text-slate-700 truncate text-sm">{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageFiles.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Page Size</label>
                  <select value={pageSize} onChange={e => setPageSize(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500">
                    {['A4', 'A3', 'A5', 'Letter', 'Legal'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Orientation</label>
                  <select value={orientation} onChange={e => setOrientation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500">
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>
            )}

            {imageFiles.length > 0 && (
              <button onClick={handleProcess}
                className="mt-8 w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold py-4 px-12 rounded-xl shadow-xl shadow-indigo-200 transform transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                <span>Convert to PDF</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>
              </button>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-12 bg-white/70 border border-white shadow-2xl rounded-3xl backdrop-blur-xl min-h-[400px] max-w-4xl mx-auto w-full mt-6">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-8" />
            <h3 className="text-xl font-bold text-[#1e2a52] mb-2">Creating PDF...</h3>
            <p className="text-slate-500 text-center text-sm">Converting your scanned images. Please wait.</p>
          </div>
        )}

        {isSuccess && (
          <div className="mt-6 p-10 text-center w-full max-w-4xl mx-auto bg-emerald-50 rounded-3xl border border-emerald-100 shadow-2xl min-h-[400px] flex flex-col justify-center items-center gap-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-sm border border-emerald-200">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 className="text-2xl font-extrabold text-emerald-800">PDF Created!</h3>
            <p className="text-emerald-600 font-medium">Your scanned images have been converted to PDF.</p>
            <a href={downloadUrl} download="scanned_document.pdf"
              className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download PDF
            </a>
            <button onClick={resetAll}
              className="w-full max-w-sm bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2">
              Scan More Images
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
