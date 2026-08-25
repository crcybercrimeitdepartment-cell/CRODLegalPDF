import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle, Search, Filter, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function CopyrightAuditTrailPage({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  const [filterType, setFilterType] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [expandedEvents, setExpandedEvents] = useState({});
  
  const inputRef = useRef();

  const toolName = tool?.name || tool?.title || 'Copyright Audit Trail';
  const toolDesc = tool?.description || 'Track and view copyright-related activities performed on your PDF documents.';
  
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
      setFiles([valid[0]]);
      setIsDone(false);
      setAllEvents([]);
      setFilteredEvents([]);
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.length) addFiles(e.target.files); };
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); 
  };
  
  const handleRemove = (idx) => { 
    setFiles([]); 
    setIsDone(false); 
    setAllEvents([]);
    setFilteredEvents([]);
    setError(''); 
  };

  const loadEvents = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setError('');
    setIsDone(false);
    
    const fd = new FormData();
    fd.append('file', files[0].originalFile);
    
    try {
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/audit-trail/get-events`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) {
        throw new Error(d.detail || 'Failed to load events');
      }
      
      const events = d.events || [];
      setAllEvents(events);
      setFilteredEvents(events);
      setIsDone(true);
    } catch (e) {
      setError('Error: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateReport = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      const fd = new FormData();
      fd.append('file', files[0].originalFile);
      
      const r = await fetch(`${API_BASE_URL}/api/pdf-copyright-protection/audit-trail/report`, { method: 'POST', body: fd });
      const d = await r.json();
      
      if (!r.ok) {
        throw new Error(d.detail || 'Report failed');
      }

      const rep = d.report || {};
      const docInfo = rep.document_info || {};
      const summary = rep.event_type_summary || {};

      let text = `====================================================\n`;
      text += `          COPYRIGHT AUDIT TRAIL REPORT\n`;
      text += `====================================================\n\n`;
      text += `Document Title  : ${docInfo.title || 'Untitled'}\n`;
      text += `Document Author : ${docInfo.author || 'Not Available'}\n`;
      text += `Document Hash   : ${docInfo.document_hash || 'N/A'}\n`;
      text += `Report Timestamp: ${new Date(d.timestamp).toLocaleString()}\n\n`;
      text += `Summary:\n`;
      text += `----------------------------------------------------\n`;
      text += `Total Events Recorded: ${rep.total_events || 0}\n`;
      for (const [et, count] of Object.entries(summary)) {
        text += `  - ${et}: ${count}\n`;
      }
      text += `\n`;
      text += `Audit Events:\n`;
      text += `----------------------------------------------------\n`;
      if (!rep.events || rep.events.length === 0) {
        text += `No audit events recorded for this document yet.\n`;
      } else {
        rep.events.forEach((e, idx) => {
          text += `[Event #${idx + 1}] — ${e.event_type}\n`;
          text += `  Timestamp  : ${new Date(e.timestamp).toLocaleString()}\n`;
          text += `  Description: ${e.description || 'N/A'}\n`;
          text += `  Action Res : ${e.action_result || 'N/A'}\n`;
          text += `  Source     : ${e.source || 'N/A'}\n`;
          if (e.new_value) {
            text += `  Details    : ${JSON.stringify(e.new_value)}\n`;
          }
          text += `\n`;
        });
      }
      text += `\n`;
      text += `----------------------------------------------------\n`;
      text += `Disclaimer: ${d.disclaimer || ''}\n`;
      text += `====================================================\n`;

      const blob = new Blob([text], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'audit-trail-report.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError('Error: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyFilter = () => {
    let filtered = allEvents;
    
    if (filterType) {
      filtered = filtered.filter(e => e.event_type === filterType);
    }
    if (filterStart) {
      filtered = filtered.filter(e => {
        const dt = e.timestamp ? e.timestamp.substring(0, 10) : '';
        return dt >= filterStart;
      });
    }
    if (filterEnd) {
      filtered = filtered.filter(e => {
        const dt = e.timestamp ? e.timestamp.substring(0, 10) : '';
        return dt <= filterEnd;
      });
    }
    
    setFilteredEvents(filtered);
  };

  const clearFilter = () => {
    setFilterType('');
    setFilterStart('');
    setFilterEnd('');
    setFilteredEvents(allEvents);
  };

  const toggleEvent = (idx) => {
    setExpandedEvents(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getBadgeClass = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('created') || t.includes('record')) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (t.includes('update') || t.includes('change')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (t.includes('verif')) return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    if (t.includes('transfer')) return 'bg-purple-100 text-purple-800 border border-purple-200';
    return 'bg-slate-100 text-slate-800 border border-slate-200';
  };

  const eventTypes = [...new Set(allEvents.map(e => e.event_type))];

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
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">Drop file here or click to browse</p>
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
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">File selected</p>
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
                <div className="mt-8">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px]">
                      <div className="speeder-loader-wrapper">
                        <div className="loader"><span><span></span><span></span><span></span><span></span></span><div className="base"><span></span><div className="face"></div></div></div>
                        <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#1e2a52] mt-2 animate-pulse">Processing Request… Please wait!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button onClick={loadEvents} className="bg-[#1e2a52] hover:bg-[#16203e] text-white px-8 py-3.5 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 flex-1 sm:max-w-[240px]">
                        <Search className="w-4 h-4" /> Load Events
                      </button>
                      <button onClick={generateReport} className="bg-white hover:bg-slate-50 text-[#1e2a52] border-2 border-[#1e2a52] px-8 py-3.5 rounded-full font-bold shadow-sm transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 flex-1 sm:max-w-[240px]">
                        <Download className="w-4 h-4" /> Download Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result Area */}
          {isDone && (
            <div className="w-full text-left">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Done! Events Loaded.
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setIsDone(false); setFiles([]); setAllEvents([]); setFilteredEvents([]); }} className="text-slate-500 hover:text-slate-700 text-xs font-bold underline transition-colors">
                    Upload new file
                  </button>
                </div>
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-6">Filter Events</h2>
              <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-5 rounded-xl border border-slate-200/80 mb-8">
                <div className="flex-1 w-full space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Event Type</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-700 text-sm font-medium transition-all"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {eventTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 w-full space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-700 text-sm font-medium transition-all"
                    value={filterStart}
                    onChange={(e) => setFilterStart(e.target.value)}
                  />
                </div>
                <div className="flex-1 w-full space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e2a52] focus:border-[#1e2a52] bg-white text-slate-700 text-sm font-medium transition-all"
                    value={filterEnd}
                    onChange={(e) => setFilterEnd(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <button 
                    className="flex-1 px-5 py-2.5 bg-[#1e2a52] text-white font-bold rounded-lg hover:bg-[#16203e] transition-colors shadow-sm focus:ring-2 focus:ring-[#1e2a52] focus:ring-offset-2 text-sm inline-flex items-center justify-center gap-1.5"
                    onClick={applyFilter}
                  >
                    <Filter className="w-4 h-4" /> Apply
                  </button>
                  <button 
                    className="flex-1 px-5 py-2.5 bg-white text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 text-sm"
                    onClick={clearFilter}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
                <span>Audit Events</span>
                <span className="text-xs font-bold text-[#1e2a52] bg-[#1e2a52]/10 px-3 py-1 rounded-full">{filteredEvents.length} records</span>
              </h2>
              
              <div className="space-y-4">
                {filteredEvents.length === 0 ? (
                  <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-slate-900 mb-1">No events found</p>
                    <p className="text-sm">Try adjusting your filters or upload a different document.</p>
                  </div>
                ) : (
                  filteredEvents.map((e, idx) => (
                    <div 
                      key={idx} 
                      className={`border rounded-xl overflow-hidden transition-all cursor-pointer group shadow-sm hover:shadow-md ${expandedEvents[idx] ? 'border-[#1e2a52] bg-[#f8faf7]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      onClick={() => toggleEvent(idx)}
                    >
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${getBadgeClass(e.event_type)} w-max`}>
                            {e.event_type}
                          </span>
                          <div className={`text-sm font-bold ${expandedEvents[idx] ? 'text-[#1e2a52]' : 'text-slate-700'}`}>
                            {e.description || e.document_name || 'Event logged'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-medium text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {e.timestamp}
                          </div>
                          <div className={`transform transition-transform duration-200 text-slate-400 group-hover:text-[#1e2a52] ${expandedEvents[idx] ? 'text-[#1e2a52] rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                      
                      {expandedEvents[idx] && (
                        <div className="px-5 py-4 bg-white/50 border-t border-slate-200/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Document Name</div>
                              <div className="text-slate-900 font-semibold">{e.document_name || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Source</div>
                              <div className="text-slate-900 font-semibold">{e.source || 'N/A'}</div>
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Document Hash</div>
                              <div className="text-slate-700 font-mono text-xs bg-white p-2.5 rounded-lg border border-slate-200/80 break-all">{e.document_hash || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action Result</div>
                              <div className="text-slate-900 font-semibold">{e.action_result || 'N/A'}</div>
                            </div>
                            
                            {e.previous_value && (
                              <div className="md:col-span-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Value</div>
                                <div className="text-slate-700 font-mono text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/80 overflow-x-auto">
                                  <pre>{JSON.stringify(e.previous_value, null, 2)}</pre>
                                </div>
                              </div>
                            )}
                            
                            {e.new_value && (
                              <div className="md:col-span-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Value</div>
                                <div className="text-slate-700 font-mono text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/80 overflow-x-auto">
                                  <pre>{JSON.stringify(e.new_value, null, 2)}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-8 flex flex-col sm:flex-row justify-center pt-6 border-t border-slate-200/80">
                <button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer inline-flex justify-center items-center gap-2 hover:scale-105 active:scale-95 w-full sm:w-auto" 
                  onClick={generateReport}
                >
                  <Download className="w-4 h-4" />
                  Download Full Report
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
