import React, { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function ComparePdfPage() {
    // ── State for Uploads ──────────────────────────────────────────
    const [fileOrig, setFileOrig] = useState(null);
    const [fileRev, setFileRev] = useState(null);
    const [dragOrig, setDragOrig] = useState(false);
    const [dragRev, setDragRev] = useState(false);

    // ── State for Comparison Options ───────────────────────────────
    const [cmpMode, setCmpMode] = useState('smart');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [optIgnoreWs, setOptIgnoreWs] = useState(false);
    const [optIgnoreCase, setOptIgnoreCase] = useState(false);
    const [optIgnoreFmt, setOptIgnoreFmt] = useState(false);
    const [optIgnoreFont, setOptIgnoreFont] = useState(false);
    const [optIgnoreHf, setOptIgnoreHf] = useState(false);
    const [optIgnoreAnnot, setOptIgnoreAnnot] = useState(false);
    const [optIgnoreMeta, setOptIgnoreMeta] = useState(false);

    // ── State for Process/Results ──────────────────────────────────
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const [comparisonData, setComparisonData] = useState(null);
    
    // Derived/Result States
    const [currentRequestId, setCurrentRequestId] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentViewMode, setCurrentViewMode] = useState('side_by_side');
    const [activeFilter, setActiveFilter] = useState('all');
    const [currentDiffIdx, setCurrentDiffIdx] = useState(0);
    const [currentZoom, setCurrentZoom] = useState(1.0);

    const diffListRef = useRef(null);

    // ── File Handlers ──────────────────────────────────────────────
    const handleOrigChange = (e) => {
        if (e.target.files.length) handleFileSelect('orig', e.target.files[0]);
    };
    const handleRevChange = (e) => {
        if (e.target.files.length) handleFileSelect('rev', e.target.files[0]);
    };
    const handleDrop = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'orig') setDragOrig(false);
        else setDragRev(false);
        
        if (e.dataTransfer.files.length) handleFileSelect(type, e.dataTransfer.files[0]);
    };
    const handleDragOver = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'orig') setDragOrig(true);
        else setDragRev(true);
    };
    const handleDragLeave = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'orig') setDragOrig(false);
        else setDragRev(false);
    };

    const handleFileSelect = (type, f) => {
        if (!f.name.toLowerCase().endsWith('.pdf')) { 
            alert('Please select a valid PDF file.'); 
            return; 
        }
        if (type === 'orig') setFileOrig(f);
        else setFileRev(f);
    };

    // ── Action: Start Comparison ───────────────────────────────────
    const startComparison = async () => {
        if (!fileOrig || !fileRev) return;

        setIsProcessing(true);
        setErrorMsg(null);
        setComparisonData(null);

        const fd = new FormData();
        fd.append('original_file', fileOrig);
        fd.append('revised_file', fileRev);
        fd.append('mode', cmpMode);
        fd.append('ignore_whitespace', optIgnoreWs);
        fd.append('ignore_case', optIgnoreCase);
        fd.append('ignore_formatting', optIgnoreFmt);
        fd.append('ignore_font_changes', optIgnoreFont);
        fd.append('ignore_headers_footers', optIgnoreHf);
        fd.append('ignore_annotations', optIgnoreAnnot);
        fd.append('ignore_metadata', optIgnoreMeta);

        try {
            const res = await fetch(`${API_BASE_URL}/api/pdf/compare/process`, { method: 'POST', body: fd });
            if (!res.ok) {
                let msg = 'Comparison failed';
                try { const d = await res.json(); msg = d.detail || msg; } catch(_) {}
                throw new Error(msg);
            }
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Comparison failed');

            setComparisonData(data);
            setCurrentRequestId(data.request_id);
            setTotalPages(Math.max(parseInt(data.summary.original_pages, 10), parseInt(data.summary.revised_pages, 10)));
            setCurrentPage(1);
            setCurrentDiffIdx(0);
            setActiveFilter('all');
            
            // Scroll to results using a timeout to let react render
            setTimeout(() => {
                const resSec = document.getElementById('react-res-sec');
                if (resSec) resSec.scrollIntoView({ behavior: 'smooth' });
            }, 100);

        } catch(e) {
            setErrorMsg('Error: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Results & Filters ──────────────────────────────────────────
    let allDiffs = comparisonData ? (comparisonData.differences || []) : [];
    let filteredDiffs = [];
    
    if (activeFilter === 'all') {
        filteredDiffs = allDiffs;
    } else if (activeFilter === 'text') {
        filteredDiffs = allDiffs.filter(d => ['TEXT_ADDED','TEXT_DELETED','TEXT_MODIFIED'].includes(d.type));
    } else if (activeFilter === 'formatting') {
        filteredDiffs = allDiffs.filter(d => ['FONT_CHANGED','FORMATTING_CHANGED'].includes(d.type));
    } else if (activeFilter === 'tables') {
        filteredDiffs = allDiffs.filter(d => d.type === 'TABLE_CHANGED');
    } else if (activeFilter === 'annotations') {
        filteredDiffs = allDiffs.filter(d => ['ANNOTATION_ADDED','ANNOTATION_DELETED','ANNOTATION_MODIFIED'].includes(d.type));
    } else if (activeFilter === 'important') {
        const impPages = (comparisonData?.important_changes || []).map(i => i.page);
        filteredDiffs = allDiffs.filter(d => impPages.includes(d.page));
    }

    const currentDiff = filteredDiffs[currentDiffIdx];
    
    // Auto sync currentPage with selected diff
    useEffect(() => {
        if (currentDiff && currentDiff.page) {
            setCurrentPage(parseInt(currentDiff.page, 10));
        }
    }, [currentDiff]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
            if (!comparisonData) return;
            
            if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
                setCurrentDiffIdx(prev => Math.min(filteredDiffs.length - 1, prev + 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
                setCurrentDiffIdx(prev => Math.max(0, prev - 1));
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [comparisonData, filteredDiffs.length]);

    // Scroll active list item into view
    useEffect(() => {
        if (diffListRef.current) {
            const activeEl = diffListRef.current.querySelector('.ditem.active');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [currentDiffIdx, activeFilter]);

    // ── Helper Variables ───────────────────────────────────────────
    const formatBytes = (bytes) => (bytes / 1048576).toFixed(2);
    const getGlobalDiffIdx = () => {
        if (filteredDiffs.length > 0 && currentDiff) {
            return allDiffs.indexOf(currentDiff);
        }
        return -1;
    };

    // ── Render Parts ───────────────────────────────────────────────
    return (
        <div className="react-wrapper-compare_pdf">
            <style dangerouslySetInnerHTML={{ __html: `
                .wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem; }
                .hdr { text-align: center; margin-bottom: 2rem; }
                .hdr h1 { font-size: 1.8rem; font-weight: 700; color: #0f172a; }
                .hdr p { color: #64748b; font-size: .95rem; margin-top: .25rem; }

                /* Dual Upload Grid */
                .dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
                @media (max-width: 700px) { .dual-grid { grid-template-columns: 1fr; } }

                /* Upload Zone */
                /* Removed old uzone styles as we are using tailwind now */

                /* Options Panel */
                .panel { border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: #fff; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                .ptitle { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                
                .opt-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
                .opt-item { display: flex; align-items: center; gap: 10px; font-size: .85rem; color: #334155; font-weight: 700; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .opt-item:hover { background: #f1f5f9; border-color: #cbd5e1; }
                .opt-item input[type="checkbox"] { accent-color: #2563eb; width: 18px; height: 18px; cursor: pointer; }

                /* Mode selector */
                .mode-row { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 16px; width: 100%; max-width: 100%; }
                .mode-row label { font-size: .85rem; font-weight: 700; color: #475569; }

                /* Action Button */
                .btn-cmp {
                    width: 100%; padding: 16px 24px; font-size: 1.1rem; font-weight: 800;
                    color: #fff; background: linear-gradient(135deg, #2563eb, #1d4ed8); border: none; border-radius: 12px;
                    cursor: pointer; transition: all .2s; margin-bottom: 24px;
                    display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(37,99,235,0.25);
                }
                .btn-cmp:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.3); }
                .btn-cmp:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 2px 10px rgba(37,99,235,0.2); }
                .btn-cmp:disabled { background: #94a3b8; box-shadow: none; transform: none; cursor: not-allowed; opacity: 0.7; }

                /* Progress & Error */
                .prog { text-align: center; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 16px; }
                .spinner { display: inline-block; width: 26px; height: 26px; border: 3px solid rgba(37,99,235,.2); border-radius: 50%; border-top-color: #2563eb; animation: spin 1s linear infinite; margin-bottom: 6px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                /* Speeder Loader Overrides for Smoother Animation */
                .speeder-loader-wrapper .loader { animation-duration: 1.2s; animation-timing-function: ease-in-out; }
                .speeder-loader-wrapper .loader > span > span:nth-child(1) { animation-duration: 0.6s; }
                .speeder-loader-wrapper .loader > span > span:nth-child(2) { animation-duration: 1.2s; }
                .speeder-loader-wrapper .loader > span > span:nth-child(3) { animation-duration: 1.2s; }
                .speeder-loader-wrapper .loader > span > span:nth-child(4) { animation-duration: 2.5s; }
                .speeder-loader-wrapper .longfazers span:nth-child(1) { animation-duration: 1.2s; }
                .speeder-loader-wrapper .longfazers span:nth-child(2) { animation-duration: 1.6s; }
                .speeder-loader-wrapper .longfazers span:nth-child(3) { animation-duration: 1.2s; }
                .speeder-loader-wrapper .longfazers span:nth-child(4) { animation-duration: 1.0s; }

                /* Stats Grid */
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
                .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center; }
                .stat-num { font-size: 1.25rem; font-weight: 800; color: #2563eb; }
                .stat-lbl { font-size: .75rem; color: #64748b; font-weight: 600; margin-top: 2px; }

                /* Category Filter Badges */
                .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
                .fbadge { padding: 5px 12px; font-size: .78rem; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 20px; background: #fff; cursor: pointer; color: #475569; }
                .fbadge:hover { background: #eff6ff; border-color: #2563eb; }
                .fbadge.active { background: #2563eb; color: #fff; border-color: #2563eb; }

                /* Exports */
                .exp-bar { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
                .btn-exp { padding: 10px 18px; font-size: .88rem; font-weight: 600; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
                .btn-exp.primary { background: #16a34a; color: #fff; border: none; }
                .btn-exp.primary:hover { background: #15803d; }
                .btn-exp.secondary { background: #2563eb; color: #fff; border: none; }
                .btn-exp.secondary:hover { background: #1d4ed8; }

                /* Navigation Bar for Differences & Pages */
                .view-ctrls { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; }
                .vbtn { padding: 6px 12px; font-size: .8rem; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; }
                .vbtn:hover { background: #eff6ff; border-color: #2563eb; }
                .vbtn.active { background: #2563eb; color: #fff; border-color: #2563eb; }

                /* Diff Navigation Box */
                .diff-nav-box { display: flex; align-items: center; gap: 6px; background: #fff; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; }

                /* Comparison Image Viewer */
                .viewer-box { text-align: center; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: #ffffff; min-height: 450px; max-height: 750px; overflow: auto; position: relative; }
                .viewer-box img { max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s ease-in-out; }

                /* Difference List */
                .diff-list { max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; }
                .ditem { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: .82rem; cursor: pointer; }
                .ditem:hover { background: #f8fafc; }
                .ditem.active { background: #eff6ff; border-left: 3px solid #2563eb; }
                .dtag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: .7rem; margin-right: 6px; }
                .dtag.TEXT_ADDED { background: #dcfce7; color: #15803d; }
                .dtag.TEXT_DELETED { background: #fee2e2; color: #b91c1c; }
                .dtag.TEXT_MODIFIED { background: #fef9c3; color: #a16207; }
                .dtag.FONT_CHANGED { background: #e0e7ff; color: #4338ca; }
                .dtag.PAGE_ADDED { background: #dbeafe; color: #1e40af; }
                .dtag.TABLE_CHANGED { background: #f1f5f9; color: #0f172a; }
                .dtag.ANNOTATION_ADDED { background: #fae8ff; color: #86198f; }
            `}} />

            <div className="wrap">
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-6">
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 mb-6">
                        {/* Dual Upload */}
                        <div className="dual-grid">
                            <div>
                            <input type="file" id="origInput" accept=".pdf,application/pdf" className="hidden" onChange={handleOrigChange} />
                            <label 
                                htmlFor="origInput" 
                                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all block h-full ${dragOrig ? 'border-[#1e2a52] bg-[#e8f0e2]' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
                                onDragOver={(e) => handleDragOver(e, 'orig')}
                                onDragLeave={(e) => handleDragLeave(e, 'orig')}
                                onDrop={(e) => handleDrop(e, 'orig')}
                            >
                                <div className="w-12 h-12 bg-[#1e2a52]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <Upload className="w-6 h-6 text-[#1e2a52]" />
                                </div>
                                <p className="text-sm sm:text-base font-bold text-[#1e2a52] mb-1">
                                    Original PDF
                                </p>
                                <p className="text-xs text-slate-500 mb-2">
                                    Drop file here or click to browse
                                </p>
                                {fileOrig && <div className="text-xs font-bold text-[#16a34a] break-all">{fileOrig.name} ({formatBytes(fileOrig.size)} MB)</div>}
                            </label>
                        </div>
                        <div>
                            <input type="file" id="revInput" accept=".pdf,application/pdf" className="hidden" onChange={handleRevChange} />
                            <label 
                                htmlFor="revInput" 
                                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all block h-full ${dragRev ? 'border-[#1e2a52] bg-[#e8f0e2]' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
                                onDragOver={(e) => handleDragOver(e, 'rev')}
                                onDragLeave={(e) => handleDragLeave(e, 'rev')}
                                onDrop={(e) => handleDrop(e, 'rev')}
                            >
                                <div className="w-12 h-12 bg-[#1e2a52]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <Upload className="w-6 h-6 text-[#1e2a52]" />
                                </div>
                                <p className="text-sm sm:text-base font-bold text-[#1e2a52] mb-1">
                                    Revised PDF
                                </p>
                                <p className="text-xs text-slate-500 mb-2">
                                    Drop file here or click to browse
                                </p>
                                {fileRev && <div className="text-xs font-bold text-[#16a34a] break-all">{fileRev.name} ({formatBytes(fileRev.size)} MB)</div>}
                            </label>
                        </div>
                    </div>
                </div>
                </div>
                <div className="card">
                    {/* Options Panel */}
                    <div className="panel">
                        <div className="ptitle">Comparison Settings</div>
                        
                        <div className="mode-row">
                            <label htmlFor="cmpMode">Comparison Mode:</label>
                                <div className="relative w-full" ref={dropdownRef}>
                                    <div 
                                        className="p-2.5 border border-slate-300 rounded-lg bg-slate-50 hover:bg-white text-sm cursor-pointer flex justify-between items-center transition-all outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >                                  <span className="truncate">
                                        {cmpMode === 'smart' && 'Smart Comparison (Text, Layout, Tables, Images & Annotations)'}
                                        {cmpMode === 'full' && 'Full Deep Comparison (All Elements)'}
                                        {cmpMode === 'text' && 'Text Only'}
                                        {cmpMode === 'visual' && 'Visual Appearance Only'}
                                        {cmpMode === 'ocr' && 'OCR Only (For Scanned PDFs)'}
                                    </span>
                                    <svg className="w-4 h-4 ml-2 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                                {isDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {[
                                            { value: 'smart', label: 'Smart Comparison (Text, Layout, Tables, Images & Annotations)' },
                                            { value: 'full', label: 'Full Deep Comparison (All Elements)' },
                                            { value: 'text', label: 'Text Only' },
                                            { value: 'visual', label: 'Visual Appearance Only' },
                                            { value: 'ocr', label: 'OCR Only (For Scanned PDFs)' }
                                        ].map(opt => (
                                            <div 
                                                key={opt.value}
                                                className={`p-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${cmpMode === opt.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
                                                onClick={() => {
                                                    setCmpMode(opt.value);
                                                    setIsDropdownOpen(false);
                                                }}
                                                style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="opt-grid">
                            <label className="opt-item"><input type="checkbox" checked={optIgnoreWs} onChange={e => setOptIgnoreWs(e.target.checked)} /><span>Ignore Whitespace</span></label>
                            <label className="opt-item"><input type="checkbox" checked={optIgnoreCase} onChange={e => setOptIgnoreCase(e.target.checked)} /><span>Ignore Case</span></label>
                            <label className="opt-item"><input type="checkbox" checked={optIgnoreFmt} onChange={e => setOptIgnoreFmt(e.target.checked)} /><span>Ignore Formatting</span></label>
                            <label className="opt-item"><input type="checkbox" checked={optIgnoreFont} onChange={e => setOptIgnoreFont(e.target.checked)} /><span>Ignore Font Changes</span></label>
                            <label className="opt-item"><input type="checkbox" checked={optIgnoreHf} onChange={e => setOptIgnoreHf(e.target.checked)} /><span>Ignore Headers &amp; Footers</span></label>
                            <label className="opt-item"><input type="checkbox" checked={optIgnoreAnnot} onChange={e => setOptIgnoreAnnot(e.target.checked)} /><span>Ignore Annotations</span></label>
                            <label className="opt-item"><input type="checkbox" checked={optIgnoreMeta} onChange={e => setOptIgnoreMeta(e.target.checked)} /><span>Ignore Metadata</span></label>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button className="btn-cmp" disabled={!fileOrig || !fileRev || isProcessing} onClick={startComparison}>
                        Start Comparison
                    </button>

                    {/* Progress */}
                    {isProcessing && (
                        <div className="flex flex-col items-center justify-center p-6 bg-[#f8faf7] border border-slate-200/80 rounded-2xl overflow-hidden relative min-h-[160px] mb-4 mt-2">
                            <div className="speeder-loader-wrapper">
                                <div className="loader">
                                    <span>
                                        <span></span><span></span><span></span><span></span>
                                    </span>
                                    <div className="base">
                                        <span></span>
                                        <div className="face"></div>
                                    </div>
                                </div>
                                <div className="longfazers">
                                    <span></span><span></span><span></span><span></span>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-[#1e2a52] mt-4 animate-pulse">Comparing PDFs... Please wait!</p>
                            <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">Analyzing text, formatting, tables, annotations, images, and page structure</p>
                        </div>
                    )}

                    {/* Error Box */}
                    {errorMsg && (
                        <div style={{background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', padding:'12px', borderRadius:'8px', marginBottom:'16px', textAlign:'center', fontWeight:600}}>
                            {errorMsg}
                        </div>
                    )}

                    {/* Results Section */}
                    {comparisonData && (
                        <div id="react-res-sec">
                            {/* Stats */}
                            <div className="stats-grid">
                                <div className="stat-card"><div className="stat-num">{comparisonData.summary.counts.all}</div><div className="stat-lbl">Total Diff</div></div>
                                <div className="stat-card"><div className="stat-num">{comparisonData.summary.original_pages}/{comparisonData.summary.revised_pages}</div><div className="stat-lbl">Orig/Rev Pages</div></div>
                                <div className="stat-card"><div className="stat-num">{comparisonData.summary.counts.text}</div><div className="stat-lbl">Text Diff</div></div>
                                <div className="stat-card"><div className="stat-num">{comparisonData.summary.counts.formatting}</div><div className="stat-lbl">Font/Format</div></div>
                                <div className="stat-card"><div className="stat-num">{comparisonData.summary.counts.tables}</div><div className="stat-lbl">Table Diff</div></div>
                                <div className="stat-card"><div className="stat-num">{comparisonData.summary.counts.annotations}</div><div className="stat-lbl">Annotations</div></div>
                                <div className="stat-card"><div className="stat-num">{comparisonData.summary.counts.important}</div><div className="stat-lbl">Important</div></div>
                            </div>

                            {/* Export Buttons */}
                            <div className="exp-bar">
                                <a href={`${API_BASE_URL}${comparisonData.report_pdf_url}`} className="btn-exp primary" download>⬇️ Download Summary Report</a>
                                <a href={`${API_BASE_URL}${comparisonData.highlighted_pdf_url}`} className="btn-exp secondary" download>👁️ Download Highlighted PDF</a>
                            </div>

                            {/* Category Filter Badges */}
                            <div className="filter-bar">
                                {[
                                    { key: 'all', label: `All (${comparisonData.summary.counts.all})` },
                                    { key: 'text', label: `Text (${comparisonData.summary.counts.text})` },
                                    { key: 'formatting', label: `Formatting (${comparisonData.summary.counts.formatting})` },
                                    { key: 'tables', label: `Tables (${comparisonData.summary.counts.tables})` },
                                    { key: 'annotations', label: `Annotations (${comparisonData.summary.counts.annotations})` },
                                    { key: 'important', label: `Important (${comparisonData.summary.counts.important})` }
                                ].map(f => (
                                    <button 
                                        key={f.key} 
                                        className={activeFilter === f.key ? 'fbadge active' : 'fbadge'} 
                                        onClick={() => { setActiveFilter(f.key); setCurrentDiffIdx(0); }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Active Difference Detail Card */}
                            {currentDiff && (
                                <div style={{background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:'10px', padding:'12px 16px', marginBottom:'12px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', marginBottom:'8px', flexWrap:'wrap'}}>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span style={{fontWeight:800, fontSize:'0.95rem', color:'#1e293b'}}>Diff {currentDiffIdx + 1} of {filteredDiffs.length}</span>
                                            <span className={`dtag ${currentDiff.type}`}>{currentDiff.type}</span>
                                            <span style={{fontSize:'0.83rem', color:'#64748b', fontWeight:700}}>Page {currentDiff.page}</span>
                                        </div>
                                        <div style={{fontSize:'0.85rem', color:'#334155', fontWeight:600}}>{currentDiff.description || ''}</div>
                                    </div>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', fontSize:'0.85rem'}}>
                                        <div style={{background:'#fef2f2', border:'1px solid #fecaca', padding:'8px 12px', borderRadius:'8px', color:'#991b1b', wordBreak:'break-word'}}>
                                            <strong style={{display:'block', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'#7f1d1d', marginBottom:'4px'}}>📄 Original Document Content:</strong>
                                            <span style={{fontFamily:'monospace', fontSize:'0.85rem'}}>{currentDiff.original || '(None / Deleted)'}</span>
                                        </div>
                                        <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', padding:'8px 12px', borderRadius:'8px', color:'#166534', wordBreak:'break-word'}}>
                                            <strong style={{display:'block', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'#14532d', marginBottom:'4px'}}>📄 Revised Document Content:</strong>
                                            <span style={{fontFamily:'monospace', fontSize:'0.85rem'}}>{currentDiff.revised || '(None / Added)'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View Controls */}
                            <div className="view-ctrls">
                                <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                    <button className={`vbtn ${currentViewMode === 'side_by_side' ? 'active' : ''}`} onClick={() => setCurrentViewMode('side_by_side')}>Side-by-Side View</button>
                                    <button className={`vbtn ${currentViewMode === 'overlay' ? 'active' : ''}`} onClick={() => setCurrentViewMode('overlay')}>Overlay Diff View</button>
                                </div>

                                {/* Difference Navigation Controls */}
                                <div className="diff-nav-box">
                                    <button className="vbtn" onClick={() => setCurrentDiffIdx(0)} title="First Difference">⏮</button>
                                    <button className="vbtn" onClick={() => setCurrentDiffIdx(Math.max(0, currentDiffIdx - 1))} title="Previous Difference">◀</button>
                                    <span style={{fontSize:'.82rem', fontWeight:800, color:'#1e293b', padding:'0 6px'}}>
                                        Diff {filteredDiffs.length > 0 ? currentDiffIdx + 1 : 0} of {filteredDiffs.length}
                                    </span>
                                    <button className="vbtn" onClick={() => setCurrentDiffIdx(Math.min(filteredDiffs.length - 1, currentDiffIdx + 1))} title="Next Difference">▶</button>
                                    <button className="vbtn" onClick={() => setCurrentDiffIdx(filteredDiffs.length - 1)} title="Last Difference">⏭</button>
                                </div>

                                {/* Zoom & Page Navigation */}
                                <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                        <button className="vbtn" onClick={() => setCurrentZoom(z => Math.min(2.5, z + 0.2))} title="Zoom In">🔍 +</button>
                                        <button className="vbtn" onClick={() => setCurrentZoom(z => Math.max(0.5, z - 0.2))} title="Zoom Out">🔍 -</button>
                                        <button className="vbtn" onClick={() => setCurrentZoom(1.0)} title="Reset Zoom">🔄 Reset</button>
                                    </div>
                                    <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                        <button className="vbtn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>&larr; Prev Page</button>
                                        <span style={{fontSize:'.8rem', fontWeight:700, color:'#334155'}}>
                                            Page <input type="number" value={currentPage} min="1" max={totalPages} style={{width:'55px', textAlign:'center', padding:'3px 4px', border:'1px solid #cbd5e1', borderRadius:'4px', fontWeight:700}} onChange={e => {
                                                let p = parseInt(e.target.value, 10);
                                                if (!isNaN(p)) setCurrentPage(Math.min(totalPages, Math.max(1, p)));
                                            }} /> / <span>{totalPages}</span>
                                        </span>
                                        <button className="vbtn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next Page &rarr;</button>
                                    </div>
                                </div>
                            </div>

                            {/* Image Viewer */}
                            <div className="viewer-box">
                                <img 
                                    style={{ transform: `scale(${currentZoom})` }}
                                    src={`${API_BASE_URL}/api/pdf/compare/view-page/${currentRequestId}/${currentPage}?mode=${currentViewMode}&active_diff=${getGlobalDiffIdx()}`} 
                                    alt="Comparison View" 
                                />
                            </div>

                            {/* Differences List */}
                            <div className="panel" style={{marginTop:'16px'}}>
                                <div className="ptitle">Detected Differences List <span style={{fontSize:'0.75rem', fontWeight:'normal', color:'#64748b'}}>(Click any row to inspect difference)</span></div>
                                <div className="diff-list" ref={diffListRef}>
                                    {filteredDiffs.length === 0 ? (
                                        <div style={{textAlign:'center', padding:'12px', color:'#166534', fontWeight:600}}>✅ No differences found for selected filter.</div>
                                    ) : (
                                        filteredDiffs.map((d, idx) => (
                                            <div key={idx} className={`ditem ${idx === currentDiffIdx ? 'active' : ''}`} onClick={() => setCurrentDiffIdx(idx)}>
                                                <span className={`dtag ${d.type}`}>{d.type}</span>
                                                <strong>Page {d.page}:</strong> {d.description}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
