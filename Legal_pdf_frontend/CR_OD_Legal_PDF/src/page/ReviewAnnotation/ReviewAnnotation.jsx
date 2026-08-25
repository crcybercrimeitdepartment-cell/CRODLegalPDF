/**
 * @file ReviewAnnotation.jsx
 * @description Review & Annotation sub-page. Provides 32 tools: pencil, highlighter, shapes, sticky notes, stamps, freehand drawing, comment threads, measurement tools, and annotation export.
 *
 * Exports:
 *  - ReviewAnnotationPage, ReviewAnnotationCard (card), Header, PDF_TOOLS
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
import { AnnotationProvider } from './context/AnnotationContext';
import { ReviewProvider } from './context/ReviewContext';
import { HistoryProvider } from './context/HistoryContext';

import PencilToolPage from './PencilToolPage';
import ArrowToolPage from './ArrowToolPage';
import StampToolPage from './StampToolPage';
import CalloutPage from './CalloutPage';
import InkAnnotationPage from './InkAnnotationPage';
import HighlightTextPage from './HighlightTextPage';
import UnderlineTextPage from './UnderlineTextPage';
import StrikeoutTextPage from './StrikeoutTextPage';
import SquigglyUnderlinePage from './SquigglyUnderlinePage';
import StickyNotesPage from './StickyNotesPage';
import TextBoxPage from './TextBoxPage';
import FreeTextAnnotationPage from './FreeTextAnnotationPage';
import RectangleToolPage from './RectangleToolPage';
import CircleEllipseToolPage from './CircleEllipseToolPage';
import LineToolPage from './LineToolPage';
import PolylineToolPage from './PolylineToolPage';
import PolygonToolPage from './PolygonToolPage';
import CloudAnnotationPage from './CloudAnnotationPage';
import MeasurementToolPage from './MeasurementToolPage';
import AreaMeasurementPage from './AreaMeasurementPage';
import DistanceMeasurementPage from './DistanceMeasurementPage';
import CommentPanelPage from './CommentPanelPage';
import ReviewPanelPage from './ReviewPanelPage';
import CommentHistoryPage from './CommentHistoryPage';
import ImportCommentsPage from './ImportCommentsPage';
import ExportCommentsPage from './ExportCommentsPage';
import ReplytoCommentsPage from './ReplytoCommentsPage';
import ResolveCommentsPage from './ResolveCommentsPage';
import FilterCommentsPage from './FilterCommentsPage';
import SearchCommentsPage from './SearchCommentsPage';
import AnnotationPropertiesPage from './AnnotationPropertiesPage';
import AnnotationSummaryReportPage from './AnnotationSummaryReportPage';

const COMPONENT_MAP = {
  "pencil-tool": PencilToolPage,
  "arrow-tool": ArrowToolPage,
  "stamp-tool": StampToolPage,
  "callout": CalloutPage,
  "ink-annotation": InkAnnotationPage,
  "highlight-text": HighlightTextPage,
  "underline-text": UnderlineTextPage,
  "strikeout-text": StrikeoutTextPage,
  "squiggly-underline": SquigglyUnderlinePage,
  "sticky-notes": StickyNotesPage,
  "text-box": TextBoxPage,
  "free-text-annotation": FreeTextAnnotationPage,
  "rectangle-tool": RectangleToolPage,
  "circle-ellipse-tool": CircleEllipseToolPage,
  "line-tool": LineToolPage,
  "polyline-tool": PolylineToolPage,
  "polygon-tool": PolygonToolPage,
  "cloud-annotation": CloudAnnotationPage,
  "measurement-tool": MeasurementToolPage,
  "area-measurement": AreaMeasurementPage,
  "distance-measurement": DistanceMeasurementPage,
  "comment-panel": CommentPanelPage,
  "review-panel": ReviewPanelPage,
  "comment-history": CommentHistoryPage,
  "import-comments": ImportCommentsPage,
  "export-comments": ExportCommentsPage,
  "reply-to-comments": ReplytoCommentsPage,
  "resolve-comments": ResolveCommentsPage,
  "filter-comments": FilterCommentsPage,
  "search-comments": SearchCommentsPage,
  "annotation-properties": AnnotationPropertiesPage,
  "annotation-summary-report": AnnotationSummaryReportPage,
};

/**
 * @file ReviewAnnotation.jsx
 * @module components/ReviewAnnotation
 * @description Master component library for the Review & Annotation Suite interface.
 * Provides 32 custom SVG tool icon components, an animated hero Header section,
 * and a responsive tool card component with SVG stroke animation effects.
 *
 * @author DeepMind Pair Programming Suite
 * @version 6.1.0
 */
