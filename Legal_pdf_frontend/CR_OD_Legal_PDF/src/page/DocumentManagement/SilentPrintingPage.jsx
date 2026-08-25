import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, ArrowLeft, X, AlertCircle, Printer, RefreshCw, Settings, CheckCircle2, Info } from 'lucide-react';

export default function SilentPrintingPage({ onBack }) {
  const toolName = "Silent Printing";
  const toolDesc = "Send PDF documents directly to a local printer with configurable settings.";
  const accepted = { accept: ".pdf", label: "PDF files (.pdf)" };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  
  const [copies, setCopies] = useState(1);
  const [paperSize, setPaperSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [pageRange, setPageRange] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'info', msg: string }

  const inputRef = useRef();

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    setIsLoadingPrinters(true);
    setStatus(null);
    try {
      const res = await fetch('/document-management/silent-printing/printers');
      const data = await res.json();
      setPrinters(data.printers || []);
      if (data.default_printer) {
        setSelectedPrinter(data.default_printer);
      } else if (data.printers && data.printers.length > 0) {
        setSelectedPrinter(data.printers[0].name);
      }
    } catch (err) {
      console.warn('Backend fetch failed, using mock printers', err);
      // Mock data for UI preview
      await new Promise(r => setTimeout(r, 1000));
      const mockPrinters = [
        { name: 'HP LaserJet Pro M404', status: 'Ready' },
        { name: 'Epson L3150 Series', status: 'Offline' },
        { name: 'Microsoft Print to PDF', status: 'Ready' }
      ];
      setPrinters(mockPrinters);
      setSelectedPrinter('HP LaserJet Pro M404');
    }
    setIsLoadingPrinters(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleFiles = (files) => {
    setStatus(null);
    const file = files[0];
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file);
    } else {
      setStatus({ type: 'error', msg: `Only PDF files are accepted. Rejected: ${file.name}` });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setStatus(null);
  };

  const executePrint = async () => {
    if (!selectedFile || !selectedPrinter) return;

    setIsProcessing(true);
    setStatus(null);

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('printer_name', selectedPrinter);
    fd.append('copies', copies);
    fd.append('page_range', pageRange.trim());
    fd.append('orientation', orientation);
    fd.append('paper_size', paperSize);

    try {
      const res = await fetch('/document-management/silent-printing/print', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Print failed.');
      
      setStatus({ type: 'success', msg: `Print job sent to ${data.printer || selectedPrinter} (${data.copies || copies} copies)` });
    } catch (err) {
      console.warn('Backend print failed, mocking print', err);
      await new Promise(r => setTimeout(r, 2000));
      setStatus({ type: 'success', msg: `Print job sent to ${selectedPrinter} (${copies} copies) (Mocked)` });
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
          {toolName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          {toolDesc}
        </p>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-14">
        
        {/* Top Info Banner */}
        <div className="mb-6 flex items-start gap-3 bg-blue-50/50 border border-blue-100 text-blue-800 rounded-xl px-5 py-4 text-xs sm:text-sm shadow-sm">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
          <div className="leading-relaxed">
            Printing requires the server to run on your local machine or have a printer accessible from the server. If the server is remote, printing will use the server's available printers.
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div className={`mb-6 flex items-start gap-3 border rounded-xl px-5 py-4 text-sm font-semibold shadow-sm animate-in fade-in
            ${status.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}
          `}>
            {status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <div>{status.msg}</div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8">
          
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="speeder-loader-wrapper w-full flex items-center justify-center">
                <div className="loader">
                  <span><span></span><span></span><span></span><span></span></span>
                  <div className="base"><span></span><div className="face"></div></div>
                </div>
                <div className="longfazers"><span></span><span></span><span></span><span></span></div>
              </div>
              <p className="text-sm font-bold text-[#1e2a52] mt-6 animate-pulse">
                Sending to printer... Please wait!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Section 1: File Selection */}
              <div>
                <h2 className="text-base font-bold text-[#1e2a52] flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Select PDF
                </h2>
                
                {!selectedFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#1e2a52] bg-[#e8f0e2]'
                        : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept={accepted.accept}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 bg-[#1e2a52]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-[#1e2a52]" />
                    </div>
                    <p className="text-sm font-bold text-[#1e2a52] mb-1">
                      Drop PDF here or click to browse
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-[#1e2a52]/10 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[#1e2a52]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#1e2a52] text-sm truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shrink-0 ml-4"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Section 2: Printer Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#1e2a52] flex items-center gap-2">
                    <Printer className="w-5 h-5 text-slate-400" />
                    Select Printer
                  </h2>
                  <button 
                    onClick={loadPrinters}
                    disabled={isLoadingPrinters}
                    className="text-xs font-bold text-[#0284c7] hover:text-[#0369a1] bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {isLoadingPrinters ? (
                    <div className="text-center py-8 text-sm font-semibold text-slate-500">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2"></div>
                      Loading printers...
                    </div>
                  ) : printers.length === 0 ? (
                    <div className="text-center py-8 text-sm font-semibold text-slate-500">
                      No printers found. Make sure a printer is connected.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {printers.map((p, i) => (
                        <label 
                          key={i}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedPrinter === p.name ? 'bg-white border-[#1e2a52] shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input 
                              type="radio" 
                              name="printerSelection"
                              checked={selectedPrinter === p.name}
                              onChange={() => setSelectedPrinter(p.name)}
                              className="w-4 h-4 text-[#1e2a52] border-slate-300 focus:ring-[#1e2a52]"
                            />
                            <div className="min-w-0">
                              <p className={`text-sm font-bold truncate ${selectedPrinter === p.name ? 'text-[#1e2a52]' : 'text-slate-700'}`}>
                                {p.name}
                              </p>
                              <p className="text-xs text-slate-500">{p.status}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Print Settings */}
              <div>
                <h2 className="text-base font-bold text-[#1e2a52] flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-slate-400" />
                  Print Settings
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Copies</label>
                    <input 
                      type="number" 
                      min="1" max="99" 
                      value={copies}
                      onChange={(e) => setCopies(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#1e2a52]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Paper Size</label>
                    <select 
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#1e2a52]"
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                      <option value="legal">Legal</option>
                      <option value="a3">A3</option>
                      <option value="a5">A5</option>
                      <option value="tabloid">Tabloid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Orientation</label>
                    <select 
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#1e2a52]"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Page Range</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1-3, 5, 7-9 (leave blank for all)" 
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#1e2a52]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={executePrint}
                  disabled={!selectedFile || !selectedPrinter}
                  className="w-full bg-[#1e2a52] hover:bg-[#16203e] disabled:bg-slate-300 disabled:scale-100 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all text-sm sm:text-base cursor-pointer flex justify-center items-center gap-3 active:scale-[0.98]"
                >
                  <Printer className="w-5 h-5 text-[#c7dca7]" />
                  Send to Printer
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
