import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, ChevronRight, Info, CheckCircle2, Maximize2, Minimize2, ZoomOut, ZoomIn, RotateCw, RotateCcw, Expand, Download, Printer, ChevronLeft, ChevronsLeft, ChevronsRight, MoreVertical, UploadCloud, FileText, CheckCircle, X, AlertCircle, ArrowRight, Sliders, MonitorPlay, Moon, Sun, Hash, MoveVertical, Columns, Book, Grid, Bookmark, ListTree, ArrowDown, ArrowUp, Clock, Activity, Volume2, Keyboard, Mouse, Hand } from 'lucide-react';
import { Document, Page, pdfjs, Outline } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';


// --- FILE: components/index.jsx ---
// --- COMPONENT: PDFFeaturesPanel ---
export function PDFFeaturesPanel({ 
  pdfFile, activeFeature, setActiveFeature, 
  setIsNightMode, viewMode, setViewMode,
  setZoomLevel, setRotation, 
  currentPage, setCurrentPage, numPages,
  setIsPresenting, setIsSidebarOpen, setSidebarMode,
  isSidebarOpen, sidebarMode, searchText, setSearchText, pdfDocument, setShowProgressIndicator,
  setIsAutoRestoreEnabled, setIsMouseNavigationEnabled, setIsTouchGestureEnabled
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [promptConfig, setPromptConfig] = useState({ isOpen: false, type: null, value: '' });
  const [isSearching, setIsSearching] = useState(false);
  const isReady = !!pdfFile;

  // Prevent background scrolling when prompt is open
  useEffect(() => {
    if (promptConfig.isOpen) {
      document.body.style.overflow = 'hidden';
      // Also lock PDFMainView scrolling if it's the scroll container
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [promptConfig.isOpen]);

  const overlayRef = React.useRef(null);
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.addEventListener('wheel', handleWheel, { passive: false });
      overlay.addEventListener('touchmove', handleWheel, { passive: false });
    }
    return () => {
      if (overlay) {
        overlay.removeEventListener('wheel', handleWheel);
        overlay.removeEventListener('touchmove', handleWheel);
      }
    };
  }, [promptConfig.isOpen]);

  const filteredTools = PDF_TOOLS.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchInPages = async (direction) => {
    if (!searchText || !pdfDocument || isSearching) return;
    setIsSearching(true);
    try {
      const step = direction === 'next' ? 1 : -1;
      let startPage = currentPage + step;
      
      while (startPage >= 1 && startPage <= numPages) {
        const page = await pdfDocument.getPage(startPage);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        
        if (text.toLowerCase().includes(searchText.toLowerCase())) {
          setCurrentPage(startPage);
          break;
        }
        startPage += step;
      }
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const handleReadAloud = async () => {
    if (!pdfDocument) return;
    
    // If it's already speaking or queued to speak, cancel it
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      return;
    }

    try {
      const page = await pdfDocument.getPage(currentPage);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      
      if (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setActiveFeature(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setActiveFeature(null);
      }
    } catch (err) {
      console.error('Error reading aloud:', err);
      setActiveFeature(null);
    }
  };

  const handleFeatureClick = (toolId) => {
    if (!isReady) return;

    // Define categories
    const SEARCH_FAMILY = ['search-text', 'find-next', 'find-previous'];
    const ACTIONS = [
      'zoom-in', 'zoom-out', 'custom-zoom-level', 'rotate-view', 
      'next-page', 'previous-page', 'first-page', 'last-page', 'go-to-page', 
      'keyboard-shortcuts', 'recent-files', 
      'thumbnail-navigation', 'bookmark-navigation', 'table-of-contents-navigation',
      'read-aloud', 'light-mode', 'single-page-view', 'fit-width'
    ];
    // The rest are MODES that become the singular activeFeature
    
    // Helper to turn off a specific mode
    const turnOffMode = (id) => {
      if (!id) return;
      if (id === 'night-mode') setIsNightMode(false);
      if (['two-page-view', 'facing-page-view', 'continuous-scrolling'].includes(id)) setViewMode('single');
      if (id === 'reading-progress-indicator') setShowProgressIndicator(false);
      if (id === 'auto-restore-last-reading-position') setIsAutoRestoreEnabled(false);
      if (id === 'mouse-wheel-page-navigation') setIsMouseNavigationEnabled(false);
      if (id === 'touch-gesture-support') setIsTouchGestureEnabled(false);
      if (id === 'fit-page') setZoomLevel(1.0);
      if (id === 'presentation-mode') {
        setIsPresenting(false);
        if (document.fullscreenElement) document.exitFullscreen();
      }
      if (id === 'full-screen-mode' && document.fullscreenElement) document.exitFullscreen();
    };

    // Helper to turn on a specific mode
    const turnOnMode = (id) => {
      if (id === 'night-mode') setIsNightMode(true);
      if (id === 'two-page-view') setViewMode('two');
      if (id === 'facing-page-view') setViewMode('facing');
      if (id === 'continuous-scrolling') setViewMode('continuous');
      if (id === 'reading-progress-indicator') setShowProgressIndicator(true);
      if (id === 'auto-restore-last-reading-position') setIsAutoRestoreEnabled(true);
      if (id === 'mouse-wheel-page-navigation') setIsMouseNavigationEnabled(true);
      if (id === 'touch-gesture-support') setIsTouchGestureEnabled(true);
      if (id === 'fit-page') setZoomLevel(0.75);
      if (id === 'full-screen-mode') {
        const layout = document.getElementById('pdf-viewer-layout');
        if (layout && !document.fullscreenElement) layout.requestFullscreen().catch(e => console.log(e));
      }
      if (id === 'presentation-mode') {
        setIsPresenting(true);
        setViewMode('single');
        const layout = document.getElementById('pdf-viewer-layout');
        if (layout && !document.fullscreenElement) layout.requestFullscreen().catch(e => console.log(e));
      }
    };

    // 1. Handle Search Family (Connected)
    if (SEARCH_FAMILY.includes(toolId)) {
      if (activeFeature && !SEARCH_FAMILY.includes(activeFeature)) {
        turnOffMode(activeFeature);
      }
      setActiveFeature('search-text'); // Always highlight search-text for the family
      
      if (toolId === 'search-text') setPromptConfig({ isOpen: true, type: 'search', value: searchText });
      if (toolId === 'find-next') searchInPages('next');
      if (toolId === 'find-previous') searchInPages('previous');
      return;
    }

    // 2. Handle Actions (Momentary)
    if (ACTIONS.includes(toolId)) {
      // Execute action without touching activeFeature (except for flashing)
      if (toolId === 'zoom-in') setZoomLevel(z => Math.min(3.0, z + 0.25));
      if (toolId === 'zoom-out') setZoomLevel(z => Math.max(0.5, z - 0.25));
      if (toolId === 'custom-zoom-level') setPromptConfig({ isOpen: true, type: 'zoom', value: '100' });
      if (toolId === 'rotate-view') setRotation(r => (r + 90) % 360);
      if (toolId === 'next-page') setCurrentPage(p => Math.min(numPages || 1, p + 1));
      if (toolId === 'previous-page') setCurrentPage(p => Math.max(1, p - 1));
      if (toolId === 'first-page') setCurrentPage(1);
      if (toolId === 'last-page') setCurrentPage(numPages || 1);
      if (toolId === 'go-to-page') setPromptConfig({ isOpen: true, type: 'page', value: currentPage.toString() });
      if (toolId === 'keyboard-shortcuts') setPromptConfig({ isOpen: true, type: 'shortcuts', value: '' });
      if (toolId === 'recent-files') setPromptConfig({ isOpen: true, type: 'recent', value: '' });
      if (toolId === 'read-aloud') handleReadAloud();
      
      // Defaults explicitly clicked
      if (toolId === 'light-mode') { turnOffMode(activeFeature); setActiveFeature(null); setIsNightMode(false); }
      if (toolId === 'single-page-view') { turnOffMode(activeFeature); setActiveFeature(null); setViewMode('single'); }
      if (toolId === 'fit-width') { turnOffMode(activeFeature); setActiveFeature(null); setZoomLevel(1.0); }
      
      // Sidebar toggles
      if (toolId === 'thumbnail-navigation') {
        setIsSidebarOpen(prev => (sidebarMode === 'thumbnails' ? !prev : true));
        setSidebarMode('thumbnails');
      }
      if (toolId === 'bookmark-navigation' || toolId === 'table-of-contents-navigation') {
        setIsSidebarOpen(prev => (sidebarMode === 'bookmarks' ? !prev : true));
        setSidebarMode('bookmarks');
      }
      return;
    }

    // 3. Handle Modes (Exclusive active state)
    if (activeFeature === toolId) {
      // Toggle OFF: Reset to default
      turnOffMode(toolId);
      setActiveFeature(null);
    } else {
      // Toggle ON new mode: Turn off previous, turn on new
      if (activeFeature) {
        turnOffMode(activeFeature);
      }
      turnOnMode(toolId);
      setActiveFeature(toolId);
    }
  };

  const handlePromptSubmit = () => {
    if (promptConfig.type === 'zoom') {
      const zoom = promptConfig.value;
      if (zoom && !isNaN(zoom)) {
        setZoomLevel(Math.max(0.1, Math.min(5.0, parseInt(zoom) / 100)));
      }
    } else if (promptConfig.type === 'page') {
      const page = promptConfig.value;
      if (page && !isNaN(page)) {
        const p = parseInt(page);
        if (p >= 1 && p <= numPages) {
          setCurrentPage(p);
        }
      }
    } else if (promptConfig.type === 'search') {
      setSearchText(promptConfig.value);
    }
    setPromptConfig({ isOpen: false, type: null, value: '' });
  };

  return (
    <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-fit">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
        <span className="font-bold text-slate-800 text-sm">PDF Features (32)</span>
        <div className="relative w-40">
          <input 
            type="text" 
            placeholder="Search features..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!isReady}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
          />
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isReady ? 'text-slate-400' : 'text-slate-300'}`} />
        </div>
      </div>
      
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            
            // Search Family all map to 'search-text' active visual
            const isSearchRelated = ['search-text', 'find-next', 'find-previous'].includes(tool.id);
            const checkId = isSearchRelated ? 'search-text' : tool.id;
            
            const isActive = activeFeature === checkId && isReady;
            
            return (
              <button
                key={tool.id}
                disabled={!isReady}
                onClick={() => handleFeatureClick(tool.id)}
                className={`relative flex flex-col items-center justify-center p-3 gap-2 rounded-xl border transition-all duration-200 group ${
                  !isReady ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' :
                  isActive 
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm scale-[0.98]' 
                    : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 hover:shadow-sm hover:-translate-y-0.5'
                }`}
                title={tool.description}
              >
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${tool.bgColor}`}>
                  <Icon className={`w-5 h-5 ${tool.iconColor}`} />
                </div>
                <span className={`text-[10px] font-bold text-center leading-tight ${
                  isActive ? 'text-blue-700' : 'text-slate-600'
                }`}>
                  {tool.name}
                </span>
              </button>
            );
          })}
          {filteredTools.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm text-slate-400">
              No features found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Custom Prompt Modal */}
      {promptConfig.isOpen && (
        <div 
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] max-w-[90vw] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {promptConfig.type === 'zoom' ? 'Custom Zoom Level' : 
                 promptConfig.type === 'search' ? 'Search Text' : 
                 promptConfig.type === 'recent' ? 'Recent Files' : 
                 promptConfig.type === 'shortcuts' ? 'Keyboard Shortcuts' : 'Go to Page'}
              </h3>
              <button 
                onClick={() => setPromptConfig({ ...promptConfig, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            
            {promptConfig.type === 'shortcuts' ? (
              <div className="flex flex-col gap-2">
                {[
                  { key: '→ / Space', desc: 'Next Page' },
                  { key: '←', desc: 'Previous Page' },
                  { key: 'Scroll Up', desc: 'Previous Page (Presentation)' },
                  { key: 'Scroll Down', desc: 'Next Page (Presentation)' },
                  { key: 'Esc', desc: 'Exit Fullscreen/Presentation' },
                ].map((shortcut, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-600">{shortcut.desc}</span>
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-500 shadow-sm">{shortcut.key}</span>
                  </div>
                ))}
              </div>
            ) : promptConfig.type === 'recent' ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-500 mb-2">Here are your recently opened files:</p>
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded flex items-center justify-center font-bold text-xs">PDF</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{pdfFile?.name || 'Current Document'}</p>
                    <p className="text-xs text-slate-500">Opened just now</p>
                  </div>
                </div>
                <div className="text-center text-xs text-slate-400 mt-2 p-4 border-2 border-dashed border-slate-100 rounded-lg">
                  History is not saved permanently yet.
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  {promptConfig.type === 'zoom' 
                    ? 'Enter zoom percentage (e.g., 150)' 
                    : promptConfig.type === 'search'
                    ? 'Enter text to search in document'
                    : `Enter page number (1 to ${numPages})`}
                </p>
                <input 
                  type={promptConfig.type === 'search' ? 'text' : 'number'}
                  value={promptConfig.value}
                  onChange={(e) => setPromptConfig({...promptConfig, value: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-6"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePromptSubmit();
                    if (e.key === 'Escape') setPromptConfig({ ...promptConfig, isOpen: false });
                  }}
                />
                <div className="flex justify-end gap-3">
                  <button 
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    onClick={() => setPromptConfig({ ...promptConfig, isOpen: false })}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    onClick={handlePromptSubmit}
                  >
                    {promptConfig.type === 'search' ? 'Search' : 'Apply'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// --- COMPONENT: PDFMainView ---
// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PDFMainView({
  pdfFile, setNumPages, currentPage, zoomLevel, rotation, isNightMode, viewMode,
  isPresenting, setCurrentPage, numPages, searchText, setPdfDocument, isMouseNavigationEnabled,
  isTouchGestureEnabled
}) {
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef(null);
  
  const textRenderer = useCallback(
    (textItem) => {
      if (!searchText) return textItem.str;
      const pattern = new RegExp(searchText, 'gi');
      return textItem.str.replace(pattern, (value) => `<mark class="bg-yellow-300 text-slate-900 rounded-sm">${value}</mark>`);
    },
    [searchText]
  );

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32); // 32px for padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [viewMode, isPresenting]);

  const onDocumentLoadSuccess = (doc) => {
    setNumPages(doc.numPages);
    if (setPdfDocument) setPdfDocument(doc);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPresenting) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentPage(p => Math.min(numPages || 1, p + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(1, p - 1));
      }
    };

    let wheelTimeout;
    const handleWheel = (e) => {
      if (!isPresenting && !isMouseNavigationEnabled) return;
      
      // BLOCK ALL SCROLLING IMMEDIATELY
      e.preventDefault();
      e.stopPropagation();

      if (wheelTimeout) return;

      if (e.deltaY > 0) {
        setCurrentPage(p => Math.min(numPages || 1, p + 1));
      } else if (e.deltaY < 0) {
        setCurrentPage(p => Math.max(1, p - 1));
      }
      
      wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 500);
    };

    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e) => {
      if (!isTouchGestureEnabled) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      if (!isTouchGestureEnabled) return;
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      
      const swipeDistanceX = touchStartX - touchEndX;
      const swipeDistanceY = Math.abs(touchStartY - touchEndY);

      // Only trigger if horizontal swipe is > 40px and significantly larger than vertical movement
      if (Math.abs(swipeDistanceX) > 40 && Math.abs(swipeDistanceX) > swipeDistanceY) {
        if (swipeDistanceX > 0) {
          // Swiped left (Next Page)
          setCurrentPage(p => Math.min(numPages || 1, p + 1));
        } else {
          // Swiped right (Previous Page)
          setCurrentPage(p => Math.max(1, p - 1));
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('keydown', handleKeyDown);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [isPresenting, numPages, setCurrentPage, isMouseNavigationEnabled]);

  const getPageWidth = () => {
    if (viewMode === 'two' || viewMode === 'facing') {
      return containerWidth / 2;
    }
    return containerWidth;
  };

  const getPageHeight = () => {
    if (isPresenting) {
      return window.innerHeight - 40;
    }
    return undefined;
  };

  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    if (!isTouchGestureEnabled) return;
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e) => {
    if (!isTouchGestureEnabled) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const swipeDistanceX = touchStartPos.current.x - touchEndX;
    const swipeDistanceY = Math.abs(touchStartPos.current.y - touchEndY);

    // Only trigger if horizontal swipe is > 40px and significantly larger than vertical movement
    if (Math.abs(swipeDistanceX) > 40 && Math.abs(swipeDistanceX) > swipeDistanceY) {
      if (swipeDistanceX > 0) {
        // Swiped left (Next Page)
        setCurrentPage(p => Math.min(numPages || 1, p + 1));
      } else {
        // Swiped right (Previous Page)
        setCurrentPage(p => Math.max(1, p - 1));
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`absolute inset-0 w-full h-full ${(isPresenting || isMouseNavigationEnabled) ? 'overflow-hidden' : 'overflow-auto'} flex justify-center py-6 px-2 transition-colors duration-300 ${
        isNightMode ? 'bg-slate-900' : 'bg-slate-100/50'
      }`}
      style={{ 
        touchAction: isTouchGestureEnabled ? 'pan-y' : 'auto',
        overscrollBehaviorX: isTouchGestureEnabled ? 'none' : 'auto'
      }}
    >
      <div className={isNightMode ? 'filter invert hue-rotate-180 brightness-90 contrast-110' : ''}>
        <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center text-blue-600 gap-3 mt-20">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-bold">Rendering PDF...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center text-red-600 gap-3 mt-20 p-6 bg-red-50 rounded-xl border border-red-200">
              <span className="font-bold">Failed to load PDF file.</span>
              <span className="text-sm text-center">The file might be corrupted or unsupported by the browser engine.</span>
            </div>
          }
        >
          <div className={`flex ${viewMode === 'single' ? 'flex-col gap-6' : 'flex-row gap-2'} items-start justify-center origin-top`}>
            {viewMode === 'single' && (
              <div className="shadow-xl bg-white transition-transform duration-300">
                <Page 
                  pageNumber={currentPage} 
                  scale={isPresenting ? 1 : zoomLevel} 
                  rotate={rotation}
                  width={isPresenting ? undefined : getPageWidth()}
                  height={getPageHeight()}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                  customTextRenderer={textRenderer}
                />
              </div>
            )}

            {viewMode === 'facing' && currentPage === 1 && (
              <div className="shadow-xl bg-white transition-transform duration-300">
                <Page 
                  pageNumber={1} 
                  scale={isPresenting ? 1 : zoomLevel} 
                  rotate={rotation}
                  width={isPresenting ? undefined : getPageWidth()}
                  height={getPageHeight()}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                  customTextRenderer={textRenderer}
                />
              </div>
            )}

            {(viewMode === 'two' || (viewMode === 'facing' && currentPage > 1)) && (
              <>
                <div className="shadow-xl bg-white transition-transform duration-300">
                  <Page 
                    pageNumber={currentPage} 
                    scale={isPresenting ? 1 : zoomLevel} 
                    rotate={rotation}
                    width={isPresenting ? undefined : getPageWidth()}
                    height={getPageHeight()}
                    renderAnnotationLayer={false}
                  renderTextLayer={true}
                  customTextRenderer={textRenderer}
                  />
                </div>
                {currentPage + 1 <= numPages && (
                  <div className="shadow-xl bg-white transition-transform duration-300">
                    <Page 
                      pageNumber={currentPage + 1} 
                      scale={isPresenting ? 1 : zoomLevel} 
                      rotate={rotation}
                      width={isPresenting ? undefined : getPageWidth()}
                      height={getPageHeight()}
                      renderAnnotationLayer={false}
                  renderTextLayer={true}
                  customTextRenderer={textRenderer}
                    />
                  </div>
                )}
              </>
            )}

            {viewMode === 'continuous' && (
              <div className="flex flex-col gap-6 w-full items-center">
                {Array.from(new Array(numPages || 0), (el, index) => (
                  <div key={`page_${index + 1}`} className="shadow-xl bg-white transition-transform duration-300">
                    <Page 
                      pageNumber={index + 1} 
                      scale={zoomLevel} 
                      rotate={rotation}
                      width={getPageWidth()}
                      renderAnnotationLayer={false}
                  renderTextLayer={true}
                  customTextRenderer={textRenderer}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Document>
      </div>
    </div>
  );
}


// --- COMPONENT: PDFSidebar ---
export function PDFSidebar({ pdfFile, numPages, currentPage, setCurrentPage, sidebarMode }) {
  
  const onItemClick = ({ pageNumber }) => {
    if (pageNumber) setCurrentPage(pageNumber);
  };

  return (
    <div className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
        <span className="font-bold text-slate-800 text-sm">
          {sidebarMode === 'bookmarks' ? 'Bookmarks' : 'Pages'}
        </span>
      </div>
      
      <div className="flex-1 overflow-x-auto lg:overflow-y-auto p-3 scrollbar-hide">
        {numPages ? (
          <Document file={pdfFile} className={sidebarMode === 'thumbnails' ? "flex flex-row lg:grid lg:grid-cols-2 gap-3" : "w-full text-sm"}>
            
            {sidebarMode === 'bookmarks' ? (
              <div className="text-slate-700 p-2 [&>ul]:space-y-2 [&_li]:mb-2 [&_li]:list-none [&_a]:text-slate-700 hover:[&_a]:text-blue-600 [&_a]:cursor-pointer [&_a]:transition-colors [&_ul_ul]:pl-4 [&_ul_ul]:mt-2 [&_ul_ul]:border-l-2 [&_ul_ul]:border-slate-100">
                <Outline onItemClick={onItemClick} />
              </div>
            ) : (
              Array.from(new Array(numPages), (el, index) => (
              <div 
                key={`thumb-${index}`}
                onClick={() => setCurrentPage(index + 1)}
                className={`group flex lg:flex-col items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                  currentPage === index + 1 ? 'scale-100' : 'hover:scale-[1.02]'
                }`}
              >
                <div className={`w-16 h-20 lg:w-[68px] lg:h-24 rounded shadow-sm border-2 flex items-center justify-center bg-slate-50 transition-colors relative overflow-hidden shrink-0 ${
                  currentPage === index + 1 ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 group-hover:border-blue-300'
                }`}>
                  <Page 
                    pageNumber={index + 1} 
                    width={64} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false}
                    loading={
                      <div className="w-full h-full p-2 flex flex-col gap-1 opacity-30 absolute inset-0">
                        <div className="w-full h-1 bg-slate-300 rounded-full" />
                        <div className="w-3/4 h-1 bg-slate-300 rounded-full" />
                        <div className="w-full h-1 bg-slate-300 rounded-full mt-1.5" />
                        <div className="w-5/6 h-1 bg-slate-300 rounded-full" />
                        <div className="w-full h-1 bg-slate-300 rounded-full" />
                      </div>
                    }
                  />
                </div>
                <span className={`text-xs font-bold lg:mt-1 ${
                  currentPage === index + 1 ? 'text-blue-600' : 'text-slate-500'
                }`}>
                  {index + 1}
                </span>
              </div>
            )))}
          </Document>
        ) : (
          <div className="text-center text-xs font-medium text-slate-400 mt-4 lg:mt-10 w-full">
            Loading pages...
          </div>
        )}
      </div>
    </div>
  );
}


// --- COMPONENT: PDFStatusFooter ---
export function PDFStatusFooter({ pdfName, pdfSize, numPages, currentPage, activeFeature }) {
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const activeToolObj = PDF_TOOLS.find(t => t.id === activeFeature);
  const activeToolName = activeToolObj ? activeToolObj.name : 'None';
  const progressPercent = numPages ? Math.round((currentPage / numPages) * 100) : 0;

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between overflow-x-auto gap-4 scrollbar-hide">
      
      <div className="flex items-center gap-3 shrink-0 pr-4 sm:pr-6 border-r border-slate-200">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
          <Info className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Document Info</span>
          <span className={`text-sm font-bold truncate max-w-[150px] sm:max-w-[200px] ${pdfName ? 'text-slate-800' : 'text-slate-400 italic'}`}>
            {pdfName || 'No Document'}
          </span>
        </div>
      </div>

      <div className="flex flex-col shrink-0 pr-4 sm:pr-6 border-r border-slate-200 hidden sm:flex">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">File Size</span>
        <span className="text-sm font-bold text-slate-800">{formatSize(pdfSize)}</span>
      </div>

      <div className="flex flex-col shrink-0 pr-4 sm:pr-6 border-r border-slate-200">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pages</span>
        <span className="text-sm font-bold text-slate-800">{numPages || '-'}</span>
      </div>

      <div className="flex flex-col shrink-0 pr-4 sm:pr-6 border-r border-slate-200 hidden md:flex">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Reading Progress</span>
        <span className="text-sm font-bold text-slate-800">Page {currentPage} of {numPages || '-'} • {progressPercent}%</span>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <span className="text-sm font-bold text-slate-700 hidden lg:inline">Current Mode</span>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-sm font-bold">
          <span>{activeToolName}</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}


// --- COMPONENT: PDFToolbar ---
export function PDFToolbar({
  pdfFile,
  zoomLevel, setZoomLevel,
  currentPage, setCurrentPage, numPages,
  rotation, setRotation,
  setActiveFeature,
  activeFeature
}) {
  const isReady = !!pdfFile;
  const handleZoomOut = () => {
    setActiveFeature('zoom-out');
    setZoomLevel(z => Math.max(0.5, z - 0.25));
  };
  const handleZoomIn = () => {
    setActiveFeature('zoom-in');
    setZoomLevel(z => Math.min(3.0, z + 0.25));
  };
  const handleRotate = () => {
    setActiveFeature('rotate-view');
    setRotation(r => (r + 90) % 360);
  };
  const handlePrevPage = () => {
    setActiveFeature('previous-page');
    setCurrentPage(p => Math.max(1, p - 1));
  };
  const handleNextPage = () => {
    setActiveFeature('next-page');
    setCurrentPage(p => Math.min(numPages || 1, p + 1));
  };
  const handleFirstPage = () => {
    setActiveFeature('first-page');
    setCurrentPage(1);
  };
  const handleLastPage = () => {
    setActiveFeature('last-page');
    setCurrentPage(numPages || 1);
  };

  const handleDownload = () => {
    if (!pdfFile) return;
    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFile.name || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!pdfFile) return;
    const url = URL.createObjectURL(pdfFile);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 5000);
    };
  };

  const handleFullScreen = () => {
    setActiveFeature('full-screen-mode');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  const setFitWidth = () => {
    setActiveFeature('fit-width');
    setZoomLevel(1.0);
  };

  const setFitPage = () => {
    setActiveFeature('fit-page');
    setZoomLevel(0.75); // Approximate fit-page scale
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-2 px-4 flex items-center justify-between overflow-x-auto gap-4 scrollbar-hide">
      <div className={`flex items-center gap-2 border-r border-slate-200 pr-4 shrink-0 transition-opacity ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}>
        <button onClick={setFitWidth} disabled={!isReady} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Maximize2 className="w-4 h-4 text-blue-600" />
          <span>Fit Width</span>
        </button>
        <button onClick={setFitPage} disabled={!isReady} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Minimize2 className="w-4 h-4 text-blue-600" />
          <span>Fit Page</span>
        </button>
      </div>

      {/* Zoom Controls */}
      <div className={`flex items-center gap-1 border-r border-slate-200 pr-4 shrink-0 transition-opacity ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}>
        <button onClick={handleZoomOut} disabled={!isReady} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-14 text-center text-sm font-bold text-slate-800">
          {Math.round(zoomLevel * 100)}%
        </div>
        <button onClick={handleZoomIn} disabled={!isReady} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Pagination */}
      <div className={`flex items-center gap-1 border-r border-slate-200 pr-4 shrink-0 transition-opacity ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}>
        <button onClick={handleFirstPage} disabled={!isReady || currentPage <= 1} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button onClick={handlePrevPage} disabled={!isReady || currentPage <= 1} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="px-2 text-sm font-semibold text-slate-700 min-w-[4rem] text-center">
          {currentPage} / {numPages || '-'}
        </div>
        <button onClick={handleNextPage} disabled={!isReady || !numPages || currentPage >= numPages} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={handleLastPage} disabled={!isReady || !numPages || currentPage >= numPages} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-1 shrink-0 transition-opacity ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}>
        <button onClick={handleRotate} disabled={!isReady} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Rotate Clockwise">
          <RotateCw className="w-4 h-4" />
        </button>
        <button onClick={() => setRotation(0)} disabled={!isReady} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Reset Rotation">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={handleFullScreen} disabled={!isReady} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Full Screen">
          <Expand className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-slate-200 mx-2"></div>
        <button onClick={handleDownload} disabled={!isReady} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Download">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={handlePrint} disabled={!isReady} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Print">
          <Printer className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


// --- COMPONENT: PDFUploadArea ---
export function PDFUploadArea({ onUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndUpload = (file) => {
    setError('');
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file (.pdf)');
      return;
    }
    // Limit to 50MB for client side performance
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndUpload(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndUpload(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 mb-8 animate-fade-in-up">
      <div 
        className={`relative w-full rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center transition-all duration-300 ease-out bg-white shadow-sm ${
          isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".pdf,application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden" 
        />
        
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-blue-600 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 mb-2">Drop PDF file here or click to browse</h3>
        <p className="text-sm text-slate-500 font-medium mb-6">Accepted: PDF files (.pdf) up to 50MB</p>
        
        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg font-medium animate-shake">
            {error}
          </div>
        )}

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2.5 bg-white border border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>Browse Files</span>
        </button>
      </div>
    </div>
  );
}


// --- COMPONENT: PDFViewerLayout ---
export function PDFViewerLayout(props) {
  const { pdfFile, pdfName, pdfSize, numPages, onRemove, onUpload } = props;

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        props.setIsPresenting(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [props.setIsPresenting]);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div id="pdf-viewer-layout" className={`w-full h-full flex flex-col gap-4 animate-fade-in-up ${props.isPresenting ? 'bg-slate-900 p-0 m-0' : ''}`}>
      {/* Top File Status Bar */}
      {!props.isPresenting && (
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border ${
              pdfFile ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              PDF
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-bold ${pdfFile ? 'text-slate-800' : 'text-slate-400'}`}>
                {pdfFile ? pdfName : 'No PDF Document Selected'}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {pdfFile ? `${formatSize(pdfSize)} • ${numPages ? `${numPages} Pages` : 'Loading...'}` : 'Please upload a file to view properties'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {pdfFile ? (
              <>
                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-bold border border-green-200">
                  <span>Uploaded Successfully</span>
                  <CheckCircle className="w-4 h-4" />
                </div>
                <button 
                  onClick={onRemove}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove File"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200">
                  <span>Waiting for Upload</span>
                  <AlertCircle className="w-4 h-4" />
                </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!props.isPresenting && <PDFToolbar {...props} pdfFile={pdfFile} />}

      {/* Reading Progress Indicator */}
      {props.showProgressIndicator && numPages && (
        <div className="w-full h-1.5 bg-slate-200 mt-2 rounded-full overflow-hidden shrink-0 shadow-inner">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${(props.currentPage / numPages) * 100}%` }}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className={`flex-1 flex flex-col lg:flex-row gap-4 h-auto items-stretch mt-4 ${!props.isPresenting ? 'min-h-[600px]' : 'h-screen m-[-1rem] bg-slate-900'}`}>
        
        {/* Left Sidebar - Thumbnails */}
        {!props.isPresenting && props.isSidebarOpen && (
          <>
            <div className="hidden lg:block w-[180px] shrink-0 relative min-h-[400px]">
              <div className="absolute inset-0">
                <PDFSidebar {...props} pdfFile={pdfFile} />
              </div>
            </div>
            
            {/* Mobile Left Sidebar */}
            <div className="block lg:hidden w-full h-[200px]">
              <PDFSidebar {...props} pdfFile={pdfFile} />
            </div>
          </>
        )}

        {/* Center - PDF Viewer or Upload Area */}
        <div className={`flex-1 min-w-0 relative ${!props.isPresenting ? 'min-h-[600px]' : ''}`}>
          <div className={`absolute inset-0 overflow-hidden flex items-center justify-center ${!props.isPresenting ? 'bg-slate-100/50 rounded-xl border border-slate-200' : 'bg-slate-900'}`}>
            {pdfFile ? (
              <div className="w-full h-full relative">
                 <PDFMainView {...props} />
              </div>
            ) : (
              <div className="w-full h-full flex justify-center px-4 pt-4">
                <PDFUploadArea onUpload={onUpload} />
              </div>
            )}
          </div>
        </div>

        {/* Right - Features Panel */}
        {!props.isPresenting && <PDFFeaturesPanel {...props} />}
      </div>

      {/* Bottom Status Footer */}
      {!props.isPresenting && <PDFStatusFooter {...props} />}

      {/* Floating Exit Presentation Mode Button */}
      {props.isPresenting && (
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            }
            props.setIsPresenting(false);
          }}
          className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 border border-slate-700"
        >
          <X className="w-4 h-4" />
          <span className="text-sm font-medium">Exit Presentation</span>
        </button>
      )}
    </div>
  );
}



