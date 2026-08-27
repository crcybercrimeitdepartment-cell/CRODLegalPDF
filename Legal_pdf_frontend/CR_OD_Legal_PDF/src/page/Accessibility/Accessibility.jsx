/**
 * @file Accessibility.jsx
 * @description Accessibility & Assistive Tools sub-page. Provides 32 tools: screen reader support, alt text, PDF/UA compliance, WCAG checker, keyboard navigation, dyslexia mode, voice navigation, and AI fix suggestions.
 *
 * Exports:
 *  - AccessibilityPage, Accessibility (card), Header, ACCESSIBILITY_TOOLS
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
import AccessibilitySupportPage from './AccessibilitySupportPage';
import ScreenReaderSupportPage from './ScreenReaderSupportPage';
import ReadAloudPage from './ReadAloudPage';
import TextReflowPage from './TextReflowPage';
import HighContrastModePage from './HighContrastModePage';
import KeyboardNavigationPage from './KeyboardNavigationPage';
import AccessibilityCheckerPage from './AccessibilityCheckerPage';
import TaggedPDFSupportPage from './TaggedPDFSupportPage';
import AlternativeTextAltTextPage from './AlternativeTextAltTextPage';
import AccessibleFormsPage from './AccessibleFormsPage';
import ColorContrastValidationPage from './ColorContrastValidationPage';
import PDFUACompliancePage from './PDFUACompliancePage';
import DyslexiaReadingModePage from './DyslexiaReadingModePage';
import CustomFontSizeControlsPage from './CustomFontSizeControlsPage';
import AdjustableLineSpacingPage from './AdjustableLineSpacingPage';
import AdjustableLetterSpacingPage from './AdjustableLetterSpacingPage';
import ReadingRulerPage from './ReadingRulerPage';
import FocusModePage from './FocusModePage';
import KeyboardShortcutCustomizationPage from './KeyboardShortcutCustomizationPage';
import VoiceNavigationPage from './VoiceNavigationPage';

import {
  ArrowRight,
  Eye,
  Volume2,
  VolumeX,
  AlignLeft,
  Sun,
  Keyboard,
  CheckSquare,
  Tag,
  Image,
  ClipboardCheck,
  Palette,
  ShieldCheck,
  BookOpen,
  Type,
  Sliders,
  Scan,
  Maximize2,
  Target,
  Command,
  Mic,
  FileAudio,
  MessageSquare,
  Video,
  Grid,
  Layers,
  Globe,
  Link,
  Download,
  Scale,
  ListOrdered,
  Wand2,
  Monitor
} from 'lucide-react';

/* ==========================================================================
   1. ACCESSIBILITY ICON COMPONENTS (32 TOOLS)
   Har icon component Lucide React ke basic icons ko custom styling ke sath wrap karta hai.
   ========================================================================== */

// 1. Accessibility Support - Comprehensive suite of features ensuring PDF documents are accessible to everyone
function AccessibilitySupportIcon({ className = "w-8 h-8" }) { return <Eye className={className} />; }

// 2. Screen Reader Support - Full compatibility with NVDA, JAWS, and VoiceOver screen reader software
function ScreenReaderSupportIcon({ className = "w-8 h-8" }) { return <Volume2 className={className} />; }

// 3. Read Aloud - High-quality text-to-speech engine to listen to document content hands-free
function ReadAloudIcon({ className = "w-8 h-8" }) { return <VolumeX className={className} />; }

// 4. Text Reflow - Automatically reflows document text for seamless reading on any screen size
function TextReflowIcon({ className = "w-8 h-8" }) { return <AlignLeft className={className} />; }

// 5. High Contrast Mode - Dark mode, inverted colors, and custom high-contrast color schemes for visual ease
function HighContrastModeIcon({ className = "w-8 h-8" }) { return <Sun className={className} />; }

// 6. Keyboard Navigation - Complete keyboard access with visible focus indicators for all interactive elements
function KeyboardNavigationIcon({ className = "w-8 h-8" }) { return <Keyboard className={className} />; }

// 7. Accessibility Checker - Automated scan to detect accessibility barriers, missing tags, and color issues
function AccessibilityCheckerIcon({ className = "w-8 h-8" }) { return <CheckSquare className={className} />; }

