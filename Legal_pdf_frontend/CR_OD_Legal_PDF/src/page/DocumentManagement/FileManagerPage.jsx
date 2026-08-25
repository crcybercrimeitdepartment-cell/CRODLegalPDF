import React, { useState, useEffect, useRef } from 'react';
import { Upload, FolderPlus, Download, Trash2, Folder, File, FileText, FileImage, Archive, Search, ChevronRight, Home, Edit2, Copy, ArrowRightCircle, ArrowLeft, X, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';
import apiClient from '../../api/apiClient';

// Removed mock storage

export default function FileManagerPage({ onBack }) {
  const toolName = "File Manager";
  const toolDesc = "Manage and organize your PDFs and related files in a secure virtual directory.";

  const [allFolders, setAllFolders] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [currentItems, setCurrentItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [renameModal, setRenameModal] = useState({ isOpen: false, item: null, newName: '' });
  const [folderModal, setFolderModal] = useState({ isOpen: false, folderName: '' });
  const [moveCopyModal, setMoveCopyModal] = useState({ isOpen: false, item: null, action: 'move', targetFolder: '' });

  const inputRef = useRef(null);
  
  // Initialize FS
  useEffect(() => {
    loadDirectory('');
    fetchDirectories();
  }, []);

  const fetchDirectories = async () => {
    try {
      const res = await fetch('/document-management/file-manager/directories');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAllFolders(data.directories);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDirectory = async (path) => {
    setIsProcessing(true);
    setLoadingText('Loading folder contents...');
    try {
      const res = await fetch(`/document-management/file-manager/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error('Failed to load directory');
      const data = await res.json();
      setCurrentPath(path);
      setCurrentItems(data.items || []);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const getBreadcrumbs = () => {
    const crumbs = [{ name: 'Home', path: '' }];
    if (currentPath) {
      let acc = '';
      currentPath.split('/').forEach(p => {
        if (!p) return;
        acc = acc ? acc + '/' + p : p;
        crumbs.push({ name: p, path: acc });
      });
    }
    return crumbs;
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredItems = currentItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Drag and drop for the main dropzone
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesUpload(Array.from(e.target.files));
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFilesUpload = async (files) => {
    setIsProcessing(true);
    setLoadingText(`Uploading ${files.length} file(s)...`);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('parent_path', currentPath);
        formData.append('file', file);
        await apiClient.uploadFiles('/api/document-management/file-manager/upload', formData);
      }
      showToast(`Successfully uploaded ${files.length} file(s)!`, 'success');
      loadDirectory(currentPath);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const navigateTo = (path) => {
    setSearchQuery('');
    loadDirectory(path);
  };

  const downloadFile = async (path) => {
    try {
      const filename = path.split('/').pop();
      showToast(`Downloading ${filename}...`, 'success');
      await apiClient.downloadFile(`/api/document-management/file-manager/download?path=${encodeURIComponent(path)}`, filename);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const createFolder = async () => {
    const name = folderModal.folderName.trim();
    if (!name) {
      showToast('Please enter a folder name.', 'error');
      return;
    }
    
    setIsProcessing(true);
    setLoadingText('Creating folder...');
    try {
      const formData = new FormData();
      formData.append('parent_path', currentPath);
      formData.append('folder_name', name);
      await apiClient.uploadFiles('/api/document-management/file-manager/create-folder', formData);
      setFolderModal({ isOpen: false, folderName: '' });
      showToast(`Folder '${name}' created successfully!`, 'success');
      loadDirectory(currentPath);
      fetchDirectories();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const renameItem = async () => {
    const { item, newName } = renameModal;
    const cleanName = newName.trim();
    if (!cleanName) {
      showToast('Please enter a new name.', 'error');
      return;
    }

    setIsProcessing(true);
    setLoadingText('Renaming item...');
    try {
      const res = await fetch('/document-management/file-manager/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path, new_name: cleanName })
      });
      if (!res.ok) throw new Error('Rename failed');
      
      setRenameModal({ isOpen: false, item: null, newName: '' });
      showToast(`Renamed to '${cleanName}' successfully!`, 'success');
      loadDirectory(currentPath);
      if (item.is_dir) fetchDirectories();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const moveCopyItem = async () => {
    const { item, action, targetFolder } = moveCopyModal;
    
    setIsProcessing(true);
    setLoadingText(`${action === 'move' ? 'Moving' : 'Copying'} item...`);
    try {
      const endpoint = action === 'move' ? '/document-management/file-manager/move' : '/document-management/file-manager/copy';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: item.path, target_folder_path: targetFolder })
      });
      if (!res.ok) throw new Error(`${action} failed`);
      
      setMoveCopyModal({ isOpen: false, item: null, action: 'move', targetFolder: '' });
      showToast(`Item ${action}d successfully!`, 'success');
      loadDirectory(currentPath);
      if (item.is_dir) fetchDirectories();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteItem = async () => {
    const { item } = deleteModal;
    setIsProcessing(true);
    setLoadingText('Deleting item...');
    try {
      const res = await fetch('/document-management/file-manager/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path })
      });
      if (!res.ok) throw new Error('Delete failed');
      
      setDeleteModal({ isOpen: false, item: null });
      showToast('Item deleted successfully!', 'success');
      loadDirectory(currentPath);
      if (item.is_dir) fetchDirectories();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileIcon = (ext, isDir) => {
    if (isDir) return <Folder className="w-5 h-5 text-blue-500" fill="currentColor" />;
    const e = (ext || '').toLowerCase();
    if (['pdf'].includes(e)) return <FileText className="w-5 h-5 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(e)) return <FileImage className="w-5 h-5 text-purple-500" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return <Archive className="w-5 h-5 text-orange-500" />;
    if (['json'].includes(e)) return <FileJson className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };



  return (
    <div className="react-wrapper-fm">
      <style>{`
        .fm-wrap { max-width: 1200px; margin: 0 auto; padding: 0 1rem 3rem 1rem; }
        .fm-hdr { text-align: center; margin-bottom: 2rem; }
        .fm-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .fm-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .fm-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .fm-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .fm-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .fm-card-large { padding: 2rem; }
        
        /* Dropzone matching AddAttachmentsPage */
        .fm-dropzone { position: relative; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 2rem 3rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; }
        .fm-dropzone.dragover { border-color: #1e2a52; background: #e8f0e2; }
        .fm-dropzone:hover:not(.dragover) { border-color: #1e2a52; background: #eff4ea; }
        .fm-dz-icon { width: 64px; height: 64px; background: rgba(30, 42, 82, 0.1); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .fm-dz-title { font-size: 1.1rem; font-weight: 700; color: #1e2a52; margin-bottom: 4px; }
        .fm-dz-subtitle { font-size: 0.85rem; color: #64748b; }
        
        /* Actions */
        .fm-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 1rem; }
        .fm-breadcrumb { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.9rem; color: #475569; overflow-x: auto; padding-bottom: 4px; }
        .fm-bc-link { color: #7c3aed; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; }
        .fm-bc-link:hover { background: #f3e8ff; }
        .fm-bc-sep { color: #cbd5e1; }
        
        .fm-search { display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 300px; flex: 1; }
        .fm-search input { border: none; background: transparent; outline: none; font-size: 0.9rem; width: 100%; color: #1e293b; }
        
        .fm-btn { padding: 8px 16px; font-size: 0.88rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .fm-btn-primary { background: #7c3aed; color: #fff; }
        .fm-btn-primary:hover { background: #6d28d9; }
        .fm-btn-success { background: #1e2a52; color: #fff; }
        .fm-btn-success:hover { background: #16203e; }
        .fm-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .fm-btn-secondary:hover { background: #e2e8f0; }
        .fm-btn-danger { background: #fee2e2; color: #dc2626; }
        .fm-btn-danger:hover { background: #fecaca; }
        
        /* Table Layout matching mobile responsiveness */
        .fm-table-container { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; margin-top: 1rem; }
        .fm-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .fm-table th { text-align: left; padding: 12px 16px; font-size: 0.8rem; font-weight: 700; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
        .fm-table td { padding: 12px 16px; font-size: 0.9rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .fm-table tr:last-child td { border-bottom: none; }
        .fm-table tr:hover td { background: #f8fafc; }
        
        .fm-item-name { display: flex; align-items: center; gap: 12px; font-weight: 600; color: #1e293b; cursor: pointer; }
        .fm-item-name:hover { color: #7c3aed; }
        
        .fm-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
        .fm-action-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid transparent; color: #64748b; cursor: pointer; transition: all 0.15s; background: transparent; }
        .fm-action-icon:hover { background: #f1f5f9; color: #1e2a52; border-color: #cbd5e1; }
        .fm-action-icon.danger:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        
        .fm-empty { padding: 4rem 2rem; text-align: center; color: #64748b; }
        .fm-empty h3 { margin: 16px 0 8px; font-size: 1.1rem; color: #1e293b; font-weight: 700; }
        
        /* Modals */
        .fm-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; justify-content: center; align-items: center; }
        .fm-modal { background: #fff; border-radius: 16px; width: 90%; max-width: 480px; box-shadow: 0 25px 60px rgba(0,0,0,0.15); overflow: hidden; }
        .fm-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .fm-modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1e2a52; }
        .fm-modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; border-radius: 6px; padding: 4px; }
        .fm-modal-close:hover { background: #f1f5f9; color: #475569; }
        .fm-modal-body { padding: 1.5rem; }
        .fm-modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        
        .fm-input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; margin-top: 6px; transition: border-color 0.15s; }
        .fm-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
        .fm-select { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; margin-top: 6px; background: #fff; cursor: pointer; }
        .fm-label { font-size: 0.85rem; font-weight: 700; color: #475569; }

        .fm-toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .fm-toast { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-radius: 10px; background: #1e2a52; color: #fff; font-weight: 600; font-size: 0.9rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: fm-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fm-toast.success { border-left: 4px solid #22c55e; }
        .fm-toast.error { border-left: 4px solid #ef4444; }
        @keyframes fm-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="fm-wrap">
        {onBack && (
          <button onClick={onBack} className="fm-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        
        <div className="fm-hdr">
          <h1>{toolName}</h1>
          <p>{toolDesc}</p>
        </div>

        {/* Global Loader replacing everything while processing */}
        {isProcessing ? (
          <div className="fm-card fm-card-large">
            <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[300px]">
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
              <p className="text-sm sm:text-base font-bold text-[#1e2a52] mt-4 animate-pulse">
                {loadingText}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="fm-card">
              <div
                className={`fm-dropzone ${isDragging ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input className="hidden" type="file" multiple ref={inputRef} onChange={handleInputChange} />
                <div className="fm-dz-icon">
                  <Upload className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <div className="fm-dz-title">Drag & Drop Files Here to Upload</div>
                <div className="fm-dz-subtitle">Or click to browse your computer</div>
              </div>
            </div>

            <div className="fm-card">
              <div className="fm-toolbar">
                <div className="fm-breadcrumb">
                  {getBreadcrumbs().map((crumb, idx, arr) => (
                    <React.Fragment key={crumb.path}>
                      <span className="fm-bc-link" onClick={() => navigateTo(crumb.path)}>
                        {idx === 0 && <Home size={16} />}
                        {crumb.name}
                      </span>
                      {idx < arr.length - 1 && <ChevronRight size={14} className="fm-bc-sep" />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <div className="fm-search">
                    <Search size={16} className="text-slate-400" />
                    <input type="text" placeholder="Search files..." value={searchQuery} onChange={handleSearch} />
                  </div>
                  <button className="fm-btn fm-btn-primary" onClick={() => setFolderModal({ isOpen: true, folderName: '' })}>
                    <FolderPlus size={16} /> New Folder
                  </button>
                  <button className="fm-btn fm-btn-secondary" onClick={async () => {
                    try {
                      showToast('Preparing ZIP download...', 'success');
                      await apiClient.downloadFile(`/api/document-management/file-manager/download-zip?path=${encodeURIComponent(currentPath)}`, `${currentPath || 'Home'}.zip`);
                    } catch (e) {
                      showToast(e.message, 'error');
                    }
                  }}>
                    <Download size={16} /> Download ZIP
                  </button>
                </div>
              </div>

              <div className="fm-table-container">
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Name</th>
                      <th style={{ width: '15%' }}>Size</th>
                      <th style={{ width: '20%' }}>Modified</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="4">
                          <div className="fm-empty">
                            <Archive size={48} className="mx-auto text-slate-300 mb-3" />
                            <h3>This folder is empty</h3>
                            <p>Upload a file or create a new folder to get started.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div 
                              className="fm-item-name" 
                              onClick={() => item.is_dir ? navigateTo(item.path) : downloadFile(item.path)}
                            >
                              {getFileIcon(item.extension, item.is_dir)}
                              {item.name}
                            </div>
                          </td>
                          <td>{item.size_formatted}</td>
                          <td>{item.modified_at}</td>
                          <td>
                            <div className="fm-row-actions">
                              {item.is_dir ? (
                                <button className="fm-action-icon" onClick={() => navigateTo(item.path)} title="Open Folder">
                                  <ArrowRightCircle size={16} />
                                </button>
                              ) : (
                                <button className="fm-action-icon" onClick={() => downloadFile(item.path)} title="Download File">
                                  <Download size={16} />
                                </button>
                              )}
                              <button className="fm-action-icon" onClick={() => setRenameModal({ isOpen: true, item, newName: item.name })} title="Rename">
                                <Edit2 size={16} />
                              </button>
                              <button className="fm-action-icon" onClick={() => {
                                const parentPath = item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : '';
                                const otherFolders = allFolders.filter(f => f.path !== parentPath);
                                const defaultTarget = otherFolders.length > 0 ? otherFolders[0].path : '';
                                setMoveCopyModal({ isOpen: true, item, action: 'move', targetFolder: defaultTarget });
                              }} title="Move">
                                <Folder size={16} />
                              </button>
                              <button className="fm-action-icon" onClick={() => {
                                const parentPath = item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : '';
                                const otherFolders = allFolders.filter(f => f.path !== parentPath);
                                const defaultTarget = otherFolders.length > 0 ? otherFolders[0].path : '';
                                setMoveCopyModal({ isOpen: true, item, action: 'copy', targetFolder: defaultTarget });
                              }} title="Copy">
                                <Copy size={16} />
                              </button>
                              <button className="fm-action-icon danger" onClick={() => setDeleteModal({ isOpen: true, item })} title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {folderModal.isOpen && (
        <div className="fm-modal-overlay">
          <div className="fm-modal">
            <div className="fm-modal-header">
              <h3>Create New Folder</h3>
              <button className="fm-modal-close" onClick={() => setFolderModal({ isOpen: false, folderName: '' })}><X size={20} /></button>
            </div>
            <div className="fm-modal-body">
              <label className="fm-label">Folder Name:</label>
              <input 
                autoFocus
                type="text" 
                className="fm-input" 
                placeholder="e.g. Invoices, Contracts"
                value={folderModal.folderName}
                onChange={e => setFolderModal({ ...folderModal, folderName: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
              />
            </div>
            <div className="fm-modal-footer">
              <button className="fm-btn fm-btn-secondary" onClick={() => setFolderModal({ isOpen: false, folderName: '' })}>Cancel</button>
              <button className="fm-btn fm-btn-primary" onClick={createFolder}>Create Folder</button>
            </div>
          </div>
        </div>
      )}

      {renameModal.isOpen && renameModal.item && (
        <div className="fm-modal-overlay">
          <div className="fm-modal">
            <div className="fm-modal-header">
              <h3>Rename {renameModal.item.is_dir ? 'Folder' : 'File'}</h3>
              <button className="fm-modal-close" onClick={() => setRenameModal({ isOpen: false, item: null, newName: '' })}><X size={20} /></button>
            </div>
            <div className="fm-modal-body">
              <label className="fm-label">New Name:</label>
              <input 
                autoFocus
                type="text" 
                className="fm-input" 
                value={renameModal.newName}
                onChange={e => setRenameModal({ ...renameModal, newName: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && renameItem()}
              />
            </div>
            <div className="fm-modal-footer">
              <button className="fm-btn fm-btn-secondary" onClick={() => setRenameModal({ isOpen: false, item: null, newName: '' })}>Cancel</button>
              <button className="fm-btn fm-btn-primary" onClick={renameItem}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {moveCopyModal.isOpen && moveCopyModal.item && (
        <div className="fm-modal-overlay">
          <div className="fm-modal">
            <div className="fm-modal-header">
              <h3>{moveCopyModal.action === 'move' ? 'Move' : 'Copy'} Item</h3>
              <button className="fm-modal-close" onClick={() => setMoveCopyModal({ isOpen: false, item: null, action: 'move', targetFolder: '' })}><X size={20} /></button>
            </div>
            <div className="fm-modal-body">
              <label className="fm-label">Select Destination Folder:</label>
              <select 
                className="fm-select" 
                value={moveCopyModal.targetFolder}
                onChange={e => setMoveCopyModal({ ...moveCopyModal, targetFolder: e.target.value })}
              >
                {allFolders.filter(f => {
                  const itemParent = moveCopyModal.item?.path?.includes('/') 
                    ? moveCopyModal.item.path.substring(0, moveCopyModal.item.path.lastIndexOf('/')) 
                    : '';
                  return f.path !== itemParent;
                }).map(f => (
                  <option key={f.path || '__root__'} value={f.path}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="fm-modal-footer">
              <button className="fm-btn fm-btn-secondary" onClick={() => setMoveCopyModal({ isOpen: false, item: null, action: 'move', targetFolder: '' })}>Cancel</button>
              <button className="fm-btn fm-btn-primary" onClick={moveCopyItem}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && deleteModal.item && (
        <div className="fm-modal-overlay">
          <div className="fm-modal">
            <div className="fm-modal-header">
              <h3>Confirm Deletion</h3>
              <button className="fm-modal-close" onClick={() => setDeleteModal({ isOpen: false, item: null })}><X size={20} /></button>
            </div>
            <div className="fm-modal-body">
              <p className="text-sm text-slate-600 mb-3">Are you sure you want to delete <strong>{deleteModal.item.name}</strong>?</p>
              {deleteModal.item.is_dir && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>Warning: This is a folder. Deleting it will permanently erase all files and subfolders inside it!</span>
                </div>
              )}
            </div>
            <div className="fm-modal-footer">
              <button className="fm-btn fm-btn-secondary" onClick={() => setDeleteModal({ isOpen: false, item: null })}>Cancel</button>
              <button className="fm-btn fm-btn-danger" onClick={deleteItem}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast.show && (
        <div className="fm-toast-container">
          <div className={`fm-toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-red-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
