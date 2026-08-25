import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Download, ArrowLeft, Image as ImageIcon,
  FileText, ArrowRight, ArrowLeft as ChevronLeft, MonitorPlay,
  AlertTriangle, RefreshCw
} from 'lucide-react';

const ReplaceImages = ({ tool, onBack }) => {
  // Project State
  const [projectFile, setProjectFile] = useState(null);
  const [projectType, setProjectType] = useState(null); // 'pdf' | 'image'
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [projectData, setProjectData] = useState(null); 
  /* projectData structure (from simulated backend): 
     { pages: [{ pageNum, pageUrl, width, height, images: [{ xref, bbox, supported }] }], images: [{xref, width, height, duplicateCount}] }
  */
  
  // Navigation & Selection State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedXref, setSelectedXref] = useState(null);
  
  // Replacement State
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementUrl, setReplacementUrl] = useState(null);
  const [showNewPreview, setShowNewPreview] = useState(true);
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultDownloadUrl, setResultDownloadUrl] = useState(null);

  const projectInputRef = useRef(null);
  const replInputRef = useRef(null);

  // --- 1. PROJECT LOAD ---
  const handleProjectUpload = (e) => {
    if (e.target.files?.length > 0) {
      loadProject(e.target.files[0]);
    }
    e.target.value = ''; // Reset input
  };

  const loadProject = async (file) => {
    setProjectFile(file);
    setIsProjectLoading(true);
    setResultDownloadUrl(null);
    setSelectedXref(null);
    setReplacementFile(null);
    if (replacementUrl) URL.revokeObjectURL(replacementUrl);
    setReplacementUrl(null);

    try {
      // SIMULATE BACKEND DETECTION API
      await new Promise(r => setTimeout(r, 1500));
      
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      setProjectType(isPdf ? 'pdf' : 'image');
      
      if (isPdf) {
        // Simulated PDF Data
        setProjectData({
          pages: [
            {
              pageNum: 0,
              pageUrl: 'https://placehold.co/800x1100/f8fafc/334155.png?text=Simulated+PDF+Page+1',
              width: 800,
              height: 1100,
              images: [
                { xref: 12, bbox: [100, 100, 400, 300], supported: true },
                { xref: 15, bbox: [450, 800, 700, 950], supported: true }
              ]
            },
            {
              pageNum: 1,
              pageUrl: 'https://placehold.co/800x1100/f8fafc/334155.png?text=Simulated+PDF+Page+2',
              width: 800,
              height: 1100,
              images: [
                { xref: 12, bbox: [100, 100, 400, 300], supported: true }, // Duplicate
                { xref: 42, bbox: [200, 500, 600, 800], supported: false } // Unsupported mask
              ]
            }
          ],
          images: [
            { xref: 12, width: 600, height: 400, duplicateCount: 2 },
            { xref: 15, width: 500, height: 300, duplicateCount: 1 },
            { xref: 42, width: 800, height: 600, duplicateCount: 1 }
          ]
        });
        setCurrentPageIndex(0);
      } else {
        // Image Project Data
        const objUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = objUrl;
        await new Promise(r => img.onload = r);
        
        setProjectData({
          pages: [{
            pageNum: 0,
            pageUrl: objUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            images: []
          }],
          images: []
        });
      }
    } catch(err) {
      console.error(err);
      alert("Error loading project.");
      closeProject();
    } finally {
      setIsProjectLoading(false);
    }
  };

  const closeProject = () => {
    setProjectFile(null);
    setProjectData(null);
    if (replacementUrl) URL.revokeObjectURL(replacementUrl);
    if (projectType === 'image' && projectData?.pages[0]?.pageUrl && projectData.pages[0].pageUrl.startsWith('blob:')) {
       URL.revokeObjectURL(projectData.pages[0].pageUrl);
    }
  };

  // --- 2. REPLACEMENT UPLOAD ---
  const handleReplacementUpload = (e) => {
    if (e.target.files?.length > 0) {
      const file = e.target.files[0];
      setReplacementFile(file);
      if (replacementUrl) URL.revokeObjectURL(replacementUrl);
      setReplacementUrl(URL.createObjectURL(file));
      setShowNewPreview(true);
    }
    e.target.value = '';
  };

  // --- 3. APPLY ---
  const applyReplacement = async () => {
    if (projectType === 'pdf' && (!selectedXref || !replacementFile)) return;
    if (projectType === 'image' && !replacementFile) return;

    setIsProcessing(true);
    try {
      // Simulate Backend processing `/replace/apply`
      await new Promise(r => setTimeout(r, 2000));
      
      // For simulation, just return the replacement file as the result if image, or a dummy pdf if pdf.
      if (projectType === 'image') {
        if (resultDownloadUrl) URL.revokeObjectURL(resultDownloadUrl);
        setResultDownloadUrl(replacementUrl); // just link the replacement
      } else {
        // Simulate a new PDF Blob (just creating a dummy text blob for download testing)
        const dummyPdf = new Blob(["Simulated PDF Result"], { type: 'application/pdf' });
        if (resultDownloadUrl) URL.revokeObjectURL(resultDownloadUrl);
        setResultDownloadUrl(URL.createObjectURL(dummyPdf));
      }
      
    } catch(err) {
      alert("Failed to apply replacement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultDownloadUrl) return;
    const a = document.createElement("a");
    a.href = resultDownloadUrl;
    a.download = `updated_${projectFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- RENDER HELPERS ---
  const activePage = projectData?.pages[currentPageIndex];
  
  const getSelectedGlobalImage = () => {
    if (!projectData || !selectedXref) return null;
    return projectData.images.find(img => img.xref === selectedXref);
  };

  const selectedGlobalImg = getSelectedGlobalImage();

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border-t border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar - Controls */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 flex flex-col h-full space-y-5">
            
            {/* Step 1: Open Project */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide border-b border-slate-700/50 pb-1">1. Open Project</h3>
              
              {!projectFile ? (
                <div 
                  onClick={() => projectInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all border-slate-600 bg-slate-50 hover:border-sky-400 hover:bg-sky-900/20"
                >
                  <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-700">Drag & drop PDF or Image</p>
                  <p className="text-[10px] text-slate-500 mt-1">Supported: PDF, JPG, PNG, WEBP</p>
                  <input type="file" ref={projectInputRef} onChange={handleProjectUpload} accept=".pdf,image/*" className="hidden" />
                </div>
              ) : (
                <div className="bg-[#0f172a] border border-slate-700 p-3 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${projectType === 'pdf' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {projectType?.toUpperCase()}
                    </span>
                    <strong className="text-sm text-white truncate" title={projectFile.name}>{projectFile.name}</strong>
                  </div>
                  <button 
                    onClick={closeProject}
                    className="w-full py-1.5 mt-1 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 text-xs font-bold rounded-md transition-colors border border-slate-700 hover:border-red-500/30"
                  >
                    Close Project
                  </button>
                </div>
              )}
            </div>

            {/* PDF Specific Controls */}
            {projectFile && projectType === 'pdf' && activePage && (
              <>
                <div className="flex flex-col gap-3 animate-fade-in">
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide border-b border-slate-700/50 pb-1">Page Navigation</h3>
                  <div className="flex items-center justify-between bg-[#0f172a] p-2 rounded-lg border border-slate-700">
                    <button 
                      onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                      disabled={currentPageIndex === 0}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-xs font-bold text-slate-300">Page {currentPageIndex + 1} / {projectData.pages.length}</span>
                    <button 
                      onClick={() => setCurrentPageIndex(Math.max(0, Math.min(projectData.pages.length - 1, currentPageIndex + 1)))}
                      disabled={currentPageIndex === projectData.pages.length - 1}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 animate-fade-in">
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide border-b border-slate-700/50 pb-1">2. Select Image</h3>
                  
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                    {activePage.images.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center p-2 bg-[#0f172a] rounded-lg border border-slate-800">No images found on this page.</p>
                    ) : (
                      activePage.images.map((imgData, i) => {
                        const isSelected = selectedXref === imgData.xref;
                        const gData = projectData.images.find(g => g.xref === imgData.xref);
                        
                        return (
                          <div 
                            key={i}
                            onClick={() => imgData.supported && setSelectedXref(imgData.xref)}
                            className={`flex items-center p-2 rounded-lg border transition-all ${!imgData.supported ? 'opacity-60 bg-red-500/5 border-red-500/20 cursor-not-allowed' : isSelected ? 'bg-sky-500/20 border-sky-400 cursor-pointer shadow-[0_0_8px_rgba(56,189,248,0.2)]' : 'bg-[#0f172a] border-slate-700 cursor-pointer hover:border-slate-500 hover:bg-[#1e293b]'}`}
                          >
                            <ImageIcon className={`w-4 h-4 mr-2 ${!imgData.supported ? 'text-red-400' : isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>Image {i+1} {gData ? `(${gData.width}x${gData.height})` : ''}</span>
                              {!imgData.supported && <span className="text-[9px] text-red-400">Unsupported format/mask</span>}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  
                  {selectedGlobalImg && selectedGlobalImg.duplicateCount > 1 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg flex gap-2 items-start animate-fade-in">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <strong className="text-xs text-amber-400">Duplicate Image Detected</strong>
                        <p className="text-[10px] text-amber-200/70 leading-tight mt-0.5">This image is used {selectedGlobalImg.duplicateCount} times in this document. Replacing it will update all occurrences globally.</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Replacement Upload (Always show for image mode, or when xref selected for pdf mode) */}
            {projectFile && (projectType === 'image' || selectedXref) && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide border-b border-slate-700/50 pb-1">{projectType === 'pdf' ? '3. Upload Replacement' : '2. Upload Replacement'}</h3>
                
                <div 
                  onClick={() => replInputRef.current?.click()}
                  className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${replacementFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-600 bg-[#0f172a]/60 hover:border-sky-400 hover:bg-sky-900/20'}`}
                >
                  <p className="text-xs text-slate-300 font-medium">Click to upload new image</p>
                  <p className="text-[10px] text-sky-400 mt-1 truncate">{replacementFile ? replacementFile.name : 'No file selected'}</p>
                  <input type="file" ref={replInputRef} onChange={handleReplacementUpload} accept="image/jpeg,image/png,image/webp" className="hidden" />
                </div>

                {replacementFile && (
                  <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-700">
                    <button 
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${showNewPreview ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                      onClick={() => setShowNewPreview(true)}
                    >
                      New Preview
                    </button>
                    <button 
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${!showNewPreview ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                      onClick={() => setShowNewPreview(false)}
                    >
                      Original
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className={`mt-auto pt-4 flex flex-col gap-2 ${(!projectFile || (projectType === 'pdf' && !selectedXref) || !replacementFile) ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <button 
                onClick={applyReplacement}
                disabled={isProcessing || !replacementFile || (projectType === 'pdf' && !selectedXref)} 
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span> Processing...</> : <><MonitorPlay className="w-4 h-4" /> Apply Replacement</>}
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage Workspace */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          
          <div className="flex-1 flex flex-col h-full bg-[#090d16] border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            {/* Stage Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg shrink-0">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/30">
                  {projectFile ? 'Workspace Active' : 'Waiting for Project'}
                </span>
              </div>
              
              {resultDownloadUrl && (
                <button 
                  onClick={downloadResult}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-md transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <Download className="w-3.5 h-3.5" /> Download Result
                </button>
              )}
            </div>

            {/* Stage Body */}
            <div 
              className="flex-1 relative overflow-auto flex items-center justify-center p-4 sm:p-8"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0)',
                backgroundSize: '16px 16px'
              }}
            >
              
              {!projectFile && !isProjectLoading && (
                <div className="flex flex-col items-center justify-center text-slate-500 text-center">
                  <FileText className="w-16 h-16 text-slate-700 mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-slate-200 mb-2">No Project Open</h3>
                  <p className="text-sm mt-2 text-slate-400 max-w-[320px]">Upload a PDF document or image file using the left panel to begin replacing embedded images.</p>
                </div>
              )}

              {isProjectLoading && (
                <div className="flex flex-col items-center justify-center text-slate-500 text-center animate-pulse">
                  <div className="w-12 h-12 rounded-full border-4 border-sky-500/30 border-t-sky-500 animate-spin mb-4"></div>
                  <h3 className="text-lg font-bold text-slate-200">Analyzing Document...</h3>
                  <p className="text-sm mt-2 text-slate-400">Detecting embedded images securely.</p>
                </div>
              )}

              {projectFile && !isProjectLoading && activePage && (
                <div className="relative inline-block shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-white transition-transform duration-300">
                  
                  {/* Background Document View */}
                  <img 
                    src={activePage.pageUrl} 
                    alt="Document View" 
                    className="block w-full h-auto max-w-full max-h-[70vh] object-contain pointer-events-none"
                    onLoad={(e) => {
                      // We need to trigger a re-render to calculate correct bboxes based on displayed size
                      // For this React simulation, we'll use CSS % based positioning to make it responsive
                      e.target.dataset.loaded = "true";
                    }}
                  />
                  
                  {/* BBox Overlays (PDF Mode) */}
                  {projectType === 'pdf' && activePage.images.map((img, i) => {
                    const isSelected = selectedXref === img.xref;
                    // Calculate % coordinates based on original PDF dimensions vs bbox
                    const origW = activePage.width;
                    const origH = activePage.height;
                    const leftPct = (img.bbox[0] / origW) * 100;
                    const topPct = (img.bbox[1] / origH) * 100;
                    const widthPct = ((img.bbox[2] - img.bbox[0]) / origW) * 100;
                    const heightPct = ((img.bbox[3] - img.bbox[1]) / origH) * 100;

                    return (
                      <div 
                        key={i}
                        onClick={() => img.supported && setSelectedXref(img.xref)}
                        className={`absolute border-2 transition-all cursor-pointer group ${!img.supported ? 'border-red-500 bg-red-500/20 cursor-not-allowed' : isSelected ? 'border-emerald-500 bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10' : 'border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/40'}`}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                        }}
                        title={!img.supported ? 'Unsupported encoding' : 'Click to select this image'}
                      >
                        {isSelected && replacementUrl && showNewPreview && (
                          <img 
                            src={replacementUrl} 
                            className="absolute inset-0 w-full h-full object-fill bg-black/80 z-20" 
                            alt="Replacement Preview"
                          />
                        )}
                        {/* Hover hint */}
                        {img.supported && !isSelected && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Select Image
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Image Replacement Overlay (Image Mode) */}
                  {projectType === 'image' && replacementUrl && showNewPreview && (
                    <img 
                      src={replacementUrl} 
                      className="absolute inset-0 w-full h-full object-fill bg-black/80 z-20 pointer-events-none" 
                      alt="Replacement Preview"
                    />
                  )}

                </div>
              )}
            </div>
          </div>
        </main>

      </div>
    </div>
  );
};

export default ReplaceImages;
