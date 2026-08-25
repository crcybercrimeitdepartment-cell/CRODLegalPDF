import os

CONVERT_DIR = 'c:/Users/achar/Desktop/Legal_pdf_fullstack/Legal_pdf_frontend/CR_OD_Legal_PDF/src/page/ConvertPDF'

PAGE_CONFIG = {
    'PDFtoWordPage.jsx':              ('pdf-to-word',         '.docx', 'PDF to Word'),
    'PDFtoExcelPage.jsx':             ('pdf-to-excel',        '.xlsx', 'PDF to Excel'),
    'PDFtoPowerPointPage.jsx':        ('pdf-to-powerpoint',   '.pptx', 'PDF to PowerPoint'),
    'PDFtoJPGPage.jsx':               ('pdf-to-jpg',          '.zip',  'PDF to JPG'),
    'PDFtoPNGPage.jsx':               ('pdf-to-png',          '.zip',  'PDF to PNG'),
    'PDFtoGIFPage.jsx':               ('pdf-to-gif',          '.zip',  'PDF to GIF'),
    'PDFtoBMPPage.jsx':               ('pdf-to-bmp',          '.zip',  'PDF to BMP'),
    'PDFtoTIFFPage.jsx':              ('pdf-to-tiff',         '.zip',  'PDF to TIFF'),
    'PDFtoWebPPage.jsx':              ('pdf-to-webp',         '.zip',  'PDF to WebP'),
    'PDFtoSVGPage.jsx':               ('pdf-to-svg',          '.zip',  'PDF to SVG'),
    'PDFtoTextTXTPage.jsx':           ('pdf-to-txt',          '.txt',  'PDF to Text (TXT)'),
    'PDFtoHTMLPage.jsx':              ('pdf-to-html',         '.zip',  'PDF to HTML'),
    'PDFtoXMLPage.jsx':               ('pdf-to-xml',          '.xml',  'PDF to XML'),
    'PDFtoCSVPage.jsx':               ('pdf-to-csv',          '.zip',  'PDF to CSV'),
    'PDFtoJSONPage.jsx':              ('pdf-to-json',         '.json', 'PDF to JSON'),
    'PDFtoRTFPage.jsx':               ('pdf-to-rtf',          '.rtf',  'PDF to RTF'),
    'PDFtoMarkdownMDPage.jsx':        ('pdf-to-markdown',     '.md',   'PDF to Markdown'),
    'PDFtoEPUBPage.jsx':              ('pdf-to-epub',         '.epub', 'PDF to EPUB'),
    'PDFtoXPSPage.jsx':               ('pdf-to-xps',          '.xps',  'PDF to XPS'),
    'PDFtoZIPPage.jsx':               ('pdf-to-zip',          '.zip',  'PDF to ZIP'),
    'PDFtoHEICPage.jsx':              ('pdf-to-heic',         '.zip',  'PDF to HEIC'),
    'PDFtoRAWImagePage.jsx':          ('pdf-to-raw-image',    '.zip',  'PDF to RAW Image'),
    'PDFtoODTOpenDocumentTextPage.jsx':         ('pdf-to-odt',  '.odt', 'PDF to ODT'),
    'PDFtoODSOpenDocumentSpreadsheetPage.jsx':  ('pdf-to-ods',  '.ods', 'PDF to ODS'),
    'PDFtoODPOpenDocumentPresentationPage.jsx': ('pdf-to-odp',  '.odp', 'PDF to ODP'),
    'PDFtoVisioVSDXPage.jsx':         ('pdf-to-visio',        '.vsdx', 'PDF to Visio'),
    'PDFtoPublisherPUBPage.jsx':      ('pdf-to-publisher',    '.pub',  'PDF to Publisher'),
    'PDFtoPhotoshopPSDPage.jsx':      ('pdf-to-photoshop',    '.zip',  'PDF to Photoshop PSD'),
    'PDFtoIllustratorAIPage.jsx':     ('pdf-to-illustrator',  '.zip',  'PDF to Illustrator AI'),
    'PDFtoCADDWGDXFPage.jsx':         ('pdf-to-cad',          '.zip',  'PDF to CAD DWG/DXF'),
    'PDFtoEmailEMLPage.jsx':          ('pdf-to-email',        '.eml',  'PDF to Email EML'),
    'PDFtoOutlookMSGPage.jsx':        ('pdf-to-outlook',      '.msg',  'PDF to Outlook MSG'),
    'PDFtoPDFAPage.jsx':              ('pdf-to-pdfa',         '.pdf',  'PDF to PDF/A'),
    'PDFtoEditablePDFPage.jsx':       ('pdf-to-searchable',   '.pdf',  'PDF to Editable PDF'),
    'PDFtoSearchablePDFOCRPage.jsx':  ('pdf-to-searchable',   '.pdf',  'PDF to Searchable PDF (OCR)'),
    'PDFtoImageCollectionPage.jsx':   ('pdf-to-jpg',          '.zip',  'PDF to Image Collection'),
    'PDFtoIndividualPagesPage.jsx':   ('pdf-to-jpg',          '.zip',  'PDF to Individual Pages'),
    'PDFtoSingleLongImagePage.jsx':   ('pdf-to-png',          '.zip',  'PDF to Single Long Image'),
}


