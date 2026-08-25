import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function AIContentSimilarityCheckPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'AI Content Similarity Check';
  const toolDesc = tool?.description || 'Analyze text similarity between sections of your PDF document.';
  
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
      setFiles(prev => [...prev, ...valid]);
      setIsDone(false);
      setResult(null);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };
  
  const handleRemove = (idx) => { 
    setFiles(prev => prev.filter((_, i) => i !== idx)); 
    if (files.length <= 1) { setIsDone(false); setResult(null); }
    setError(''); 
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    setError('');
    setResult(null);

    const fd = new FormData();
    fd.append('file', files[0].originalFile);

    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/similarity-check/analyze`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (j.success) {
        setResult(j);
        setIsDone(true);
      } else {
        setError(j.error || 'Analysis failed');
        setIsDone(false);
      }
    } catch (ex) {
      setError('Error: ' + ex.message);
      setIsDone(false);
    } finally {
      setIsProcessing(false);
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

      {/* Upload Card */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10">
          
          {!isDone && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-[#1e2a52] bg-[#e8f0e2]' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
              >
                <input ref={inputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleFileChange} />
                <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop files here or click to browse</p>
                <p className="text-xs sm:text-sm text-slate-500">Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span></p>
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-6 space-y-2.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1e2a52]/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#1e2a52]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400">{file.size}</p>
                      </div>
                      <button onClick={() => handleRemove(idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Action area */}
              {files.length > 0 && (
                <div className="mt-8 text-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Processing {toolName}… Please wait!</p>
                    </div>
                  ) : (
                    <button onClick={handleProcess} className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-10 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95">
                      {`Start ${toolName}`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result Area */}
          {isDone && result && (
            <div className="w-full text-left">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm mb-6">
                <CheckCircle2 className="w-5 h-5" />
                Done! Analysis complete.
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-6">Similarity Analysis</h2>
              
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 text-center mb-6">
                <div className="text-4xl font-extrabold text-indigo-900">{result.overall_similarity}%</div>
                <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mt-1">Overall Similarity</div>
                <div className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  result.similarity_level === 'Low' ? 'bg-yellow-100 text-yellow-800' :
                  result.similarity_level === 'Medium' ? 'bg-orange-100 text-orange-800' :
                  result.similarity_level === 'High' ? 'bg-red-100 text-red-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {result.similarity_level}
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  Chunks analyzed: {result.total_chunks_analyzed} | Similar pairs found: {result.total_similar_pairs}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Similar Sections</h3>
                {result.total_similar_pairs === 0 ? (
                  <div className="text-center p-8 text-slate-500">No significant similarity detected between document sections.</div>
                ) : (
                  (result.similar_sections || []).map((s, idx) => (
                    <div key={idx} className="p-4 bg-white border border-slate-200 rounded-lg mb-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                        <div className="font-bold text-indigo-700">{s.similarity}% similar</div>
                        <div className="text-sm text-slate-500 font-medium">Page {s.chunk_a.page} &harr; Page {s.chunk_b.page}</div>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500 mb-3">
                        <span>Cosine: {s.cosine}%</span>
                        <span>Jaccard: {s.jaccard}%</span>
                      </div>
                      <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 italic">
                        {s.chunk_a.preview.substring(0, 120)}...
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {result.disclaimer && (
                <div className="mt-6 text-xs text-slate-500 text-center italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {result.disclaimer}
                </div>
              )}

              <div className="mt-8 flex justify-center gap-4">
                <button onClick={() => { setIsDone(false); setFiles([]); setResult(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer hover:scale-105">
                  Analyze Another File
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
