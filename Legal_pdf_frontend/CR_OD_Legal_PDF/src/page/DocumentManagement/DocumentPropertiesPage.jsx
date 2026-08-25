import React, { useState, useRef } from 'react';
import { Upload, ArrowLeft, AlertCircle, FileText, CheckCircle, Shield, FileOutput, ShieldAlert, ShieldCheck, Printer, Copy, Edit3, MessageSquare, FormInput, Accessibility, Type, BarChart2, Settings, Download, X } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function DocumentPropertiesPage({ onBack }) {
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const [editForm, setEditForm] = useState({ title: '', author: '', subject: '', keywords: '' });

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

  const handlePdfFile = (file) => {
    setSelectedPdf(file);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    setAnalysisData(null);
    setIsAnalyzing(true);

    // Mock analysis process
    setTimeout(() => {
      const mockData = {
        file_info: {
          filename: file.name,
          file_size_human: formatSize(file.size),
          mime_type: 'application/pdf',
          page_count: 5,
          pdf_version: '1.7'
        },
        metadata: {
          title: 'Legal Contract 2024',
          author: 'John Doe',
          subject: 'Confidentiality Agreement',
          keywords: 'legal, contract, nda',
          creator: 'Microsoft Word',
          producer: 'Adobe PDF Library 15.0',
          creation_date: '2023-10-01 10:00:00',
          mod_date: '2023-10-05 14:30:00',
          format: 'PDF 1.7'
        },
        security: {
          is_encrypted: false,
          password_protected: false,
          encryption_method: 'None',
          key_length: 'N/A',
          details: 'Standard security. Document is fully accessible.'
        },
        permissions: {
          printing: true,
          copying: true,
          modifying: false,
          annotating: true,
          form_filling: true,
          accessibility: true,
          details: 'Document has standard permissions. Modification is restricted.'
        },
        fonts: {
          total_fonts: 2,
          fonts: [
            { name: 'ArialMT', type: 'TrueType', encoding: 'WinAnsiEncoding', pages: [1, 2] },
            { name: 'TimesNewRomanPSMT', type: 'Type1', encoding: 'MacRomanEncoding', pages: [3, 4, 5] }
          ]
        },
        statistics: {
          total_pages: 5,
          text_pages: 4,
          image_pages: 1,
          total_images: 3,
          has_table_of_contents: true
        }
      };

      setAnalysisData(mockData);
      setEditForm({
        title: mockData.metadata.title,
        author: mockData.metadata.author,
        subject: mockData.metadata.subject,
        keywords: mockData.metadata.keywords
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleSaveMetadata = () => {
    if (!selectedPdf) return;
    setIsSaving(true);
    setSuccess('');
    setDownloadUrl('');

    // Mock saving process
    setTimeout(() => {
      setIsSaving(false);
      setSuccess('PDF metadata updated successfully!');
      setDownloadUrl('#'); // Mock download url
    }, 2000);
  };

  const resetAll = () => {
    setSelectedPdf(null);
    setAnalysisData(null);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const Field = ({ label, value, emptyState }) => (
    <div className="dp-field">
      <div className="dp-field-label">{label}</div>
      <div className={`dp-field-value ${emptyState ? 'empty' : ''}`}>{value || 'N/A'}</div>
    </div>
  );

  const PermItem = ({ label, status, icon: Icon }) => {
    let statusClass = 'unknown';
    let statusText = 'Unknown';
    if (status === true) { statusClass = 'allowed'; statusText = 'Allowed'; }
    else if (status === false) { statusClass = 'denied'; statusText = 'Denied'; }

    return (
      <div className="dp-perm-item">
        <Icon size={16} className="text-[#1e2a52] shrink-0" />
        <span className="dp-perm-label">{label}</span>
        <span className={`dp-perm-status ${statusClass}`}>{statusText}</span>
      </div>
    );
  };

  return (
    <div className="react-wrapper-document_properties">
      <style>{`
        .dp-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem 3rem 1rem; font-family: 'Inter', sans-serif; }
        .dp-hdr { text-align: center; margin-bottom: 2rem; }
        .dp-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .dp-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .dp-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .dp-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .dp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .dp-card h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0 0 1.25rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #f1f5f9; display: flex; align-items: center; gap: 8px; }
        
        .dp-file-info { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .dp-file-icon { font-size: 1.5rem; flex-shrink: 0; }
        .dp-file-details { flex: 1; min-width: 0; }
        .dp-file-name { font-weight: 700; color: #1e293b; font-size: 1rem; margin-bottom: 4px; word-break: break-all; }
        .dp-file-size { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        
        .dp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
        @media (max-width: 600px) { .dp-grid { grid-template-columns: 1fr; } }
        
        .dp-field { padding: 12px 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; transition: all 0.2s; min-width: 0; }
        .dp-field:hover { border-color: #e2e8f0; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .dp-field-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .dp-field-value { font-size: 0.95rem; font-weight: 600; color: #0f172a; word-break: break-word; }
        .dp-field-value.empty { color: #94a3b8; font-style: italic; font-weight: 400; }

        .dp-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; border: 1px solid transparent; }
        .dp-status-badge.safe { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
        .dp-status-badge.warning { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .dp-status-badge.danger { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

        .dp-perm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
        .dp-perm-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; }
        .dp-perm-label { font-weight: 600; color: #334155; }
        .dp-perm-status { font-weight: 800; font-size: 0.82rem; margin-left: auto; text-transform: uppercase; }
        .dp-perm-status.allowed { color: #16a34a; }
        .dp-perm-status.denied { color: #dc2626; }
        .dp-perm-status.unknown { color: #94a3b8; }

        .dp-font-table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
        .dp-font-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 500px; }
        .dp-font-table th { text-align: left; padding: 12px 16px; background: #f8fafc; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
        .dp-font-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .dp-font-table tr:hover td { background: #f8fafc; }
        
        .dp-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
        .dp-stat-box { text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .dp-stat-number { font-size: 1.8rem; font-weight: 800; color: #7c3aed; }
        .dp-stat-label { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px; }

        .dp-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 1.5rem; }
        @media (max-width: 600px) { .dp-form-grid { grid-template-columns: 1fr; } }
        .dp-form-label { display: block; font-weight: 700; font-size: 0.85rem; color: #334155; margin-bottom: 6px; }
        .dp-form-input { width: 100%; padding: 10px 14px; font-size: 0.95rem; font-weight: 500; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; transition: all 0.2s; }
        .dp-form-input:focus { border-color: #7c3aed; outline: none; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }

        .dp-btn { padding: 12px 24px; font-size: 0.95rem; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; justify-content: center; white-space: nowrap; }
        .dp-btn-primary { background: #7c3aed; color: #fff; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2); }
        .dp-btn-primary:hover { background: #6d28d9; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3); }
        .dp-btn-primary:disabled { background: #c4b5fd; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .dp-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .dp-btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
        
        .dp-btn-success { background: #16a34a; color: #fff; text-decoration: none; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2); }
        .dp-btn-success:hover { background: #15803d; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22, 163, 74, 0.3); }

        .dp-loading { text-align: center; padding: 3rem 1rem; }
        .dp-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #7c3aed; border-radius: 50%; animation: dp-spin 0.8s linear infinite; margin: 0 auto 1rem; }
        @keyframes dp-spin { to { transform: rotate(360deg); } }

        /* Loader Overrides */
        .react-wrapper-document_properties .loader > span,
        .react-wrapper-document_properties .loader > span > span,
        .react-wrapper-document_properties .face,
        .react-wrapper-document_properties .face:after,
        .react-wrapper-document_properties .base span:before,
        .react-wrapper-document_properties .longfazers span {
          background: #7c3aed !important;
        }
        .react-wrapper-document_properties .base span,
        .react-wrapper-document_properties .base span:after {
          border-right-color: #7c3aed !important;
        }
      `}</style>

      <div className="dp-wrap">
        {onBack && (
          <button onClick={onBack} className="dp-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="dp-hdr">
          <h1>Document Properties</h1>
          <p>View comprehensive PDF properties, inspect metadata, security, fonts, and statistics. Edit metadata and save changes.</p>
        </div>

        {!selectedPdf ? (
          <div className="dp-card">
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
            
            {error && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="dp-file-info">
              <div className="dp-file-icon">
                <FileText className="w-8 h-8 text-[#1e2a52]" />
              </div>
              <div className="dp-file-details">
                <div className="dp-file-name">{selectedPdf.name}</div>
                <div className="dp-file-size">{formatSize(selectedPdf.size)}</div>
              </div>
              {!isAnalyzing && !isSaving && !success && (
                <button onClick={resetAll} className="dp-btn dp-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Change File
                </button>
              )}
            </div>

            {isAnalyzing ? (
              <div className="dp-card dp-loading">
                <div className="dp-spinner"></div>
                <div className="text-slate-600 font-medium">Analyzing document properties...</div>
              </div>
            ) : analysisData ? (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                
                {/* General Info */}
                <div className="dp-card">
                  <h2><FileText size={20} className="text-[#1e2a52]" /> General Information</h2>
                  <div className="dp-grid">
                    <Field label="File Name" value={analysisData.file_info.filename} />
                    <Field label="File Size" value={analysisData.file_info.file_size_human} />
                    <Field label="MIME Type" value={analysisData.file_info.mime_type} />
                    <Field label="Page Count" value={analysisData.file_info.page_count} />
                    <Field label="PDF Version" value={analysisData.file_info.pdf_version} />
                  </div>
                </div>

                {/* Metadata */}
                <div className="dp-card">
                  <h2><FormInput size={20} className="text-[#1e2a52]" /> Document Metadata</h2>
                  <div className="dp-grid">
                    <Field label="Title" value={analysisData.metadata.title} emptyState={!analysisData.metadata.title} />
                    <Field label="Author" value={analysisData.metadata.author} emptyState={!analysisData.metadata.author} />
                    <Field label="Subject" value={analysisData.metadata.subject} emptyState={!analysisData.metadata.subject} />
                    <Field label="Keywords" value={analysisData.metadata.keywords} emptyState={!analysisData.metadata.keywords} />
                    <Field label="Creator" value={analysisData.metadata.creator} emptyState={!analysisData.metadata.creator} />
                    <Field label="Producer" value={analysisData.metadata.producer} emptyState={!analysisData.metadata.producer} />
                    <Field label="Creation Date" value={analysisData.metadata.creation_date} emptyState={!analysisData.metadata.creation_date} />
                    <Field label="Modification Date" value={analysisData.metadata.mod_date} emptyState={!analysisData.metadata.mod_date} />
                    <Field label="Format" value={analysisData.metadata.format} emptyState={!analysisData.metadata.format} />
                  </div>
                </div>

                {/* Security */}
                <div className="dp-card">
                  <h2><Shield size={20} className="text-[#1e2a52]" /> Security Information</h2>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {analysisData.security.is_encrypted ? (
                      <span className="dp-status-badge danger"><ShieldAlert size={16} /> Encrypted</span>
                    ) : (
                      <span className="dp-status-badge safe"><ShieldCheck size={16} /> Not Encrypted</span>
                    )}
                    
                    {analysisData.security.password_protected ? (
                      <span className="dp-status-badge warning"><ShieldAlert size={16} /> Password Protected</span>
                    ) : (
                      <span className="dp-status-badge safe"><ShieldCheck size={16} /> No Password</span>
                    )}
                  </div>
                  <div className="dp-grid">
                    <Field label="Encryption Method" value={analysisData.security.encryption_method} />
                    <Field label="Key Length" value={analysisData.security.key_length} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {analysisData.security.details}
                  </p>
                </div>

                {/* Permissions */}
                <div className="dp-card">
                  <h2><ShieldCheck size={20} className="text-[#1e2a52]" /> Document Permissions</h2>
                  <div className="dp-perm-grid">
                    <PermItem label="Printing" status={analysisData.permissions.printing} icon={Printer} />
                    <PermItem label="Copying/Extraction" status={analysisData.permissions.copying} icon={Copy} />
                    <PermItem label="Modifying" status={analysisData.permissions.modifying} icon={Edit3} />
                    <PermItem label="Annotating" status={analysisData.permissions.annotating} icon={MessageSquare} />
                    <PermItem label="Form Filling" status={analysisData.permissions.form_filling} icon={FormInput} />
                    <PermItem label="Accessibility" status={analysisData.permissions.accessibility} icon={Accessibility} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {analysisData.permissions.details}
                  </p>
                </div>

                {/* Fonts */}
                <div className="dp-card">
                  <h2><Type size={20} className="text-[#1e2a52]" /> Font Information</h2>
                  <p className="text-sm font-bold text-slate-600 mb-4 bg-slate-50 inline-block px-3 py-1 rounded-full border border-slate-200">
                    Total fonts found: {analysisData.fonts.total_fonts || 0}
                  </p>
                  
                  {analysisData.fonts.fonts && analysisData.fonts.fonts.length > 0 ? (
                    <div className="dp-font-table-wrap">
                      <table className="dp-font-table">
                        <thead>
                          <tr>
                            <th>Font Name</th>
                            <th>Type</th>
                            <th>Encoding</th>
                            <th>Pages</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.fonts.fonts.map((f, i) => (
                            <tr key={i}>
                              <td className="font-semibold text-[#1e2a52]">{f.name}</td>
                              <td>{f.type}</td>
                              <td>{f.encoding}</td>
                              <td className="text-slate-500 text-xs">{f.pages ? f.pages.join(', ') : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 font-medium">
                      No font information available.
                    </div>
                  )}
                </div>

                {/* Statistics */}
                <div className="dp-card">
                  <h2><BarChart2 size={20} className="text-[#1e2a52]" /> Document Statistics</h2>
                  <div className="dp-stat-grid">
                    <div className="dp-stat-box">
                      <div className="dp-stat-number">{analysisData.statistics.total_pages}</div>
                      <div className="dp-stat-label">Total Pages</div>
                    </div>
                    <div className="dp-stat-box">
                      <div className="dp-stat-number">{analysisData.statistics.text_pages}</div>
                      <div className="dp-stat-label">Text Pages</div>
                    </div>
                    <div className="dp-stat-box">
                      <div className="dp-stat-number">{analysisData.statistics.image_pages}</div>
                      <div className="dp-stat-label">Image Pages</div>
                    </div>
                    <div className="dp-stat-box">
                      <div className="dp-stat-number">{analysisData.statistics.total_images}</div>
                      <div className="dp-stat-label">Total Images</div>
                    </div>
                  </div>
                </div>

                {/* Edit Metadata */}
                {!success && !isSaving && (
                  <div className="dp-card">
                    <h2><Settings size={20} className="text-[#1e2a52]" /> Edit Metadata</h2>
                    <p className="text-sm text-slate-600 mb-2">Update title, author, subject, and keywords. Changes will be saved to a new PDF file.</p>
                    
                    <div className="dp-form-grid">
                      <div>
                        <label className="dp-form-label">Title</label>
                        <input 
                          type="text" 
                          className="dp-form-input" 
                          placeholder="Document title"
                          value={editForm.title}
                          onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="dp-form-label">Author</label>
                        <input 
                          type="text" 
                          className="dp-form-input" 
                          placeholder="Author name"
                          value={editForm.author}
                          onChange={(e) => setEditForm({...editForm, author: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="dp-form-label">Subject</label>
                        <input 
                          type="text" 
                          className="dp-form-input" 
                          placeholder="Document subject"
                          value={editForm.subject}
                          onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="dp-form-label">Keywords</label>
                        <input 
                          type="text" 
                          className="dp-form-input" 
                          placeholder="keyword1, keyword2, keyword3"
                          value={editForm.keywords}
                          onChange={(e) => setEditForm({...editForm, keywords: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-8">
                      <button onClick={resetAll} className="dp-btn dp-btn-secondary w-full sm:w-auto flex-1">
                        Cancel / Reset
                      </button>
                      <button onClick={handleSaveMetadata} className="dp-btn dp-btn-primary w-full sm:w-auto flex-[2]">
                        <FileOutput size={18} /> Save Changes & Generate PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {isSaving && (
                  <div className="dp-card">
                    <div className="flex flex-col items-center justify-center p-8 bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl overflow-hidden relative min-h-[160px]">
                      <div className="speeder-loader-wrapper">
                        <div className="loader">
                          <span><span></span><span></span><span></span><span></span></span>
                          <div className="base"><span></span><div className="face"></div></div>
                        </div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-sm font-bold text-[#6d28d9] mt-4 animate-pulse">
                        Saving document properties… Please wait!
                      </p>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {success && (
                  <div className="dp-card bg-[#f0fdf4] border-[#bbf7d0] animate-in slide-in-from-bottom-4 fade-in">
                    <div className="flex flex-col items-center text-center py-6">
                      <CheckCircle size={48} className="text-emerald-500 mb-4" />
                      <h3 className="text-xl font-bold text-emerald-800 mb-2">{success}</h3>
                      <p className="text-emerald-600 mb-8 max-w-md">The metadata has been successfully updated and embedded into your document.</p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                        <a href={apiClient.getFullUrl(downloadUrl)} className="dp-btn dp-btn-success flex-1" download>
                          <Download size={18} /> Download Updated PDF
                        </a>
                        <button onClick={resetAll} className="dp-btn dp-btn-secondary flex-1 border-emerald-200 hover:bg-emerald-50">
                          Process Another
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
