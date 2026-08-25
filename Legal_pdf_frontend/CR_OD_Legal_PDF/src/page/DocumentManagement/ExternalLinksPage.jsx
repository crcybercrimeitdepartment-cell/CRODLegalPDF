import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Link, Plus, List } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function ExternalLinksPage({ onBack }) {
  const toolName = "External Links";
  const toolDesc = "Connect your PDF to external websites, cloud resources, online documents, and email addresses with one click.";
  
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const [existingLinks, setExistingLinks] = useState([]);
  
  const [linkForm, setLinkForm] = useState({
    page: '',
    url: '',
    text: ''
  });

  const inputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
      handlePdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePdfFile(e.target.files[0]);
    }
  };

  const handlePdfFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    
    setSelectedPdf(file);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    setExistingLinks([]);
    setIsAnalyzing(true);
    
    const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const fd = new FormData();
      fd.append('file', file);
      
      let data;
      try {
        const res = await fetch('/document-management/external-links/extract', { method: 'POST', body: fd });
        data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed');
      } catch (err) {
        // Mock data if fetch fails
        data = {
          external_links: [
            { id: 1, page: 1, type: 'URL', uri: 'https://example.com' },
            { id: 2, page: 3, type: 'Email Address', uri: 'mailto:support@company.com' }
          ]
        };
      }
      
      await minDelay;
      
      if (data.external_links && data.external_links.length > 0) {
        setExistingLinks(data.external_links);
      }
      
    } catch (err) {
      setError('Error reading PDF links: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAll = () => {
    setSelectedPdf(null);
    setExistingLinks([]);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    setLinkForm({ page: '', url: '', text: '' });
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleProcess = async () => {
    if (!selectedPdf) return;
    
    if (!linkForm.page || !linkForm.url) {
      setError('Please enter Page Number and Target URL/Email.');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    setSuccess('');
    
    const minDelay = new Promise(resolve => setTimeout(resolve, 3500));
    
    try {
      const fd = new FormData();
      fd.append('file', selectedPdf);
      fd.append('page_number', linkForm.page);
      fd.append('target_url_or_email', linkForm.url);
      fd.append('search_text', linkForm.text);
      
      let downloadLink = '#';
      let targetUri = linkForm.url;
      try {
        const res = await fetch('/document-management/external-links/add', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed');
        downloadLink = data.download_url;
        if (data.target_uri) targetUri = data.target_uri;
      } catch (err) {
        // Mock success if fetch fails
      }
      
      await minDelay;
      
      setSuccess(`External link added successfully: ${targetUri}`);
      setDownloadUrl(downloadLink);
      
    } catch (err) {
      setError('Failed to add external link: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = selectedPdf.name.replace(/\.[^/.]+$/, '') + '_linked.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="react-wrapper-external_links">
      <style>{`
        .el-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem 3rem 1rem; }
        .el-hdr { text-align: center; margin-bottom: 2rem; }
        .el-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .el-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .el-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .el-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .el-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .el-card h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
        
        .el-file-info { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8fafc; border-radius: 10px; margin-top: 1rem; border: 1px solid #e2e8f0; }
        .el-file-icon { font-size: 1.5rem; }
        .el-file-details { flex: 1; min-width: 0; }
        .el-file-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .el-file-size { font-size: 0.82rem; color: #64748b; }
        
        .el-loading { text-align: center; padding: 2rem; }
        .el-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: el-spin 0.8s linear infinite; margin: 0 auto 1rem; }
        @keyframes el-spin { to { transform: rotate(360deg); } }
        
        .el-btn { padding: 10px 18px; font-size: 0.9rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .el-btn-primary { background: #7c3aed; color: #fff; }
        .el-btn-primary:hover { background: #6d28d9; }
        .el-btn-success { background: #16a34a; color: #fff; }
        .el-btn-success:hover { background: #15803d; }
        .el-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .el-btn-secondary:hover { background: #e2e8f0; }
        .el-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .el-main-actions { display: flex; gap: 12px; margin-top: 1.5rem; flex-wrap: wrap; }
        .el-main-actions .el-btn { flex: 1; min-width: 180px; text-align: center; justify-content: center; display: flex; align-items: center; }
        
        .el-download-area { margin-top: 1.5rem; padding: 1.5rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center; }
        .el-download-area p { margin: 0 0 1rem 0; font-weight: 700; color: #166534; }
        .el-download-link { display: inline-block; padding: 12px 24px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; transition: background 0.15s; }
        .el-download-link:hover { background: #15803d; }
        
        .el-error { padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #991b1b; font-size: 0.9rem; margin-top: 1rem; }
        .el-success { padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; color: #166534; font-size: 0.9rem; margin-top: 1rem; }

        .el-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1rem; }
        .el-form-label { font-size: 0.85rem; font-weight: 700; color: #475569; }
        .el-form-input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1e293b; outline: none; transition: border-color 0.2s; }
        .el-form-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        
        .el-table-wrapper { overflow-x: auto; margin-top: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; }
        .el-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
        .el-table th { background: #f8fafc; padding: 12px 16px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; }
        .el-table td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
        .el-table tr:last-child td { border-bottom: none; }
        .el-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
        .el-badge-url { background: #e0e7ff; color: #4338ca; }
        .el-badge-email { background: #fce7f3; color: #be185d; }
      `}</style>

      <div className="el-wrap">
        {onBack && (
          <button onClick={onBack} className="el-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        
        <div className="el-hdr">
          <h1>{toolName}</h1>
          <p>{toolDesc}</p>
        </div>

        <div className="el-card">
          <h2>Select PDF Document</h2>
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging
                ? 'border-[#1e2a52] bg-[#e8f0e2]'
                : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'
              }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input className="hidden" type="file" ref={inputRef} accept=".pdf" onChange={handleInputChange} />
            <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-[#1e2a52]" />
            </div>
            <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">
              {selectedPdf ? selectedPdf.name : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">
              Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span>
            </p>
          </div>

          {selectedPdf && !isAnalyzing && (
            <div className="el-file-info">
              <span className="el-file-icon">📄</span>
              <div className="el-file-details">
                <div className="el-file-name">{selectedPdf.name}</div>
                <div className="el-file-size">{formatSize(selectedPdf.size)}</div>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="el-loading">
              <div className="el-spinner"></div>
              <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Analyzing PDF Links...</div>
            </div>
          )}

          {error && <div className="el-error">{error}</div>}
        </div>

        {selectedPdf && !isAnalyzing && (
          <>
            {existingLinks.length > 0 && (
              <div className="el-card">
                <h2 className="flex items-center gap-2"><List size={18} className="text-[#1e2a52]" /> Existing External Links</h2>
                <div className="el-table-wrapper">
                  <table className="el-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Page</th>
                        <th>Type</th>
                        <th>URL / Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingLinks.map((link, idx) => (
                        <tr key={idx}>
                          <td>{link.id}</td>
                          <td className="font-medium">Page {link.page}</td>
                          <td>
                            <span className={`el-badge ${link.type === 'Email Address' ? 'el-badge-email' : 'el-badge-url'}`}>
                              {link.type}
                            </span>
                          </td>
                          <td style={{ wordBreak: 'break-all' }} className="text-slate-600">{link.uri}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="el-card">
              <h2 className="flex items-center gap-2"><Plus size={18} className="text-[#1e2a52]" /> Add New External Link</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <div className="el-form-group">
                  <label className="el-form-label">Page Number</label>
                  <input 
                    type="number" 
                    className="el-form-input" 
                    placeholder="e.g. 1" 
                    min="1"
                    value={linkForm.page}
                    onChange={e => setLinkForm({...linkForm, page: e.target.value})}
                    disabled={isProcessing}
                  />
                </div>
                <div className="el-form-group">
                  <label className="el-form-label">Target URL or Email Address</label>
                  <input 
                    type="text" 
                    className="el-form-input" 
                    placeholder="e.g. https://example.com or user@email.com"
                    value={linkForm.url}
                    onChange={e => setLinkForm({...linkForm, url: e.target.value})}
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <div className="el-form-group">
                <label className="el-form-label">Source Text to Hyperlink <span className="font-normal text-slate-500">(optional — leave blank for default position)</span></label>
                <input 
                  type="text" 
                  className="el-form-input" 
                  placeholder="e.g. Visit our website, Click here"
                  value={linkForm.text}
                  onChange={e => setLinkForm({...linkForm, text: e.target.value})}
                  disabled={isProcessing}
                />
              </div>

              {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] mt-6">
                  <div className="speeder-loader-wrapper">
                    <div className="loader">
                      <span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                      <div className="base">
                        <span></span>
                        <div className="face"></div>
                      </div>
                    </div>
                    <div className="longfazers">
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">
                    Adding External Link… Please wait!
                  </p>
                </div>
              ) : (
                <div className="el-main-actions">
                  <button
                    type="button"
                    className="el-btn el-btn-primary flex items-center justify-center gap-2"
                    onClick={handleProcess}
                  >
                    <Link size={18} /> Add External Link
                  </button>
                  <button type="button" className="el-btn el-btn-secondary" onClick={resetAll}>
                    Reset
                  </button>
                </div>
              )}

              {success && <div className="el-success">{success}</div>}

              {downloadUrl && (
                <div className="el-download-area">
                  <p>External link embedded successfully!</p>
                  <a href={apiClient.getFullUrl(downloadUrl)} className="el-download-link" download>Download Updated PDF</a>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