// --- FILE: PDFReaderWorkspace.jsx ---
export function PDFReaderWorkspace() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [pdfSize, setPdfSize] = useState(0);

  // Shared Document State
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [activeFeature, setActiveFeature] = useState('fit-width');
  const [isNightMode, setIsNightMode] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // single, two, continuous
  const [isPresenting, setIsPresenting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [sidebarMode, setSidebarMode] = useState('thumbnails'); // 'thumbnails' or 'bookmarks'
  const [searchText, setSearchText] = useState('');
  const [pdfDocument, setPdfDocument] = useState(null);
  const [showProgressIndicator, setShowProgressIndicator] = useState(false);
  const [isAutoRestoreEnabled, setIsAutoRestoreEnabled] = useState(false);
  const [isMouseNavigationEnabled, setIsMouseNavigationEnabled] = useState(false);
  const [isTouchGestureEnabled, setIsTouchGestureEnabled] = useState(false);

  // Save current page to localStorage when auto-restore is enabled
  useEffect(() => {
    if (isAutoRestoreEnabled && pdfName && currentPage) {
      localStorage.setItem(`pdf_restore_${pdfName}`, currentPage.toString());
    }
  }, [currentPage, pdfName, isAutoRestoreEnabled]);

  const handleFileUpload = (file) => {
    setPdfFile(file);
    setPdfName(file.name);
    setPdfSize(file.size);
    
    // Check if auto-restore is enabled and we have a saved page
    let initialPage = 1;
    if (isAutoRestoreEnabled) {
      const savedPage = localStorage.getItem(`pdf_restore_${file.name}`);
      if (savedPage) {
        initialPage = parseInt(savedPage, 10);
      }
    }
    
    // Reset state on new file upload
    setNumPages(null);
    setCurrentPage(initialPage);
    setZoomLevel(1.0);
    setRotation(0);
    setActiveFeature('fit-width');
    setIsNightMode(false);
    setViewMode('single');
    setIsPresenting(false);
    setIsSidebarOpen(true);
    setSidebarMode('thumbnails');
    setSearchText('');
    setPdfDocument(null);
    setShowProgressIndicator(false);
    // Note: intentionally not resetting isMouseNavigationEnabled so the preference sticks
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
    setPdfName('');
    setPdfSize(0);
    setSearchText('');
    setPdfDocument(null);
    setShowProgressIndicator(false);
  };

  return (
    <PDFViewerLayout 
      pdfFile={pdfFile}
      pdfName={pdfName}
      pdfSize={pdfSize}
      numPages={numPages}
      setNumPages={setNumPages}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      zoomLevel={zoomLevel}
      setZoomLevel={setZoomLevel}
      rotation={rotation}
      setRotation={setRotation}
      activeFeature={activeFeature}
      setActiveFeature={setActiveFeature}
      isNightMode={isNightMode}
      setIsNightMode={setIsNightMode}
      viewMode={viewMode}
      setViewMode={setViewMode}
      isPresenting={isPresenting}
      setIsPresenting={setIsPresenting}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      sidebarMode={sidebarMode}
      setSidebarMode={setSidebarMode}
      searchText={searchText}
      setSearchText={setSearchText}
      pdfDocument={pdfDocument}
      setPdfDocument={setPdfDocument}
      showProgressIndicator={showProgressIndicator}
      setShowProgressIndicator={setShowProgressIndicator}
      isAutoRestoreEnabled={isAutoRestoreEnabled}
      setIsAutoRestoreEnabled={setIsAutoRestoreEnabled}
      isMouseNavigationEnabled={isMouseNavigationEnabled}
      setIsMouseNavigationEnabled={setIsMouseNavigationEnabled}
      isTouchGestureEnabled={isTouchGestureEnabled}
      setIsTouchGestureEnabled={setIsTouchGestureEnabled}
      onRemove={handleRemoveFile}
      onUpload={handleFileUpload}
    />
  );
}