// 8. Tagged PDF Support - View, edit, and create semantic PDF tags for logical document hierarchy
function TaggedPdfSupportIcon({ className = "w-8 h-8" }) { return <Tag className={className} />; }

// 9. Alternative Text (Alt Text) - Add and edit meaningful alt text descriptions for images, charts, and diagrams
function AlternativeTextIcon({ className = "w-8 h-8" }) { return <Image className={className} />; }

// 10. Accessible Forms - Interactive form fields with clear labels, tooltips, and tab-order navigation
function AccessibleFormsIcon({ className = "w-8 h-8" }) { return <ClipboardCheck className={className} />; }

// 11. Color Contrast Validation - Verify foreground and background text contrast ratios against WCAG standards
function ColorContrastValidationIcon({ className = "w-8 h-8" }) { return <Palette className={className} />; }

// 12. PDF/UA Compliance - Validate and conform documents to ISO 14289-1 (PDF/UA) universal accessibility
function PdfUaComplianceIcon({ className = "w-8 h-8" }) { return <ShieldCheck className={className} />; }

// 13. Dyslexia Reading Mode - Specialized fonts, tinted backgrounds, and spacing optimized for dyslexia
function DyslexiaReadingModeIcon({ className = "w-8 h-8" }) { return <BookOpen className={className} />; }

// 14. Custom Font Size Controls - Scalable font sizing and instant text magnification without losing document layout
function CustomFontSizeControlsIcon({ className = "w-8 h-8" }) { return <Type className={className} />; }

// 15. Adjustable Line Spacing - Customize line height and vertical paragraph spacing for optimal readability
function AdjustableLineSpacingIcon({ className = "w-8 h-8" }) { return <Sliders className={className} />; }

// 16. Adjustable Letter Spacing - Fine-tune tracking and kerning between characters to reduce visual crowding
function AdjustableLetterSpacingIcon({ className = "w-8 h-8" }) { return <Scan className={className} />; }

// 17. Reading Ruler - On-screen focus bar and line guide to help maintain focus while reading long texts
function ReadingRulerIcon({ className = "w-8 h-8" }) { return <Maximize2 className={className} />; }

// 18. Focus Mode - Distraction-free reading view that isolates current paragraphs and hides UI panels
function FocusModeIcon({ className = "w-8 h-8" }) { return <Target className={className} />; }

// 19. Keyboard Shortcut Customization - Remap hotkeys and keyboard shortcuts to match user accessibility preferences
function KeyboardShortcutCustomizationIcon({ className = "w-8 h-8" }) { return <Command className={className} />; }

// 20. Voice Navigation - Control document reading, scrolling, and page turning using voice commands
function VoiceNavigationIcon({ className = "w-8 h-8" }) { return <Mic className={className} />; }


/* ==========================================================================
   2. HEADER COMPONENT WITH FLOATING BRANDING & DECORATIVE ANIMATIONS
   Header component handles top page branding, main title, subtitle, floating SVG file badges,
   aur background dashed curve lines.
   ========================================================================== */

/**
 * Header Component
 * Renders top hero section with dynamic floating accessibility badges and gradient title.
 */


/* ==========================================================================
   3. ACCESSIBILITY TOOL CARD COMPONENT
   Component displaying each Accessibility feature card in the grid.
   Includes slide-in entrance animations, hover expansion, icon badge, and action link.
   ========================================================================== */

/**
 * Accessibility Component
 * Renders individual accessibility tool card inside grid.
 *
 * @param {Object} props - Component properties
 * @param {Object} props.tool - Tool data object containing name, description, icon, bgColor, and iconColor
 * @param {number} [props.index=0] - Index position used for staggered animation timing and entrance direction
 * @param {Function} [props.onClick] - Click handler function
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
            <SlideInText text="Accessibility & Assistive Tools" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Make your PDF documents accessible with screen reader optimization, alt text, and tags.
          </p>
        </div>
      </div>
    </header>
  );
}

export function Accessibility({ tool, index = 0, onClick }) {
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
   4. ACCESSIBILITY TOOLS DATA
   ========================================================================== */

/**
 * Curated palette of background pastel colors and matching icon text colors.
 * Cards me cycle hone wale custom color themes:
 * - bg: Badge background SVG color
 * - icon: Lucide icon color class
 */
