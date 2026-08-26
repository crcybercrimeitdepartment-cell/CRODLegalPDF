import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Plus, Trash2, Edit2, Search, X, AlertTriangle, Video, FileText } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

var LANGUAGES = [
  { value: 'ASL', label: 'American Sign Language (ASL)' },
  { value: 'ISL', label: 'Indian Sign Language (ISL)' },
  { value: 'BSL', label: 'British Sign Language (BSL)' },
];

export default function SignLanguageVideoSupportPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showWorkspace, setShowWorkspace] = useState(false);
  var [totalPages, setTotalPages] = useState(1);
  var [deafScore, setDeafScore] = useState(0);

  var [videoLinks, setVideoLinks] = useState([]);
  var [activePage, setActivePage] = useState(1);
  var [searchQuery, setSearchQuery] = useState('');
  var [filterLang, setFilterLang] = useState('');

  var [showAddModal, setShowAddModal] = useState(false);
  var [editLinkId, setEditLinkId] = useState(null);
  var [modalTitle, setModalTitle] = useState('Add Sign Language Video');

  var [videoUrl, setVideoUrl] = useState('');
  var [videoTitle, setVideoTitle] = useState('');
  var [videoDesc, setVideoDesc] = useState('');
  var [videoPage, setVideoPage] = useState(1);
  var [videoSection, setVideoSection] = useState('');
  var [videoLang, setVideoLang] = useState('ASL');
  var [videoLangOther, setVideoLangOther] = useState('');
  var [uploadFileName, setUploadFileName] = useState('No local video selected.');

  var [showDeleteModal, setShowDeleteModal] = useState(false);
  var [deleteLinkId, setDeleteLinkId] = useState(null);

  var fileInputRef = useRef(null);
  var videoFileRef = useRef(null);

  var filteredVideos = videoLinks.filter(function (l) {
    var matchPage = !activePage || l.page_number === activePage;
    var q = searchQuery.toLowerCase();
    var matchSearch = !q || (l.section_title && l.section_title.toLowerCase().indexOf(q) >= 0) || (l.description && l.description.toLowerCase().indexOf(q) >= 0);
    var matchLang = !filterLang || l.language_code === filterLang;
    return matchPage && matchSearch && matchLang;
  });

  var pageVideoCounts = {};
  videoLinks.forEach(function (l) { pageVideoCounts[l.page_number] = (pageVideoCounts[l.page_number] || 0) + 1; });

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Uploading "' + file.name + '"...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      var data = await res.json();
      setDocumentId(data.document_id);
      setTotalPages(data.page_count || 1);
      setFileStatus('\u2713 Uploaded: ' + data.filename + ' (' + data.page_count + ' pages)');
      setShowWorkspace(true);
      await loadAuditData(data.document_id);
    } catch (err) { setFileStatus('\u2717 Upload failed: ' + err.message); }
  }, []);

  var loadAuditData = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/sign-language/' + docId + '/audit');
      var data = await res.json();
      if (data.success) {
        setVideoLinks(data.links || []);
        setDeafScore(data.deaf_accessibility_score || 0);
      }
    } catch (err) { console.error(err); }
  }, []);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var openAddModal = useCallback(function () {
    setEditLinkId(null);
    setModalTitle('Add Sign Language Video');
    setVideoUrl('');
    setVideoTitle('');
    setVideoDesc('');
    setVideoPage(activePage || 1);
    setVideoSection('');
    setVideoLang('ASL');
    setVideoLangOther('');
    setUploadFileName('No local video selected.');
    setShowAddModal(true);
  }, [activePage]);

  var openEditModal = useCallback(function (link) {
    setEditLinkId(link.link_id);
    setModalTitle('Edit Sign Language Video Link');
    setVideoUrl(link.video_url);
    setVideoTitle(link.section_title);
    setVideoDesc(link.description || '');
    setVideoPage(link.page_number);
    setVideoSection(link.section_title || '');
    if (['ASL', 'ISL', 'BSL'].indexOf(link.language_code) >= 0) { setVideoLang(link.language_code); setVideoLangOther(''); }
    else { setVideoLang('Other'); setVideoLangOther(link.language_code); }
    setUploadFileName('Re-upload is optional.');
    setShowAddModal(true);
  }, []);

  var uploadVideoFile = useCallback(async function (e) {
    var file = e.target.files[0];
    if (!file || !documentId) return;
    setUploadFileName('Uploading "' + file.name + '"...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/sign-language/' + documentId + '/upload-video', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      var data = await res.json();
      setVideoUrl(data.video_url);
      setUploadFileName('\u2713 Uploaded: ' + file.name + ' (' + Math.round(data.file_size / 1024 / 1024 * 10) / 10 + ' MB)');
    } catch (err) { setUploadFileName('\u2717 Upload failed: ' + err.message); }
  }, [documentId]);

  var saveVideo = useCallback(async function () {
    if (!videoTitle.trim() || !videoPage || !videoUrl.trim()) { alert('Please specify Title, Page and Video URL.'); return; }
    if (videoPage < 1 || videoPage > totalPages) { alert('Page must be between 1 and ' + totalPages + '.'); return; }
    var lang = videoLang === 'Other' ? (videoLangOther.trim() || 'Other') : videoLang;
    var payload = { page_number: videoPage, section_title: videoTitle.trim(), video_url: videoUrl.trim(), language_code: lang, description: videoDesc.trim() };
    try {
      var res;
      if (editLinkId) {
        res = await fetch(API_BASE + '/sign-language/' + documentId + '/link/' + editLinkId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(API_BASE + '/sign-language/' + documentId + '/add-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (res.ok) { setShowAddModal(false); await loadAuditData(documentId); }
      else alert('Save failed.');
    } catch (err) { alert(err.message); }
  }, [videoTitle, videoPage, videoUrl, videoLang, videoLangOther, videoDesc, editLinkId, documentId, totalPages, loadAuditData]);

  var deleteVideo = useCallback(async function () {
    if (!deleteLinkId || !documentId) return;
    try {
      var res = await fetch(API_BASE + '/sign-language/' + documentId + '/link/' + deleteLinkId, { method: 'DELETE' });
      if (res.ok) { setShowDeleteModal(false); await loadAuditData(documentId); }
      else alert('Deletion failed.');
    } catch (err) { alert(err.message); }
  }, [deleteLinkId, documentId, loadAuditData]);

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      {/* Header Area */}
      <div className="absolute top-1.5 left-4 sm:top-5 sm:left-8 md:left-12 z-50 flex items-center w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] min-h-[40px]">
        {/* Back Button */}
        <div className="absolute left-0 z-10">
          {onBack && (
            <button onClick={onBack}
              className="text-slate-700 hover:text-[#1e2a52] font-bold flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
        </div>
        
        {/* Centered Title */}
        <div className="flex-1 flex flex-col items-center justify-center text-center pointer-events-none w-full px-20">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">{'\uD83E\uDD1F'} Sign Language Video Support</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        {!showWorkspace && (
          <>
            <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
              onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
              className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-white hover:border-sky-400 hover:bg-sky-50/30 transition mb-6">
              <Upload className="w-10 h-10 text-sky-500 mx-auto mb-3" />
              <h3 className="m-0 mb-1.5 text-slate-800">Click to upload PDF Document</h3>
              <p className="m-0 text-[13px] text-slate-500">Supports PDF files up to 50MB</p>
              {fileStatus && <div className="mt-3 font-semibold text-sm" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#059669' : '#ef4444' }}>{fileStatus}</div>}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            {!fileStatus && (
              <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl">
                <Video className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-500 font-medium">Upload a PDF to link sign language videos.</h3>
              </div>
            )}
          </>
        )}

        {showWorkspace && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold bg-sky-50 text-sky-700 border border-sky-200 mb-5">
                <span className="mr-1.5 text-xs font-normal text-slate-500">Deaf Accessibility Score</span> {deafScore}%
              </div>
              <h4 className="m-0 mb-3 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" /> PDF Pages
              </h4>
              <div className="flex flex-col gap-1 max-h-[350px] overflow-y-auto border border-slate-200 rounded-lg p-2">
                {Array.from({ length: totalPages }, function (_, i) { return i + 1; }).map(function (pg) {
                  var count = pageVideoCounts[pg] || 0;
                  return (
                    <div key={pg} onClick={function () { setActivePage(pg); }}
                      className={'flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border ' + (pg === activePage ? 'bg-sky-50 border-sky-400' : 'bg-white border-slate-200 hover:bg-slate-50')}>
                      <span className="text-sm font-medium text-slate-800">Page {pg}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: count > 0 ? '#e0f2fe' : '#f1f5f9', color: count > 0 ? '#0369a1' : '#64748b' }}>{count} videos</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={searchQuery} onChange={function (e) { setSearchQuery(e.target.value); }}
                    placeholder="Search videos by title..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                </div>
                <select value={filterLang} onChange={function (e) { setFilterLang(e.target.value); }}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:border-sky-400">
                  <option value="">All Sign Languages</option>
                  {LANGUAGES.map(function (l) { return <option key={l.value} value={l.value}>{l.label}</option>; })}
                </select>
                <button onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Add Video
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto">
                {filteredVideos.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">No sign language videos for Page {activePage}.</div>
                )}
                {filteredVideos.map(function (link) {
                  return (
                    <div key={link.link_id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-sky-200 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="m-0 mb-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="text-sky-600">{'\uD83E\uDD1F'}</span> {link.section_title}
                          </h4>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 mr-1.5">{link.language_code}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Page {link.page_number}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={function () { openEditModal(link); }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={function () { setDeleteLinkId(link.link_id); setShowDeleteModal(true); }}
                            className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {link.video_url && (
                        <div className="mt-3 rounded-lg overflow-hidden bg-slate-100 aspect-video flex items-center justify-center text-xs text-slate-400">
                          {link.video_url.includes('youtube') || link.video_url.includes('youtu.be')
                            ? <iframe src={link.video_url} className="w-full h-full border-0" allowFullScreen title={link.section_title} />
                            : <video src={link.video_url} controls className="w-full h-full object-cover" />
                          }
                        </div>
                      )}
                      <p className="m-0 mt-2 text-[13px] text-slate-500 leading-relaxed">{link.description || 'No description provided.'}</p>
                      <div className="text-[11px] text-slate-400 mt-2">Added: {link.created_at || 'Just now'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={function () { setShowAddModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-[520px] max-h-[80vh] overflow-y-auto" onClick={function (e) { e.stopPropagation(); }}>
            <h3 className="mt-0 mb-4 text-base font-semibold text-slate-800 border-b border-slate-200 pb-3">{modalTitle}</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Video Source</label>
              <div className="flex gap-2 items-center">
                <label onClick={function () { videoFileRef.current && videoFileRef.current.click(); }}
                  className="flex-1 text-center inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Video className="w-4 h-4" /> Upload Local Video (MP4/WebM/MOV)
                </label>
                <input ref={videoFileRef} type="file" accept=".mp4,.webm,.mov" className="hidden" onChange={uploadVideoFile} />
              </div>
              <div className="text-xs text-slate-500 mt-1">{uploadFileName}</div>
              <input type="text" value={videoUrl} onChange={function (e) { setVideoUrl(e.target.value); }}
                placeholder="https://www.youtube.com/embed/..."
                className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-400" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Video Title *</label>
              <input type="text" value={videoTitle} onChange={function (e) { setVideoTitle(e.target.value); }}
                placeholder="e.g. Chapter 1 Sign Interpretation"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-400" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description / Context</label>
              <textarea value={videoDesc} onChange={function (e) { setVideoDesc(e.target.value); }} rows={2}
                placeholder="Describe the associated content..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-400 resize-y" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">PDF Page Number *</label>
                <input type="number" min={1} value={videoPage} onChange={function (e) { setVideoPage(parseInt(e.target.value) || 1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Associated Section</label>
                <input type="text" value={videoSection} onChange={function (e) { setVideoSection(e.target.value); }}
                  placeholder="e.g. Emergency Instructions"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-400" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sign Language Type *</label>
              <select value={videoLang} onChange={function (e) { setVideoLang(e.target.value); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-400">
                {LANGUAGES.map(function (l) { return <option key={l.value} value={l.value}>{l.label}</option>; })}
                <option value="Other">Other Custom Type</option>
              </select>
              {videoLang === 'Other' && (
                <input type="text" value={videoLangOther} onChange={function (e) { setVideoLangOther(e.target.value); }}
                  placeholder="Specify sign language..."
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-400" />
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button onClick={function () { setShowAddModal(false); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={saveVideo}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer">Save Video</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={function () { setShowDeleteModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-[400px] text-center" onClick={function (e) { e.stopPropagation(); }}>
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="m-0 mb-2 text-base font-semibold text-slate-800">Remove Sign Language Video?</h3>
            <p className="m-0 mb-5 text-sm text-slate-500 leading-relaxed">This sign language video association will be unlinked. Uploaded local video file will be deleted securely.</p>
            <div className="flex justify-center gap-3">
              <button onClick={function () { setShowDeleteModal(false); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={deleteVideo}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 cursor-pointer">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
