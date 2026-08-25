import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function DuplicateCheckPage() {
    // ── State: Files ──────────────────────────────────────────────
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    // ── State: Settings ───────────────────────────────────────────
    const [cmpMode, setCmpMode] = useState('aggressive');
    const [threshold, setThreshold] = useState(75);
    const [chkIgnoreHeaders, setChkIgnoreHeaders] = useState(true);
    const [chkIgnoreFooters, setChkIgnoreFooters] = useState(true);
    const [chkIgnorePageNums, setChkIgnorePageNums] = useState(true);
    const [chkCheckPages, setChkCheckPages] = useState(true);
    const [chkCheckText, setChkCheckText] = useState(true);
    const [chkCheckImages, setChkCheckImages] = useState(true);

    // ── State: Process/Results ────────────────────────────────────
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [analysisData, setAnalysisData] = useState(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    // ── State: Checkboxes for duplicate removal ───────────────────
    // Key: `${doc_index}-${page}`, Value: boolean (true means remove)
    const [selectedRemovals, setSelectedRemovals] = useState({});

    // ── State: Modal ──────────────────────────────────────────────
    const [visModalData, setVisModalData] = useState(null);

    // ── Handlers ──────────────────────────────────────────────────
    const handleFileChange = (e) => {
        if (e.target.files.length) handleFiles(Array.from(e.target.files));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleFiles = (files) => {
        const valid = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (!valid.length) {
            alert('Please select valid PDF files.');
            return;
        }
        setSelectedFiles(prev => [...prev, ...valid]);
    };

    const removeFile = (idx) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const handleModeChange = (e) => {
        const val = e.target.value;
        setCmpMode(val);
        if (val === 'exact') setThreshold(100);
        else if (val === 'strict') setThreshold(95);
        else if (val === 'balanced') setThreshold(85);
        else if (val === 'aggressive') setThreshold(75);
    };

    const startAnalysis = async () => {
        if (!selectedFiles.length) return;

        setIsAnalyzing(true);
        setErrorMsg(null);
        setAnalysisData(null);
        setSelectedRemovals({});

        const fd = new FormData();
        selectedFiles.forEach(f => fd.append('files', f));
        fd.append('mode', cmpMode);
        fd.append('threshold', threshold);
        fd.append('check_pages', chkCheckPages);
        fd.append('check_text', chkCheckText);
        fd.append('check_images', chkCheckImages);
        fd.append('ignore_headers', chkIgnoreHeaders);
        fd.append('ignore_footers', chkIgnoreFooters);
        fd.append('ignore_page_numbers', chkIgnorePageNums);

        try {
            const res = await fetch(`${API_BASE_URL}/api/pdf/duplicate/analyze`, { method: 'POST', body: fd });
            if (!res.ok) {
                let msg = 'Duplicate check analysis failed';
                try { const d = await res.json(); msg = d.detail || msg; } catch (_) {}
                throw new Error(msg);
            }
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Analysis failed');

            setAnalysisData(data);
            setCurrentSessionId(data.session_id);

            // Initialize selections
            const initialRemovals = {};
            if (data.groups) {
                data.groups.forEach(g => {
                    (g.items || []).forEach(it => {
                        if (!it.is_primary) {
                            initialRemovals[`${it.doc_index}-${it.page}`] = true;
                        }
                    });
                });
            }
            setSelectedRemovals(initialRemovals);

            setTimeout(() => {
                const resSec = document.getElementById('react-res-sec');
                if (resSec) resSec.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (e) {
            setErrorMsg('Error: ' + e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleToggleRemoval = (docIndex, page, checked) => {
        setSelectedRemovals(prev => ({
            ...prev,
            [`${docIndex}-${page}`]: checked
        }));
    };

    const selectAllDuplicateRemovals = (status) => {
        const newRemovals = {};
        if (analysisData && analysisData.groups) {
            analysisData.groups.forEach(g => {
                (g.items || []).forEach(it => {
                    if (!it.is_primary) {
                        newRemovals[`${it.doc_index}-${it.page}`] = status;
                    }
                });
            });
        }
        setSelectedRemovals(newRemovals);
    };

    const openVisModal = (g) => {
        const items = g.items || [];
        if (items.length < 2) return;
        setVisModalData({
            group: g,
            it1: items[0],
            it2: items[1]
        });
    };

    const closeVisModal = () => {
        setVisModalData(null);
    };

    const cleanSelectedDuplicates = async () => {
        const removePages = Object.keys(selectedRemovals)
            .filter(key => selectedRemovals[key])
            .map(key => {
                const [doc_index, page] = key.split('-');
                return { doc_index: parseInt(doc_index, 10), page: parseInt(page, 10) };
            });

        if (!removePages.length) {
            alert('Please select at least one duplicate page to remove.');
            return;
        }

        if (!window.confirm(`Generate clean PDF removing ${removePages.length} selected duplicate page(s)?`)) return;

        setIsCleaning(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pdf/duplicate/clean`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: currentSessionId, remove_pages: removePages }),
            });
            if (!res.ok) {
                let msg = 'Clean PDF generation failed';
                try { const d = await res.json(); msg = d.detail || msg; } catch (_) {}
                throw new Error(msg);
            }
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Clean PDF failed');

            alert(`Clean PDF generated successfully! Kept ${data.pages_kept} page(s), removed ${data.pages_removed} duplicate page(s).`);
            window.location.href = `${API_BASE_URL}${data.cleaned_pdf_url}`;
        } catch (e) {
            alert('Clean PDF Error: ' + e.message);
        } finally {
            setIsCleaning(false);
        }
    };

    const formatBytes = (bytes) => (bytes / 1048576).toFixed(2);

    return (
        <div className="react-wrapper-duplicate_check">
            <style dangerouslySetInnerHTML={{ __html: `
                .wrap { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
                .hdr { text-align: center; margin-bottom: 1.5rem; }
                .hdr h1 { font-size: 1.8rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .hdr p { color: #64748b; font-size: .92rem; margin-top: .25rem; }

                /* Upload Zone */
                /* Removed old uzone styles as we are using tailwind now */

                /* Selected File List */
                .file-list { margin-top: 12px; max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
                .file-item { display: flex; align-items: center; justify-content: space-between; background: #f1f5f9; padding: 6px 12px; border-radius: 6px; font-size: .82rem; font-weight: 600; color: #334155; }
                .file-item .del { color: #dc2626; cursor: pointer; font-weight: bold; }

                /* Configuration Panel */
                .panel { border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: #fff; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                .ptitle { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                .cfg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
                .cfg-group { display: flex; flex-direction: column; gap: 8px; }
                .cfg-group label { font-size: .85rem; font-weight: 700; color: #475569; }
                .cfg-group input[type="number"] { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: .9rem; background: #f8fafc; transition: all 0.2s; outline: none; }
                .cfg-group input[type="number"]:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); background: #fff; }

                .check-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
                .check-item { display: flex; align-items: center; gap: 10px; font-size: .85rem; color: #334155; font-weight: 700; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .check-item:hover { background: #f1f5f9; border-color: #cbd5e1; }
                .check-item input[type="checkbox"] { accent-color: #2563eb; width: 18px; height: 18px; cursor: pointer; }

                /* Action Button */
                .btn-analyze {
                    width: 100%; padding: 16px 24px; font-size: 1.1rem; font-weight: 800;
                    color: #fff; background: linear-gradient(135deg, #2563eb, #1d4ed8); border: none; border-radius: 12px;
                    cursor: pointer; transition: all .2s; margin-bottom: 24px;
                    display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(37,99,235,0.25);
                }
                .btn-analyze:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.3); }
                .btn-analyze:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 2px 10px rgba(37,99,235,0.2); }
                .btn-analyze:disabled { background: #94a3b8; box-shadow: none; transform: none; cursor: not-allowed; opacity: 0.7; }

                /* Progress & Error */
                .prog { text-align: center; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 16px; }
                .spinner { display: inline-block; width: 28px; height: 28px; border: 3px solid rgba(37,99,235,.2); border-radius: 50%; border-top-color: #2563eb; animation: spin 1s linear infinite; margin-bottom: 6px; }
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
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px; }
                .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; }
                .stat-num { font-size: 1.35rem; font-weight: 800; color: #2563eb; }
                .stat-lbl { font-size: .75rem; color: #64748b; font-weight: 700; margin-top: 2px; }

                /* Export Bar */
                .exp-bar { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
                .btn-exp { padding: 10px 18px; font-size: .88rem; font-weight: 700; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border: none; }
                .btn-exp.primary { background: #16a34a; color: #fff; }
                .btn-exp.primary:hover { background: #15803d; }
                .btn-exp.secondary { background: #2563eb; color: #fff; }
                .btn-exp.secondary:hover { background: #1d4ed8; }

                /* Duplicate Group Cards */
                .group-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
                .group-hdr { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
                .gtag { display: inline-block; padding: 3px 8px; border-radius: 12px; font-weight: 800; font-size: .72rem; text-transform: uppercase; }
                .gtag.EXACT_PAGE { background: #dcfce7; color: #15803d; }
                .gtag.NEAR_PAGE { background: #fef9c3; color: #a16207; }
                .gtag.EXACT_TEXT { background: #dbeafe; color: #1e40af; }
                .gtag.NEAR_TEXT { background: #ffedd5; color: #c2410c; }
                .gtag.DUPLICATE_IMAGE { background: #fae8ff; color: #86198f; }

                .item-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; }
                .item-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: .83rem; }
                .item-box.primary { border-left: 4px solid #16a34a; }
                .item-box.duplicate { border-left: 4px solid #dc2626; }

                /* Visual Side-by-Side Modal / Inspector */
                .vis-modal { display: flex; position: fixed; inset: 0; background: rgba(15,23,42,0.75); z-index: 1000; align-items: center; justify-content: center; padding: 20px; }
                .vis-card { background: #fff; border-radius: 12px; width: 100%; max-width: 1100px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); }
                .vis-hdr { background: #0f172a; color: #fff; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; }
                .vis-body { padding: 16px; overflow-y: auto; flex: 1; }

                .side-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
                @media (max-width: 768px) { .side-grid { grid-template-columns: 1fr; } }
                .preview-pane { border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 10px; text-align: center; }
                .preview-pane h5 { margin: 0 0 8px 0; font-size: .88rem; color: #1e293b; font-weight: 800; }
                .preview-pane img { max-width: 100%; max-height: 440px; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
                .loc-badge { font-size: .75rem; font-weight: 700; color: #475569; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 6px; }
            ` }} />
            
            <div className="wrap">


                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-6">
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 mb-6">
                        {/* Dual Upload Zone */}
                    <input type="file" id="pdfFilesInput" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileChange} />
                    <label 
                        htmlFor="pdfFilesInput" 
                        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all block ${dragActive ? 'border-[#1e2a52] bg-[#e8f0e2]' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}
                        onDragOver={handleDragOver} 
                        onDragLeave={handleDragLeave} 
                        onDrop={handleDrop}
                    >
                        <div className="w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-[#1e2a52]" />
                        </div>
                        <p className="text-base sm:text-lg font-bold text-[#1e2a52] mb-1">
                            Drop multiple PDF files here or click to browse
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 mb-2">
                            Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span>
                        </p>
                    </label>
                    {selectedFiles.length > 0 && (
                        <div className="mt-6 space-y-2.5">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-left pl-2">
                                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                            </p>
                            {selectedFiles.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-left">
                                    <div className="w-9 h-9 rounded-lg bg-[#1e2a52]/10 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4 text-[#1e2a52]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                                        <p className="text-[10px] sm:text-xs text-slate-400">{formatBytes(f.size)} MB</p>
                                    </div>
                                    <button type="button" onClick={() => removeFile(idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    </div>
                </div>

                <div className="card">
                    {/* Configuration Panel */}
                    <div className="panel">
                        <div className="ptitle">Detection Settings &amp; Exclusion Rules</div>
                        
                        <div className="cfg-grid">
                            <div className="cfg-group">
                                <label>Sensitivity Mode:</label>
                                <div className="relative w-full" ref={dropdownRef}>
                                    <div 
                                        className="p-2.5 border border-slate-300 rounded-lg bg-slate-50 hover:bg-white text-sm cursor-pointer flex justify-between items-center transition-all outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span className="truncate">
                                            {cmpMode === 'aggressive' && 'Aggressive (75% Similarity)'}
                                            {cmpMode === 'balanced' && 'Balanced (85% Similarity)'}
                                            {cmpMode === 'exact' && 'Exact Only (100% Match)'}
                                            {cmpMode === 'strict' && 'Strict (95% Similarity)'}
                                            {cmpMode === 'custom' && 'Custom Threshold'}
                                        </span>
                                        <svg className="w-4 h-4 ml-2 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                    {isDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {[
                                                { value: 'aggressive', label: 'Aggressive (75% Similarity)' },
                                                { value: 'balanced', label: 'Balanced (85% Similarity)' },
                                                { value: 'exact', label: 'Exact Only (100% Match)' },
                                                { value: 'strict', label: 'Strict (95% Similarity)' },
                                                { value: 'custom', label: 'Custom Threshold' }
                                            ].map(opt => (
                                                <div 
                                                    key={opt.value}
                                                    className={`p-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${cmpMode === opt.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
                                                    onClick={() => {
                                                        handleModeChange({ target: { value: opt.value } });
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

                            <div className="cfg-group">
                                <label>Similarity Threshold (%):</label>
                                <input type="number" value={threshold} min="50" max="100" step="5" onChange={e => setThreshold(e.target.value)} />
                            </div>
                        </div>

                        <div className="check-grid">
                            <label className="check-item"><input type="checkbox" checked={chkIgnoreHeaders} onChange={e => setChkIgnoreHeaders(e.target.checked)} /><span>Ignore Running Headers</span></label>
                            <label className="check-item"><input type="checkbox" checked={chkIgnoreFooters} onChange={e => setChkIgnoreFooters(e.target.checked)} /><span>Ignore Running Footers</span></label>
                            <label className="check-item"><input type="checkbox" checked={chkIgnorePageNums} onChange={e => setChkIgnorePageNums(e.target.checked)} /><span>Ignore Page Numbers</span></label>
                            <label className="check-item"><input type="checkbox" checked={chkCheckPages} onChange={e => setChkCheckPages(e.target.checked)} /><span>Check Duplicate Pages</span></label>
                            <label className="check-item"><input type="checkbox" checked={chkCheckText} onChange={e => setChkCheckText(e.target.checked)} /><span>Check Duplicate Text</span></label>
                            <label className="check-item"><input type="checkbox" checked={chkCheckImages} onChange={e => setChkCheckImages(e.target.checked)} /><span>Check Duplicate Images</span></label>
                        </div>
                    </div>

                    {/* Start Analysis Button */}
                    <button className="btn-analyze" disabled={selectedFiles.length === 0 || isAnalyzing || isCleaning} onClick={startAnalysis}>
                        🔍 Start Duplicate Analysis
                    </button>

                    {/* Progress Box */}
                    {(isAnalyzing || isCleaning) && (
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
                            <p className="text-sm font-bold text-[#1e2a52] mt-4 animate-pulse">
                                {isCleaning ? 'Generating Clean PDF Document... Please wait!' : 'Analyzing PDF Documents... Please wait!'}
                            </p>
                            {!isCleaning && (
                                <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">Comparing page text, structural hashes, paragraphs, and embedded images</p>
                            )}
                        </div>
                    )}

                    {/* Error Box */}
                    {errorMsg && (
                        <div style={{background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', padding:'12px', borderRadius:'8px', marginBottom:'16px', textAlign:'center', fontWeight:700}}>
                            {errorMsg}
                        </div>
                    )}

                    {/* Results Section */}
                    {analysisData && (
                        <div id="react-res-sec" style={{marginTop: '16px'}}>
                            {/* Stats */}
                            <div className="stats-grid">
                                <div className="stat-card"><div className="stat-num">{analysisData.summary.duplicate_groups}</div><div className="stat-lbl">Duplicate Groups</div></div>
                                <div className="stat-card"><div className="stat-num">{analysisData.summary.documents_analyzed}</div><div className="stat-lbl">Documents</div></div>
                                <div className="stat-card"><div className="stat-num">{analysisData.summary.total_pages}</div><div className="stat-lbl">Total Pages</div></div>
                                <div className="stat-card"><div className="stat-num">{analysisData.summary.exact_matches}</div><div className="stat-lbl">Exact Matches</div></div>
                                <div className="stat-card"><div className="stat-num">{analysisData.summary.near_matches}</div><div className="stat-lbl">Near Matches</div></div>
                                <div className="stat-card"><div className="stat-num">{analysisData.summary.duplicate_images}</div><div className="stat-lbl">Dup Images</div></div>
                            </div>

                            {/* Export & Cleaning Bar */}
                            <div className="exp-bar">
                                <button className="btn-exp primary" onClick={cleanSelectedDuplicates}>
                                    ✨ Generate Clean PDF (Remove Selected Duplicates)
                                </button>
                                <a href={`${API_BASE_URL}${analysisData.report_pdf_url}`} className="btn-exp secondary" download>
                                    📊 Download Summary PDF Report
                                </a>
                            </div>

                            {/* Duplicate Groups List */}
                            <div className="panel">
                                <div className="ptitle" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span>Detected Duplicate Groups</span>
                                    <div>
                                        <button className="btn-exp secondary" style={{padding:'4px 10px', fontSize:'0.75rem', marginRight: '4px'}} onClick={() => selectAllDuplicateRemovals(true)}>Select All Duplicates</button>
                                        <button className="btn-exp secondary" style={{padding:'4px 10px', fontSize:'0.75rem', background:'#64748b'}} onClick={() => selectAllDuplicateRemovals(false)}>Deselect All</button>
                                    </div>
                                </div>
                                <div>
                                    {(!analysisData.groups || analysisData.groups.length === 0) ? (
                                        <div style={{textAlign:'center', padding:'20px', color:'#166534', fontWeight:700, fontSize:'.95rem'}}>
                                            🎉 Great news! No meaningful duplicates detected for the selected threshold and exclusion rules.
                                        </div>
                                    ) : (
                                        analysisData.groups.map((g, idx) => (
                                            <div key={idx} className="group-card">
                                                <div className="group-hdr">
                                                    <div>
                                                        <strong style={{fontSize:'.95rem', color:'#0f172a'}}>Duplicate Group #{g.group_id}</strong>{' '}
                                                        <span className={`gtag ${g.type}`}>{g.type_label}</span>{' '}
                                                        <span style={{fontWeight:800, color:'#2563eb', fontSize:'.85rem'}}>({g.similarity}% Match)</span>
                                                    </div>
                                                    <button className="btn-exp secondary" style={{padding:'4px 10px', fontSize:'.78rem'}} onClick={() => openVisModal(g)}>👁️ Inspect Visual Preview</button>
                                                </div>
                                                <div className="item-grid">
                                                    {(g.items || []).map((it, i) => {
                                                        const isDup = !it.is_primary;
                                                        const boxCls = isDup ? 'item-box duplicate' : 'item-box primary';
                                                        const bboxStr = it.bbox ? ` [x:${Math.round(it.bbox[0])}, y:${Math.round(it.bbox[1])}]` : '';
                                                        const isSelected = selectedRemovals[`${it.doc_index}-${it.page}`] || false;

                                                        return (
                                                            <div key={i} className={boxCls}>
                                                                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px'}}>
                                                                    <strong style={{color:'#1e293b'}}>{it.filename} — Page {it.page}</strong>
                                                                    {isDup ? (
                                                                        <label style={{fontSize:'.78rem', fontWeight:800, color:'#dc2626', cursor:'pointer'}}>
                                                                            <input 
                                                                                type="checkbox" 
                                                                                style={{marginRight:'4px'}} 
                                                                                checked={isSelected}
                                                                                onChange={(e) => handleToggleRemoval(it.doc_index, it.page, e.target.checked)}
                                                                            />
                                                                            Remove Duplicate
                                                                        </label>
                                                                    ) : (
                                                                        <span style={{fontSize:'.75rem', fontWeight:800, color:'#16a34a', background:'#dcfce7', padding:'2px 6px', borderRadius:'4px'}}>Original Keep</span>
                                                                    )}
                                                                </div>
                                                                <div style={{color:'#475569', fontSize:'.8rem', wordBreak:'break-word'}}>{it.preview}</div>
                                                                <div style={{fontSize:'.72rem', color:'#64748b', marginTop:'4px', fontWeight:700}}>📍 Location: Page {it.page}{bboxStr}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Side-by-Side Preview Inspector Modal */}
            {visModalData && (
                <div className="vis-modal">
                    <div className="vis-card">
                        <div className="vis-hdr">
                            <h4 style={{margin:0, fontSize:'1.05rem', fontWeight:800, display:'flex', alignItems:'center', gap:'6px'}}>
                                👁️ Visual Side-by-Side Preview &amp; Location Highlight
                            </h4>
                            <button style={{background:'none', border:'none', color:'#94a3b8', fontSize:'1.5rem', cursor:'pointer', fontWeight:'bold'}} onClick={closeVisModal}>&times;</button>
                        </div>
                        <div className="vis-body">
                            <div className="side-grid">
                                {/* Left: Primary / Original Page */}
                                <div className="preview-pane">
                                    <h5 style={{color:'#166534'}}>🟢 Original / Keep Document</h5>
                                    <img 
                                        src={`${API_BASE_URL}/api/pdf/duplicate/view-page/${currentSessionId}/${visModalData.it1.doc_index}/${visModalData.it1.page}?active_group=${visModalData.group.group_id}`} 
                                        alt="Primary Page Preview" 
                                    />
                                    <div className="loc-badge">
                                        📍 {visModalData.it1.filename} — Page {visModalData.it1.page}
                                        {visModalData.it1.bbox ? ` [x:${Math.round(visModalData.it1.bbox[0])}, y:${Math.round(visModalData.it1.bbox[1])}, w:${Math.round(visModalData.it1.bbox[2]-visModalData.it1.bbox[0])}, h:${Math.round(visModalData.it1.bbox[3]-visModalData.it1.bbox[1])}]` : ''}
                                    </div>
                                </div>
                                {/* Right: Duplicate Page */}
                                <div className="preview-pane">
                                    <h5 style={{color:'#991b1b'}}>🔴 Duplicate / Remove Candidate</h5>
                                    <img 
                                        src={`${API_BASE_URL}/api/pdf/duplicate/view-page/${currentSessionId}/${visModalData.it2.doc_index}/${visModalData.it2.page}?active_group=${visModalData.group.group_id}`} 
                                        alt="Duplicate Page Preview" 
                                    />
                                    <div className="loc-badge">
                                        📍 {visModalData.it2.filename} — Page {visModalData.it2.page}
                                        {visModalData.it2.bbox ? ` [x:${Math.round(visModalData.it2.bbox[0])}, y:${Math.round(visModalData.it2.bbox[1])}, w:${Math.round(visModalData.it2.bbox[2]-visModalData.it2.bbox[0])}, h:${Math.round(visModalData.it2.bbox[3]-visModalData.it2.bbox[1])}]` : ''}
                                    </div>
                                </div>
                            </div>

                            <div style={{background:'#f1f5f9', border:'1px solid #cbd5e1', borderRadius:'8px', padding:'12px', fontSize:'.85rem'}}>
                                <strong style={{color:'#0f172a', display:'block', marginBottom:'4px'}}>Matched Content Snippet:</strong>
                                <div style={{color:'#334155', fontFamily:'monospace', whiteSpace:'pre-wrap'}}>
                                    {visModalData.it1.preview || visModalData.it2.preview || '[Identical Content Area]'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
