import React, { useState, useRef } from 'react';
import { Upload, ArrowLeft, X, AlertCircle, FileText, CheckCircle2, Download, Plus, Trash2, Edit3, Settings } from 'lucide-react';
import apiClient from '../../api/apiClient';

export default function CustomPropertiesPage({ onBack }) {
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [properties, setProperties] = useState([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [modalForm, setModalForm] = useState({ name: '', type: 'Text', value: '' });
  const [modalError, setModalError] = useState('');

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
    setProperties([]);
    setIsAnalyzing(true);

    // Mock analysis process
    setTimeout(() => {
      setProperties([
        { name: 'Department', type: 'Text', value: 'Engineering' },
        { name: 'ProjectID', type: 'Number', value: '45021' },
        { name: 'IsConfidential', type: 'Boolean', value: 'true' }
      ]);
      setIsAnalyzing(false);
    }, 1500);
  };

  const deleteProperty = (index) => {
    setProperties(prev => prev.filter((_, i) => i !== index));
  };

  const openModalForAdd = () => {
    setEditingIndex(-1);
    setModalForm({ name: '', type: 'Text', value: '' });
    setModalError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (index) => {
    setEditingIndex(index);
    setModalForm({ ...properties[index] });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = () => {
    setModalError('');
    const { name, type, value } = modalForm;

    if (!name.trim()) {
      setModalError('Property name is required.');
      return;
    }
    if (value === '' || value === null) {
      setModalError('Property value is required.');
      return;
    }

    const nameLower = name.trim().toLowerCase();
    const isDuplicate = properties.some((p, i) => i !== editingIndex && p.name.toLowerCase() === nameLower);
    
    if (isDuplicate) {
      setModalError(`A property named "${name}" already exists.`);
      return;
    }

    const newProp = { name: name.trim(), type, value: value.toString() };

    setProperties(prev => {
      const updated = [...prev];
      if (editingIndex >= 0) {
        updated[editingIndex] = newProp;
      } else {
        updated.push(newProp);
      }
      return updated;
    });

    setIsModalOpen(false);
  };

  const handleProcess = () => {
    if (!selectedPdf) return;
    setIsProcessing(true);
    setSuccess('');
    setDownloadUrl('');
    setError('');

    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(`Custom properties saved successfully! ${properties.length} properties embedded in PDF.`);
      setDownloadUrl('#');
    }, 2500);
  };

  const resetAll = () => {
    setSelectedPdf(null);
    setProperties([]);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const renderValueInput = () => {
    if (modalForm.type === 'Text') {
      return <input type="text" className="cp-input" placeholder="e.g., Legal, CL-123" value={modalForm.value} onChange={(e) => setModalForm({...modalForm, value: e.target.value})} />;
    }
    if (modalForm.type === 'Number') {
      return <input type="number" className="cp-input" placeholder="e.g., 12345" value={modalForm.value} onChange={(e) => setModalForm({...modalForm, value: e.target.value})} />;
    }
    if (modalForm.type === 'Date') {
      return <input type="date" className="cp-input" value={modalForm.value} onChange={(e) => setModalForm({...modalForm, value: e.target.value})} />;
    }
    if (modalForm.type === 'Boolean') {
      return (
        <select className="cp-input" value={modalForm.value} onChange={(e) => setModalForm({...modalForm, value: e.target.value})}>
          <option value="">Select Boolean...</option>
          <option value="true">Yes (True)</option>
          <option value="false">No (False)</option>
        </select>
      );
    }
    return null;
  };

  return (
    <div className="react-wrapper-custom_properties">
      <style>{`
        .cp-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem 3rem 1rem; font-family: 'Inter', sans-serif; }
        .cp-hdr { text-align: center; margin-bottom: 2rem; }
        .cp-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .cp-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .cp-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .cp-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .cp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .cp-card h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
        
        .cp-file-info { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8fafc; border-radius: 10px; margin-top: 1rem; border: 1px solid #e2e8f0; }
        .cp-file-icon { font-size: 1.5rem; }
        .cp-file-details { flex: 1; }
        .cp-file-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
        .cp-file-size { font-size: 0.82rem; color: #64748b; }
        
        .cp-table-container { max-height: 450px; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 1.5rem; -webkit-overflow-scrolling: touch; }
        .cp-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 600px; }
        .cp-table th { background: #f8fafc; text-align: left; padding: 12px 16px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
        .cp-table td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
        .cp-table tr:hover td { background: #f8fafc; }
        
        .cp-input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; font-family: inherit; transition: border-color 0.2s; box-sizing: border-box; }
        .cp-input:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
        
        .cp-btn { padding: 10px 18px; font-size: 0.9rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 8px; justify-content: center; }
        .cp-btn-primary { background: #7c3aed; color: #fff; }
        .cp-btn-primary:hover { background: #6d28d9; }
        .cp-btn-success { background: #16a34a; color: #fff; }
        .cp-btn-success:hover { background: #15803d; }
        .cp-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .cp-btn-secondary:hover { background: #e2e8f0; }
        .cp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .cp-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
        .cp-badge.text { background: #e0e7ff; color: #3730a3; }
        .cp-badge.number { background: #dcfce7; color: #166534; }
        .cp-badge.date { background: #fef3c7; color: #92400e; }
        .cp-badge.boolean { background: #fce7f3; color: #9d174d; }

        .cp-loading { text-align: center; padding: 3rem 1rem; }
        .cp-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #7c3aed; border-radius: 50%; animation: cp-spin 0.8s linear infinite; margin: 0 auto 1rem; }
        @keyframes cp-spin { to { transform: rotate(360deg); } }

        /* Modal Overlay */
        .cp-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px); }
        .cp-modal { background: #fff; border-radius: 16px; width: 90%; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: cp-modal-in 0.2s ease-out; }
        @keyframes cp-modal-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .cp-modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .cp-modal-header h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
        .cp-modal-close { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .cp-modal-close:hover { background: #f1f5f9; color: #0f172a; }
        .cp-modal-body { padding: 1.5rem; }
        .cp-modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 12px; }

        .cp-form-group { margin-bottom: 1.25rem; }
        .cp-form-label { display: block; font-size: 0.85rem; font-weight: 700; color: #334155; margin-bottom: 6px; }

        /* Custom Blue Loader Overrides to match AddAttachments */
        .react-wrapper-custom_properties .loader > span,
        .react-wrapper-custom_properties .loader > span > span,
        .react-wrapper-custom_properties .face,
        .react-wrapper-custom_properties .face:after,
        .react-wrapper-custom_properties .base span:before,
        .react-wrapper-custom_properties .longfazers span {
          background: #7c3aed !important;
        }
        .react-wrapper-custom_properties .base span,
        .react-wrapper-custom_properties .base span:after {
          border-right-color: #7c3aed !important;
        }
      `}</style>

      <div className="cp-wrap">
        {onBack && (
          <button onClick={onBack} className="cp-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="cp-hdr">
          <h1>Custom Properties</h1>
          <p>Attach business-specific metadata to PDF documents — Department, Project, Client ID, and more.</p>
        </div>

        <div className="cp-card">
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
                  <button onClick={resetAll} className="cp-btn cp-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Change File
                  </button>
                )}
              </div>
              
              <div className="cp-file-info">
                <div className="cp-file-icon">
                  <FileText className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <div className="cp-file-details">
                  <div className="cp-file-name">{selectedPdf.name}</div>
                  <div className="cp-file-size">{formatSize(selectedPdf.size)}</div>
                </div>
              </div>

              {isAnalyzing ? (
                <div className="cp-loading">
                  <div className="cp-spinner"></div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Analyzing document properties...</div>
                </div>
              ) : (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, padding: 0, border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Settings size={20} className="text-[#1e2a52]" /> Custom Properties 
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {properties.length}
                      </span>
                    </h2>
                    <button onClick={openModalForAdd} className="cp-btn cp-btn-secondary" style={{ color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff' }}>
                      <Plus size={16} /> Add Property
                    </button>
                  </div>

                  {properties.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', marginTop: '1.5rem' }}>
                      <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No custom properties found</h3>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Click "Add Property" to attach metadata to your document.</p>
                    </div>
                  ) : (
                    <div className="cp-table-container">
                      <table className="cp-table">
                        <thead>
                          <tr>
                            <th>Property Name</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {properties.map((prop, idx) => {
                            let displayValue = prop.value;
                            if (prop.type === 'Boolean') displayValue = prop.value === 'true' ? 'Yes' : 'No';
                            
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700 }}>{prop.name}</td>
                                <td>
                                  <span className={`cp-badge ${prop.type.toLowerCase()}`}>{prop.type}</span>
                                </td>
                                <td style={{ wordBreak: 'break-all' }}>{displayValue}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    <button onClick={() => openModalForEdit(idx)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Edit">
                                      <Edit3 size={14} />
                                    </button>
                                    <button onClick={() => deleteProperty(idx)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Delete">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!success && !isProcessing && (
                    <div style={{ marginTop: '2rem' }}>
                      <button onClick={handleProcess} className="cp-btn cp-btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }} disabled={properties.length === 0}>
                        Save Changes & Generate PDF
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
                        Saving custom properties… Please wait!
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
                          className="cp-btn cp-btn-success"
                          style={{ padding: '14px 24px', fontSize: '1.05rem', textDecoration: 'none' }}
                        >
                          <Download size={20} /> Download Updated PDF
                        </a>
                        <button
                          onClick={resetAll}
                          className="cp-btn cp-btn-secondary"
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

      {isModalOpen && (
        <div className="cp-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3>{editingIndex >= 0 ? 'Edit Property' : 'Add Custom Property'}</h3>
              <button className="cp-modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="cp-modal-body">
              {modalError && (
                <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} /> {modalError}
                </div>
              )}
              
              <div className="cp-form-group">
                <label className="cp-form-label">Property Name</label>
                <input 
                  type="text" 
                  className="cp-input" 
                  placeholder="e.g., Department, Client ID, Project Name" 
                  value={modalForm.name} 
                  onChange={(e) => setModalForm({...modalForm, name: e.target.value})} 
                />
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>A unique name to identify this property</div>
              </div>

              <div className="cp-form-group">
                <label className="cp-form-label">Property Type</label>
                <select 
                  className="cp-input" 
                  value={modalForm.type} 
                  onChange={(e) => {
                    setModalForm({
                      ...modalForm, 
                      type: e.target.value, 
                      value: '' // reset value on type change
                    });
                  }}
                >
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="Date">Date</option>
                  <option value="Boolean">Boolean</option>
                </select>
              </div>

              <div className="cp-form-group">
                <label className="cp-form-label">Property Value</label>
                {renderValueInput()}
              </div>
            </div>
            
            <div className="cp-modal-footer">
              <button className="cp-btn cp-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="cp-btn cp-btn-primary" onClick={handleModalSubmit}>
                {editingIndex >= 0 ? 'Save Changes' : 'Add Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