// --- FILE: PDFReader.jsx ---
/* ==========================================================================
   SECTION 1: PDF READER TOOL ICON WRAPPER COMPONENTS (32 ITEMS)
   ========================================================================== */

/** @typedef {Object} IconProps @property {string} [className="w-8 h-8"] - Tailwind CSS sizing & styling classes */

/** @param {IconProps} props @returns {JSX.Element} 1. Fit Width Icon */
function FitWidthIcon({ className = "w-8 h-8" }) { return <Maximize2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 2. Fit Page Icon */
function FitPageIcon({ className = "w-8 h-8" }) { return <Minimize2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 3. Zoom In Icon */
function ZoomInIcon({ className = "w-8 h-8" }) { return <ZoomIn className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 4. Zoom Out Icon */
function ZoomOutIcon({ className = "w-8 h-8" }) { return <ZoomOut className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 5. Custom Zoom Level Icon */
function CustomZoomLevelIcon({ className = "w-8 h-8" }) { return <Sliders className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 6. Rotate View Icon */
function RotateViewIcon({ className = "w-8 h-8" }) { return <RotateCw className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 7. Full Screen Mode Icon */
function FullScreenModeIcon({ className = "w-8 h-8" }) { return <Expand className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 8. Presentation Mode Icon */
function PresentationModeIcon({ className = "w-8 h-8" }) { return <MonitorPlay className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 9. Night Mode Icon */
function NightModeIcon({ className = "w-8 h-8" }) { return <Moon className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 10. Light Mode Icon */
function LightModeIcon({ className = "w-8 h-8" }) { return <Sun className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 11. Previous Page Icon */
function PreviousPageIcon({ className = "w-8 h-8" }) { return <ChevronLeft className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 12. Next Page Icon */
function NextPageIcon({ className = "w-8 h-8" }) { return <ChevronRight className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 13. First Page Icon */
function FirstPageIcon({ className = "w-8 h-8" }) { return <ChevronsLeft className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 14. Last Page Icon */
function LastPageIcon({ className = "w-8 h-8" }) { return <ChevronsRight className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 15. Go to Page Icon */
function GoToPageIcon({ className = "w-8 h-8" }) { return <Hash className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 16. Continuous Scrolling Icon */
function ContinuousScrollingIcon({ className = "w-8 h-8" }) { return <MoveVertical className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 17. Single Page View Icon */
function SinglePageViewIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 18. Two Page View Icon */
function TwoPageViewIcon({ className = "w-8 h-8" }) { return <Columns className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 19. Facing Page View Icon */
function FacingPageViewIcon({ className = "w-8 h-8" }) { return <Book className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 20. Thumbnail Navigation Icon */
function ThumbnailNavigationIcon({ className = "w-8 h-8" }) { return <Grid className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 21. Bookmark Navigation Icon */
function BookmarkNavigationIcon({ className = "w-8 h-8" }) { return <Bookmark className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 22. Table of Contents Navigation Icon */
function TableOfContentsNavigationIcon({ className = "w-8 h-8" }) { return <ListTree className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 23. Search Text Icon */
function SearchTextIcon({ className = "w-8 h-8" }) { return <Search className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 24. Find Next Icon */
function FindNextIcon({ className = "w-8 h-8" }) { return <ArrowDown className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 25. Find Previous Icon */
function FindPreviousIcon({ className = "w-8 h-8" }) { return <ArrowUp className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 26. Recent Files Icon */
function RecentFilesIcon({ className = "w-8 h-8" }) { return <Clock className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 27. Reading Progress Indicator Icon */
function ReadingProgressIndicatorIcon({ className = "w-8 h-8" }) { return <Activity className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 28. Auto Restore Last Reading Position Icon */
function AutoRestoreLastReadingPositionIcon({ className = "w-8 h-8" }) { return <RotateCcw className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 29. Read Aloud Icon */
function ReadAloudIcon({ className = "w-8 h-8" }) { return <Volume2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 30. Keyboard Shortcuts Icon */
function KeyboardShortcutsIcon({ className = "w-8 h-8" }) { return <Keyboard className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 31. Mouse Wheel Page Navigation Icon */
function MouseWheelPageNavigationIcon({ className = "w-8 h-8" }) { return <Mouse className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 32. Touch Gesture Support Icon */
function TouchGestureSupportIcon({ className = "w-8 h-8" }) { return <Hand className={className} />; }

/**
 * Curated palette of 10 pastel background colors and matching vibrant icon colors.
 * Used sequentially to provide visual variety across tool grid cards.
 */
const colors = [
  { bg: 'bg-[#FFECEC]', icon: 'text-[#EF4444]' }, // 0. Red Theme
  { bg: 'bg-[#E3F2FD]', icon: 'text-[#3B82F6]' }, // 1. Blue Theme
  { bg: 'bg-[#F3E5F5]', icon: 'text-[#A855F7]' }, // 2. Purple Theme
  { bg: 'bg-[#FEF2F2]', icon: 'text-[#DC2626]' }, // 3. Rose Theme
  { bg: 'bg-[#FFF3E0]', icon: 'text-[#F97316]' }, // 4. Orange Theme
  { bg: 'bg-[#ECFDF5]', icon: 'text-[#10B981]' }, // 5. Green Theme
  { bg: 'bg-[#E0F2FE]', icon: 'text-[#0284C7]' }, // 6. Sky Theme
  { bg: 'bg-[#FEF3C7]', icon: 'text-[#D97706]' }, // 7. Amber Theme
  { bg: 'bg-[#F5F3FF]', icon: 'text-[#7C3AED]' }, // 8. Violet Theme
  { bg: 'bg-[#FCE4EC]', icon: 'text-[#EC4899]' }  // 9. Pink Theme
];

/**
 * PDF_TOOLS Configuration Dataset
 * Array of 32 PDF Reader tool objects displayed in the main application grid.
 */
export const PDF_TOOLS = [
  {
    id: 'fit-width',
    name: 'Fit Width',
    description: 'Automatically scale document pages to fit the full horizontal width of the viewport.',
    icon: FitWidthIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'fit-page',
    name: 'Fit Page',
    description: 'Scale document pages to fit entirely within the current window dimensions.',
    icon: FitPageIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    description: 'Increase display magnification for detailed reading and high precision viewing.',
    icon: ZoomInIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    description: 'Decrease magnification level to see an expanded overview of the document page.',
    icon: ZoomOutIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'custom-zoom-level',
    name: 'Custom Zoom Level',
    description: 'Set custom percentage zoom levels with pixel precision control.',
    icon: CustomZoomLevelIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'rotate-view',
    name: 'Rotate View',
    description: 'Rotate document orientation clockwise or counter-clockwise in 90-degree increments.',
    icon: RotateViewIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'full-screen-mode',
    name: 'Full Screen Mode',
    description: 'Expand document viewer to fill the entire screen without menu distractions.',
    icon: FullScreenModeIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'presentation-mode',
    name: 'Presentation Mode',
    description: 'Display PDF pages as full-screen slide presentations with seamless transitions.',
    icon: PresentationModeIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'night-mode',
    name: 'Night Mode',
    description: 'Switch to dark theme background to reduce eye strain in low-light environments.',
    icon: NightModeIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'light-mode',
    name: 'Light Mode',
    description: 'Switch to high-contrast light theme for crisp daylight document viewing.',
    icon: LightModeIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'previous-page',
    name: 'Previous Page',
    description: 'Navigate backward to the immediately preceding page in the current document.',
    icon: PreviousPageIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'next-page',
    name: 'Next Page',
    description: 'Navigate forward to the next sequential page in your active PDF document.',
    icon: NextPageIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'first-page',
    name: 'First Page',
    description: 'Jump directly to the cover or very first page of the loaded PDF document.',
    icon: FirstPageIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'last-page',
    name: 'Last Page',
    description: 'Jump instantly to the final appendix or back cover page of your file.',
    icon: LastPageIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'go-to-page',
    name: 'Go to Page',
    description: 'Jump directly to any specific target page number in the document instantly.',
    icon: GoToPageIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'continuous-scrolling',
    name: 'Continuous Scrolling',
    description: 'Enable continuous vertical page scrolling for smooth fluid document reading.',
    icon: ContinuousScrollingIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'single-page-view',
    name: 'Single Page View',
    description: 'Display one document page at a time centered on the reader screen.',
    icon: SinglePageViewIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'two-page-view',
    name: 'Two Page View',
    description: 'Display two pages side by side for a dual-page spread layout.',
    icon: TwoPageViewIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'facing-page-view',
    name: 'Facing Page View',
    description: 'View cover page individually followed by two-page book spread layout.',
    icon: FacingPageViewIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'thumbnail-navigation',
    name: 'Thumbnail Navigation',
    description: 'Browse document pages using interactive visual thumbnail previews in sidebar.',
    icon: ThumbnailNavigationIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'bookmark-navigation',
    name: 'Bookmark Navigation',
    description: 'Jump between saved custom bookmarks and favorite document sections.',
    icon: BookmarkNavigationIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'table-of-contents-navigation',
    name: 'Table of Contents Navigation',
    description: 'Explore structured chapter headings and nested outline trees for fast navigation.',
    icon: TableOfContentsNavigationIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'search-text',
    name: 'Search Text',
    description: 'Find words, phrases, or search patterns across all document pages.',
    icon: SearchTextIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'find-next',
    name: 'Find Next',
    description: 'Jump forward to the next match occurrence of your active search query.',
    icon: FindNextIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'find-previous',
    name: 'Find Previous',
    description: 'Jump backward to the previous matching text occurrence in the document.',
    icon: FindPreviousIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'recent-files',
    name: 'Recent Files',
    description: 'Quickly access and reopen recently read PDF files and document history.',
    icon: RecentFilesIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'reading-progress-indicator',
    name: 'Reading Progress Indicator',
    description: 'Track percentage completed, total pages read, and reading status.',
    icon: ReadingProgressIndicatorIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'auto-restore-last-reading-position',
    name: 'Auto Restore Last Reading Position',
    description: 'Automatically resume reading from the exact page where you left off.',
    icon: AutoRestoreLastReadingPositionIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'read-aloud',
    name: 'Read Aloud (Text-to-Speech)',
    description: 'Listen to document text spoken aloud using high-quality voice synthesis.',
    icon: ReadAloudIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'keyboard-shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Speed up navigation using customizable key bindings and quick hotkeys.',
    icon: KeyboardShortcutsIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'mouse-wheel-page-navigation',
    name: 'Mouse Wheel Page Navigation',
    description: 'Navigate pages using smooth mouse scroll wheel and trackpad gestures.',
    icon: MouseWheelPageNavigationIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'touch-gesture-support',
    name: 'Touch Gesture Support',
    description: 'Pinch to zoom, swipe to turn pages, and tap navigation optimized for touch screens.',
    icon: TouchGestureSupportIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  }
];

/* ==========================================================================
   SECTION 2: ANIMATED HERO HEADER COMPONENT
   ========================================================================== */

/**
 * Header Component
 * Renders the top hero branding section featuring animated background floating file badges,
 * dashed SVG curve paths, glowing particle indicators, and gradient typography.
 *
 * @component
 * @returns {JSX.Element} Rendered hero header section
 */


/* ==========================================================================
   SECTION 3: MAIN TOOL CARD COMPONENT
   ========================================================================== */

/**
 * PDFReader Tool Card Component
 * Renders individual interactive feature card with responsive dimensions, custom SVG badge,
 * hover elevation scale, and stroke draw animation.
 *
 * @component
 * @param {Object} props Component properties
 * @param {Object} props.tool Tool configuration object (id, name, description, icon, bgColor, iconColor)
 * @param {number} [props.index=0] Staggered animation index multiplier
 * @param {Function} [props.onClick] Interactive click event handler
 * @returns {JSX.Element} Rendered tool card element
 */
/* ==========================================================================
   2. HEADER COMPONENT
   ========================================================================== */

export function Header() {
  /** Reusable floating PDF-style document badge icon inside header */
  const FileIcon = ({ bg, icon = null, rotate = 0, size = 34, floatClass = 'animate-float-1' }) => {
    const w = size;
    const h = size * 1.22;
    return (
      <div className={floatClass}>
        <div
          style={{ transform: `rotate(${rotate}deg)`, width: w, height: h, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }}
          className="hover:scale-115 transition-transform duration-300 cursor-default flex-shrink-0 scale-[0.50] sm:scale-100 origin-center"
        >
          <svg width={w} height={h} viewBox="-7 -7 70 82" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 0h36l16 16v48a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z"
              fill="white"
              stroke="white"
              strokeWidth="12"
              strokeLinejoin="round"
            />
            <path d="M4 0h36l16 16v48a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={bg} />
            <path d="M40 0l16 16H44a4 4 0 0 1-4-4V0z" fill="rgba(0,0,0,0.2)" />
            {icon}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <header className="w-full relative pt-1 sm:pt-2 pb-2 sm:pb-3 mb-2 sm:mb-3 select-none">

      {/* Animated background floating dots along the arc */}
      <div className="absolute hidden sm:block left-[13%] top-[32%] w-3 h-3 rounded-full bg-blue-500 shadow pointer-events-none z-10 animate-float-3" />
      <div className="absolute hidden sm:block left-[35%] top-[62%] w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm pointer-events-none z-10 animate-float-1" />
      <div className="absolute hidden sm:block right-[34%] top-[20%] w-3 h-3 rounded-full bg-emerald-400 shadow pointer-events-none z-10 animate-float-5" />
      <div className="absolute hidden sm:block right-[19%] top-[58%] w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm pointer-events-none z-10 animate-float-2" />
      <div className="absolute hidden sm:block right-[37%] top-[74%] w-2 h-2 rounded-full bg-orange-400 shadow-sm pointer-events-none z-10 animate-float-4" />

      {/* Floating file badges around header */}
      <div className="absolute flex left-0 sm:left-4 md:left-[17%]" style={{ top: '45%', zIndex: 15 }}>
        <FileIcon bg="#9333EA" rotate={-13} size={32} floatClass="animate-float-1"
          icon={
            <>
              <circle cx="18" cy="30" r="3.5" fill="rgba(255,255,255,0.7)" />
              <path d="M6 48 L18 35 L27 43 L36 33 L50 47 L50 54 L6 54Z" fill="rgba(255,255,255,0.55)" />
            </>
          }
        />
      </div>

      <div className="absolute flex left-6 sm:left-20 md:left-[26%]" style={{ top: '4%', zIndex: 15 }}>
        <FileIcon bg="#2563EB" rotate={7} size={38} floatClass="animate-float-2"
          icon={
            <text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">AI</text>
          }
        />
      </div>

      <div className="absolute flex right-6 sm:right-20 md:right-[26%]" style={{ top: '4%', zIndex: 15 }}>
        <FileIcon bg="#16A34A" rotate={-7} size={38} floatClass="animate-float-4"
          icon={
            <text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">X</text>
          }
        />
      </div>

      <div className="absolute flex right-0 sm:right-4 md:right-[20%]" style={{ top: '42%', zIndex: 15 }}>
        <FileIcon bg="#EA580C" rotate={9} size={32} floatClass="animate-float-5"
          icon={
            <text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">P</text>
          }
        />
      </div>

      <div className="absolute hidden lg:flex" style={{ right: '15%', top: '56%', zIndex: 15 }}>
        <FileIcon bg="#64748B" rotate={-5} size={30} floatClass="animate-float-6"
          icon={
            <text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="12" fill="white" letterSpacing="0.5">ZIP</text>
          }
        />
      </div>

      {/* Main header row: Title and Tagline */}
      <div className="flex items-center justify-center w-full relative z-20">
        <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0 pt-1 sm:pt-2 md:pt-3 px-2">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1e2a52] tracking-tight leading-tight break-words pb-1">
            <SlideInText text="PDF Reader & Viewer" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            View, read, presentation mode, and navigate PDF documents with smooth reading tools.
          </p>
        </div>
      </div>
    </header>
  );
}

export function PDFReaderPage({ onBack, searchQuery = "" }) {
  return (
    <div className="flex-1 flex flex-col w-full relative pt-11 sm:pt-4">
      {onBack && (
        <button onClick={onBack} 
          className="absolute top-1.5 left-3 sm:top-5 sm:left-6 md:left-10 z-50 text-[#1e2a52] hover:text-blue-950 font-bold flex items-center gap-1.5 sm:gap-2 bg-white/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm backdrop-blur-md border border-slate-200/90 transition-all hover:shadow-md hover:scale-105 cursor-pointer text-xs sm:text-sm"
        >
          <svg className="w-4 h-4 text-[#1e2a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>Back</span>
        </button>
      )}
      <Header />
      <div className="flex-1 flex flex-col w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 pb-4 overflow-x-hidden">
        <PDFReaderWorkspace />
      </div>
    </div>
  );
}

