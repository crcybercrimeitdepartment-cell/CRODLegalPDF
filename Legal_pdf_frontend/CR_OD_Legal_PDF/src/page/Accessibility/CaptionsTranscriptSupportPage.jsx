import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Upload, Play, Pause, Plus, CheckCheck, Download, Upload as UploadIcon, Trash2, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') + '/api/accessibility';

function parseTimeToSeconds(timeStr) {
  var clean = timeStr.replace(',', '.');
  var parts = clean.split(':');
  if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(clean) || 0;
}

function formatTime(sec) {
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export default function CaptionsTranscriptSupportPage({ onBack }) {
  var [documentId, setDocumentId] = useState(null);
  var [fileStatus, setFileStatus] = useState('');
  var [showWorkspace, setShowWorkspace] = useState(false);

  var [tracks, setTracks] = useState([]);
  var [activeTrackId, setActiveTrackId] = useState(null);
  var [playing, setPlaying] = useState(false);
  var [currentTime, setCurrentTime] = useState(0);
  var [duration, setDuration] = useState(30);
  var [captionText, setCaptionText] = useState('[Captions Preview Area]');

  var [captions, setCaptions] = useState([]);
  var [validationIssues, setValidationIssues] = useState([]);

  var [transcript, setTranscript] = useState('');

  var playTimerRef = useRef(null);
  var fileInputRef = useRef(null);

  var activeTrack = tracks.find(function (t) { return t.track_id === activeTrackId; });

  var trackCount = tracks.length;
  var withCaps = tracks.filter(function (t) { return t.has_captions; }).length;
  var coverage = trackCount > 0 ? Math.round((withCaps / trackCount) * 100) : 100;

  var uploadPdf = useCallback(async function (file) {
    setFileStatus('Uploading "' + file.name + '"...');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      var data = await res.json();
      setDocumentId(data.document_id);
      setFileStatus('\u2713 Uploaded: ' + data.filename + ' (' + data.page_count + ' pages)');
      setShowWorkspace(true);
      await loadWorkspaceData(data.document_id);
    } catch (err) {
      setFileStatus('\u2717 Upload failed: ' + err.message);
    }
  }, []);

  var loadWorkspaceData = useCallback(async function (docId) {
    try {
      var res = await fetch(API_BASE + '/captions-transcripts/' + docId + '/extract');
      var data = await res.json();
      if (data.success) {
        setTracks(data.tracks || []);
        setTranscript(data.full_transcript_text || '');
        if (data.tracks && data.tracks.length > 0) selectTrack(data.tracks[0].track_id, data.tracks);
      }
    } catch (err) { console.error(err); }
  }, []);

  var selectTrack = useCallback(function (trackId, allTracks) {
    var t = (allTracks || tracks).find(function (tr) { return tr.track_id === trackId; });
    if (!t) return;
    setActiveTrackId(trackId);
    setDuration(t.duration_seconds || 30);
    setCurrentTime(0);
    setCaptions(t.captions || []);
    setPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);
  }, [tracks]);

  var handleDrop = useCallback(function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') uploadPdf(f); }, [uploadPdf]);
  var handleFileSelect = useCallback(function (e) { var f = e.target.files[0]; if (f) uploadPdf(f); }, [uploadPdf]);

  var validateCaptions = useCallback(async function (caps) {
    if (!documentId || !activeTrackId) return;
    try {
      var res = await fetch(API_BASE + '/captions-transcripts/' + documentId + '/validate-captions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: activeTrackId, captions: caps }),
      });
      var data = await res.json();
      if (data.success && !data.is_valid) setValidationIssues(data.issues || []);
      else setValidationIssues([]);
    } catch (err) { console.error(err); }
  }, [documentId, activeTrackId]);

  var updateCaption = useCallback(function (idx, field, value) {
    setCaptions(function (prev) {
      var updated = prev.map(function (c, i) { return i === idx ? Object.assign({}, c, Object.fromEntries([[field, value]])) : c; });
      validateCaptions(updated);
      return updated;
    });
  }, [validateCaptions]);

  var addCaptionRow = useCallback(function () {
    setCaptions(function (prev) {
      var updated = prev.concat([{ start_time: '00:00:00.000', end_time: '00:00:05.000', speaker: 'Narrator', text: 'New caption text.' }]);
      validateCaptions(updated);
      return updated;
    });
  }, [validateCaptions]);

  var removeCaptionRow = useCallback(function (idx) {
    setCaptions(function (prev) {
      var updated = prev.filter(function (_, i) { return i !== idx; });
      validateCaptions(updated);
      return updated;
    });
  }, [validateCaptions]);

  var saveCaptions = useCallback(async function () {
    if (!documentId || !activeTrackId) return;
    try {
      var res = await fetch(API_BASE + '/captions-transcripts/' + documentId + '/update-captions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: activeTrackId, captions: captions }),
      });
      var data = await res.json();
      if (data.success) {
        setTracks(function (prev) { return prev.map(function (t) { return t.track_id === activeTrackId ? Object.assign({}, t, { captions: captions, has_captions: captions.length > 0 }) : t; }); });
        alert('Captions saved successfully!');
      }
    } catch (err) { alert('Failed: ' + err.message); }
  }, [documentId, activeTrackId, captions]);

  var saveTranscript = useCallback(async function () {
    if (!documentId) return;
    try {
      var res = await fetch(API_BASE + '/captions-transcripts/' + documentId + '/update-transcript', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_text: transcript }),
      });
      var data = await res.json();
      if (data.success) alert('Transcript saved!');
    } catch (err) { alert('Failed: ' + err.message); }
  }, [documentId, transcript]);

  var generateTranscript = useCallback(async function () {
    if (!documentId || !activeTrackId) return;
    try {
      var res = await fetch(API_BASE + '/captions-transcripts/' + documentId + '/generate-transcript?track_id=' + activeTrackId, { method: 'POST' });
      var data = await res.json();
      if (data.success) { alert('Transcript generated!'); await loadWorkspaceData(documentId); }
    } catch (err) { alert(err.message); }
  }, [documentId, activeTrackId, loadWorkspaceData]);

  var importCaptions = useCallback(async function (e) {
    var file = e.target.files[0];
    if (!file || !documentId || !activeTrackId) return;
    try {
      var formData = new FormData();
      formData.append('file', file);
      var res = await fetch(API_BASE + '/captions-transcripts/' + documentId + '/import-captions?track_id=' + activeTrackId, { method: 'POST', body: formData });
      var data = await res.json();
      if (data.success) { alert('Captions imported!'); await loadWorkspaceData(documentId); }
      else alert(data.detail || 'Import failed');
    } catch (err) { alert(err.message); }
  }, [documentId, activeTrackId, loadWorkspaceData]);

  var togglePlayback = useCallback(function () {
    if (playing) {
      setPlaying(false);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    } else {
      setPlaying(true);
      playTimerRef.current = setInterval(function () {
        setCurrentTime(function (t) {
          var next = t + 0.5;
          if (next >= duration) { setPlaying(false); clearInterval(playTimerRef.current); return duration; }
          return next;
        });
      }, 500);
    }
  }, [playing, duration]);

  useEffect(function () {
    if (activeTrack && activeTrack.captions) {
      var matching = '[No caption at this segment]';
      activeTrack.captions.forEach(function (c) {
        var s = parseTimeToSeconds(c.start_time);
        var e = parseTimeToSeconds(c.end_time);
        if (currentTime >= s && currentTime <= e) matching = c.speaker ? c.speaker + ': ' + c.text : c.text;
      });
      setCaptionText(matching);
    }
  }, [currentTime, activeTrack]);

  useEffect(function () { return function () { if (playTimerRef.current) clearInterval(playTimerRef.current); }; }, []);

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">{'\u2601'} Captions & Transcript Support</h1>
                  </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10 flex flex-col">
        
        {!showWorkspace && (
          <div onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-8 text-center cursor-pointer bg-white hover:border-amber-400 hover:bg-amber-50/30 transition mb-6">
            <Upload className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="m-0 mb-1.5 text-slate-800">Click to upload PDF Document</h3>
            <p className="m-0 text-[13px] text-slate-500">Supports PDF files up to 50MB</p>
            {fileStatus && <div className="mt-3 font-semibold text-sm" style={{ color: fileStatus.indexOf('\u2713') >= 0 ? '#059669' : '#ef4444' }}>{fileStatus}</div>}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />

        {!showWorkspace && !fileStatus && (
          <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-500 font-medium">Upload a PDF to begin captions & transcript verification.</h3>
          </div>
        )}

        {showWorkspace && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="mt-0 mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-amber-500">{'\u266B'}</span> Media Tracks
              </h3>
              <div className="flex flex-col gap-3">
                {tracks.map(function (t) {
                  return (
                    <div key={t.track_id} onClick={function () { selectTrack(t.track_id); }}
                      className={'bg-white border rounded-xl p-4 cursor-pointer transition-all ' + (t.track_id === activeTrackId ? 'border-amber-400 shadow-md' : 'border-slate-200 hover:shadow-md')}>
                      <div className="flex justify-between items-center">
                        <h5 className="m-0 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                          <span className="text-amber-500">{'\u25B6'}</span> {t.title}
                        </h5>
                        <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded">Page {t.page_number}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5">
                        Type: {t.media_type} | Captions: <span className={'font-semibold ' + (t.has_captions ? 'text-emerald-600' : 'text-amber-600')}>{t.has_captions ? 'Available' : 'Missing'}</span>
                      </div>
                    </div>
                  );
                })}
                {tracks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No media tracks detected.</p>}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-6 shadow-sm">
                <h4 className="mt-0 mb-2 text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                  <span>{'\uD83D\uDCCA'}</span> Accessibility Status
                </h4>
                <div className="text-[13px] text-amber-900 leading-relaxed">
                  <div><strong>Total Tracks:</strong> {trackCount}</div>
                  <div><strong>With Captions:</strong> {withCaps}</div>
                  <div><strong>Captions Coverage:</strong> {coverage}%</div>
                  <div className="mt-2 font-semibold" style={{ color: coverage === 100 ? '#047857' : '#b45309' }}>
                    {coverage === 100 ? '\u2713 All multimedia tracks are accessible' : '\u26A0 Missing synchronized captions on some tracks'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="bg-black rounded-xl overflow-hidden relative">
                <div className="p-4 text-center">
                  <span className="text-3xl text-slate-500 mb-3 block">{'\uD83C\uDFA5'}</span>
                  <div className="font-semibold text-base text-white">{activeTrack ? activeTrack.title : 'No Track Selected'}</div>
                  <div className="text-[13px] text-slate-400 mt-1">{activeTrack ? 'Type: ' + activeTrack.media_type + ' | Duration: ' + activeTrack.duration_seconds + 's' : 'Select a media track to preview captions'}</div>
                  {activeTrack && (
                    <div className="mt-4 max-w-[450px] mx-auto">
                      <div className="bg-slate-800 px-4 py-3 rounded-lg font-mono text-sm text-white mb-3 min-h-[44px]">{captionText}</div>
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={togglePlayback}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer"
                          style={{ background: playing ? '#d97706' : '#334155' }}>
                          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} {playing ? 'Pause' : 'Play'}
                        </button>
                        <span className="text-xs text-slate-400 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="m-0 text-base font-semibold text-slate-800 flex items-center gap-2">
                    <span className="text-amber-500">{'\u270F'}</span> Caption Track Editor
                  </h3>
                  <div className="flex gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                      <UploadIcon className="w-3.5 h-3.5" /> Import SRT/VTT
                      <input type="file" accept=".srt,.vtt" className="hidden" onChange={importCaptions} />
                    </label>
                    <a href={documentId && activeTrackId ? API_BASE + '/captions-transcripts/' + documentId + '/export-captions/' + activeTrackId + '/srt' : '#'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 no-underline">
                      <Download className="w-3.5 h-3.5" /> Export SRT
                    </a>
                    <a href={documentId && activeTrackId ? API_BASE + '/captions-transcripts/' + documentId + '/export-captions/' + activeTrackId + '/vtt' : '#'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 no-underline">
                      <Download className="w-3.5 h-3.5" /> Export VTT
                    </a>
                  </div>
                </div>

                {validationIssues.length > 0 && (
                  <div className="mb-4">
                    {validationIssues.map(function (iss, i) {
                      return (
                        <div key={i} className="bg-red-50 border-l-4 border-red-500 text-red-800 px-3 py-2 rounded text-[13px] mb-2 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span><strong>[{iss.severity}]</strong> {iss.description}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-2.5 border-b-2 border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[120px]">Start Time</th>
                        <th className="text-left px-3 py-2.5 border-b-2 border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[120px]">End Time</th>
                        <th className="text-left px-3 py-2.5 border-b-2 border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[110px]">Speaker</th>
                        <th className="text-left px-3 py-2.5 border-b-2 border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider">Caption Text</th>
                        <th className="text-left px-3 py-2.5 border-b-2 border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[70px]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {captions.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">No captions. Use Import or Add Entry.</td></tr>
                      )}
                      {captions.map(function (c, idx) {
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 border-b border-slate-100">
                              <input type="text" value={c.start_time} onChange={function (e) { updateCaption(idx, 'start_time', e.target.value); }}
                                className="w-[100px] px-2 py-1.5 border border-slate-200 rounded text-xs font-mono bg-white text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100" />
                            </td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              <input type="text" value={c.end_time} onChange={function (e) { updateCaption(idx, 'end_time', e.target.value); }}
                                className="w-[100px] px-2 py-1.5 border border-slate-200 rounded text-xs font-mono bg-white text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100" />
                            </td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              <input type="text" value={c.speaker || ''} onChange={function (e) { updateCaption(idx, 'speaker', e.target.value); }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100" placeholder="Speaker" />
                            </td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              <input type="text" value={c.text} onChange={function (e) { updateCaption(idx, 'text', e.target.value); }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 min-h-[36px]" />
                            </td>
                            <td className="px-3 py-2 border-b border-slate-100">
                              <button onClick={function () { removeCaptionRow(idx); }}
                                className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button onClick={addCaptionRow}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Plus className="w-4 h-4" /> Add Entry
                  </button>
                  <button onClick={saveCaptions}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 cursor-pointer">
                    <CheckCheck className="w-4 h-4" /> Save Captions
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="m-0 text-base font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" /> Full Transcript Workspace
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={generateTranscript}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                      <span>{'\u2728'}</span> Auto-Generate
                    </button>
                    <a href={documentId ? API_BASE + '/captions-transcripts/' + documentId + '/export-transcript' : '#'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 no-underline">
                      <Download className="w-3.5 h-3.5" /> Export TXT
                    </a>
                  </div>
                </div>
                <textarea value={transcript} onChange={function (e) { setTranscript(e.target.value); }}
                  placeholder="Write full document transcript text here..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-4 text-sm leading-relaxed max-h-[400px] overflow-y-auto resize-y min-h-[120px]" />
                <div className="flex justify-end mt-3">
                  <button onClick={saveTranscript}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 cursor-pointer">
                    <CheckCheck className="w-4 h-4" /> Save Transcript
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
