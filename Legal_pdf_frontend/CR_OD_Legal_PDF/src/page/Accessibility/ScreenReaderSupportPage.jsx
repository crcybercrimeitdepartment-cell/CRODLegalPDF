import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, CloudUpload, Download, SlidersHorizontal } from 'lucide-react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

const workflowSteps = [
  'Upload PDF',
  'Validate Structure',
  'Process',
  'Screen Reader Test',
  'Save PDF',
];

export default function ScreenReaderSupportPage({ onBack }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [autoTagHeadings, setAutoTagHeadings] = useState(true);
  const [repairTableHeaders, setRepairTableHeaders] = useState(true);
  const [fixReadingOrder, setFixReadingOrder] = useState(true);
  const [generateStructTree, setGenerateStructTree] = useState(true);
  const [validationResult, setValidationResult] = useState(null);
  const [processResult, setProcessResult] = useState(null);
  const [speechTest, setSpeechTest] = useState([]);
  const [score, setScore] = useState(0);
  const [compatibilityLevel, setCompatibilityLevel] = useState('');
  const [stats, setStats] = useState({
    headings: 0,
    paragraphs: 0,
    tables: 0,
    figures: 0,
    totalElements: 0,
  });
  const [simulatorAnnouncement, setSimulatorAnnouncement] = useState(
    'Upload a document and run testing to hear simulated screen reader voice announcements...'
  );
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef(false);
  const [structureTree, setStructureTree] = useState([]);
  const [selectedTreeIndex, setSelectedTreeIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);

  const currentStep = !documentId ? 1 : !validationResult ? 2 : !processResult ? 3 : 4;
  const postPdf = useCallback(async function (endpoint, file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(API_BASE + endpoint, { method: 'POST', body: formData });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        message = data.detail || data.error || data.message || message;
      } catch (parseError) {
        console.error(parseError);
        try {
          const text = await res.text();
          if (text) message = text;
        } catch (textError) {
          console.error(textError);
        }
      }
      throw new Error(message);
    }

    return res.json();
  }, []);

  const uploadPdf = useCallback(async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setDocumentId(data.document_id);
        setPdfFile(file);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      uploadPdf(file);
    } else {
      alert('Please upload a PDF file.');
    }
  }, [uploadPdf]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) uploadPdf(file);
  }, [uploadPdf]);

  const validateDocument = useCallback(async () => {
    if (!pdfFile) return;
    setLoading(true);
    try {
      const [supportData, readingOrderData, headingData] = await Promise.all([
        postPdf('/screen-reader-support', pdfFile),
        postPdf('/reading-order', pdfFile),
        postPdf('/heading-structure', pdfFile),
      ]);

      const support = supportData?.screen_reader_support || {};
      const readingOrder = readingOrderData?.reading_order || {};
      const headings = headingData?.heading_structure || {};
      const headingItems = (headings.headings || []).map(function (item, index) {
        return {
          tag: 'H',
          tag_type: 'Heading',
          page_number: item.page,
          reading_order: index + 1,
          text: item.text,
          screen_reader_announcement: item.text,
        };
      });

      setValidationResult({
        support,
        readingOrder,
        headings,
      });
      setScore(support.score || 0);
      setCompatibilityLevel(support.recommendation || 'Validation complete');
      setStats({
        headings: headings.total_headings || headingItems.length,
        paragraphs: readingOrder.total_blocks || 0,
        tables: support.tables_detected || 0,
        figures: support.images_detected || 0,
        totalElements: (readingOrder.total_blocks || 0) + headingItems.length,
      });
      setStructureTree(headingItems);
    } catch (err) {
      alert('Validation error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pdfFile, postPdf]);

  const testSpeech = useCallback(async () => {
    if (!pdfFile) return;
    try {
      const data = await postPdf('/read-aloud', pdfFile);
      const readingText = data?.read_aloud?.text || '';
      const speechQueue = readingText
        .split(/\n+/)
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .slice(0, 50)
        .map(function (line, index) {
          return {
            id: index + 1,
            screen_reader_announcement: line,
          };
        });

      setSpeechTest(speechQueue);
      if (speechQueue.length > 0) {
        setSimulatorAnnouncement(
          '[NVDA Announcement]: "' + speechQueue[0].screen_reader_announcement + '"'
        );
      }
    } catch (err) {
      alert('Speech test error: ' + err.message);
    }
  }, [pdfFile, postPdf]);

  useEffect(function () {
    if (documentId && !validationResult) {
      validateDocument();
      testSpeech();
    }
  }, [documentId, validationResult, validateDocument, testSpeech]);

  const processDocument = useCallback(async () => {
    if (!pdfFile) return;
    setProcessing(true);
    try {
      setProcessResult({
        success: true,
        options: {
          auto_tag_headings: autoTagHeadings,
          repair_table_headers: repairTableHeaders,
          fix_reading_order: fixReadingOrder,
          generate_struct_tree: generateStructTree,
        },
      });
      await validateDocument();
      await testSpeech();
    } catch (err) {
      alert('Processing error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  }, [pdfFile, autoTagHeadings, repairTableHeaders, fixReadingOrder, generateStructTree, validateDocument, testSpeech]);
  const speakText = useCallback((text) => {
    if (!text) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    setSimulatorAnnouncement('[NVDA Announcement]: "' + text + '"');
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setAutoPlaying(false);
    autoPlayRef.current = false;
  }, []);

  const speakCurrent = useCallback(() => {
    if (speechTest.length === 0) return;
    const item = speechTest[selectedTreeIndex];
    if (item) {
      speakText(item.screen_reader_announcement);
    }
  }, [speechTest, selectedTreeIndex, speakText]);

  const speakPrevious = useCallback(() => {
    if (selectedTreeIndex > 0) {
      const newIndex = selectedTreeIndex - 1;
      setSelectedTreeIndex(newIndex);
      const item = speechTest[newIndex];
      if (item) {
        speakText(item.screen_reader_announcement);
      }
    }
  }, [selectedTreeIndex, speechTest, speakText]);

  const speakNext = useCallback(() => {
    if (selectedTreeIndex < speechTest.length - 1) {
      const newIndex = selectedTreeIndex + 1;
      setSelectedTreeIndex(newIndex);
      const item = speechTest[newIndex];
      if (item) {
        speakText(item.screen_reader_announcement);
      }
    }
  }, [selectedTreeIndex, speechTest, speakText]);

  const readEntireDocument = useCallback(async () => {
    if (speechTest.length === 0) return;
    setAutoPlaying(true);
    autoPlayRef.current = true;
    for (let i = 0; i < speechTest.length; i++) {
      if (!autoPlayRef.current) break;
      setSelectedTreeIndex(i);
      const item = speechTest[i];
      if (item) {
        setSimulatorAnnouncement(
          '[NVDA Announcement]: "' + item.screen_reader_announcement + '"'
        );
        await new Promise((resolve) => {
          if (typeof window === 'undefined' || !window.speechSynthesis) {
            resolve();
            return;
          }
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(item.screen_reader_announcement);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.onend = resolve;
          utterance.onerror = resolve;
          window.speechSynthesis.speak(utterance);
        });
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    setAutoPlaying(false);
    autoPlayRef.current = false;
  }, [speechTest]);
  var renderPdfPage = useCallback(function (pdf, num) {
    if (!pdf) return;
    pdf.getPage(num).then(function (page) {
      var vp = page.getViewport({ scale: 1.2 });
      var c = canvasRef.current;
      if (!c) return;
      c.width = vp.width;
      c.height = vp.height;
      page.render({ canvasContext: c.getContext('2d'), viewport: vp });
    });
  }, []);

  var loadPdf = useCallback(function (input) {
    if (typeof window === 'undefined' || typeof window.pdfjsLib === 'undefined') return;
    var task =
      typeof input === 'string'
        ? window.pdfjsLib.getDocument(input)
        : window.pdfjsLib.getDocument({ data: input });
    task.promise
      .then(function (pdf) {
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        renderPdfPage(pdf, 1);
      })
      .catch(function (e) {
        console.error(e);
      });
  }, [renderPdfPage]);

  var goToPage = useCallback(
    function (page) {
      if (page < 1 || page > totalPages) return;
      setCurrentPage(page);
      if (pdfDocRef.current) {
        renderPdfPage(pdfDocRef.current, page);
      }
    },
    [totalPages, renderPdfPage]
  );

  useEffect(
    function () {
      if (pdfDocRef.current) renderPdfPage(pdfDocRef.current, currentPage);
    },
    [currentPage, renderPdfPage]
  );

  useEffect(
    function () {
      if (documentId && pdfFile) {
        pdfFile.arrayBuffer().then(function (buf) {
          loadPdf(buf);
        });
      }
    },
    [documentId, pdfFile, loadPdf]
  );
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1e2a52] tracking-tight drop-shadow-sm leading-tight">Screen Reader Support</h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Accessibility Tools</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 w-full max-w-[1920px] mx-auto mt-12 sm:mt-16 lg:mt-20 relative z-10 overflow-y-auto pb-10">

        {/* Upload Zone */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div
            onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={"border-2 border-dashed rounded-2xl py-10 px-8 text-center cursor-pointer transition " + (dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30')}
          >
            <CloudUpload className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <p className="m-0 mb-1.5 text-[15px] font-semibold text-slate-800">Drag & drop PDF here for screen reader compatibility analysis</p>
            <p className="m-0 text-xs text-slate-500">or click to browse local files</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          {loading && <p className="m-0 mt-3 text-[13px] font-semibold text-center text-blue-500">Uploading...</p>}
          {documentId && <p className="m-0 mt-3 text-[13px] font-semibold text-center text-green-600">Uploaded successfully. Document ready for analysis.</p>}
        </div>

        <div
          className="rounded-xl p-6 text-white flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 10px 30px rgba(79, 70, 229, 0.2)',
          }}
        >
          <div className="flex-1 flex flex-col gap-3">
            <div
              className={
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ' +
                (score >= 90
                  ? 'bg-green-100 text-green-700'
                  : score >= 70
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700')
              }
            >
              {compatibilityLevel || 'Awaiting Validation'}
            </div>
            <h2 className="text-lg font-bold">Screen Reader Compatibility Audit</h2>
            <p className="text-xs text-white/70">
              {validationResult
                ? 'Document validated. ' + stats.totalElements + ' tagged elements found.'
                : 'Upload and validate a PDF to begin screen reader compatibility analysis.'}
            </p>
            <div className="grid grid-cols-4 gap-3 mt-2">
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] text-white/60">Headings</div>
                <div className="text-sm font-bold">{stats.headings}</div>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] text-white/60">Paragraphs</div>
                <div className="text-sm font-bold">{stats.paragraphs}</div>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] text-white/60">Tables</div>
                <div className="text-sm font-bold">{stats.tables}</div>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] text-white/60">Figures</div>
                <div className="text-sm font-bold">{stats.figures}</div>
              </div>
            </div>
          </div>
          <button
            onClick={function () {
              if (documentId) {
                validateDocument();
                testSpeech();
              }
            }}
            disabled={!documentId}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            Re-validate
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <div className="text-sm font-semibold text-slate-700">
            Screen Reader Simulator (NVDA / JAWS Mode)
          </div>
          <div
            className="border border-slate-200 rounded-lg p-4 text-sm italic"
            style={{ backgroundColor: '#f0f9ff' }}
          >
            {simulatorAnnouncement}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={speakPrevious}
              disabled={selectedTreeIndex === 0 || speechTest.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              Previous Element
            </button>
            <button
              onClick={speakCurrent}
              disabled={speechTest.length === 0}
              className="px-3 py-2 bg-[#1e2a52] hover:bg-[#16203e] rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 text-white"
            >
              Speak Current
            </button>
            <button
              onClick={stopSpeech}
              className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer text-white"
              style={{ backgroundColor: '#ef4444' }}
            >
              Stop Reading
            </button>
            <button
              onClick={speakNext}
              disabled={selectedTreeIndex >= speechTest.length - 1 || speechTest.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              Next Element
            </button>
            <button
              onClick={readEntireDocument}
              disabled={speechTest.length === 0 || autoPlaying}
              className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 text-white"
              style={{ backgroundColor: '#10b981' }}
            >
              {autoPlaying ? 'Reading...' : 'Read Entire Document'}
            </button>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-700 mb-3">
            Tagged Document Structure Tree &amp; Reading Order
          </div>
          <div className="max-h-[250px] overflow-y-auto">
            {structureTree.length === 0 ? (
              <div className="text-xs text-slate-500">
                No structure tree available. Process the document first.
              </div>
            ) : (
              structureTree.map(function (item, i) {
                return (
                  <div
                    key={i}
                    className={
                      'p-2 border-b border-slate-100 text-xs flex items-center gap-2 ' +
                      (i === selectedTreeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50')
                    }
                    onClick={function () {
                      setSelectedTreeIndex(i);
                      if (item.screen_reader_announcement) {
                        speakText(item.screen_reader_announcement);
                      }
                    }}
                  >
                    <span className="font-bold text-indigo-600 min-w-[40px]">
                      {item.tag_type || item.tag || 'P'}
                    </span>
                    <span className="text-slate-400">
                      p.{item.page || item.page_number || 1}
                    </span>
                    <span className="text-slate-400">
                      #{item.reading_order || i + 1}
                    </span>
                    <span className="text-slate-600 truncate flex-1">
                      {item.text_content || item.text || item.content || ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={function () {
                if (currentPage > 1) goToPage(currentPage - 1);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Prev
            </button>
            <span className="text-sm font-semibold text-slate-700">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={function () {
                if (currentPage < totalPages) goToPage(currentPage + 1);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Next
            </button>
          </div>
          <canvas
            ref={canvasRef}
            className="max-w-full border border-slate-200 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
