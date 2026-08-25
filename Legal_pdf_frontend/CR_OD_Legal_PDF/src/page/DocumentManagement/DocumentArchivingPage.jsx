import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowLeft, AlertCircle, FileText, CheckCircle, Search, Trash2, RotateCcw, X, Archive, List } from 'lucide-react';

export default function DocumentArchivingPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('archive'); // 'archive' or 'browse'

  // Archive Tab State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveResults, setArchiveResults] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Browse Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [archives, setArchives] = useState([
    { id: 'ARC-1001', name: 'Legal_Contract_V1.pdf', size: 1048576, sizeStr: '1.0 MB', pages: 12, date: '2023-10-15 10:30' },
    { id: 'ARC-1002', name: 'Financial_Report_Q3.pdf', size: 4500000, sizeStr: '4.3 MB', pages: 45, date: '2023-10-14 15:45' },
    { id: 'ARC-1003', name: 'Employee_Handbook.pdf', size: 2500000, sizeStr: '2.4 MB', pages: 30, date: '2023-10-10 09:15' }
  ]);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState([]);

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
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (filesList) => {
    setError('');
    const valid = filesList.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (valid.length === 0) {
      setError('Please select valid PDF files only.');
      return;
    }
    
    setSelectedFiles(prev => {
      const merged = [...prev];
      valid.forEach(nf => {
        if (!merged.some(f => f.name === nf.name && f.size === nf.size)) {
          merged.push(nf);
        }
      });
      return merged;
    });
    setSuccess('');
    setArchiveResults(null);
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleArchive = () => {
    if (selectedFiles.length === 0) return;
    setIsArchiving(true);
    setError('');
    setSuccess('');

    // Mock Archive Process
    setTimeout(() => {
      setIsArchiving(false);
      
      const newArchives = selectedFiles.map((file, idx) => ({
        id: `ARC-200${Math.floor(Math.random() * 1000) + idx}`,
        name: file.name,
        size: file.size,
        sizeStr: formatSize(file.size),
        pages: Math.floor(Math.random() * 20) + 1,
        date: new Date().toISOString().slice(0, 16).replace('T', ' ')
      }));

      setArchiveResults(newArchives);
      setArchives(prev => [...newArchives, ...prev]);
      setSuccess(`Archived ${newArchives.length} file(s) successfully.`);
    }, 2500);
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setArchiveResults(null);
    setError('');
    setSuccess('');
    if (inputRef.current) inputRef.current.value = '';
  };

  // Browse Functions
  const filteredArchives = archives.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedArchiveIds(filteredArchives.map(a => a.id));
    } else {
      setSelectedArchiveIds([]);
    }
  };

  const handleToggleArchive = (id) => {
    setSelectedArchiveIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const deleteArchive = (id) => {
    if (window.confirm('Permanently delete this archive?')) {
      setArchives(prev => prev.filter(a => a.id !== id));
      setSelectedArchiveIds(prev => prev.filter(x => x !== id));
    }
  };

  const bulkDelete = () => {
    if (selectedArchiveIds.length === 0) return;
    if (window.confirm(`Permanently delete ${selectedArchiveIds.length} archive(s)?`)) {
      setArchives(prev => prev.filter(a => !selectedArchiveIds.includes(a.id)));
      setSelectedArchiveIds([]);
    }
  };

  const restoreArchive = (id) => {
    window.alert(`Document ${id} restored to output directory.`);
  };

  return (
    <div className="react-wrapper-da">
      <style>{`
        .da-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem 3rem 1rem; font-family: 'Inter', sans-serif; }
        .da-hdr { text-align: center; margin-bottom: 2rem; }
        .da-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .da-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .da-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .da-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .da-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .da-card h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0 0 1.25rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #f1f5f9; display: flex; align-items: center; gap: 8px; }
        
        .da-tabs { display: flex; gap: 6px; margin-bottom: 1.5rem; background: #f1f5f9; border-radius: 12px; padding: 6px; }
        .da-tab { flex: 1; padding: 12px 16px; text-align: center; font-size: 0.95rem; font-weight: 700; border: none; background: none; border-radius: 8px; cursor: pointer; color: #64748b; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .da-tab:hover:not(.active) { color: #1e293b; background: rgba(255,255,255,0.5); }
        .da-tab.active { background: #fff; color: #7c3aed; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .da-btn { padding: 10px 20px; font-size: 0.9rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 8px; justify-content: center; }
        .da-btn-primary { background: #7c3aed; color: #fff; }
        .da-btn-primary:hover { background: #6d28d9; }
        .da-btn-primary:disabled { background: #c4b5fd; cursor: not-allowed; }
        .da-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .da-btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
        .da-btn-danger { background: #ef4444; color: #fff; }
        .da-btn-danger:hover { background: #dc2626; }
        
        .da-table-wrap { overflow-x: auto; margin-top: 1rem; border: 1px solid #e2e8f0; border-radius: 10px; }
        .da-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 700px; }
        .da-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
        .da-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
        .da-table tr:hover td { background: #f8fafc; }
        
        .da-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .da-badge.success { background: #dcfce7; color: #166534; }
        .da-badge.info { background: #e0e7ff; color: #3730a3; }
        
        .da-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
        .da-stat { padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center; }
        .da-stat-val { font-size: 1.6rem; font-weight: 800; color: #7c3aed; }
        .da-stat-label { font-size: 0.85rem; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; }

        .da-search-input { width: 100%; padding: 10px 14px; font-size: 0.9rem; border: 2px solid #e2e8f0; border-radius: 8px; outline: none; transition: border-color 0.2s; }
        .da-search-input:focus { border-color: #7c3aed; }
        
        .da-checkbox { width: 16px; height: 16px; accent-color: #7c3aed; cursor: pointer; margin: 0; }
        
        /* Loader Overrides */
        .react-wrapper-da .loader > span,
        .react-wrapper-da .loader > span > span,
        .react-wrapper-da .face,
        .react-wrapper-da .face:after,
        .react-wrapper-da .base span:before,
        .react-wrapper-da .longfazers span {
          background: #7c3aed !important;
        }
        .react-wrapper-da .base span,
        .react-wrapper-da .base span:after {
          border-right-color: #7c3aed !important;
        }
      `}</style>

      <div className="da-wrap">
        {onBack && (
          <button onClick={onBack} className="da-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="da-hdr">
          <h1>Document Archiving</h1>
          <p>Archive PDFs for long-term storage, browse your archive, restore, or download documents on demand.</p>
        </div>

        <div className="da-tabs">
          <button className={`da-tab ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => setActiveTab('archive')}>
            <Archive size={18} /> Archive Files
          </button>
          <button className={`da-tab ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
            <List size={18} /> Browse Archive
          </button>
        </div>

        {activeTab === 'archive' && (
          <div className="animate-in fade-in duration-300">
            <div className="da-card">
              <h2><Upload size={20} className="text-[#1e2a52]" /> Upload PDFs to Archive</h2>
              
              {!isArchiving && !archiveResults && (
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
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                  />
                  <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-[#1e2a52]" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">
                    Drop PDFs here or click to browse
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span>
                  </p>
                </div>
              )}

              {selectedFiles.length > 0 && !archiveResults && !isArchiving && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </div>
                  </div>
                  <div className="space-y-2 mb-6 max-h-[250px] overflow-y-auto pr-2">
                    {selectedFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <FileText size={18} className="text-[#1e2a52]" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">{f.name}</div>
                          <div className="text-xs text-slate-400">{formatSize(f.size)}</div>
                        </div>
                        <button onClick={() => removeSelectedFile(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button onClick={handleArchive} className="da-btn da-btn-primary flex-1">
                      <Archive size={18} /> Archive {selectedFiles.length} File(s)
                    </button>
                    <button onClick={resetUpload} className="da-btn da-btn-secondary">
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {isArchiving && (
                <div className="flex flex-col items-center justify-center p-8 bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl overflow-hidden relative min-h-[160px] mt-4">
                  <div className="speeder-loader-wrapper">
                    <div className="loader">
                      <span><span></span><span></span><span></span><span></span></span>
                      <div className="base"><span></span><div className="face"></div></div>
                    </div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-sm font-bold text-[#6d28d9] mt-4 animate-pulse">
                    Archiving {selectedFiles.length} document(s)… Please wait!
                  </p>
                </div>
              )}
            </div>

            {/* Results Table */}
            {archiveResults && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="da-card">
                  <h2><CheckCircle size={20} className="text-emerald-600" /> Archive Results</h2>
                  
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-bold mb-4 flex items-center gap-2">
                    <CheckCircle size={18} /> {success}
                  </div>

                  <div className="da-table-wrap">
                    <table className="da-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Filename</th>
                          <th>Archive ID</th>
                          <th>Size</th>
                          <th>Pages</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archiveResults.map((r, i) => (
                          <tr key={i}>
                            <td><span className="da-badge success">Archived</span></td>
                            <td className="font-medium">{r.name}</td>
                            <td><code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{r.id}</code></td>
                            <td>{r.sizeStr}</td>
                            <td>{r.pages}</td>
                            <td>{r.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button onClick={resetUpload} className="da-btn da-btn-secondary">
                      Archive More Files
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="animate-in fade-in duration-300">
            <div className="da-card">
              
              <div className="da-stat-grid">
                <div className="da-stat">
                  <div className="da-stat-val">{archives.length}</div>
                  <div className="da-stat-label">Total Documents</div>
                </div>
                <div className="da-stat">
                  <div className="da-stat-val">
                    {formatSize(archives.reduce((acc, val) => acc + val.size, 0))}
                  </div>
                  <div className="da-stat-label">Total Size</div>
                </div>
                <div className="da-stat">
                  <div className="da-stat-val">
                    {archives.reduce((acc, val) => acc + val.pages, 0)}
                  </div>
                  <div className="da-stat-label">Total Pages</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4 mt-6">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    className="da-search-input pl-10" 
                    placeholder="Search by filename or Archive ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="da-btn da-btn-secondary">Clear</button>
                )}
              </div>

              {selectedArchiveIds.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl mb-4 animate-in fade-in">
                  <div className="text-sm font-bold text-red-800">{selectedArchiveIds.length} item(s) selected</div>
                  <button onClick={bulkDelete} className="da-btn da-btn-danger" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    <Trash2 size={16} /> Delete Selected
                  </button>
                </div>
              )}

              {filteredArchives.length === 0 ? (
                <div className="text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Archive size={48} className="mx-auto text-slate-300 mb-4" />
                  <div className="font-bold text-slate-600 text-lg">No archives found</div>
                  <div className="text-sm text-slate-500 mt-2">Try adjusting your search or upload new files in the Archive tab.</div>
                </div>
              ) : (
                <div className="da-table-wrap">
                  <table className="da-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            className="da-checkbox"
                            checked={filteredArchives.length > 0 && selectedArchiveIds.length === filteredArchives.length}
                            onChange={handleToggleSelectAll}
                          />
                        </th>
                        <th>Filename</th>
                        <th>Archive ID</th>
                        <th>Size</th>
                        <th>Pages</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchives.map(a => (
                        <tr key={a.id} className={selectedArchiveIds.includes(a.id) ? 'bg-blue-50/50' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              className="da-checkbox"
                              checked={selectedArchiveIds.includes(a.id)}
                              onChange={() => handleToggleArchive(a.id)}
                            />
                          </td>
                          <td className="font-medium text-[#1e2a52]">{a.name}</td>
                          <td><code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{a.id}</code></td>
                          <td>{a.sizeStr}</td>
                          <td>{a.pages}</td>
                          <td className="text-slate-500 text-xs">{a.date}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => restoreArchive(a.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Restore Document">
                                <RotateCcw size={16} />
                              </button>
                              <button onClick={() => deleteArchive(a.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Delete Permanently">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
