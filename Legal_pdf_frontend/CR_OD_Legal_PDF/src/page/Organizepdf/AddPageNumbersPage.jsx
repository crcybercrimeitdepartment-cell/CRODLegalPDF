import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function AddPageNumberPage() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);

  // Form State
  const [pageMode, setPageMode] = useState('single');
  const [position, setPosition] = useState('Bottom Right');
  const [marginType, setMarginType] = useState('Recommended');
  const [pageRange, setPageRange] = useState('all');
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(10);
  const [startNumber, setStartNumber] = useState(1);

  const [formatType, setFormatType] = useState('{n}');
  const [customFormat, setCustomFormat] = useState('{n}');

  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [fontSize, setFontSize] = useState(14);
  const [fontColor, setFontColor] = useState('#000000');
  const [styleBold, setStyleBold] = useState(false);
  const [styleItalic, setStyleItalic] = useState(false);
  const [styleUnderline, setStyleUnderline] = useState(false);

  const fileInputRef = useRef(null);

  // Helper: Hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  };

  // Helper: Get standard font
  const getFont = async (pdfDoc, family, isBold, isItalic) => {
    // Map families to closest standard font
    let base = 'Helvetica';
    if (family.toLowerCase().includes('times') || family.toLowerCase().includes('georgia')) base = 'TimesRoman';
    else if (family.toLowerCase().includes('courier')) base = 'Courier';

    if (base === 'Helvetica') {
      if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      if (isBold) return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      if (isItalic) return await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      return await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
    if (base === 'TimesRoman') {
      if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
      if (isBold) return await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      if (isItalic) return await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      return await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }
    if (base === 'Courier') {
      if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
      if (isBold) return await pdfDoc.embedFont(StandardFonts.CourierBold);
      if (isItalic) return await pdfDoc.embedFont(StandardFonts.CourierOblique);
      return await pdfDoc.embedFont(StandardFonts.Courier);
    }
    return await pdfDoc.embedFont(StandardFonts.Helvetica);
  };

  // Logic to process a document (used by preview and final generation)
  const processDocument = async (fileBuffer, isPreview = false) => {
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const font = await getFont(pdfDoc, fontFamily, styleBold, styleItalic);
    const colorRGB = hexToRgb(fontColor);
    const color = rgb(colorRGB.r, colorRGB.g, colorRGB.b);

    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // Calculate margins
    let margin = 20; // Recommended default
    if (marginType === 'Small') margin = 10;
    if (marginType === 'Big') margin = 40;

    // Determine which pages to process
    let startIdx = 0;
    let endIdx = totalPages - 1;
    if (pageRange === 'custom') {
      startIdx = Math.max(0, pageFrom - 1);
      endIdx = Math.min(totalPages - 1, pageTo - 1);
    }

    // If preview, only process the first applicable page
    if (isPreview) {
      endIdx = startIdx;
    }

    for (let i = startIdx; i <= endIdx; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      let pageNum = startNumber + (i - startIdx);
      let formatStr = formatType === 'custom' ? customFormat : formatType;
      let textToDraw = formatStr.replace('{n}', pageNum.toString()).replace('{m}', totalPages.toString());

      const textWidth = font.widthOfTextAtSize(textToDraw, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Calculate Position
      let x = margin;
      let y = margin; // Note: pdf-lib y-axis starts from bottom

      // Handle facing pages (alternate left/right)
      let currentPos = position;
      if (pageMode === 'facing') {
        const isEven = (i + 1) % 2 === 0;
        // Mirror position if even page
        if (isEven) {
          if (currentPos.includes('Left')) currentPos = currentPos.replace('Left', 'Right');
          else if (currentPos.includes('Right')) currentPos = currentPos.replace('Right', 'Left');
        }
      }

      if (currentPos.includes('Left')) {
        x = margin;
      } else if (currentPos.includes('Center')) {
        x = (width / 2) - (textWidth / 2);
      } else if (currentPos.includes('Right')) {
        x = width - margin - textWidth;
      }

      if (currentPos.includes('Top')) {
        y = height - margin - textHeight;
      } else if (currentPos.includes('Bottom')) {
        y = margin;
      }

      page.drawText(textToDraw, {
        x,
        y,
        size: fontSize,
        font,
        color,
      });

      // Hack for underline since pdf-lib doesn't have native text decoration
      if (styleUnderline) {
        const underlineThickness = Math.max(1, fontSize * 0.07);
        page.drawLine({
          start: { x, y: y - (fontSize * 0.2) },
          end: { x: x + textWidth, y: y - (fontSize * 0.2) },
          thickness: underlineThickness,
          color: color
        });
      }
    }

    // If preview, we want to just extract the first modified page to keep the blob small
    if (isPreview && totalPages > 1) {
      const previewDoc = await PDFDocument.create();
      const [copiedPage] = await previewDoc.copyPages(pdfDoc, [startIdx]);
      previewDoc.addPage(copiedPage);
      return await previewDoc.save();
    }

    return await pdfDoc.save();
  };

  // Generate Preview
  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      return;
    }

    const generatePreview = async () => {
      try {
        const fileBuffer = await files[0].arrayBuffer();
        const pdfBytes = await processDocument(fileBuffer, true);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (error) {
        console.error("Preview generation failed", error);
      }
    };

    // Debounce slightly to avoid aggressive re-rendering on typing
    const timeoutId = setTimeout(() => {
      generatePreview();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [files, pageMode, position, marginType, pageRange, pageFrom, pageTo, startNumber, formatType, customFormat, fontFamily, fontSize, fontColor, styleBold, styleItalic, styleUnderline]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
    if (files.length - 1 === 0) {
      setIsSuccess(false);
      setIsProcessing(false);
      setPreviewUrl(null);
    }
  };

  const handleAddPageNumbers = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setIsSuccess(false);

    try {
      const generatedFiles = [];
      for (const file of files) {
        const fileBuffer = await file.arrayBuffer();
        const pdfBytes = await processDocument(fileBuffer, false);

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        generatedFiles.push({
          url,
          filename: file.name.replace('.pdf', '_numbered.pdf')
        });
      }
      setProcessedFiles(generatedFiles);
      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to add page numbers", error);
      alert("An error occurred while processing the PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const positions = [
    { label: 'Top Left', top: '0%', left: '0%', transform: 'translate(0, 0)' },
    { label: 'Top Center', top: '0%', left: '50%', transform: 'translate(-50%, 0)' },
    { label: 'Top Right', top: '0%', left: '100%', transform: 'translate(-100%, 0)' },
    { label: 'Bottom Left', top: '100%', left: '0%', transform: 'translate(0, -100%)' },
    { label: 'Bottom Center', top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },
    { label: 'Bottom Right', top: '100%', left: '100%', transform: 'translate(-100%, -100%)' },
  ];

  const currentPos = positions.find(p => p.label === position) || positions[5];

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 min-h-screen flex flex-col items-center">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
          <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
            Add Page Numbers
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Add page numbers into PDFs with ease. Choose your positions, dimensions, typography.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start w-full">
          {/* Left Column (Upload and Preview) */}
          <div className="w-full lg:max-w-2xl flex flex-col gap-6 mx-auto lg:mx-0 transition-all duration-500">
            <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden flex-1">
              <div
                className={`upload-zone relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-inner group flex flex-col justify-center min-h-[300px] ${isDragOver ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" accept=".pdf" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
                <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-translate-y-1">
                  <svg className="w-10 h-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="drop-text text-xl font-bold text-slate-800 mb-2 transition-colors group-hover:text-indigo-900">
                  {files.length > 0 ? `${files.length} File(s) selected` : 'Drag & drop a PDF here'}
                </p>
                {files.length === 0 && <p className="text-sm text-slate-500">or <span className="font-semibold text-indigo-600 group-hover:underline">click to browse</span></p>}
              </div>

              {files.length > 0 && (
                <div className="file-list mt-6 space-y-3">
                  {files.map((file, index) => (
                    <div key={index} className="file-item flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(index); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0" title="Remove file">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview UI replacing old pdfPreview empty container */}
              <div className="preview-section mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden h-[300px] sm:h-[400px] lg:h-[500px] flex flex-col items-center justify-center shadow-inner w-full relative">
                {previewUrl ? (
                  <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full border-none bg-transparent" title="PDF Preview" />
                ) : (
                  <p className="preview-empty text-slate-400 font-medium p-6 text-center">Upload PDF to see a live preview</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Options) */}
          <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden mx-auto lg:mx-0 transition-all duration-500">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

              {!isProcessing && !isSuccess && (
                <>
                  <div>
                    <div className="text-sm font-bold text-slate-700 tracking-wider uppercase mb-3 border-b border-slate-200 pb-2">Page Mode</div>
                <div className="flex gap-3">
                  <div className={`flex-1 py-3 text-center border rounded-xl font-semibold cursor-pointer transition-colors ${pageMode === 'single' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'}`} onClick={() => setPageMode('single')}>Single Page</div>
                  <div className={`flex-1 py-3 text-center border rounded-xl font-semibold cursor-pointer transition-colors ${pageMode === 'facing' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'}`} onClick={() => setPageMode('facing')}>Facing Pages</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-700 tracking-wider uppercase mb-3 border-b border-slate-200 pb-2">Position</div>
                <div className="text-center">
                  <div className="flex justify-center mb-5">
                    <div className="relative w-20 h-28 border-2 border-slate-200 bg-white rounded-lg shadow-sm">
                      <div
                        className="absolute w-4 h-4 bg-indigo-500 rounded-full transition-all duration-300 shadow-md"
                        style={{ top: currentPos.top, left: currentPos.left, transform: currentPos.transform }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-40 mx-auto">
                    {positions.map((pos) => (
                      <button
                        key={pos.label}
                        type="button"
                        className={`w-12 h-12 rounded-lg cursor-pointer transition-colors ${position === pos.label ? 'border-2 border-indigo-500 bg-indigo-50' : 'border border-slate-200 bg-white hover:bg-slate-50'}`}
                        onClick={() => setPosition(pos.label)}
                        title={pos.label}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Margin</label>
                <select className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={marginType} onChange={(e) => setMarginType(e.target.value)}>
                  <option value="Small">Small</option>
                  <option value="Recommended">Recommended</option>
                  <option value="Big">Big</option>
                </select>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-700 tracking-wider uppercase mb-3 border-b border-slate-200 pb-2">Pages to Number</div>
                <select className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm mb-3" value={pageRange} onChange={(e) => setPageRange(e.target.value)}>
                  <option value="all">All pages</option>
                  <option value="custom">Pages from ... to ...</option>
                </select>

                {pageRange === 'custom' && (
                  <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
                    <span className="font-medium">From</span>
                    <input type="number" className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center focus:outline-none focus:border-indigo-500 shadow-sm" value={pageFrom} onChange={(e) => setPageFrom(Number(e.target.value))} min="1" />
                    <span className="font-medium">to</span>
                    <input type="number" className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center focus:outline-none focus:border-indigo-500 shadow-sm" value={pageTo} onChange={(e) => setPageTo(Number(e.target.value))} min="1" />
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First number</label>
                  <input type="number" className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={startNumber} onChange={(e) => setStartNumber(Number(e.target.value))} min="1" />
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-700 tracking-wider uppercase mb-3 border-b border-slate-200 pb-2">Text & Typography</div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Text Format</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm mb-2" value={formatType} onChange={(e) => setFormatType(e.target.value)}>
                    <option value="{n}">1 (Single Number)</option>
                    <option value="Page {n}">Page 1</option>
                    <option value="Page {n} of {m}">Page 1 of 5</option>
                    <option value="custom">Custom...</option>
                  </select>
                  {formatType === 'custom' && (
                    <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm" value={customFormat} onChange={(e) => setCustomFormat(e.target.value)} placeholder="Use {n} and {m}" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Font</label>
                    <select className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                      <option value="Arial">Arial</option>
                      <option value="Arial Unicode MS">Arial Unicode MS</option>
                      <option value="Comic Sans MS">Comic Sans MS</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Size</label>
                    <input type="number" className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Color</label>
                    <div className="relative w-full h-[52px]">
                      <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" value={fontColor} onChange={(e) => setFontColor(e.target.value)} />
                      <div className="absolute inset-0 w-full h-full border border-slate-200 rounded-xl shadow-sm pointer-events-none" style={{ backgroundColor: fontColor }}></div>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white mix-blend-difference pointer-events-none">{fontColor}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Style</label>
                    <div className="flex gap-2">
                      <button type="button" className={`w-12 h-[52px] border rounded-xl font-bold transition-colors shadow-sm ${styleBold ? 'bg-slate-200 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} onClick={() => setStyleBold(!styleBold)}>B</button>
                      <button type="button" className={`w-12 h-[52px] border rounded-xl italic font-serif transition-colors shadow-sm ${styleItalic ? 'bg-slate-200 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} onClick={() => setStyleItalic(!styleItalic)}>I</button>
                      <button type="button" className={`w-12 h-[52px] border rounded-xl underline transition-colors shadow-sm flex items-center justify-center ${styleUnderline ? 'bg-slate-200 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} onClick={() => setStyleUnderline(!styleUnderline)}><span style={{ textDecoration: 'underline' }}>U</span></button>
                    </div>
                  </div>
                </div>
              </div>

                  <button className="btn btn-primary bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-indigo-200 transition-all text-base cursor-pointer flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none w-full mt-8 group" onClick={handleAddPageNumbers} disabled={files.length === 0}>
                    <span className="btn-text">Add Page Numbers</span>
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </button>
                </>
              )}

              {/* Processing UI */}
              {isProcessing && (
                <div className="flex flex-col items-center justify-center p-8 bg-indigo-50/50 border border-indigo-100 rounded-2xl mt-6 backdrop-blur-sm">
                  <div className="speeder-loader-wrapper mb-4">
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
                  <p className="text-base font-bold text-indigo-800 mt-4 animate-pulse">
                    Adding page numbers...
                  </p>
                </div>
              )}

              {/* Success UI */}
              {isSuccess && (
                <div className="mt-6 p-8 text-center space-y-4 w-full bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col items-center justify-center gap-3 relative z-10">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1 shadow-sm border border-emerald-200 animate-bounce">
                      <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </div>
                    <h3 className="text-xl font-extrabold text-emerald-800">Success!</h3>
                    <p className="text-sm text-emerald-700 font-medium mb-4">Your PDF files are ready to download.</p>

                    <div className="w-full flex flex-col gap-3">
                      {processedFiles.map((pf, idx) => (
                        <a key={idx} href={pf.url} download={pf.filename} className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all text-base cursor-pointer hover:-translate-y-1 active:translate-y-0 w-full">
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                          Download {processedFiles.length > 1 ? pf.filename : 'PDF'}
                        </a>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="relative z-10 inline-flex items-center justify-center gap-2 bg-white hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-200 px-8 py-3 rounded-xl font-bold transition-all text-base cursor-pointer w-full mt-4" onClick={() => {
                    setIsSuccess(false);
                    setFiles([]);
                    setPreviewUrl(null);
                    processedFiles.forEach(pf => URL.revokeObjectURL(pf.url));
                    setProcessedFiles([]);
                  }}>
                    Start Over
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
