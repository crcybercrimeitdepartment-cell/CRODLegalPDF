import React, { useState, useRef } from 'react';
import { Upload, ArrowLeft, AlertCircle, FileText, Download, CheckCircle, ShieldCheck, ShieldAlert, FileWarning, Search } from 'lucide-react';

export default function DigitalSignatureValidationPage({ onBack }) {
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

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
    setReportData(null);
  };

  const handleValidate = async () => {
    if (!selectedPdf) return;
    setIsValidating(true);
    setError('');
    setReportData(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedPdf);

      const response = await fetch('/document-management/digital-signature-validation/validate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Validation failed (${response.status})`);
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to validate signatures. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signature_validation_${(reportData.filename || 'report').replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setSelectedPdf(null);
    setReportData(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const getStatusIcon = (status) => {
    if (status.includes('Valid') && !status.includes('Invalid')) return <ShieldCheck size={28} className="text-emerald-600" />;
    if (status.includes('Issues') || status.includes('Warning')) return <FileWarning size={28} className="text-amber-600" />;
    if (status.includes('Invalid')) return <ShieldAlert size={28} className="text-red-600" />;
    return <FileText size={28} className="text-slate-500" />;
  };

  const getStatusColor = (status) => {
    if (status.includes('Valid') && !status.includes('Invalid')) return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (status.includes('Issues') || status.includes('Warning')) return 'bg-amber-50 border-amber-200 text-amber-800';
    if (status.includes('Invalid')) return 'bg-red-50 border-red-200 text-red-800';
    return 'bg-slate-50 border-slate-200 text-slate-800';
  };

  const getSigStatusBadge = (sig) => {
    if (sig.error) return { cls: 'warning', label: 'Error' };
    if (sig.intact && sig.valid && sig.trusted) return { cls: 'safe', label: 'Valid & Trusted' };
    if (sig.intact && sig.valid) return { cls: 'safe', label: 'Valid (Untrusted CA)' };
    if (sig.intact) return { cls: 'warning', label: 'Integrity OK' };
    if (sig.intact === false) return { cls: 'warning', label: 'Failed' };
    return { cls: 'warning', label: 'Unknown' };
  };

  return (
    <div className="react-wrapper-dsv">
      <style>{`
        .dsv-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem 3rem 1rem; font-family: 'Inter', sans-serif; }
        .dsv-hdr { text-align: center; margin-bottom: 2rem; }
        .dsv-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .dsv-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .dsv-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .dsv-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .dsv-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .dsv-card h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0 0 1.25rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #f1f5f9; display: flex; align-items: center; gap: 8px; }
        
        .dsv-file-info { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .dsv-file-icon { font-size: 1.5rem; flex-shrink: 0; }
        .dsv-file-details { flex: 1; min-width: 0; }
        .dsv-file-name { font-weight: 700; color: #1e293b; font-size: 1rem; margin-bottom: 4px; word-break: break-all; }
        .dsv-file-size { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        
        .dsv-btn { padding: 12px 24px; font-size: 0.95rem; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; justify-content: center; white-space: nowrap; }
        .dsv-btn-primary { background: #7c3aed; color: #fff; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2); }
        .dsv-btn-primary:hover { background: #6d28d9; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3); }
        .dsv-btn-primary:disabled { background: #c4b5fd; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .dsv-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .dsv-btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
        
        .dsv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
        @media (max-width: 600px) { .dsv-grid { grid-template-columns: 1fr; } }
        .dsv-field { padding: 12px 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; transition: all 0.2s; min-width: 0; }
        .dsv-field:hover { border-color: #e2e8f0; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .dsv-field-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .dsv-field-value { font-size: 0.95rem; font-weight: 600; color: #0f172a; word-break: break-word; }
        .dsv-field-value.empty { color: #94a3b8; font-style: italic; font-weight: 400; }

        .dsv-sig-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: all 0.2s; }
        .dsv-sig-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
        .dsv-sig-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 8px; padding-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; }
        .dsv-sig-name { font-weight: 800; font-size: 1.1rem; color: #1e2a52; display: flex; align-items: center; gap: 8px; }
        
        .dsv-badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; border: 1px solid transparent; }
        .dsv-badge.safe { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
        .dsv-badge.warning { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        
        .dsv-cert-box { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; }
        .dsv-cert-title { font-weight: 800; font-size: 0.85rem; color: #7c3aed; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .dsv-integrity-box { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #059669; }
        .dsv-integrity-title { font-weight: 800; font-size: 0.85rem; color: #059669; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }

        .dsv-loading { text-align: center; padding: 3rem 1rem; }
        .dsv-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #7c3aed; border-radius: 50%; animation: dsv-spin 0.8s linear infinite; margin: 0 auto 1rem; }
        @keyframes dsv-spin { to { transform: rotate(360deg); } }

        /* Loader Overrides for #7c3aed Theme */
        .react-wrapper-dsv .loader > span,
        .react-wrapper-dsv .loader > span > span,
        .react-wrapper-dsv .face,
        .react-wrapper-dsv .face:after,
        .react-wrapper-dsv .base span:before,
        .react-wrapper-dsv .longfazers span {
          background: #7c3aed !important;
        }
        .react-wrapper-dsv .base span,
        .react-wrapper-dsv .base span:after {
          border-right-color: #7c3aed !important;
        }
      `}</style>

      <div className="dsv-wrap">
        {onBack && (
          <button onClick={onBack} className="dsv-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="dsv-hdr">
          <h1>Digital Signature Validation</h1>
          <p>Upload a digitally signed PDF to detect signatures, validate signer and certificate information, and check document integrity.</p>
        </div>

        <div className="dsv-card">
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
                Drop signed PDF file here or click to browse
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Accepted: <span className="font-semibold text-[#1e2a52]">PDF files (.pdf)</span>
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              
              <div className="dsv-file-info">
                <div className="dsv-file-icon">
                  <FileText className="w-8 h-8 text-[#1e2a52]" />
                </div>
                <div className="dsv-file-details">
                  <div className="dsv-file-name">{selectedPdf.name}</div>
                  <div className="dsv-file-size">{formatSize(selectedPdf.size)}</div>
                </div>
                {!isValidating && !reportData && (
                  <button onClick={resetAll} className="dsv-btn dsv-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    Change File
                  </button>
                )}
              </div>

              {!reportData && !isValidating && (
                <div className="flex gap-4">
                  <button onClick={handleValidate} className="dsv-btn dsv-btn-primary flex-1">
                    <Search size={18} /> Validate Signatures
                  </button>
                </div>
              )}

              {isValidating && (
                <div className="flex flex-col items-center justify-center p-8 bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl overflow-hidden relative min-h-[160px]">
                  <div className="speeder-loader-wrapper">
                    <div className="loader">
                      <span><span></span><span></span><span></span><span></span></span>
                      <div className="base"><span></span><div className="face"></div></div>
                    </div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <p className="text-sm font-bold text-[#6d28d9] mt-4 animate-pulse">
                    Analyzing digital signatures… Please wait!
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {reportData && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
            
            {/* Status Banner */}
            <div className={`p-6 rounded-2xl border-2 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 ${getStatusColor(reportData.status)}`}>
              <div className="flex items-center gap-4">
                {getStatusIcon(reportData.status)}
                <div>
                  <div className="font-bold text-sm uppercase tracking-wider opacity-80 mb-1">Validation Status</div>
                  <div className="text-2xl font-black">{reportData.status}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <div className="bg-white/60 px-4 py-2 rounded-lg font-bold text-sm border border-current/20">Signatures: {reportData.signature_count}</div>
                <div className="bg-white/60 px-4 py-2 rounded-lg font-bold text-sm border border-current/20">Errors: {reportData.error_count}</div>
                <div className="bg-white/60 px-4 py-2 rounded-lg font-bold text-sm border border-current/20">Warnings: {reportData.warning_count}</div>
              </div>
            </div>

            {/* File Info */}
            <div className="dsv-card">
              <h2><FileText size={20} className="text-[#1e2a52]" /> File Information</h2>
              <div className="dsv-grid">
                <div className="dsv-field"><div className="dsv-field-label">Filename</div><div className="dsv-field-value">{reportData.filename}</div></div>
                <div className="dsv-field"><div className="dsv-field-label">File Size</div><div className="dsv-field-value">{reportData.file_size_human}</div></div>
                <div className="dsv-field"><div className="dsv-field-label">PDF Version</div><div className="dsv-field-value">{reportData.pdf_version}</div></div>
                <div className="dsv-field"><div className="dsv-field-label">Page Count</div><div className="dsv-field-value">{reportData.page_count}</div></div>
                <div className="dsv-field"><div className="dsv-field-label">Encrypted</div><div className="dsv-field-value">{reportData.is_encrypted ? 'Yes' : 'No'}</div></div>
              </div>
            </div>

            {/* Signatures */}
            <div className="dsv-card">
              <h2><ShieldCheck size={20} className="text-[#1e2a52]" /> Detected Signatures</h2>
              {reportData.signatures.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 font-medium">
                  No digital signatures detected in this document.
                </div>
              ) : (
                reportData.signatures.map((sig, idx) => (
                  <div key={idx} className="dsv-sig-card">
                    <div className="dsv-sig-header">
                      <div className="dsv-sig-name">Signature #{idx + 1}: {sig.field_name}</div>
                      {(() => { const b = getSigStatusBadge(sig); return (
                        <span className={`dsv-badge ${b.cls}`}>{b.label}</span>
                      ); })()}
                    </div>
                    
                    <div className="dsv-grid">
                      <div className="dsv-field"><div className="dsv-field-label">Field Type</div><div className="dsv-field-value">{sig.field_type || 'Sig'}</div></div>
                      <div className="dsv-field"><div className="dsv-field-label">Page</div><div className="dsv-field-value">{sig.page || 'N/A'}</div></div>
                      <div className="dsv-field"><div className="dsv-field-label">Signing Time</div><div className="dsv-field-value">{sig.signing_time || 'Not available'}</div></div>
                      <div className="dsv-field"><div className="dsv-field-label">Reason</div><div className="dsv-field-value">{sig.reason || 'Not specified'}</div></div>
                      <div className="dsv-field"><div className="dsv-field-label">Location</div><div className="dsv-field-value">{sig.location || 'Not specified'}</div></div>
                      {sig.filter && <div className="dsv-field"><div className="dsv-field-label">Filter</div><div className="dsv-field-value">{sig.filter}</div></div>}
                      {sig.sub_filter && <div className="dsv-field"><div className="dsv-field-label">Sub-Filter</div><div className="dsv-field-value">{sig.sub_filter}</div></div>}
                      {sig.md_algorithm && <div className="dsv-field"><div className="dsv-field-label">Hash Algorithm</div><div className="dsv-field-value">{sig.md_algorithm}</div></div>}
                      {sig.signature_mechanism && <div className="dsv-field"><div className="dsv-field-label">Signature Mechanism</div><div className="dsv-field-value">{sig.signature_mechanism}</div></div>}
                    </div>

                    {sig.certificate && (sig.certificate.signer_name || sig.certificate.issuer_organization) && (
                      <div className="dsv-cert-box">
                        <div className="dsv-cert-title">Certificate Information</div>
                        <div className="dsv-grid">
                          <div className="dsv-field"><div className="dsv-field-label">Signer Name</div><div className="dsv-field-value">{sig.certificate.signer_name || 'N/A'}</div></div>
                          {sig.certificate.signer_email && <div className="dsv-field"><div className="dsv-field-label">Email</div><div className="dsv-field-value">{sig.certificate.signer_email}</div></div>}
                          <div className="dsv-field"><div className="dsv-field-label">Organization</div><div className="dsv-field-value">{sig.certificate.organization || 'N/A'}</div></div>
                          <div className="dsv-field"><div className="dsv-field-label">Issuer</div><div className="dsv-field-value">{sig.certificate.issuer_organization || 'N/A'}</div></div>
                          {sig.certificate.issuer_common_name && <div className="dsv-field"><div className="dsv-field-label">Issuer CN</div><div className="dsv-field-value">{sig.certificate.issuer_common_name}</div></div>}
                          {sig.certificate.valid_from && <div className="dsv-field"><div className="dsv-field-label">Valid From</div><div className="dsv-field-value">{new Date(sig.certificate.valid_from).toLocaleDateString()}</div></div>}
                          {sig.certificate.valid_to && <div className="dsv-field"><div className="dsv-field-label">Valid To</div><div className="dsv-field-value">{new Date(sig.certificate.valid_to).toLocaleDateString()}</div></div>}
                          {sig.certificate.is_expired !== undefined && <div className="dsv-field"><div className="dsv-field-label">Expired</div><div className="dsv-field-value">{sig.certificate.is_expired ? 'Yes' : 'No'}</div></div>}
                          {sig.certificate.self_signed !== undefined && <div className="dsv-field"><div className="dsv-field-label">Self-Signed</div><div className="dsv-field-value">{sig.certificate.self_signed ? 'Yes' : 'No'}</div></div>}
                          {sig.certificate.serial_number && <div className="dsv-field"><div className="dsv-field-label">Serial Number</div><div className="dsv-field-value">{sig.certificate.serial_number}</div></div>}
                          {sig.certificate.signature_algorithm && <div className="dsv-field"><div className="dsv-field-label">Algorithm</div><div className="dsv-field-value">{sig.certificate.signature_algorithm}</div></div>}
                        </div>
                      </div>
                    )}

                    {sig.validation_checks && sig.validation_checks.length > 0 && (
                      <div className="dsv-integrity-box">
                        <div className="dsv-integrity-title">Validation Checks</div>
                        <div className="flex flex-col gap-2">
                          {sig.validation_checks.map((check, ci) => (
                            <div key={ci} className={`flex items-center gap-3 p-3 rounded-lg border ${check.passed === true || typeof check.passed === 'string' ? 'bg-emerald-50 border-emerald-200' : check.passed === false ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                              {check.passed === true ? <CheckCircle size={16} className="text-emerald-600 shrink-0" /> : check.passed === false ? <AlertCircle size={16} className="text-red-600 shrink-0" /> : <AlertCircle size={16} className="text-amber-600 shrink-0" />}
                              <div>
                                <span className={`font-bold text-sm ${check.passed === true ? 'text-emerald-800' : check.passed === false ? 'text-red-800' : 'text-amber-800'}`}>{check.name}</span>
                                <span className="text-sm text-slate-600 ml-2">{check.detail}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sig.timestamp && sig.timestamp.present && (
                      <div className="dsv-cert-box" style={{ borderLeftColor: sig.timestamp.valid ? '#059669' : '#dc2626' }}>
                        <div className="dsv-cert-title" style={{ color: sig.timestamp.valid ? '#059669' : '#dc2626' }}>TSA Timestamp</div>
                        <div className="dsv-grid">
                          <div className="dsv-field"><div className="dsv-field-label">Present</div><div className="dsv-field-value">Yes</div></div>
                          <div className="dsv-field"><div className="dsv-field-label">Integrity</div><div className="dsv-field-value">{sig.timestamp.intact ? 'Passed' : 'Failed'}</div></div>
                          <div className="dsv-field"><div className="dsv-field-label">Valid</div><div className="dsv-field-value">{sig.timestamp.valid ? 'Yes' : 'No'}</div></div>
                          <div className="dsv-field"><div className="dsv-field-label">Trusted</div><div className="dsv-field-value">{sig.timestamp.trusted ? 'Yes' : 'No'}</div></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Issues */}
            <div className="dsv-card">
              <h2><ShieldAlert size={20} className="text-[#1e2a52]" /> Validation Issues</h2>
              {reportData.issues.length === 0 ? (
                <div className="text-center p-6 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 font-bold flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> No issues detected.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {reportData.issues.map((issue, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border-l-4 ${issue.severity === 'error' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                      <div className="font-bold text-sm mb-1">{issue.title}</div>
                      <div className="text-sm text-slate-700 mb-2">{issue.description}</div>
                      {issue.action && <div className="text-xs font-semibold text-slate-500 italic">Recommended: {issue.action}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Download Report */}
            <div className="dsv-card flex flex-col md:flex-row gap-4 items-center justify-between bg-[#f8fafc]">
              <div className="text-slate-600 font-medium text-center md:text-left w-full md:w-auto">
                Download the full validation report in JSON format.
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button onClick={resetAll} className="dsv-btn dsv-btn-secondary w-full sm:w-auto">
                  Validate Another
                </button>
                <button onClick={handleDownloadReport} className="dsv-btn dsv-btn-primary w-full sm:w-auto">
                  <Download size={18} /> Download JSON Report
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
