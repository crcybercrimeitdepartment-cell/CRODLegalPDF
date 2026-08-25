import React, { useState, useRef } from 'react';
import { Upload, ArrowLeft, X, AlertCircle, FileText, CheckCircle2, Download, Plus, Trash2 } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function BookmarkManagementPage({ onBack }) {
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const inputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf')) {
        handlePdfFile(file);
      } else {
        setError('Please drop a valid PDF file.');
      }
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePdfFile(e.target.files[0]);
    }
  };

  const handlePdfFile = async (file) => {
    setSelectedPdf(file);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    setBookmarks([]);
    setIsExtracting(true);

    // Mock extraction process
    setTimeout(() => {
      setBookmarks([
        { id: 1, level: 1, title: 'Cover Page', page: 1 },
        { id: 2, level: 1, title: 'Table of Contents', page: 2 },
        { id: 3, level: 2, title: 'Introduction', page: 3 },
        { id: 4, level: 1, title: 'Main Chapter', page: 5 }
      ]);
      setIsExtracting(false);
    }, 1500);
  };

  const updateBookmark = (index, field, value) => {
    setBookmarks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const deleteBookmark = (index) => {
    setBookmarks(prev => prev.filter((_, i) => i !== index));
  };

  const addBookmark = () => {
    setBookmarks(prev => [
      ...prev,
      { id: Date.now(), level: 1, title: `New Section ${prev.length + 1}`, page: 1 }
    ]);
  };

  const handleProcess = () => {
    if (!selectedPdf) return;
    setIsProcessing(true);
    setSuccess('');
    setDownloadUrl('');
    setError('');

    setTimeout(() => {
      setIsProcessing(false);
      setSuccess('Bookmarks updated successfully!');
      setDownloadUrl('#');
    }, 2500);
  };

  const resetAll = () => {
    setSelectedPdf(null);
    setBookmarks([]);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="react-wrapper-bookmark_management">
      <style>{`
        .bkm-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem 3rem 1rem; font-family: 'Inter', sans-serif; }
        .bkm-hdr { text-align: center; margin-bottom: 2rem; }
        .bkm-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .bkm-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .bkm-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .bkm-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .bkm-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .bkm-card h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
        
        .bkm-file-info { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8fafc; border-radius: 10px; margin-top: 1rem; border: 1px solid #e2e8f0; }
        .bkm-file-icon { font-size: 1.5rem; }
        .bkm-file-details { flex: 1; }
        .bkm-file-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
        .bkm-file-size { font-size: 0.82rem; color: #64748b; }
        
        .bkm-table-container { max-height: 450px; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 1.5rem; -webkit-overflow-scrolling: touch; }
        .bkm-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 600px; }
        .bkm-table th { background: #f8fafc; text-align: left; padding: 12px 16px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
        .bkm-table td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; vertical-align: middle; }
        
        .bkm-input { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; font-family: inherit; transition: border-color 0.2s; }
        .bkm-input:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1); }
        
        .bkm-btn { padding: 10px 18px; font-size: 0.9rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 8px; justify-content: center; }
        .bkm-btn-primary { background: #7c3aed; color: #fff; }
        .bkm-btn-primary:hover { background: #6d28d9; }
        .bkm-btn-success { background: #16a34a; color: #fff; }
        .bkm-btn-success:hover { background: #15803d; }
        .bkm-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .bkm-btn-secondary:hover { background: #e2e8f0; }
        .bkm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .bkm-loading { text-align: center; padding: 3rem 1rem; }
        .bkm-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #7c3aed; border-radius: 50%; animation: bkm-spin 0.8s linear infinite; margin: 0 auto 1rem; }
        @keyframes bkm-spin { to { transform: rotate(360deg); } }

        /* Custom Blue Loader Overrides to match AddAttachments */
        .react-wrapper-bookmark_management .loader > span,
        .react-wrapper-bookmark_management .loader > span > span,
        .react-wrapper-bookmark_management .face,
        .react-wrapper-bookmark_management .face:after,
        .react-wrapper-bookmark_management .base span:before,
        .react-wrapper-bookmark_management .longfazers span {
          background: #7c3aed !important;
        }
        .react-wrapper-bookmark_management .base span,
        .react-wrapper-bookmark_management .base span:after {
          border-right-color: #7c3aed !important;
        }
      `}</style>

      <div className="bkm-wrap">
        {onBack && (
          <button onClick={onBack} className="bkm-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="bkm-hdr">
          <h1>Bookmark Management</h1>
          <p>Create, edit, organize, rename, reorder, and delete PDF outline bookmarks easily.</p>
        </div>

        <div className="bkm-card">
          {!selectedPdf ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging
                ? 'border-[#7c3aed] bg-[#f5f3ff] scale-[1.01]'
                : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'
                }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleInputChange}
              />
              <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-[#1e2a52]" />
              </div>
              <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">
                Drop PDF file here or click to browse
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span>
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ margin: 0, padding: 0, border: 'none' }}>Selected Document</h2>
                {!isProcessing && !success && (
                  <button onClick={resetAll} className="bkm-btn bkm-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Change File
                  </button>
                )}
              </div>
              
              <div className="bkm-file-info">
                <div className="bkm-file-icon">
                  <FileText className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <div className="bkm-file-details">
                  <div className="bkm-file-name">{selectedPdf.name}</div>
                  <div className="bkm-file-size">{formatSize(selectedPdf.size)}</div>
                </div>
              </div>

              {isExtracting ? (
                <div className="bkm-loading">
                  <div className="bkm-spinner"></div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Extracting bookmarks...</div>
                </div>
              ) : (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, padding: 0, border: 'none' }}>Bookmarks Structure Tree</h2>
                    <button onClick={addBookmark} className="bkm-btn bkm-btn-secondary" style={{ color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                      <Plus size={16} /> Add New Bookmark
                    </button>
                  </div>

                  <div className="bkm-table-container">
                    <table className="bkm-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th style={{ width: '120px' }}>Level</th>
                          <th>Bookmark Title</th>
                          <th style={{ width: '120px' }}>Target Page</th>
                          <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookmarks.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                              No bookmarks found. Click "Add New Bookmark" to create one.
                            </td>
                          </tr>
                        ) : (
                          bookmarks.map((bm, idx) => (
                            <tr key={bm.id || idx}>
                              <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                              <td>
                                <select 
                                  className="bkm-input" 
                                  value={bm.level} 
                                  onChange={(e) => updateBookmark(idx, 'level', parseInt(e.target.value))}
                                >
                                  <option value="1">Level 1</option>
                                  <option value="2">Level 2</option>
                                  <option value="3">Level 3</option>
                                </select>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{ display: 'inline-block', width: `${(bm.level - 1) * 20}px` }}></span>
                                  <input 
                                    type="text" 
                                    className="bkm-input" 
                                    value={bm.title} 
                                    onChange={(e) => updateBookmark(idx, 'title', e.target.value)} 
                                  />
                                </div>
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="bkm-input" 
                                  min="1" 
                                  value={bm.page} 
                                  onChange={(e) => updateBookmark(idx, 'page', parseInt(e.target.value))} 
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  onClick={() => deleteBookmark(idx)} 
                                  style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!success && !isProcessing && (
                    <div style={{ marginTop: '2rem' }}>
                      <button onClick={handleProcess} className="bkm-btn bkm-btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }}>
                        Save Updated Bookmarks PDF
                      </button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex flex-col items-center justify-center p-8 mt-6 bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl overflow-hidden relative min-h-[160px]">
                      <div className="speeder-loader-wrapper">
                        <div className="loader">
                          <span><span></span><span></span><span></span><span></span></span>
                          <div className="base"><span></span><div className="face"></div></div>
                        </div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-sm font-bold text-[#6d28d9] mt-4 animate-pulse">
                        Saving bookmarks… Please wait!
                      </p>
                    </div>
                  )}

                  {success && (
                    <div className="mt-8 space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
                        <CheckCircle2 className="w-6 h-6" />
                        {success}
                      </div>
                      <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a
                          href={apiClient.getFullUrl(downloadUrl)}
                          download
                          className="bkm-btn bkm-btn-success"
                          style={{ padding: '14px 24px', fontSize: '1.05rem', textDecoration: 'none' }}
                        >
                          <Download size={20} /> Download Updated PDF
                        </a>
                        <button
                          onClick={resetAll}
                          className="bkm-btn bkm-btn-secondary"
                          style={{ padding: '14px 24px', fontSize: '1.05rem' }}
                        >
                          Process Another File
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