def make_page(component_name, tool_name, api_slug, output_ext):
    # Build the JSX as a plain string - NO f-strings to avoid brace escaping issues
    lines = []
    lines.append("import React, { useState, useRef } from 'react';")
    lines.append("import { Upload, FileText, Download, CheckCircle2, ArrowLeft, X, AlertCircle } from 'lucide-react';")
    lines.append("")
    lines.append("const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';")
    lines.append("")
    lines.append("export default function " + component_name + "({ onBack }) {")
    lines.append('  const toolName = "' + tool_name + '";')
    lines.append('  const toolDesc = "Convert your PDF with ' + tool_name + '.";')
    lines.append('  const apiSlug = "' + api_slug + '";')
    lines.append('  const outputExt = "' + output_ext + '";')
    lines.append("")
    lines.append("  const [file, setFile] = useState(null);")
    lines.append("  const [isProcessing, setIsProcessing] = useState(false);")
    lines.append("  const [isDone, setIsDone] = useState(false);")
    lines.append("  const [isDragging, setIsDragging] = useState(false);")
    lines.append("  const [error, setError] = useState('');")
    lines.append("  const [downloadBlob, setDownloadBlob] = useState(null);")
    lines.append("  const [downloadFilename, setDownloadFilename] = useState('');")
    lines.append("  const inputRef = useRef();")
    lines.append("")
    lines.append("  const addFile = (newFiles) => {")
    lines.append("    setError('');")
    lines.append("    const f = Array.from(newFiles).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');")
    lines.append("    if (!f) { setError('Only PDF files (.pdf) are accepted.'); return; }")
    lines.append("    setFile(f);")
    lines.append("    setIsDone(false);")
    lines.append("    setDownloadBlob(null);")
    lines.append("  };")
    lines.append("")
    lines.append("  const handleFileChange = (e) => { if (e.target.files?.length) addFile(e.target.files); };")
    lines.append("  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFile(e.dataTransfer.files); };")
    lines.append("")
    lines.append("  const handleProcess = async () => {")
    lines.append("    if (!file) return;")
    lines.append("    setIsProcessing(true);")
    lines.append("    setError('');")
    lines.append("    try {")
    lines.append("      // Step 1: Upload the real File object")
    lines.append("      const uploadForm = new FormData();")
    lines.append("      uploadForm.append('file', file);")
    lines.append("      const uploadRes = await fetch(`${API_BASE_URL}/api/convert-from-pdf/${apiSlug}/upload`, {")
    lines.append("        method: 'POST',")
    lines.append("        body: uploadForm,")
    lines.append("      });")
    lines.append("      if (!uploadRes.ok) {")
    lines.append("        const err = await uploadRes.json().catch(() => ({}));")
    lines.append("        throw new Error(err.detail || `Upload failed (${uploadRes.status})`);")
    lines.append("      }")
    lines.append("      const uploadData = await uploadRes.json();")
    lines.append("")
    lines.append("      // Step 2: Process")
    lines.append("      const processForm = new FormData();")
    lines.append("      processForm.append('request_id', uploadData.request_id);")
    lines.append("      processForm.append('filename', uploadData.filename);")
    lines.append("      const processRes = await fetch(`${API_BASE_URL}/api/convert-from-pdf/${apiSlug}/process`, {")
    lines.append("        method: 'POST',")
    lines.append("        body: processForm,")
    lines.append("      });")
    lines.append("      if (!processRes.ok) {")
    lines.append("        const err = await processRes.json().catch(() => ({}));")
    lines.append("        throw new Error(err.detail || `Processing failed (${processRes.status})`);")
    lines.append("      }")
    lines.append("      const processData = await processRes.json();")
    lines.append("")
    lines.append("      // Step 3: Download the output as blob")
    lines.append("      const dlUrl = processData.download_url || processData.zip_url;")
    lines.append("      if (!dlUrl) throw new Error('No download URL returned from server.');")
    lines.append("")
    lines.append("      const fileRes = await fetch(`${API_BASE_URL}${dlUrl}`);")
    lines.append("      if (!fileRes.ok) throw new Error('Failed to fetch the converted file from server.');")
    lines.append("      const blob = await fileRes.blob();")
    lines.append("")
    lines.append("      // Determine correct extension from response")
    lines.append("      let finalExt = outputExt;")
    lines.append("      if (processData.filename) {")
    lines.append("        const extMatch = processData.filename.match(/\\.[^.]+$/);")
    lines.append("        if (extMatch) finalExt = extMatch[0];")
    lines.append("      }")
    lines.append("      const baseName = file.name.replace(/\\.[^/.]+$/, '');")
    lines.append("      setDownloadFilename(`${baseName}_converted${finalExt}`);")
    lines.append("      setDownloadBlob(blob);")
    lines.append("      setIsDone(true);")
    lines.append("    } catch (err) {")
    lines.append("      setError(err.message || 'An unexpected error occurred.');")
    lines.append("    } finally {")
    lines.append("      setIsProcessing(false);")
    lines.append("    }")
    lines.append("  };")
    lines.append("")
    lines.append("  const handleDownload = () => {")
    lines.append("    if (!downloadBlob) return;")
    lines.append("    const url = URL.createObjectURL(downloadBlob);")
    lines.append("    const a = document.createElement('a');")
    lines.append("    a.href = url;")
    lines.append("    a.download = downloadFilename;")
    lines.append("    document.body.appendChild(a);")
    lines.append("    a.click();")
    lines.append("    document.body.removeChild(a);")
    lines.append("    URL.revokeObjectURL(url);")
    lines.append("  };")
    lines.append("")
    lines.append("  const handleReset = () => {")
    lines.append("    setFile(null);")
    lines.append("    setIsDone(false);")
    lines.append("    setError('');")
    lines.append("    setDownloadBlob(null);")
    lines.append("    setDownloadFilename('');")
    lines.append("  };")
    lines.append("")
    lines.append("  const fmtSize = (f) => f.size < 1024 * 1024 ? (f.size / 1024).toFixed(0) + ' KB' : (f.size / (1024 * 1024)).toFixed(2) + ' MB';")
    lines.append("")
    lines.append("  return (")
    lines.append("    <div className=\"flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen\">")
    lines.append("      <div className=\"w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5\">")
    lines.append("        <button onClick={onBack} className=\"inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm\">")
    lines.append("          <ArrowLeft className=\"w-4 h-4\" /> Back")
    lines.append("        </button>")
    lines.append("      </div>")
    lines.append("")
    lines.append("      <div className=\"text-center max-w-2xl mx-auto mt-8 mb-8 px-4\">")
    lines.append("        <h1 className=\"text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3\">{toolName}</h1>")
    lines.append("        <p className=\"text-xs sm:text-sm text-slate-600 font-medium leading-relaxed\">{toolDesc}</p>")
    lines.append("      </div>")
    lines.append("")
    lines.append("      <div className=\"w-full max-w-2xl mx-auto px-4 sm:px-6 pb-14\">")
    lines.append("        <div className=\"bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10\">")
    lines.append("")
    lines.append("          <div")
    lines.append("            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}")
    lines.append("            onDragLeave={() => setIsDragging(false)}")
    lines.append("            onDrop={handleDrop}")
    lines.append("            onClick={() => inputRef.current?.click()}")
    lines.append("            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-[#1e2a52] bg-[#e8f0e2]' : 'border-[#1e2a52]/30 bg-[#f8faf7] hover:border-[#1e2a52] hover:bg-[#eff4ea]'}`}")
    lines.append("          >")
    lines.append("            <input ref={inputRef} type=\"file\" accept=\".pdf\" className=\"hidden\" onChange={handleFileChange} />")
    lines.append("            <div className=\"w-16 h-16 bg-[#1e2a52]/10 rounded-2xl flex items-center justify-center mx-auto mb-4\">")
    lines.append("              <Upload className=\"w-8 h-8 text-[#1e2a52]\" />")
    lines.append("            </div>")
    lines.append("            <p className=\"text-base sm:text-lg font-bold text-[#1e2a52] mb-1\">{file ? file.name : 'Drop PDF here or click to browse'}</p>")
    lines.append("            <p className=\"text-xs sm:text-sm text-slate-500\">Accepted: <span className=\"font-semibold text-[#1e2a52]\">PDF files (.pdf)</span></p>")
    lines.append("          </div>")
    lines.append("")
    lines.append("          {error && (")
    lines.append("            <div className=\"mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm\">")
    lines.append("              <AlertCircle className=\"w-4 h-4 shrink-0 mt-0.5\" />")
    lines.append("              <span>{error}</span>")
    lines.append("            </div>")
    lines.append("          )}")
    lines.append("")
    lines.append("          {file && (")
    lines.append("            <div className=\"mt-6\">")
    lines.append("              <div className=\"flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3\">")
    lines.append("                <div className=\"w-9 h-9 rounded-lg bg-[#1e2a52]/10 flex items-center justify-center shrink-0\">")
    lines.append("                  <FileText className=\"w-4 h-4 text-[#1e2a52]\" />")
    lines.append("                </div>")
    lines.append("                <div className=\"flex-1 min-w-0\">")
    lines.append("                  <p className=\"text-xs sm:text-sm font-semibold text-slate-800 truncate\">{file.name}</p>")
    lines.append("                  <p className=\"text-[10px] sm:text-xs text-slate-400\">{fmtSize(file)}</p>")
    lines.append("                </div>")
    lines.append("                <button onClick={handleReset} className=\"p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer\">")
    lines.append("                  <X className=\"w-4 h-4\" />")
    lines.append("                </button>")
    lines.append("              </div>")
    lines.append("")
    lines.append("              <div className=\"mt-8 text-center\">")
    lines.append("                {isProcessing ? (")
    lines.append("                  <div className=\"flex flex-col items-center justify-center p-8 bg-[#f8faf7] border border-slate-200/80 rounded-2xl min-h-[140px]\">")
    lines.append("                    <div className=\"w-12 h-12 border-4 border-[#1e2a52] border-t-transparent rounded-full animate-spin mb-4\"></div>")
    lines.append("                    <p className=\"text-xs sm:text-sm font-bold text-[#1e2a52] animate-pulse\">Converting your PDF... Please wait!</p>")
    lines.append("                  </div>")
    lines.append("                ) : isDone ? (")
    lines.append("                  <div className=\"space-y-4\">")
    lines.append("                    <div className=\"flex items-center justify-center gap-2 text-emerald-600 font-bold text-base\">")
    lines.append("                      <CheckCircle2 className=\"w-6 h-6\" /> Conversion Complete!")
    lines.append("                    </div>")
    lines.append("                    <div className=\"flex justify-center gap-3 flex-wrap\">")
    lines.append("                      <button onClick={handleDownload} className=\"inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold shadow-md transition-all text-sm cursor-pointer hover:scale-105\">")
    lines.append("                        <Download className=\"w-4 h-4\" /> Download {downloadFilename}")
    lines.append("                      </button>")
    lines.append("                      <button onClick={handleReset} className=\"inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-full font-bold transition-all text-sm cursor-pointer\">")
    lines.append("                        Convert Another")
    lines.append("                      </button>")
    lines.append("                    </div>")
    lines.append("                  </div>")
    lines.append("                ) : (")
    lines.append("                  <button onClick={handleProcess} className=\"bg-[#1e2a52] hover:bg-[#16203e] text-white px-12 py-4 rounded-full font-bold shadow-lg transition-all text-sm cursor-pointer inline-flex items-center gap-2 hover:scale-105 active:scale-95\">")
    lines.append("                    Start {toolName}")
    lines.append("                  </button>")
    lines.append("                )}")
    lines.append("              </div>")
    lines.append("            </div>")
    lines.append("          )}")
    lines.append("")
    lines.append("        </div>")
    lines.append("      </div>")
    lines.append("    </div>")
    lines.append("  );")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)


fixed = 0
for filename, (api_slug, output_ext, tool_name) in PAGE_CONFIG.items():
    filepath = os.path.join(CONVERT_DIR, filename)
    component_name = filename.replace('.jsx', '')
    content = make_page(component_name, tool_name, api_slug, output_ext)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    fixed += 1
    print(f"Rewrote {filename}")

print(f"\nTotal rewritten: {fixed}")
