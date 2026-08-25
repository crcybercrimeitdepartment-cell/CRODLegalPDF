/**
 * @file CompareRedaction.jsx
 * @description Compare & Redaction sub-page. Provides 3 tools: PDF comparison (side-by-side diff), PDF redaction (permanent blackout), and duplicate page detection.
 *
 * Exports:
 *  - CompareRedactionPage, CompareRedaction (card), Header, PDF_TOOLS
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
import {
  GitCompare,
  EyeOff,
  CopyCheck,
  ArrowRight
} from 'lucide-react';

/**
 * @file CompareRedaction.jsx
 * @description Core UI component file providing tool icon components, the header section,
 * and individual interactive feature cards with ambient glows and micro-animations.
 * @module CompareRedaction
 */

/* ==========================================================================
   1. COMPARE & REDACTION ICON COMPONENTS (3 TOOLS)
   ========================================================================== */

/**
 * Compare PDF Icon Component
 * Represents side-by-side document diffing and visual comparison.
 *
 * @component
 * @param {Object} props - Component properties
 * @param {string} [props.className="w-8 h-8"] - Tailwind CSS styling classes
 * @returns {JSX.Element} Lucide GitCompare icon element
 */
function ComparePdfIcon({ className = "w-8 h-8" }) {
  return <GitCompare className={className} />;
}

/**
 * Redact PDF Icon Component
 * Represents permanent sensitive data redaction and privacy protection.
 *
 * @component
 * @param {Object} props - Component properties
 * @param {string} [props.className="w-8 h-8"] - Tailwind CSS styling classes
 * @returns {JSX.Element} Lucide EyeOff icon element
 */
function RedactPdfIcon({ className = "w-8 h-8" }) {
  return <EyeOff className={className} />;
}

/**
 * Duplicate Check Icon Component
 * Represents page-level & document-level duplication scanner.
 *
 * @component
 * @param {Object} props - Component properties
 * @param {string} [props.className="w-8 h-8"] - Tailwind CSS styling classes
 * @returns {JSX.Element} Lucide CopyCheck icon element
 */
function DuplicateCheckIcon({ className = "w-8 h-8" }) {
  return <CopyCheck className={className} />;
}

/* ==========================================================================
   2. HEADER COMPONENT WITH FLOATING BRANDING & DECORATIVE ANIMATIONS
   ========================================================================== */

/**
 * Header Component
 * Renders hero banner with gradient typography, subtitle description, 
 * decorative dashed arc path, and floating animated file badges.
 *
 * @component
 * @returns {JSX.Element} Header section element
 */
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
            <SlideInText text="Compare & Redaction" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Compare document versions side-by-side and permanently redact sensitive information.
          </p>
        </div>
      </div>
    </header>
  );
}