const colors = [
  { bg: 'bg-[#FFECEC]', icon: 'text-[#EF4444]' }, // Red theme
  { bg: 'bg-[#E3F2FD]', icon: 'text-[#3B82F6]' }, // Blue theme
  { bg: 'bg-[#F3E5F5]', icon: 'text-[#A855F7]' }, // Purple theme
  { bg: 'bg-[#FEF2F2]', icon: 'text-[#DC2626]' }, // Rose theme
  { bg: 'bg-[#FFF3E0]', icon: 'text-[#F97316]' }, // Orange theme
  { bg: 'bg-[#ECFDF5]', icon: 'text-[#10B981]' }, // Green theme
  { bg: 'bg-[#E0F2FE]', icon: 'text-[#0284C7]' }, // Sky theme
  { bg: 'bg-[#FEF3C7]', icon: 'text-[#D97706]' }, // Amber theme
  { bg: 'bg-[#F5F3FF]', icon: 'text-[#7C3AED]' }, // Violet theme
  { bg: 'bg-[#FCE4EC]', icon: 'text-[#EC4899]' }  // Pink theme
];

/**
 * ACCESSIBILITY_TOOLS Array
 * List of 32 accessibility tool configurations displayed in the main application grid.
 */
export const ACCESSIBILITY_TOOLS = [
  {
    id: 'accessibility-support',
    name: 'Accessibility Support',
    description: 'Comprehensive suite of features ensuring PDF documents are accessible to everyone.',
    icon: AccessibilitySupportIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'screen-reader-support',
    name: 'Screen Reader Support',
    description: 'Full compatibility with NVDA, JAWS, and VoiceOver screen reader software.',
    icon: ScreenReaderSupportIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'read-aloud',
    name: 'Read Aloud',
    description: 'High-quality text-to-speech engine to listen to document content hands-free.',
    icon: ReadAloudIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'text-reflow',
    name: 'Text Reflow',
    description: 'Automatically reflows document text for seamless reading on any screen size.',
    icon: TextReflowIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'high-contrast-mode',
    name: 'High Contrast Mode',
    description: 'Dark mode, inverted colors, and custom high-contrast color schemes for visual ease.',
    icon: HighContrastModeIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'keyboard-navigation',
    name: 'Keyboard Navigation',
    description: 'Complete keyboard access with visible focus indicators for all interactive elements.',
    icon: KeyboardNavigationIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'accessibility-checker',
    name: 'Accessibility Checker',
    description: 'Automated scan to detect accessibility barriers, missing tags, and color issues.',
    icon: AccessibilityCheckerIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'tagged-pdf-support',
    name: 'Tagged PDF Support',
    description: 'View, edit, and create semantic PDF tags for logical document hierarchy.',
    icon: TaggedPdfSupportIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'alternative-text',
    name: 'Alternative Text (Alt Text)',
    description: 'Add and edit meaningful alt text descriptions for images, charts, and diagrams.',
    icon: AlternativeTextIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'accessible-forms',
    name: 'Accessible Forms',
    description: 'Interactive form fields with clear labels, tooltips, and tab-order navigation.',
    icon: AccessibleFormsIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'color-contrast-validation',
    name: 'Color Contrast Validation',
    description: 'Verify foreground and background text contrast ratios against WCAG standards.',
    icon: ColorContrastValidationIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'pdf-ua-compliance',
    name: 'PDF/UA Compliance',
    description: 'Validate and conform documents to ISO 14289-1 (PDF/UA) universal accessibility.',
    icon: PdfUaComplianceIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'dyslexia-reading-mode',
    name: 'Dyslexia Reading Mode',
    description: 'Specialized fonts, tinted backgrounds, and spacing optimized for dyslexia.',
    icon: DyslexiaReadingModeIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'custom-font-size-controls',
    name: 'Custom Font Size Controls',
    description: 'Scalable font sizing and instant text magnification without losing document layout.',
    icon: CustomFontSizeControlsIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'adjustable-line-spacing',
    name: 'Adjustable Line Spacing',
    description: 'Customize line height and vertical paragraph spacing for optimal readability.',
    icon: AdjustableLineSpacingIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'adjustable-letter-spacing',
    name: 'Adjustable Letter Spacing',
    description: 'Fine-tune tracking and kerning between characters to reduce visual crowding.',
    icon: AdjustableLetterSpacingIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'reading-ruler',
    name: 'Reading Ruler',
    description: 'On-screen focus bar and line guide to help maintain focus while reading long texts.',
    icon: ReadingRulerIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'focus-mode',
    name: 'Focus Mode',
    description: 'Distraction-free reading view that isolates current paragraphs and hides UI panels.',
    icon: FocusModeIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'keyboard-shortcut-customization',
    name: 'Keyboard Shortcut Customization',
    description: 'Remap hotkeys and keyboard shortcuts to match user accessibility preferences.',
    icon: KeyboardShortcutCustomizationIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'voice-navigation',
    name: 'Voice Navigation',
    description: 'Control document reading, scrolling, and page turning using voice commands.',
    icon: VoiceNavigationIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  }
];

