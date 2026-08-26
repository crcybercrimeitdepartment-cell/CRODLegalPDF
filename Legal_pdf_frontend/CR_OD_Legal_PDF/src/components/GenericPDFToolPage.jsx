import React, { useState, useRef, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';

/**
 * Generic PDF Tool Page component.
 * Handles upload → API call → download flow for simple single-file PDF tools.
 *
 * Props:
 *   toolName: string - Display name (e.g., "Extract PDF Pages")
 *   toolDesc: string - Short description
 *   apiEndpoint: string - Full API endpoint path (e.g., "/api/pdf/extract")
 *   queryParams: object - Optional query params to append (e.g., { pages: "1,3,5" })
 *   extraFormFields: function(state) - optional function returning JSX for extra form fields
 *   getExtraData: function() - returns { key: value } pairs to add to FormData OR query string
 *   outputFilename: string - suggested download filename
 *   outputExt: string - file extension for download (e.g., ".pdf", ".zip")
 *   multipleFiles: boolean - allow multiple file uploads
 *   acceptedType: string - MIME accept (default ".pdf")
 *   onBack: function
 */
export default function GenericPDFToolPage({
  toolName,
  toolDesc,
  apiEndpoint,
  getQueryParams,        // function(formState) => { split_every: 3 } - appended as ?key=val
  getFormData,           // function(file, formState) => FormData with extra fields
  extraFields,           // function({ formState, setFormState }) => JSX
  outputFilename,
  outputExt = '.pdf',
  multipleFiles = false,
  acceptedType = '.pdf',
  onBack,
}) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [formState, setFormState] = useState({});

  const fileInputRef = useRef(null);

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles).filter(f =>
      acceptedType === '.pdf'
        ? f.type === 'application/pdf'
        : true
    );
    if (fileArray.length > 0) {
      setFiles(multipleFiles ? prev => [...prev, ...fileArray] : [fileArray[0]]);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleProcess = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select a file to process.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Build FormData
      let formData;
      if (getFormData) {
        formData = getFormData(files, formState);
      } else {
        formData = new FormData();
        if (multipleFiles) {
          files.forEach(f => formData.append('files', f));
        } else {
          formData.append('file', files[0]);
        }
      }

      // Build query string
      let url = `${API_BASE_URL}${apiEndpoint}`;
      if (getQueryParams) {
        const params = getQueryParams(formState);
        const qs = new URLSearchParams(params).toString();
        if (qs) url += `?${qs}`;
      }

      const response = await fetch(url, { method: 'POST', body: formData });

      if (!response.ok) {
        let errMsg = `Server error: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
          if (typeof errMsg !== 'string') errMsg = JSON.stringify(errMsg);
        } catch (_) { }
        throw new Error(errMsg);
      }

      const contentType = response.headers.get('content-type') || '';

      let dlUrl;
      if (contentType.includes('application/json')) {
        // JSON response with a download_url field
        const data = await response.json();
        const downloadPath = data.download_url || data.zip_url || data.url;
        if (!downloadPath) throw new Error('No download URL in response');

        const fileRes = await fetch(`${API_BASE_URL}${downloadPath}`);
        if (!fileRes.ok) throw new Error('Failed to download processed file');
        const blob = await fileRes.blob();
        dlUrl = window.URL.createObjectURL(blob);
      } else {
        // Direct file response
        const blob = await response.blob();
        dlUrl = window.URL.createObjectURL(blob);
      }

      setDownloadUrl(dlUrl);
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
    setFiles([]);
    setIsProcessing(false);
    setIsSuccess(false);
    setErrorMsg(null);
    setDownloadUrl(null);
  };

  const dlFilename = outputFilename
    ? outputFilename
    : files.length > 0
      ? files[0].name.replace(/\.[^/.]+$/, '') + '_output' + outputExt
      : `output${outputExt}`;

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 flex flex-col items-center">
      {/* Background decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mt-4 mb-8 px-4">
          <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
            {toolName}
          </h1>
          {toolDesc && (
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{toolDesc}</p>
          )}
        </div>

        {/* Main Card */}
        {!isProcessing && !isSuccess && (
          <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-10 max-w-4xl mx-auto w-full">
            {errorMsg && (
              <div className="mb-5 p-4 text-red-700 bg-red-50 border border-red-200 rounded-xl text-sm font-medium flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-100 scale-[1.01]'
                  : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-inner'
              } group`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                multiple={multipleFiles}
                accept={acceptedType}
                className="hidden"
                ref={fileInputRef}
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
              />
              <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-translate-y-1">
                <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-900">
                {files.length > 0 ? `${files.length} File(s) selected` : 'Drag & Drop your PDF here'}
              </p>
              <p className="text-sm text-slate-500">
                or <span className="font-semibold text-indigo-600 group-hover:underline">click to browse</span> files
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="overflow-hidden">
                        <span className="font-medium text-slate-700 truncate block text-sm">{file.name}</span>
                        <span className="text-xs text-slate-400">
                          {file.size < 1024 * 1024 ? (file.size / 1024).toFixed(0) + ' KB' : (file.size / (1024 * 1024)).toFixed(2) + ' MB'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeFile(idx); }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Extra Fields */}
            {extraFields && files.length > 0 && (
              <div className="mt-6">
                {extraFields({ formState, setFormState })}
              </div>
            )}

            {/* Submit Button */}
            <div className="text-center mt-8">
              <button
                onClick={handleProcess}
                disabled={files.length === 0}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-4 px-12 rounded-xl shadow-xl shadow-indigo-200 transform transition-all duration-300 flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
              >
                <span>Process {toolName}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-12 bg-white/70 border border-white shadow-2xl rounded-3xl backdrop-blur-xl min-h-[400px] max-w-4xl mx-auto w-full mt-6">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8" />
            <h3 className="text-xl font-bold text-[#1e2a52] mb-2">Processing {toolName}…</h3>
            <p className="text-slate-500 text-center text-sm">This might take a moment. Please wait.</p>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div className="mt-6 p-10 text-center space-y-6 w-full max-w-4xl mx-auto bg-emerald-50 rounded-3xl border border-emerald-100 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col justify-center items-center">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />

            <div className="flex flex-col items-center justify-center gap-4 relative z-10 w-full max-w-sm">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-sm border border-emerald-200">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-emerald-800">Done!</h3>
              <p className="text-emerald-600 font-medium mb-4">Your file is ready to download.</p>

              <a
                href={downloadUrl}
                download={dlFilename}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex justify-center items-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download File
              </a>

              <button
                onClick={resetApp}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 mt-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Process Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
