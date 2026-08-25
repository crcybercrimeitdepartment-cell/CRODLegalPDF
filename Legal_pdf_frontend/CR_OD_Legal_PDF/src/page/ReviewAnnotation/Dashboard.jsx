import React, { useContext, useState } from 'react';
import { AnnotationContext } from './context/AnnotationContext';
import { ReviewContext } from './context/ReviewContext';
import { HistoryContext } from './context/HistoryContext';
import ImportCommentsModal from './ImportCommentsModal';
import ExportCommentsModal from './ExportCommentsModal';
import PropertiesPanel from './PropertiesPanel';
import SummaryReportModal from './SummaryReportModal';
import { 
  Pencil, 
  ArrowRight, 
  Stamp, 
  MessageSquare, 
  ClipboardCheck,
  History,
  DownloadCloud,
  UploadCloud,
  PenTool, 
  ListTodo,
  Highlighter,
  Underline,
  Strikethrough,
  Activity,
  Type,
  AlignLeft,
  Square,
  Circle,
  Minus,
  Hexagon,
  Cloud,
  Ruler,
  Milestone,
  Sliders,
  PieChart
} from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const { annotations, setIsCommentPanelOpen, setIsPropertiesPanelOpen } = useContext(AnnotationContext);
  const { setIsReviewPanelOpen } = useContext(ReviewContext);
  const { setIsHistoryPanelOpen } = useContext(HistoryContext);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const features = [
    { id: 'pencil', title: 'Pencil & Annotation', description: 'Draw freehand lines, write handwritten notes, mark, underline, and annotate PDF pages naturally.', icon: <Pencil className="w-5 h-5 text-blue-600" />, active: true },
    { id: 'underline', title: 'Underline Text', description: 'Draw precise lines under selected text with various styles (solid, dashed, dotted).', icon: <Underline className="w-5 h-5 text-red-600" />, active: true },
    { id: 'arrow', title: 'Arrow Tool', description: 'Draw directional arrows toward specific text, images, or objects to indicate key feedback clearly.', icon: <ArrowRight className="w-5 h-5 text-blue-600" />, active: true },
    { id: 'stamp', title: 'Stamp Tool', description: 'Add official document status stamps (Approved, Rejected, Confidential, Draft, Reviewed) or custom text stamps.', icon: <Stamp className="w-5 h-5 text-indigo-600" />, active: true },
    { id: 'sticky', title: 'Sticky Notes', description: 'Add comments and discussion points as interactive sticky notes across the document.', icon: <MessageSquare className="w-5 h-5 text-yellow-600" />, active: true },
    { id: 'squiggly', title: 'Squiggly Underline', description: 'Mark text with wavy underlines to indicate spelling or grammar concerns.', icon: <Activity className="w-5 h-5 text-rose-500" />, active: true },
    { id: 'strikeout', title: 'Strikeout Text', description: 'Cross out text indicating deletions or corrections with customizable styles.', icon: <Strikethrough className="w-5 h-5 text-red-700" />, active: true },
    { id: 'freetext', title: 'Free Text Annotation', description: 'Add inline, unbordered text directly onto the document for natural markups.', icon: <AlignLeft className="w-5 h-5 text-fuchsia-500" />, active: true },
    { id: 'line', title: 'Line Tool', description: 'Draw straight lines for underlining, strike-throughs, or connecting ideas.', icon: <Minus className="w-5 h-5 text-indigo-600" />, active: true },
    { id: 'ellipse', title: 'Circle / Ellipse Tool', description: 'Draw perfect circles or free-form ellipses to highlight content.', icon: <Circle className="w-5 h-5 text-pink-600" />, active: true },
    { id: 'rectangle', title: 'Rectangle Tool', description: 'Draw customizable rectangle shapes for highlighting and boxing content.', icon: <Square className="w-5 h-5 text-purple-600" />, active: true },
    { id: 'textbox', title: 'Text Box', description: 'Place visible text boxes directly on the document for labels and forms.', icon: <Type className="w-5 h-5 text-indigo-500" />, active: true },
    { id: 'highlight', title: 'Highlight Text', description: 'Select and highlight text directly from the document with customizable colors and opacity.', icon: <Highlighter className="w-5 h-5 text-yellow-500" />, active: true },
    { id: 'callout', title: 'Callout Tool', description: 'Add text callouts with directional leader lines to highlight specific details in complex documents.', icon: <MessageSquare className="w-5 h-5 text-teal-600" />, active: true },
    { id: 'ink', title: 'Ink Annotation', description: 'Create smooth, pressure-sensitive handwriting and freeform ink strokes simulating physical pens.', icon: <PenTool className="w-5 h-5 text-indigo-700" />, active: true },
    { id: 'review', title: 'Review Panel', description: 'Centralized dashboard to view, search, filter, sort, and manage all comments, annotations, stamps, and review items.', icon: <ListTodo className="w-5 h-5 text-emerald-600" />, active: false },
    { id: 'polyline', title: 'Polyline Tool', description: 'Draw connected multi-segment lines with customizable styles, caps, and markers.', icon: <Activity className="w-5 h-5 text-indigo-500" />, active: true },
    { id: 'polygon', title: 'Polygon Tool', description: 'Draw closed multi-sided vector shapes with customizable fills, borders, and styles.', icon: <Hexagon className="w-5 h-5 text-indigo-600" />, active: true },
    { id: 'cloud', title: 'Cloud Annotation', description: 'Draw cloud-shaped scalloped borders for engineering and revision markups.', icon: <Cloud className="w-5 h-5 text-sky-500" />, active: true },
    { id: 'measurement', title: 'Measurement Tool', description: 'Accurately measure objects, drawings, and blueprints directly on the PDF with scale calibration.', icon: <Ruler className="w-5 h-5 text-orange-600" />, active: true },
    { id: 'area', title: 'Area Measurement', description: 'Calculate real-world area of irregular shapes directly on the PDF with precise scale calibration.', icon: <Square className="w-5 h-5 text-emerald-600" />, active: true },
    { id: 'distance', title: 'Distance Measurement', description: 'Trace multi-segment paths to calculate cumulative total real-world distance.', icon: <Milestone className="w-5 h-5 text-rose-600" />, active: true }
  ];

  const categories = [
    { title: "Text Markups", ids: ['highlight', 'underline', 'strikeout', 'squiggly'] },
    { title: "Text & Writing", ids: ['pencil', 'ink', 'freetext', 'textbox'] },
    { title: "Shapes & Pointers", ids: ['arrow', 'line', 'rectangle', 'ellipse', 'polygon', 'polyline', 'cloud'] },
    { title: "Measurement & Scale", ids: ['measurement', 'area', 'distance'] },
    { title: "Workflow & Feedback", ids: ['stamp', 'sticky', 'callout', 'review'] }
  ];

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans print:bg-white print:block">
      
      {/* 1. TOP NAVBAR (File Actions) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden shadow-sm">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
               <PenTool className="text-white w-5 h-5" />
             </div>
             <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">Review and Annotation</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
            >
              <PieChart size={16} /> <span className="hidden sm:inline">Summary Report</span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
              title="Export Comments"
            >
              <DownloadCloud size={16} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
              title="Import Comments"
            >
              <UploadCloud size={16} /> <span className="hidden sm:inline">Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. HERO & CONTEXTUAL ACTIONS */}
      <div className="bg-slate-900 text-white pt-12 pb-14 px-4 sm:px-6 lg:px-8 print:hidden relative overflow-hidden shadow-md z-20">
        <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-400 via-slate-900 to-black"></div>
        <div className="max-w-[90rem] mx-auto relative z-10 flex flex-col xl:flex-row items-center xl:items-end justify-between gap-8">
            <div className="max-w-2xl text-center xl:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Professional Review Suite
              </h2>
              <p className="text-lg text-slate-300 font-light">
                Select a specialized tool below to begin marking up and collaborating on your documents.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center xl:justify-end gap-3 w-full xl:w-auto bg-slate-800/50 p-2 rounded-2xl backdrop-blur-sm border border-slate-700/50">
              <button 
                onClick={() => setIsPropertiesPanelOpen(prev => !prev)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
              >
                <Sliders size={18} /> Properties
              </button>
              <button 
                onClick={() => setIsHistoryPanelOpen(prev => !prev)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
              >
                <History size={18} /> Audit Trail
              </button>
              <button 
                onClick={() => setIsReviewPanelOpen(prev => !prev)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
              >
                <ClipboardCheck size={18} /> Review Panel
              </button>
              <button 
                onClick={() => setIsCommentPanelOpen(prev => !prev)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
              >
                <MessageSquare size={18} /> Comments 
                <span className="bg-blue-800/60 px-2 py-0.5 rounded-full text-xs ml-1">{annotations.length}</span>
              </button>
            </div>
        </div>
      </div>

      {/* 3. CATEGORIZED TOOL GRID */}
      <div className="flex-1 max-w-[90rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 print:hidden space-y-16">
        {categories.map(category => (
           <div key={category.title} className="relative">
              <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-4">
                 {category.title}
                 <div className="h-px bg-slate-200 flex-1 mt-1"></div>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {category.ids.map(id => {
                    const feature = features.find(f => f.id === id);
                    if (!feature) return null;
                    return (
                      <div 
                        key={feature.id} 
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                        onClick={() => feature.active ? onNavigate(feature.id) : alert('This tool is not yet implemented.')}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                            {feature.icon}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 leading-tight">
                            {feature.title}
                          </h4>
                        </div>
                        
                        <p className="text-slate-500 text-xs leading-relaxed mb-4 flex-grow">
                          {feature.description}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                           <span className={`font-semibold text-xs ${feature.active ? 'text-indigo-600 group-hover:text-indigo-700' : 'text-slate-400'}`}>
                              {feature.active ? 'Open Tool' : 'Coming Soon'}
                           </span>
                           <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${feature.active ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100' : 'bg-slate-50 text-slate-300'}`}>
                             <ArrowRight className="w-3.5 h-3.5" />
                           </div>
                        </div>
                      </div>
                    );
                 })}
              </div>
           </div>
        ))}
      </div>

      <ImportCommentsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <ExportCommentsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <SummaryReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
      <PropertiesPanel />
    </div>
  );
}