export function AccessibilityPage({ onBack, searchQuery = "" }) {
    const [selectedTool, setSelectedTool] = React.useState(() => {
    const hashParts = window.location.hash.replace('#', '').split('/');
    if (hashParts.length > 1) {
      const toolId = hashParts[1];
      return ACCESSIBILITY_TOOLS.find(t => t.id === toolId) || null;
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
    const handleBack = () => {
      setSelectedTool(null);
      const parentHash = window.location.hash.split('/')[0];
      window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash);
      window.scrollTo(0, 0);
    };

    switch (selectedTool.id) {
      case 'accessibility-support': return <AccessibilitySupportPage tool={selectedTool} onBack={handleBack} />;
      case 'screen-reader-support': return <ScreenReaderSupportPage tool={selectedTool} onBack={handleBack} />;
      case 'read-aloud': return <ReadAloudPage tool={selectedTool} onBack={handleBack} />;
      case 'text-reflow': return <TextReflowPage tool={selectedTool} onBack={handleBack} />;
      case 'high-contrast-mode': return <HighContrastModePage tool={selectedTool} onBack={handleBack} />;
      case 'keyboard-navigation': return <KeyboardNavigationPage tool={selectedTool} onBack={handleBack} />;
      case 'accessibility-checker': return <AccessibilityCheckerPage tool={selectedTool} onBack={handleBack} />;
      case 'tagged-pdf-support': return <TaggedPDFSupportPage tool={selectedTool} onBack={handleBack} />;
      case 'alternative-text': return <AlternativeTextAltTextPage tool={selectedTool} onBack={handleBack} />;
      case 'accessible-forms': return <AccessibleFormsPage tool={selectedTool} onBack={handleBack} />;
      case 'color-contrast-validation': return <ColorContrastValidationPage tool={selectedTool} onBack={handleBack} />;
      case 'pdf-ua-compliance': return <PDFUACompliancePage tool={selectedTool} onBack={handleBack} />;
      case 'dyslexia-reading-mode': return <DyslexiaReadingModePage tool={selectedTool} onBack={handleBack} />;
      case 'custom-font-size-controls': return <CustomFontSizeControlsPage tool={selectedTool} onBack={handleBack} />;
      case 'adjustable-line-spacing': return <AdjustableLineSpacingPage tool={selectedTool} onBack={handleBack} />;
      case 'adjustable-letter-spacing': return <AdjustableLetterSpacingPage tool={selectedTool} onBack={handleBack} />;
      case 'reading-ruler': return <ReadingRulerPage tool={selectedTool} onBack={handleBack} />;
      case 'focus-mode': return <FocusModePage tool={selectedTool} onBack={handleBack} />;
      case 'keyboard-shortcut-customization': return <KeyboardShortcutCustomizationPage tool={selectedTool} onBack={handleBack} />;
      case 'voice-navigation': return <VoiceNavigationPage tool={selectedTool} onBack={handleBack} />;
      default: return <ToolWorkspace tool={selectedTool} onBack={handleBack} />;
    }
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
            {ACCESSIBILITY_TOOLS.filter(tool => {
              const q = (searchQuery || "").trim().toLowerCase();
              if (!q) return true;
              const name = (tool.name || tool.title || "").toLowerCase(); return name.includes(q);
            }).map((tool, idx) => (
              <Accessibility
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

