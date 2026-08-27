import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowLeft, X, AlertCircle, Edit3, Image as ImageIcon, Type, Download, CheckCircle2, FileText, Move } from 'lucide-react';
import apiClient from '../../api/apiClient';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function BatchWatermarkPage({ onBack }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, text: '' });

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Watermark Settings
  const [wmType, setWmType] = useState('text'); // 'text' or 'image'
  
  // Text
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(36);
  const [fontColor, setFontColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  
  // Image
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  
  // Common
  const [opacity, setOpacity] = useState(50);
  const [rotation, setRotation] = useState(45);
  const [scale, setScale] = useState(1.0);
  
  // Positioning & Pages
  const [position, setPosition] = useState('Center');
  const [pages, setPages] = useState('all');
  const [customPages, setCustomPages] = useState('');

  // Interactive Preview State
  const [previewIndex, setPreviewIndex] = useState(0);
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  
  const [customXRatio, setCustomXRatio] = useState(0.5);
  const [customYRatio, setCustomYRatio] = useState(0.5);
  const [isDraggingWm, setIsDraggingWm] = useState(false);
  const overlayRef = useRef(null);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFiles = (filesList) => {
    setError('');
    const newFiles = Array.from(filesList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    
    if (newFiles.length === 0 && filesList.length > 0) {
      setError('Please select valid PDF files only.');
      return;
    }
    
    setSelectedFiles(prev => {
      const merged = [...prev];
      newFiles.forEach(nf => {
        if (!merged.some(f => f.name === nf.name && f.size === nf.size)) {
          merged.push(nf);
        }
      });
      return merged;
    });
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setResults(null);
    setPreviewIndex(0);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = (pageInfo) => {
    setPageWidth(pageInfo.width);
    setPageHeight(pageInfo.height);
  };

  // Map presets to ratios for preview
  const getPresetRatios = (pos) => {
    switch (pos) {
      case 'Top Left': return { x: 0.1, y: 0.1 };
      case 'Top Center': return { x: 0.5, y: 0.1 };
      case 'Top Right': return { x: 0.9, y: 0.1 };
      case 'Center Left': return { x: 0.1, y: 0.5 };
      case 'Center': return { x: 0.5, y: 0.5 };
      case 'Center Right': return { x: 0.9, y: 0.5 };
      case 'Bottom Left': return { x: 0.1, y: 0.9 };
      case 'Bottom Center': return { x: 0.5, y: 0.9 };
      case 'Bottom Right': return { x: 0.9, y: 0.9 };
      default: return { x: 0.5, y: 0.5 };
    }
  };

  useEffect(() => {
    if (position !== 'Custom') {
      const { x, y } = getPresetRatios(position);
      setCustomXRatio(x);
      setCustomYRatio(y);
    }
  }, [position]);

  const handlePointerDown = (e) => {
    if (position !== 'Custom') setPosition('Custom');
    setIsDraggingWm(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingWm || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Clamp to bounds
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    setCustomXRatio(x / rect.width);
    setCustomYRatio(y / rect.height);
  };

  const handlePointerUp = (e) => {
    setIsDraggingWm(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setResults(null);
    setError('');
    
    setProgress({ percent: 10, text: 'Uploading files and preparing watermarks...' });
    
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    
    formData.append('watermark_type', wmType);
    if (wmType === 'text') {
      formData.append('text', text);
      formData.append('font_family', fontFamily);
      formData.append('font_size', fontSize);
      formData.append('font_color', fontColor);
      formData.append('bold', isBold);
      formData.append('italic', isItalic);
    } else {
      if (imageFile) formData.append('watermark_image', imageFile);
      formData.append('image_scale', scale);
      formData.append('image_opacity', opacity);
      formData.append('image_rotation', rotation);
    }
    
    formData.append('opacity', opacity);
    formData.append('rotation', rotation);
    formData.append('scale', scale);
    formData.append('position', position);
    if (position === 'Custom') {
      formData.append('custom_x_ratio', customXRatio.toString());
      formData.append('custom_y_ratio', customYRatio.toString());
    }
    formData.append('pages_selection', pages === 'custom' ? customPages : pages);
    
    const minDelay = new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      setTimeout(() => setProgress({ percent: 40, text: 'Applying watermarks to documents...' }), 800);
      setTimeout(() => setProgress({ percent: 80, text: 'Finalizing PDF generation...' }), 1800);
      
      const res = await apiClient.uploadFiles('/api/document-management/batch-watermark', formData, false);
      const data = res.data || res;
      
      await minDelay;
      setProgress({ percent: 100, text: 'Batch watermarking complete!' });

      setTimeout(() => {
        setIsProcessing(false);
        setResults(data);
      }, 500);
    } catch(err) {
      await minDelay;
      setIsProcessing(false);
      setError(err?.response?.data?.detail || err.message || 'An error occurred during watermarking.');
    }
  };

  const handleReset = () => {
    setResults(null);
    setSelectedFiles([]);
    setPreviewIndex(0);
  };

  return (
    <div className="react-wrapper-batch_watermark">
      <style>{`
        .bw-wrap { max-width: 1200px; margin: 0 auto; padding: 0 1rem 3rem 1rem; font-family: 'Inter', sans-serif; }
        .bw-hdr { text-align: center; margin-bottom: 2rem; }
        .bw-hdr h1 { font-size: 2.1rem; font-weight: 800; color: #1e2a52; margin: 0 0 8px 0; }
        .bw-hdr p { color: #64748b; font-size: 1rem; margin: 0; }
        
        .bw-back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1e2a52; font-weight: 700; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; margin-bottom: 1.5rem; }
        .bw-back-btn:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: scale(1.05); }

        .bw-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.75rem; box-shadow: 0 4px 14px rgba(0,0,0,0.03); margin-bottom: 1.25rem; min-width: 0; display: flex; flex-direction: column; height: 100%; }
        @media (max-width: 768px) {
            .bw-card { padding: 1.25rem; }
        }
        .bw-card h3 { margin: 0 0 1.25rem 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.75rem; }
        
        .bw-grid { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: stretch; }
        .bw-grid > div { min-width: 0; }
        @media (min-width: 950px) {
            .bw-grid { grid-template-columns: 460px 1fr; }
        }

        .bw-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: all 0.15s; }
        .bw-btn-primary { background: #7c3aed; color: #fff; padding: 14px; font-size: 1.05rem; width: 100%; margin-top: 1.25rem; }
        .bw-btn-primary:hover { background: #6d28d9; }
        .bw-btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }
        
        .bw-table-wrap { max-height: 240px; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; -webkit-overflow-scrolling: touch; }
        .bw-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 400px; }
        .bw-table th { background: #f8fafc; text-align: left; padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10;}
        .bw-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; vertical-align: middle; }
        
        /* Form styles */
        .bw-form-group { margin-bottom: 1rem; }
        .bw-form-label { display: block; font-weight: 700; font-size: 0.85rem; color: #334155; margin-bottom: 4px; }
        .bw-form-input { width: 100%; padding: 8px 12px; font-size: 0.9rem; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; box-sizing: border-box; font-weight: 500; transition: border-color 0.2s; }
        .bw-form-input:focus { border-color: #7c3aed; outline: none; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
        .bw-form-row { display: flex; gap: 12px; }
        .bw-form-row > div { flex: 1; min-width: 0; }
        
        /* Range Slider */
        .bw-range-wrap { display: flex; align-items: center; gap: 10px; }
        .bw-range-wrap input[type=range] { flex: 1; accent-color: #7c3aed; }
        .bw-range-val { font-size: 0.8rem; font-weight: 700; color: #64748b; min-width: 40px; text-align: right; }

        /* Type Tabs */
        .bw-tabs { display: flex; gap: 8px; margin-bottom: 1.25rem; }
        .bw-tab { flex: 1; padding: 10px; text-align: center; font-weight: 700; font-size: 0.9rem; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; background: #f1f5f9; color: #64748b; }
        .bw-tab.active { background: #f5f3ff; color: #6d28d9; border-color: #7c3aed; }
        
        /* Position Grid */
        .bw-pos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .bw-pos-btn { padding: 8px 4px; text-align: center; font-size: 0.75rem; font-weight: 600; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; background: #f8fafc; color: #475569; transition: all 0.15s; }
        .bw-pos-btn:hover { background: #e2e8f0; }
        .bw-pos-btn.active { background: #7c3aed; color: #fff; border-color: #7c3aed; }

        /* Canvas Preview */
        .bw-preview-box { flex: 1; min-height: 400px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem; overflow: hidden; position: relative; }
        .bw-pdf-container { position: relative; display: inline-block; box-shadow: 0 4px 20px rgba(0,0,0,0.1); background: #fff; max-width: 100%; max-height: 600px; overflow: hidden; user-select: none; }
        .bw-pdf-container canvas { max-width: 100% !important; height: auto !important; }
        
        .bw-wm-draggable { position: absolute; transform: translate(-50%, -50%); cursor: grab; user-select: none; touch-action: none; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
        .bw-wm-draggable:active { cursor: grabbing; }
        .bw-wm-text { white-space: nowrap; }
        .bw-wm-img { max-width: 150px; pointer-events: none; }

        /* Spinners & Results */
        .bw-res-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 1.5rem; }
        .bw-res-stat { padding: 12px; border-radius: 10px; text-align: center; font-weight: 800; }
        
        /* Theme Loader overrides */
        .react-wrapper-batch_watermark .loader > span,
        .react-wrapper-batch_watermark .loader > span > span,
        .react-wrapper-batch_watermark .face,
        .react-wrapper-batch_watermark .face:after,
        .react-wrapper-batch_watermark .base span:before,
        .react-wrapper-batch_watermark .longfazers span {
          background: #7c3aed !important;
        }
        .react-wrapper-batch_watermark .base span,
        .react-wrapper-batch_watermark .base span:after {
          border-right-color: #7c3aed !important;
        }
      `}</style>

      <div className="bw-wrap">
        {onBack && (
          <button onClick={onBack} className="bw-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="bw-hdr">
          <h1>Batch Watermark</h1>
          <p>Apply text or image watermarks to multiple PDF files at once.</p>
        </div>

        {/* TOP CARD: DRAG & DROP AND FILE LIST */}
        <div className="bw-card">
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging
              ? 'border-[#7c3aed] bg-[#f5f3ff] scale-[1.01]'
              : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'
              }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          >
            <input className="hidden" type="file" ref={fileInputRef} multiple accept=".pdf" onChange={(e) => handleFiles(e.target.files)} />
            <div className="w-14 h-14 bg-[#1e2a52]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-[#1e2a52]" />
            </div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>Select PDF Files</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Drag & drop files or click browse</p>
          </div>

          {error && <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', color: '#991b1b', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={18} /> {error}</div>}

          {selectedFiles.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 mt-6">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem' }}>Selected Documents ({selectedFiles.length})</div>
                <button onClick={clearAllFiles} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}>
                  Clear All
                </button>
              </div>

              <div className="bw-table-wrap">
                <table className="bw-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Filename</th>
                      <th style={{ width: '100px' }}>Size</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFiles.map((file, idx) => (
                      <tr key={idx} style={{ background: previewIndex === idx ? '#f5f3ff' : 'transparent' }}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: previewIndex === idx ? 800 : 600, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                          {file.name} {previewIndex === idx && <span style={{fontSize:'10px', marginLeft:'8px', background:'#7c3aed', color:'white', padding:'2px 6px', borderRadius:'10px'}}>Previewing</span>}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{formatBytes(file.size)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); if(previewIndex >= selectedFiles.length -1) setPreviewIndex(0); }} 
                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM GRID: SETTINGS (LEFT) AND LIVE PREVIEW (RIGHT) */}
        {selectedFiles.length > 0 && (
          <div className="bw-grid animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
              <div className="bw-card">
                <h3><Edit3 size={20} /> Watermark Configuration</h3>

                <div className="bw-tabs">
                  <div className={`bw-tab ${wmType === 'text' ? 'active' : ''}`} onClick={() => setWmType('text')}>
                    <Type size={16} className="inline mr-1" /> Text
                  </div>
                  <div className={`bw-tab ${wmType === 'image' ? 'active' : ''}`} onClick={() => setWmType('image')}>
                    <ImageIcon size={16} className="inline mr-1" /> Image
                  </div>
                </div>

                {wmType === 'text' && (
                  <>
                    <div className="bw-form-group">
                      <label className="bw-form-label">Watermark Text</label>
                      <input type="text" className="bw-form-input" value={text} onChange={e => setText(e.target.value)} />
                    </div>
                    <div className="bw-form-row">
                      <div className="bw-form-group">
                        <label className="bw-form-label">Font Family</label>
                        <select className="bw-form-input" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                          <option value="Helvetica">Helvetica</option>
                          <option value="Times New Roman">Times Roman</option>
                          <option value="Courier New">Courier</option>
                        </select>
                      </div>
                      <div className="bw-form-group">
                        <label className="bw-form-label">Font Size</label>
                        <input type="number" className="bw-form-input" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} min={6} max={200} />
                      </div>
                    </div>
                    <div className="bw-form-row" style={{ alignItems: 'center', marginBottom: '1rem' }}>
                      <div className="bw-form-group" style={{ marginBottom: 0 }}>
                        <label className="bw-form-label">Color</label>
                        <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} style={{ width: '100%', height: '36px', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flex: 2, paddingLeft: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={isBold} onChange={e => setIsBold(e.target.checked)} style={{ accentColor: '#7c3aed' }} /> Bold
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={isItalic} onChange={e => setIsItalic(e.target.checked)} style={{ accentColor: '#7c3aed' }} /> Italic
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {wmType === 'image' && (
                  <div className="bw-form-group">
                    <label className="bw-form-label">Upload Image</label>
                    <div 
                      onClick={() => imageInputRef.current?.click()}
                      style={{ border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
                    >
                      <input type="file" className="hidden" ref={imageInputRef} accept="image/*" onChange={handleImageUpload} />
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" style={{ maxHeight: '80px', margin: '0 auto', borderRadius: '6px' }} />
                      ) : (
                        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Click to browse image</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bw-form-row">
                  <div className="bw-form-group">
                    <label className="bw-form-label">Opacity</label>
                    <div className="bw-range-wrap">
                      <input type="range" min={1} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))} />
                      <span className="bw-range-val">{opacity}%</span>
                    </div>
                  </div>
                  <div className="bw-form-group">
                    <label className="bw-form-label">Scale</label>
                    <div className="bw-range-wrap">
                      <input type="range" min={0.2} max={3.0} step={0.1} value={scale} onChange={e => setScale(Number(e.target.value))} />
                      <span className="bw-range-val">{scale}x</span>
                    </div>
                  </div>
                </div>

                <div className="bw-form-row">
                  <div className="bw-form-group">
                    <label className="bw-form-label">Rotation</label>
                    <div className="bw-range-wrap">
                      <input type="range" min={0} max={360} value={rotation} onChange={e => setRotation(Number(e.target.value))} />
                      <span className="bw-range-val">{rotation}&deg;</span>
                    </div>
                  </div>
                </div>

                <div className="bw-form-row">
                  <div className="bw-form-group">
                    <label className="bw-form-label">Position</label>
                    <div className="bw-pos-grid">
                      {['Top Left', 'Top Center', 'Top Right', 'Center Left', 'Center', 'Center Right', 'Bottom Left', 'Bottom Center', 'Bottom Right'].map(pos => (
                        <div key={pos} className={`bw-pos-btn ${position === pos ? 'active' : ''}`} onClick={() => setPosition(pos)}>
                          {pos}
                        </div>
                      ))}
                      <div className={`bw-pos-btn ${position === 'Custom' ? 'active' : ''}`} onClick={() => setPosition('Custom')}>
                        Custom (Drag)
                      </div>
                    </div>
                  </div>
                  
                  <div className="bw-form-group">
                    <label className="bw-form-label">Page Selection</label>
                    <select className="bw-form-input" value={pages} onChange={e => setPages(e.target.value)}>
                      <option value="all">All Pages</option>
                      <option value="first page">First Page Only</option>
                      <option value="last page">Last Page Only</option>
                      <option value="odd pages">Odd Pages</option>
                      <option value="even pages">Even Pages</option>
                      <option value="custom">Custom Range...</option>
                    </select>
                    {pages === 'custom' && (
                      <input type="text" className="bw-form-input" style={{ marginTop: '8px' }} placeholder="e.g. 1-3,5,7-10" value={customPages} onChange={e => setCustomPages(e.target.value)} />
                    )}
                  </div>
                </div>

                {!isProcessing && !results && (
                  <button className="bw-btn bw-btn-primary" onClick={handleProcess} disabled={selectedFiles.length === 0}>
                    Apply Watermark to {selectedFiles.length} File(s)
                  </button>
                )}
              </div>
            </div>

            <div className="bw-card">
              {!isProcessing && !results && (
                <>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Live Interactive Preview</span>
                    {selectedFiles.length > 1 && (
                      <select 
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, maxWidth: '200px' }}
                        value={previewIndex}
                        onChange={(e) => setPreviewIndex(Number(e.target.value))}
                      >
                        {selectedFiles.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="bw-preview-box">
                    {selectedFiles[previewIndex] && (
                        <div 
                          className="bw-pdf-container" 
                          ref={overlayRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerUp}
                        >
                            <Document
                                file={selectedFiles[previewIndex]}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={<div style={{padding:'2rem', color:'#64748b'}}>Loading PDF preview...</div>}
                            >
                                <Page 
                                    pageNumber={1} 
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    onLoadSuccess={onPageLoadSuccess}
                                />
                            </Document>
                            
                            {pageWidth > 0 && (
                                <div 
                                    className="bw-wm-draggable"
                                    style={{
                                        left: `${customXRatio * 100}%`,
                                        top: `${customYRatio * 100}%`,
                                        opacity: opacity / 100,
                                        transform: `translate(-50%, -50%) rotate(-${rotation}deg) scale(${scale})`,
                                    }}
                                >
                                    {wmType === 'text' ? (
                                        <div className="bw-wm-text" style={{
                                            fontFamily: fontFamily,
                                            fontSize: `${fontSize}px`,
                                            color: fontColor,
                                            fontWeight: isBold ? 'bold' : 'normal',
                                            fontStyle: isItalic ? 'italic' : 'normal',
                                        }}>
                                            {text}
                                        </div>
                                    ) : (
                                        imagePreview && <img src={imagePreview} className="bw-wm-img" alt="watermark preview" />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    <Move size={14} className="inline mr-1" />
                    Drag the watermark to set custom placement
                  </div>
                </>
              )}

              {isProcessing && (
                <div className="p-8 bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl text-center h-full flex flex-col justify-center">
                  <div className="speeder-loader-wrapper mb-6">
                    <div className="loader">
                      <span><span></span><span></span><span></span><span></span></span>
                      <div className="base"><span></span><div className="face"></div></div>
                    </div>
                    <div className="longfazers"><span></span><span></span><span></span><span></span></div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#6d28d9', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{progress.text}</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#ddd6fe', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress.percent}%`, height: '100%', background: '#7c3aed', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}

              {results && !isProcessing && (
                <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    Watermarking Completed
                  </div>

                  <div className="bw-res-summary">
                    <div className="bw-res-stat" style={{ background: '#f1f5f9', color: '#334155' }}>
                      <div style={{ fontSize: '1.4rem' }}>{results.total_files}</div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</div>
                    </div>
                    <div className="bw-res-stat" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      <div style={{ fontSize: '1.4rem' }}>{results.successful_files}</div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Watermarked</div>
                    </div>
                    <div className="bw-res-stat" style={{ background: '#fef2f2', color: '#dc2626' }}>
                      <div style={{ fontSize: '1.4rem' }}>{results.failed_files}</div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Failed</div>
                    </div>
                  </div>

                  {results.failed_details && results.failed_details.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.92rem', marginBottom: '8px' }}>Failed Files:</div>
                      {results.failed_details.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '0.86rem', color: '#b91c1c', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                          <span>•</span> <strong>{item.filename}</strong>: {item.reason}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {results.has_download && results.download_url && (
                    <a href={apiClient.getFullUrl(results.download_url)} download style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', background: '#16a34a', color: '#ffffff', fontSize: '1.05rem', fontWeight: 800, borderRadius: '10px', textDecoration: 'none', transition: 'background 0.15s', marginBottom: '1rem' }}>
                      <Download size={20} />
                      {results.is_zip ? 'Download Watermarked PDFs (ZIP)' : `Download Watermarked PDF (${results.download_filename})`}
                    </a>
                  )}

                  <button onClick={handleReset} style={{ width: '100%', padding: '14px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer' }}>
                    Watermark More Documents
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
