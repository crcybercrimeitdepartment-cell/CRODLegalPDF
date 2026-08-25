import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowLeft, FileText, Search, Plus, Trash2, FileOutput, X, AlertCircle, FilePlus, Play, CheckCircle } from 'lucide-react';

export default function DocumentTemplatesPage({ onBack }) {
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Status state
  const [status, setStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error'

  // Modals state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form states
  const [tplForm, setTplForm] = useState({ name: '', description: '' });
  const [useForm, setUseForm] = useState({ outputName: '' });
  const [activeTemplate, setActiveTemplate] = useState(null);

  // Mock initial templates
  const [templates, setTemplates] = useState([
    { id: 'TPL-001', name: 'Contract Agreement Standard', description: 'Standard NDA and contract agreement template.', page_count: 5, file_size_human: '1.2 MB', created_at: '2023-10-01T10:00:00' },
    { id: 'TPL-002', name: 'Employee Onboarding', description: 'Forms for new employee registration.', page_count: 12, file_size_human: '3.4 MB', created_at: '2023-10-05T14:30:00' }
  ]);

  const inputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const showStatus = (message, type = 'success') => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ type: '', message: '' }), 4000);
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

  const handlePdfFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showStatus('Please select a valid PDF file.', 'error');
      return;
    }
    setSelectedPdf(file);
    setStatus({ type: '', message: '' });
  };

  // --- Save Modal Actions ---
  const openSaveModal = () => {
    if (!selectedPdf) return;
    setTplForm({
      name: selectedPdf.name.replace('.pdf', '').replace(/_/g, ' '),
      description: ''
    });
    setSaveModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!tplForm.name.trim()) {
      alert('Please enter a template name.');
      return;
    }

    const newTemplate = {
      id: `TPL-${Date.now()}`,
      name: tplForm.name,
      description: tplForm.description,
      page_count: Math.floor(Math.random() * 10) + 1, // Mock data
      file_size_human: formatSize(selectedPdf.size),
      created_at: new Date().toISOString()
    };

    setTemplates([newTemplate, ...templates]);
    showStatus(`Template "${newTemplate.name}" saved successfully.`);
    setSaveModalOpen(false);
    setSelectedPdf(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // --- Use Modal Actions ---
  const openUseModal = (template) => {
    setActiveTemplate(template);
    setUseForm({ outputName: '' });
    setUseModalOpen(true);
  };

  const handleGeneratePdf = () => {
    showStatus(`PDF generated successfully from template "${activeTemplate.name}".`);
    setUseModalOpen(false);
    setActiveTemplate(null);
  };

  // --- Delete Modal Actions ---
  const openDeleteModal = (template) => {
    setActiveTemplate(template);
    setDeleteModalOpen(true);
  };

  const handleDeleteTemplate = () => {
    setTemplates(templates.filter(t => t.id !== activeTemplate.id));
    showStatus('Template deleted successfully.');
    setDeleteModalOpen(false);
    setActiveTemplate(null);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="react-wrapper-document_templates">
      <style>{`
        .dt-wrap { max-width: 1000px; margin: 0 auto; padding: 0 1rem 3rem 1rem; font-family: 'Inter', sans-serif; }
        .dt-hdr { text-align: center; margin-bottom: 2rem; }
        .dt-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .dt-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .dt-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .dt-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .dt-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .dt-card h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0 0 1.25rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #f1f5f9; display: flex; align-items: center; gap: 8px; }
        
        /* Dropzone */
        .dt-dropzone { border: 2px dashed #e2e8f0; border-radius: 16px; padding: 3rem 2rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; margin-bottom: 1rem; }
        .dt-dropzone:hover, .dt-dropzone.dragover { border-color: #7c3aed; background: #f5f3ff; transform: scale(1.01); }
        .dt-dropzone-icon { width: 64px; height: 64px; background: rgba(30, 42, 82, 0.1); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #1e2a52; }
        .dt-dropzone.dragover .dt-dropzone-icon { color: #7c3aed; background: rgba(124, 58, 237, 0.1); }
        .dt-dropzone h3 { font-size: 1.1rem; font-weight: 700; color: #1e2a52; margin: 0 0 4px 0; }
        .dt-dropzone p { font-size: 0.9rem; color: #64748b; margin: 0; }

        .dt-selected-file { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .dt-selected-file-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .dt-selected-file-details { flex: 1; min-width: 0; }
        .dt-selected-file-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; word-break: break-all; }
        .dt-selected-file-size { font-size: 0.8rem; color: #64748b; font-weight: 500; }

        /* Search & Lists */
        .dt-search-wrap { position: relative; margin-bottom: 1.5rem; }
        .dt-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .dt-search-input { width: 100%; padding: 12px 14px 12px 42px; font-size: 0.95rem; font-weight: 500; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; transition: all 0.2s; box-sizing: border-box; }
        .dt-search-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }

        .dt-list { display: flex; flex-direction: column; gap: 12px; }
        .dt-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px; transition: all 0.2s; flex-wrap: wrap; }
        .dt-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
        .dt-item-icon { width: 48px; height: 48px; background: #f1f5f9; color: #1e2a52; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dt-item-info { flex: 1; min-width: 0; }
        .dt-item-name { font-weight: 700; font-size: 1rem; color: #1e293b; margin-bottom: 4px; word-break: break-word; }
        .dt-item-meta { font-size: 0.8rem; font-weight: 600; color: #64748b; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .dt-item-meta span { display: inline-block; padding: 2px 8px; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0; }
        .dt-item-desc { font-size: 0.85rem; color: #64748b; margin-top: 6px; line-height: 1.4; }
        .dt-item-actions { display: flex; gap: 8px; flex-shrink: 0; }

        /* Buttons */
        .dt-btn { padding: 10px 20px; font-size: 0.9rem; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; justify-content: center; white-space: nowrap; }
        .dt-btn-primary { background: #7c3aed; color: #fff; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2); }
        .dt-btn-primary:hover { background: #6d28d9; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3); }
        .dt-btn-primary:disabled { background: #c4b5fd; cursor: not-allowed; transform: none; box-shadow: none; }
        .dt-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .dt-btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
        .dt-btn-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .dt-btn-danger:hover { background: #fca5a5; color: #991b1b; }
        .dt-btn-danger-solid { background: #dc2626; color: #fff; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); }
        .dt-btn-danger-solid:hover { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3); }

        /* Status & Empty */
        .dt-status { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; margin-bottom: 1.5rem; animation: slideDown 0.3s ease; }
        .dt-status.success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
        .dt-status.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .dt-empty { text-align: center; padding: 4rem 2rem; border: 2px dashed #e2e8f0; border-radius: 16px; background: #f8fafc; }
        .dt-empty-icon { width: 64px; height: 64px; margin: 0 auto 1rem; color: #94a3b8; }
        .dt-empty h3 { font-size: 1.1rem; font-weight: 700; color: #475569; margin: 0 0 8px 0; }
        .dt-empty p { font-size: 0.95rem; color: #64748b; margin: 0; }

        /* Modals */
        .dt-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .dt-modal { background: #fff; width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); overflow: hidden; animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .dt-modal-header { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
        .dt-modal-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; }
        .dt-modal-close { background: transparent; border: none; color: #94a3b8; cursor: pointer; border-radius: 8px; padding: 6px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .dt-modal-close:hover { background: #f1f5f9; color: #1e293b; }
        .dt-modal-body { padding: 1.5rem; }
        .dt-modal-footer { padding: 1.25rem 1.5rem; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; }
        
        .dt-form-group { margin-bottom: 1.25rem; }
        .dt-form-label { display: block; font-weight: 700; font-size: 0.85rem; color: #334155; margin-bottom: 6px; }
        .dt-form-input { width: 100%; padding: 10px 14px; font-size: 0.95rem; font-weight: 500; border-radius: 10px; border: 1px solid #cbd5e1; box-sizing: border-box; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .dt-form-input:focus { border-color: #7c3aed; outline: none; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .dt-form-textarea { resize: vertical; min-height: 80px; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="dt-wrap">
        {onBack && (
          <button onClick={onBack} className="dt-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="dt-hdr">
          <h1>Document Templates</h1>
          <p>Save PDFs as reusable templates, search, and generate new copies.</p>
        </div>

        {status.message && (
          <div className={`dt-status ${status.type}`}>
            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{status.message}</span>
          </div>
        )}

        {/* Upload Section */}
        <div className="dt-card">
          <h2><FilePlus size={20} className="text-[#1e2a52]" /> Add New Template</h2>

          {!selectedPdf ? (
            <div
              className={`dt-dropzone ${isDragging ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input type="file" ref={inputRef} onChange={handleInputChange} accept=".pdf" className="hidden" />
              <div className="dt-dropzone-icon">
                <Upload size={32} />
              </div>
              <h3>Drag & drop a PDF here or click to browse</h3>
              <p>Accepted: PDF files (.pdf)</p>
            </div>
          ) : (
            <div className="dt-selected-file">
              <div className="dt-selected-file-info">
                <FileText size={32} className="text-[#1e2a52] shrink-0" />
                <div className="dt-selected-file-details">
                  <div className="dt-selected-file-name">{selectedPdf.name}</div>
                  <div className="dt-selected-file-size">{formatSize(selectedPdf.size)}</div>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setSelectedPdf(null)} className="dt-btn dt-btn-secondary flex-1 sm:flex-none">
                  Cancel
                </button>
                <button onClick={openSaveModal} className="dt-btn dt-btn-primary flex-1 sm:flex-none">
                  <Plus size={16} /> Save as Template
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Templates List */}
        <div className="dt-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 border-bottom border-[#f1f5f9] pb-3" style={{ borderBottom: '2px solid #f1f5f9' }}>
            <h2 style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
              <FileText size={20} className="text-[#1e2a52]" /> Saved Templates
              <span className="ml-2 bg-[#f1f5f9] text-[#1e2a52] px-2 py-0.5 rounded-full text-xs font-bold">
                {templates.length}
              </span>
            </h2>
          </div>

          <div className="dt-search-wrap">
            <Search size={18} className="dt-search-icon" />
            <input
              type="text"
              className="dt-search-input"
              placeholder="Search templates by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {templates.length === 0 ? (
            <div className="dt-empty">
              <FileText className="dt-empty-icon" />
              <h3>No templates saved yet</h3>
              <p>Upload a PDF above to create your first template.</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="dt-empty">
              <Search className="dt-empty-icon" />
              <h3>No matching templates</h3>
              <p>Try adjusting your search terms.</p>
            </div>
          ) : (
            <div className="dt-list">
              {filteredTemplates.map(t => (
                <div key={t.id} className="dt-item">
                  <div className="dt-item-icon">
                    <FileText size={24} />
                  </div>
                  <div className="dt-item-info">
                    <div className="dt-item-name">{t.name}</div>
                    <div className="dt-item-meta">
                      <span>{t.page_count} pages</span>
                      <span>{t.file_size_human}</span>
                      <span>{formatDate(t.created_at)}</span>
                    </div>
                    {t.description && <div className="dt-item-desc">{t.description}</div>}
                  </div>
                  <div className="dt-item-actions w-full sm:w-auto mt-2 sm:mt-0">
                    <button onClick={() => openUseModal(t)} className="dt-btn dt-btn-primary flex-1 sm:flex-none">
                      <Play size={16} /> Use
                    </button>
                    <button onClick={() => openDeleteModal(t)} className="dt-btn dt-btn-danger flex-1 sm:flex-none">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Save Template Modal */}
      {saveModalOpen && (
        <div className="dt-modal-overlay">
          <div className="dt-modal">
            <div className="dt-modal-header">
              <h2 className="dt-modal-title">Save as Template</h2>
              <button className="dt-modal-close" onClick={() => setSaveModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="dt-modal-body">
              <div className="dt-form-group">
                <label className="dt-form-label">Template Name *</label>
                <input
                  type="text"
                  className="dt-form-input"
                  placeholder="e.g. Contract Agreement"
                  value={tplForm.name}
                  onChange={e => setTplForm({ ...tplForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="dt-form-group" style={{ marginBottom: 0 }}>
                <label className="dt-form-label">Description (optional)</label>
                <textarea
                  className="dt-form-input dt-form-textarea"
                  placeholder="Brief description of the template..."
                  value={tplForm.description}
                  onChange={e => setTplForm({ ...tplForm, description: e.target.value })}
                ></textarea>
              </div>
            </div>
            <div className="dt-modal-footer">
              <button className="dt-btn dt-btn-secondary" onClick={() => setSaveModalOpen(false)}>Cancel</button>
              <button className="dt-btn dt-btn-primary" onClick={handleSaveTemplate}>Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Use Template Modal */}
      {useModalOpen && (
        <div className="dt-modal-overlay">
          <div className="dt-modal">
            <div className="dt-modal-header">
              <h2 className="dt-modal-title">Generate PDF from Template</h2>
              <button className="dt-modal-close" onClick={() => setUseModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="dt-modal-body">
              <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                You are about to generate a new PDF based on <strong>"{activeTemplate?.name}"</strong>.
              </p>
              <div className="dt-form-group" style={{ marginBottom: 0 }}>
                <label className="dt-form-label">Output file name (optional)</label>
                <input
                  type="text"
                  className="dt-form-input"
                  placeholder="e.g. filled_contract.pdf"
                  value={useForm.outputName}
                  onChange={e => setUseForm({ outputName: e.target.value })}
                  autoFocus
                />
              </div>
            </div>
            <div className="dt-modal-footer">
              <button className="dt-btn dt-btn-secondary" onClick={() => setUseModalOpen(false)}>Cancel</button>
              <button className="dt-btn dt-btn-primary" onClick={handleGeneratePdf}>
                <FileOutput size={16} /> Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Template Modal */}
      {deleteModalOpen && (
        <div className="dt-modal-overlay">
          <div className="dt-modal">
            <div className="dt-modal-header">
              <h2 className="dt-modal-title">Delete Template</h2>
              <button className="dt-modal-close" onClick={() => setDeleteModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="dt-modal-body">
              <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-xl border border-red-200">
                <AlertCircle size={24} className="shrink-0 text-red-600" />
                <div>
                  <h4 className="font-bold mb-1">Are you sure?</h4>
                  <p className="text-sm">You are about to permanently delete the template <strong>"{activeTemplate?.name}"</strong>. This action cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="dt-modal-footer">
              <button className="dt-btn dt-btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
              <button className="dt-btn dt-btn-danger-solid" onClick={handleDeleteTemplate}>
                <Trash2 size={16} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
