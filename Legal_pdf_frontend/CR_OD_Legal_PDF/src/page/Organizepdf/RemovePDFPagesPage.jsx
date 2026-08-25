import React, { useState, useRef, useCallback } from 'react';
import { uploadFiles } from '../../api/apiClient';

export default function RemovePDFPagesPage() {
    const [files, setFiles] = useState([]);
    const [pagesToRemove, setPagesToRemove] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const fileInputRef = useRef(null);

    const handleFiles = (newFiles) => {
        const fileArray = Array.from(newFiles).filter(file => file.type === 'application/pdf');
        if (fileArray.length > 0) {
            setFiles(prev => [...prev, ...fileArray]);
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, []);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const removeFile = (indexToRemove) => {
        setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleRemove = async () => {
        if (files.length === 0) {
            setErrorMsg("Please select a PDF file to process.");
            return;
        }

        if (!pagesToRemove.trim()) {
            setErrorMsg("Please specify the pages to remove (e.g. 1,3,5-8).");
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);

        const formData = new FormData();
        formData.append('file', files[0]); // backend route expects 'file'
        formData.append('pages', pagesToRemove); // backend route expects 'pages'

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || '';
            // pages is a query parameter in the backend
            const response = await fetch(`${API_BASE_URL}/api/pdf/remove?pages=${encodeURIComponent(pagesToRemove)}`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                let errMsg = `Error: ${response.status}`;
                try { const e = await response.json(); errMsg = e.detail || errMsg; } catch(_){}
                throw new Error(errMsg);
            }
            const data = await response.json();
            if (data.download_url) {
                const fileRes = await fetch(`${API_BASE_URL}${data.download_url}`);
                if (!fileRes.ok) throw new Error('Failed to download result');
                const blob = await fileRes.blob();
                const url = window.URL.createObjectURL(blob);
                setDownloadUrl(url);
                setIsSuccess(true);
            } else {
                throw new Error("No download URL returned.");
            }
        } catch (error) {
            setErrorMsg(error.message || "An error occurred during processing.");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetApp = () => {
        setFiles([]);
        setPagesToRemove("");
        setIsProcessing(false);
        setIsSuccess(false);
        setErrorMsg(null);
        if (downloadUrl) {
            window.URL.revokeObjectURL(downloadUrl);
            setDownloadUrl(null);
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 flex flex-col items-center">
            {/* Background Decorative Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            
            <div className="w-full max-w-4xl relative z-10">
                <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
                    <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
                        Remove Pages
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        Remove specific pages from a PDF document.
                    </p>
                </div>

                {!isProcessing && !isSuccess && (
                    <div id="mainUI" className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-10 relative overflow-hidden transition-all duration-500 max-w-4xl mx-auto w-full">
                        {errorMsg && (
                            <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-lg">
                                {errorMsg}
                            </div>
                        )}

                        <div 
                            className={`upload-zone relative border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${isDragOver ? 'border-indigo-500 bg-indigo-100 scale-[1.01]' : 'border-indigo-200 bg-indigo-50/30'} hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-inner group`}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input 
                                type="file" 
                                accept=".pdf" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={(e) => {
                                    if(e.target.files.length) handleFiles(e.target.files);
                                }}
                            />
                            <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-translate-y-1">
                                <svg className="w-10 h-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <p className="drop-text text-xl font-bold text-slate-800 mb-2 transition-colors group-hover:text-indigo-900">
                                {files.length > 0 ? `${files.length} File(s) selected` : 'Drag & Drop your PDF here'}
                            </p>
                            <p className="text-sm text-slate-500">or <span className="font-semibold text-indigo-600 group-hover:underline">click to browse</span> file</p>
                        </div>
                        
                        {files.length > 0 && (
                            <div className="file-list mt-6 space-y-3">
                                {files.map((file, idx) => (
                                    <div key={idx} className="file-item flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                            </div>
                                            <span className="font-medium text-slate-700 truncate">{file.name}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0" title="Remove file">
                                            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-group bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100 mb-6 mt-6">
                            <label htmlFor="pages" className="block text-sm font-bold text-indigo-900 mb-2">Pages to remove</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    id="pages" 
                                    value={pagesToRemove}
                                    onChange={(e) => setPagesToRemove(e.target.value)}
                                    placeholder="e.g. 1,3,5-8" 
                                    className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-all text-slate-800 font-medium" 
                                />
                            </div>
                            <div className="hint text-sm text-slate-500 mt-2 font-medium">Comma-separated pages or ranges (e.g. 1,3,5-8).</div>
                        </div>

                        <div className="text-center mt-8">
                            <button 
                                onClick={handleRemove} 
                                disabled={files.length === 0 || !pagesToRemove.trim() || isProcessing}
                                className="btn btn-primary bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white px-12 py-4 rounded-xl font-bold shadow-xl shadow-indigo-200 transition-all text-base cursor-pointer inline-flex items-center justify-center gap-3 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none w-full sm:w-auto group"
                            >
                                <span className="btn-text transition-all duration-500">Remove Pages Now</span>
                                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div id="processingUI" className="flex flex-col items-center justify-center p-12 bg-indigo-50/50 border border-indigo-100 rounded-2xl mt-6 backdrop-blur-sm">
                        <div className="speeder-loader-wrapper mb-8">
                            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-lg font-bold text-indigo-800 mt-6 animate-pulse" id="processingText">
                            Removing pages from document...
                        </p>
                        <p className="text-sm text-indigo-500/80 mt-2">Please do not close this window</p>
                    </div>
                )}

                {isSuccess && (
                    <div id="successUI" className="mt-8 p-10 text-center space-y-6 w-full bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
                        
                        <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-sm border border-emerald-200 animate-bounce">
                                <svg className="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            </div>
                            <h3 className="text-2xl font-extrabold text-emerald-800">Success!</h3>
                            <p className="text-emerald-600 font-medium">Your updated PDF is ready to download.</p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-3">
                            <a href={downloadUrl} download="Edited_PDF.pdf" className="relative z-10 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all text-base cursor-pointer hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto">
                                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                Download Edited PDF
                            </a>
                            <button onClick={resetApp} className="w-full sm:w-auto text-slate-600 hover:text-slate-800 font-medium underline relative z-10 p-2">
                                Remove pages from another PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