export function CompareRedaction({ tool, index = 0, onClick }) {
  if (!tool) return null;
  const IconComponent = tool.icon;
  const isElement = React.isValidElement(tool.icon);
  const toolName = tool.name || tool.title || 'PDF Tool';
  const toolBg = tool.bgColor || tool.bg || '#FFECEC';
  const toolIconColor = tool.iconColor || tool.color || 'text-blue-600';

  const rowIndex = Math.floor(index / 2);
  const delayMs = Math.min(rowIndex * 60, 480);
  const slideAnimation = rowIndex % 2 === 0 ? 'animate-card-slide-left' : 'animate-card-slide-right';

  const fillHex = (typeof toolBg === 'string' ? toolBg.match(/#[A-Fa-f0-9]{6}/)?.[0] : null) || '#E0F2FE';

  return (
    <div
      onClick={() => onClick?.(tool)}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`${slideAnimation} w-full bg-white rounded-[16px] sm:rounded-[22px] p-3 sm:p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center gap-3 sm:gap-5 group select-none relative overflow-hidden h-[98px] sm:h-[112px] z-10 hover:z-30`}
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
   4. DATA CONFIGURATION (COLORS & TOOLS)
   ========================================================================== */

/**
 * Palette configuration mapping each tool feature to tailored pastel fills, 
 * vibrant ambient hover gradients, shadow glows, and icon accent colors.
 *
 * @type {Array<{gradient: string, icon: string, glow: string, badgeFill: string}>}
 */
const colors = [
  {
    gradient: 'from-blue-500/15 via-indigo-500/10 to-blue-500/5',
    icon: 'text-blue-600',
    glow: 'shadow-[0_0_25px_rgba(37,99,235,0.18)]',
    badgeFill: '#E0F2FE'
  }, // Blue theme (Compare PDF tool)
  {
    gradient: 'from-rose-500/15 via-red-500/10 to-rose-500/5',
    icon: 'text-rose-600',
    glow: 'shadow-[0_0_25px_rgba(225,29,72,0.18)]',
    badgeFill: '#FFE4E6'
  }, // Red theme (Redact PDF tool)
  {
    gradient: 'from-purple-500/15 via-fuchsia-500/10 to-purple-500/5',
    icon: 'text-purple-600',
    glow: 'shadow-[0_0_25px_rgba(147,51,234,0.18)]',
    badgeFill: '#F3E8FF'
  }  // Purple theme (Duplicate Check tool)
];

/**
 * PDF_TOOLS Data Array
 * Master array rendered in the main dashboard grid.
 *
 * @type {Array<{
 *   id: string,
 *   name: string,
 *   description: string,
 *   icon: React.ComponentType<{className?: string}>,
 *   gradient: string,
 *   iconColor: string,
 *   glow: string,
 *   badgeFill: string
 * }>}
 */
export const PDF_TOOLS = [
  {
    id: 'compare-pdf',
    name: 'Compare PDF',
    description: 'Compare two PDF documents side-by-side to highlight text differences, visual changes, and revision edits.',
    icon: ComparePdfIcon,
    gradient: colors[0].gradient,
    iconColor: colors[0].icon,
    glow: colors[0].glow,
    badgeFill: colors[0].badgeFill
  },
  {
    id: 'redact-pdf',
    name: 'Redact PDF',
    description: 'Permanently block out or remove sensitive text, private images, and confidential data from PDFs securely.',
    icon: RedactPdfIcon,
    gradient: colors[1].gradient,
    iconColor: colors[1].icon,
    glow: colors[1].glow,
    badgeFill: colors[1].badgeFill
  },
  {
    id: 'duplicate-check',
    name: 'Duplicate Check',
    description: 'Scan and identify duplicate pages, redundant content, or identical PDF files in your document workflow.',
    icon: DuplicateCheckIcon,
    gradient: colors[2].gradient,
    iconColor: colors[2].icon,
    glow: colors[2].glow,
    badgeFill: colors[2].badgeFill
  }
];


import ComparePdfPage from './ComparePDFPage';
import RedactPdfPage from './RedactPDFPage';
import DuplicateCheckPage from './DuplicateCheckPage';

const COMPONENT_MAP = {
  'compare-pdf': ComparePdfPage,
  'redact-pdf': RedactPdfPage,
  'duplicate-check': DuplicateCheckPage
};

export function CompareRedactionPage({ onBack, searchQuery = "" }) {
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
        <div className="flex-1 flex flex-col w-full relative pt-11 sm:pt-4">
          <button onClick={() => setSelectedTool(null)}
            className="absolute top-1.5 left-3 sm:top-5 sm:left-6 md:left-10 z-50 text-[#1e2a52] hover:text-blue-950 font-bold flex items-center gap-1.5 sm:gap-2 bg-white/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm backdrop-blur-md border border-slate-200/90 transition-all hover:shadow-md hover:scale-105 cursor-pointer text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 text-[#1e2a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span>Back to Tools</span>
          </button>
          <div className="mt-8">
            <Component />
          </div>
        </div>
      );
    }
    return <ToolWorkspace tool={selectedTool} onBack={() => setSelectedTool(null)} />;
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
        <main className="pb-16 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto w-full">
            {PDF_TOOLS.filter(tool => {
              const q = (searchQuery || "").trim().toLowerCase();
              if (!q) return true;
              const name = (tool.name || tool.title || "").toLowerCase(); return name.includes(q);
            }).map((tool, idx) => (
              <CompareRedaction
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