import { ArrowRight } from 'lucide-react';

import {
  Pencil,
  ArrowUpRight,
  Stamp,
  MessageSquarePlus,
  PenTool,
  Highlighter,
  Underline,
  Strikethrough,
  Spline,
  StickyNote,
  Type,
  FileText,
  Square,
  Circle,
  Minus,
  GitCommit,
  Hexagon,
  Cloud,
  Ruler,
  Maximize2,
  MoveHorizontal,
  MessageSquare,
  ClipboardList,
  History,
  Upload,
  Download,
  Reply,
  CheckCircle,
  Filter,
  Search,
  Sliders,
  FileBarChart
} from 'lucide-react';

/* ==========================================================================
   SECTION 1: REVIEW & ANNOTATION TOOL ICON WRAPPER COMPONENTS (32 ITEMS)
   ========================================================================== */

/** @typedef {Object} IconProps @property {string} [className="w-8 h-8"] - Tailwind CSS sizing & styling classes */

/** @param {IconProps} props @returns {JSX.Element} 1. Pencil Tool Icon */
function PencilIcon({ className = "w-8 h-8" }) { return <Pencil className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 2. Arrow Tool Icon */
function ArrowIcon({ className = "w-8 h-8" }) { return <ArrowUpRight className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 3. Stamp Tool Icon */
function StampIcon({ className = "w-8 h-8" }) { return <Stamp className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 4. Callout Icon */
function CalloutIcon({ className = "w-8 h-8" }) { return <MessageSquarePlus className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 5. Ink Annotation Icon */
function InkAnnotationIcon({ className = "w-8 h-8" }) { return <PenTool className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 6. Highlight Text Icon */
function HighlightTextIcon({ className = "w-8 h-8" }) { return <Highlighter className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 7. Underline Text Icon */
function UnderlineTextIcon({ className = "w-8 h-8" }) { return <Underline className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 8. Strikeout Text Icon */
function StrikeoutTextIcon({ className = "w-8 h-8" }) { return <Strikethrough className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 9. Squiggly Underline Icon */
function SquigglyUnderlineIcon({ className = "w-8 h-8" }) { return <Spline className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 10. Sticky Notes Icon */
function StickyNotesIcon({ className = "w-8 h-8" }) { return <StickyNote className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 11. Text Box Icon */
function TextBoxIcon({ className = "w-8 h-8" }) { return <Type className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 12. Free Text Annotation Icon */
function FreeTextAnnotationIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 13. Rectangle Tool Icon */
function RectangleIcon({ className = "w-8 h-8" }) { return <Square className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 14. Circle / Ellipse Tool Icon */
function CircleEllipseIcon({ className = "w-8 h-8" }) { return <Circle className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 15. Line Tool Icon */
function LineIcon({ className = "w-8 h-8" }) { return <Minus className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 16. Polyline Tool Icon */
function PolylineIcon({ className = "w-8 h-8" }) { return <GitCommit className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 17. Polygon Tool Icon */
function PolygonIcon({ className = "w-8 h-8" }) { return <Hexagon className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 18. Cloud Annotation Icon */
function CloudAnnotationIcon({ className = "w-8 h-8" }) { return <Cloud className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 19. Measurement Tool Icon */
function MeasurementIcon({ className = "w-8 h-8" }) { return <Ruler className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 20. Area Measurement Icon */
function AreaMeasurementIcon({ className = "w-8 h-8" }) { return <Maximize2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 21. Distance Measurement Icon */
function DistanceMeasurementIcon({ className = "w-8 h-8" }) { return <MoveHorizontal className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 22. Comment Panel Icon */
function CommentPanelIcon({ className = "w-8 h-8" }) { return <MessageSquare className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 23. Review Panel Icon */
function ReviewPanelIcon({ className = "w-8 h-8" }) { return <ClipboardList className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 24. Comment History Icon */
function CommentHistoryIcon({ className = "w-8 h-8" }) { return <History className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 25. Import Comments Icon */
function ImportCommentsIcon({ className = "w-8 h-8" }) { return <Upload className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 26. Export Comments Icon */
function ExportCommentsIcon({ className = "w-8 h-8" }) { return <Download className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 27. Reply to Comments Icon */
function ReplyCommentsIcon({ className = "w-8 h-8" }) { return <Reply className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 28. Resolve Comments Icon */
function ResolveCommentsIcon({ className = "w-8 h-8" }) { return <CheckCircle className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 29. Filter Comments Icon */
function FilterCommentsIcon({ className = "w-8 h-8" }) { return <Filter className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 30. Search Comments Icon */
function SearchCommentsIcon({ className = "w-8 h-8" }) { return <Search className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 31. Annotation Properties Icon */
function AnnotationPropertiesIcon({ className = "w-8 h-8" }) { return <Sliders className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 32. Annotation Summary Report Icon */
function AnnotationSummaryReportIcon({ className = "w-8 h-8" }) { return <FileBarChart className={className} />; }

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
 * ReviewAnnotation Tool Card Component
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
            <SlideInText text="Review & Annotation" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Add comments, highlight text, draw shapes, and collaborate on PDF document reviews.
          </p>
        </div>
      </div>
    </header>
  );
}

export function ReviewAnnotation({ tool, index = 0, onClick }) {
  if (!tool) return null;
  const IconComponent = tool.icon;
  const isElement = React.isValidElement(tool.icon);
  const toolName = tool.name || tool.title || 'PDF Tool';
  const toolBg = tool.bgColor || tool.bg || '#FFECEC';
  const toolIconColor = tool.iconColor || tool.color || 'text-blue-600';

  const rowIndex = Math.floor(index / 2);
  const delayMs = rowIndex * 120;
  const slideAnimation = rowIndex % 2 === 0 ? 'animate-card-slide-left' : 'animate-card-slide-right';

  const fillHex = (typeof toolBg === 'string' ? toolBg.match(/#[A-Fa-f0-9]{6}/)?.[0] : null) || '#E0F2FE';

  return (
    <div
      onClick={() => onClick?.(tool)}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`${slideAnimation} bg-white rounded-[16px] sm:rounded-[22px] p-2.5 sm:p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center gap-2 sm:gap-4 group select-none relative overflow-hidden h-[98px] sm:h-[112px] z-10 hover:z-30`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(tool);
        }
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 overflow-visible">
        <rect
          x="1.5"
          y="1.5"
          width="calc(100% - 3px)"
          height="calc(100% - 3px)"
          rx="18"
          fill="none"
          stroke="#2563EB"
          strokeWidth="2"
          pathLength="100"
          className="animate-draw-line"
        />
      </svg>

      <div className="w-8 h-10 sm:w-13 sm:h-15 shrink-0 relative flex items-center justify-center group-hover:scale-108 transition-transform duration-200 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.06)] mt-0.5">
        <svg className="absolute inset-0 w-full h-full" viewBox="-4 -4 56 66" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 0h30l14 14v40a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z"
            fill="white"
            stroke="white"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <path d="M4 0h30l14 14v40a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={fillHex} />
          <path d="M34 0l14 14H38a4 4 0 0 1-4-4V0z" fill="rgba(0,0,0,0.18)" />
        </svg>
        <div className={`relative z-10 ${toolIconColor}`}>
          {isElement ? (
            tool.icon
          ) : typeof IconComponent === 'function' || typeof IconComponent === 'object' ? (
            <IconComponent className="w-5 h-5 sm:w-7 sm:h-7" />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col text-left min-w-0 relative z-0 flex-1">
        <h3 className="text-[11.5px] sm:text-base font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
          {toolName}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 font-normal leading-tight line-clamp-2 mt-0.5 sm:mt-1">
          {tool.description}
        </p>

        <div className="max-h-0 opacity-0 group-hover:max-h-8 group-hover:opacity-100 group-hover:mt-1.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600">
          <span>Use Feature</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   SECTION 4: DATA CONFIGURATION
   ========================================================================== */

/**
 * Curated palette of 10 pastel background colors and matching vibrant icon colors.
 * Used sequentially to provide visual variety across tool grid cards.
 *
 * @type {ColorTheme[]}
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
 * Array of 32 Review & Annotation tool objects displayed in the main application grid.
 * Categorized into Markup, Text, Shape, Measurement, Commenting, and Reporting modules.
 *
 * @type {PdfTool[]}
 */
export const PDF_TOOLS = [
  /* --------------------------------------------------------------------------
   * CATEGORY 1: FREEHAND & MARKUP TOOLS
   * -------------------------------------------------------------------------- */
  {
    id: 'pencil-tool',
    name: 'Pencil Tool',
    description: 'Freehand drawing and sketch annotations directly on PDF pages.',
    icon: PencilIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'arrow-tool',
    name: 'Arrow Tool',
    description: 'Draw directional arrows to point out specific document details.',
    icon: ArrowIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'stamp-tool',
    name: 'Stamp Tool',
    description: 'Apply predefined or custom rubber stamps like Approved or Confidential.',
    icon: StampIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'callout',
    name: 'Callout',
    description: 'Add text callout boxes with leader lines pointing to exact content.',
    icon: CalloutIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'ink-annotation',
    name: 'Ink Annotation',
    description: 'Vector-based digital ink writing with pressure-sensitive strokes.',
    icon: InkAnnotationIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 2: TEXT ANNOTATION & HIGHLIGHT TOOLS
   * -------------------------------------------------------------------------- */
  {
    id: 'highlight-text',
    name: 'Highlight Text',
    description: 'Highlight important text passages with translucent color overlays.',
    icon: HighlightTextIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'underline-text',
    name: 'Underline Text',
    description: 'Add single or double underline markup to selected text content.',
    icon: UnderlineTextIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'strikeout-text',
    name: 'Strikeout Text',
    description: 'Mark text for deletion or modification with strikethrough lines.',
    icon: StrikeoutTextIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'squiggly-underline',
    name: 'Squiggly Underline',
    description: 'Draw wavy squiggly underlines for grammar or proofreading notes.',
    icon: SquigglyUnderlineIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'sticky-notes',
    name: 'Sticky Notes',
    description: 'Place pop-up notes on pages for collaborative comments and feedback.',
    icon: StickyNotesIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'text-box',
    name: 'Text Box',
    description: 'Insert customizable text boxes with custom borders and font styling.',
    icon: TextBoxIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'free-text-annotation',
    name: 'Free Text Annotation',
    description: 'Type freeform text directly onto document pages anywhere.',
    icon: FreeTextAnnotationIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 3: SHAPE & GEOMETRIC DRAWING TOOLS
   * -------------------------------------------------------------------------- */
  {
    id: 'rectangle-tool',
    name: 'Rectangle Tool',
    description: 'Draw vector rectangular borders or filled shapes to highlight areas.',
    icon: RectangleIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'circle-ellipse-tool',
    name: 'Circle / Ellipse Tool',
    description: 'Draw circles and ellipses around critical diagram components.',
    icon: CircleEllipseIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'line-tool',
    name: 'Line Tool',
    description: 'Draw straight line annotations with customizable thickness and style.',
    icon: LineIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'polyline-tool',
    name: 'Polyline Tool',
    description: 'Create connected multi-segment open line paths across diagrams.',
    icon: PolylineIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'polygon-tool',
    name: 'Polygon Tool',
    description: 'Draw multi-sided closed polygon shapes for geometric markup.',
    icon: PolygonIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'cloud-annotation',
    name: 'Cloud Annotation',
    description: 'Draw revision cloud boundaries to denote modified engineering sections.',
    icon: CloudAnnotationIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 4: MEASUREMENT & SCALING TOOLS
   * -------------------------------------------------------------------------- */
  {
    id: 'measurement-tool',
    name: 'Measurement Tool',
    description: 'Calibrate document scale and take precise architectural measurements.',
    icon: MeasurementIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'area-measurement',
    name: 'Area Measurement',
    description: 'Calculate polygon and enclosed surface areas in scaled drawings.',
    icon: AreaMeasurementIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'distance-measurement',
    name: 'Distance Measurement',
    description: 'Measure linear distances between two points with automatic unit conversion.',
    icon: DistanceMeasurementIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 5: COMMENT MANAGEMENT & COLLABORATION TOOLS
   * -------------------------------------------------------------------------- */
  {
    id: 'comment-panel',
    name: 'Comment Panel',
    description: 'Side panel displaying all page comments and annotation threads.',
    icon: CommentPanelIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'review-panel',
    name: 'Review Panel',
    description: 'Consolidated view of document status, approval states, and reviewer notes.',
    icon: ReviewPanelIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'comment-history',
    name: 'Comment History',
    description: 'Track audit trail of comment modifications, edits, and timestamps.',
    icon: CommentHistoryIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'import-comments',
    name: 'Import Comments',
    description: 'Import FDF/XFDF comment files from external reviewers.',
    icon: ImportCommentsIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'export-comments',
    name: 'Export Comments',
    description: 'Export all document comments to FDF, XFDF, or PDF summary files.',
    icon: ExportCommentsIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'reply-to-comments',
    name: 'Reply to Comments',
    description: 'Engage in threaded discussions by replying directly to feedback.',
    icon: ReplyCommentsIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'resolve-comments',
    name: 'Resolve Comments',
    description: 'Mark feedback threads as resolved or completed during revision.',
    icon: ResolveCommentsIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'filter-comments',
    name: 'Filter Comments',
    description: 'Filter comments by author, type, date, or resolution status.',
    icon: FilterCommentsIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'search-comments',
    name: 'Search Comments',
    description: 'Search through comment text and annotation metadata across documents.',
    icon: SearchCommentsIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 6: PROPERTIES & SUMMARY REPORT TOOLS
   * -------------------------------------------------------------------------- */
  {
    id: 'annotation-properties',
    name: 'Annotation Properties',
    description: 'Customize stroke color, fill opacity, line style, and author properties.',
    icon: AnnotationPropertiesIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'annotation-summary-report',
    name: 'Annotation Summary Report',
    description: 'Generate downloadable executive reports summarizing all feedback.',
    icon: AnnotationSummaryReportIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  }
];

function ReviewAnnotationPageContent({ onBack, searchQuery = "" }) {
    const [selectedTool, setSelectedTool] = React.useState(() => {
    const hashParts = window.location.hash.replace('#', '').split('/');
    if (hashParts.length > 1) {
      const toolId = hashParts[1];
      return PDF_TOOLS.find(t => t.id === toolId) || null;
    }
    return null;
  });

  React.useEffect(() => {
    if (selectedTool) {
      window.history.pushState({ toolOpen: true }, '', `${window.location.hash.split('/')[0]}/${selectedTool.id}`);
      window.scrollTo(0, 0);
    }
  }, [selectedTool]);

  React.useEffect(() => {
    const handlePopState = () => {
      setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (selectedTool) {
    const Component = COMPONENT_MAP[selectedTool.id];
    if (Component) {
      return (
        <div className="flex-1 flex flex-col w-full relative z-10">
          <Component tool={selectedTool} onBack={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }} />
        </div>
      );
    }
    return <ToolWorkspace tool={selectedTool} onBack={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }} />;
  }

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
      <div className="flex-1 flex flex-col w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-4 overflow-x-hidden">
        <main className="flex-1 pt-1 pb-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2.5 gap-y-3 sm:gap-6 md:gap-8">
            {PDF_TOOLS.filter(tool => {
              const q = (searchQuery || "").trim().toLowerCase();
              if (!q) return true;
              const name = (tool.name || tool.title || "").toLowerCase(); return name.includes(q);
            }).map((tool, idx) => (
              <ReviewAnnotation
                key={tool.id}
                tool={tool}
                index={idx}
                onClick={(t) => setSelectedTool(t)}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export function ReviewAnnotationPage(props) {
  return (
    <HistoryProvider>
      <AnnotationProvider>
        <ReviewProvider>
          <ReviewAnnotationPageContent {...props} />
        </ReviewProvider>
      </AnnotationProvider>
    </HistoryProvider>
  );
}
