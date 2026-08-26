/**
 * @file crodlegalpdf.jsx
 * @description Global shared UI components for CR OD Legal PDF.
 *
 * Exports:
 *  - `ToolCard` (default)  — Home dashboard card for each PDF category
 *  - Icon wrapper functions — Thin Lucide-React wrappers used in data/crodlegalpdf.js
 *  - `Header`              — Top application bar with logos, title, and search
 *  - `Footer`              — Full-width dark footer with links, stats, and social icons
 *
 * Design conventions:
 *  - Cards use alternating slide-in animations (left/right) per row pair.
 *  - SVG `animate-draw-line` class traces the card border on hover.
 *  - All components are fully responsive (mobile-first Tailwind breakpoints).
 */
import React, { useState, useEffect } from 'react';
const watermarkImg = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1787579185/WaterMark_mm8uly.png';
const phoneWatermarkImg = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1787579186/PhoneWaterMark_o0hbr0.png';
import {
  FolderTree,
  FileUp,
  FileDown,
  ShieldCheck,
  FileSignature,
  Sparkles,
  GitCompare,
  Users,
  Eye,
  FolderKanban,
  Image,
  BookOpen,
  MessageSquare,
  Fingerprint,
  Copyright,
  FolderLock,
  Wrench,
  Info,
  Play,
  MonitorPlay,
  ChevronRight,
  Lock,
  Zap,
  Globe,
  Heart,
  UserPlus,
  Calendar,
  Clock,
  HelpCircle
} from 'lucide-react';

// Logos driven directly via Cloudinary CDN URLs
const cyberCrimeLogo = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1785473583/Logo_mswjel.png';
const crodLegalPdfLogoHeader = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1785473491/LegalPDFLogo_uzgtsd.png';
const crodLegalPdfLogoFooter = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1785473491/LegalPDFLogo_uzgtsd.png';
const crodLegalPdfWatermarkLogo = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1785473491/LegalPDFLogo_uzgtsd.png';

/**
 * BackgroundWatermark
 * Renders a prominent logo watermark in the page background behind the cards grid.
 *
 * @component
 * @returns {JSX.Element}
 */
export function BackgroundWatermark() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" 
      aria-hidden="true"
    >
      <img
        src={watermarkImg}
        alt=""
        className="hidden sm:block w-full h-full object-cover opacity-[0.10] pointer-events-none select-none filter contrast-125"
      />
      <img
        src={phoneWatermarkImg}
        alt=""
        className="block sm:hidden w-full h-full object-cover opacity-[0.10] pointer-events-none select-none filter contrast-125"
      />
    </div>
  );
}



/**
 * ToolCard
 * The primary interactive card displayed in the home dashboard grid.
 * Each card represents one PDF tool category and navigates to its sub-page on click.
 *
 * Animation:
 *  - Even rows (0-indexed pairs) slide in from the left; odd rows from the right.
 *  - Stagger delay is 120 ms per row pair so cards cascade as the page loads.
 *  - An SVG border traces around the card on hover via CSS `animate-draw-line`.
 *
 * Accessibility:
 *  - role="button" + tabIndex={0} makes the div keyboard-focusable.
 *  - onKeyDown handles Enter and Space to trigger the click.
 *
 * @component
 * @param {Object}   props           - Component props
 * @param {Object}   props.tool      - Tool data object from PDF_TOOLS array
 * @param {string}   props.tool.name     - Primary display name (falls back to `title`)
 * @param {string}   props.tool.description - Short tool description text
 * @param {Function|JSX.Element} props.tool.icon - Lucide icon component or JSX element
 * @param {string}   props.tool.bgColor   - Tailwind bg class for icon badge (e.g. 'bg-[#FFECEC]')
 * @param {string}   props.tool.iconColor - Tailwind text class for the icon (e.g. 'text-[#EF4444]')
 * @param {number}   [props.index=0]  - Card's position index in the grid (determines animation direction)
 * @param {Function} [props.onClick]  - Callback invoked with the tool object when the card is clicked
 * @returns {JSX.Element} A clickable card with icon, name, and description
 */
export default function ToolCard({ tool, index = 0, onClick }) {
  const IconComponent = tool.icon;
  const isElement = React.isValidElement(tool.icon); // True if icon is already a JSX element
  const toolName = tool.name || tool.title;           // Support both `name` and legacy `title` keys
  const toolBg = tool.bgColor || tool.bg || 'bg-slate-100';
  const toolIconColor = tool.iconColor || tool.color || 'text-slate-600';

  // Compute which row pair this card belongs to (2 cards per row on mobile)
  const rowIndex = Math.floor(index / 2);
  // Stagger delay: each row pair is delayed 120ms later than the one above it
  const delayMs = rowIndex * 120;
  // Alternate slide direction: even rows from left, odd rows from right
  const slideAnimation = rowIndex % 2 === 0 ? 'animate-card-slide-left' : 'animate-card-slide-right';

  return (
    <div
      onClick={() => onClick && onClick(tool)}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`${slideAnimation} bg-white rounded-[16px] sm:rounded-[22px] p-3 sm:p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-250 ease-out cursor-pointer flex items-center gap-2.5 sm:gap-5 group select-none relative overflow-hidden h-[98px] sm:h-[112px]`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onClick) onClick(tool);
        }
      }}
    >
      {/* Animated Black Border Line Drawing on Hover */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 overflow-visible">
        <rect
          x="1.5"
          y="1.5"
          width="calc(100% - 3px)"
          height="calc(100% - 3px)"
          rx="16"
          fill="none"
          stroke="#0F172A"
          strokeWidth="2"
          pathLength="100"
          className="animate-draw-line"
        />
      </svg>

      {/* Left Icon Container */}
      <div className={`w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl ${toolBg} ${toolIconColor} flex items-center justify-center transition-transform group-hover:scale-105 duration-200 shadow-sm relative z-0`}>
        {isElement ? (
          tool.icon
        ) : typeof IconComponent === 'function' ? (
          <IconComponent className="w-5 h-5 sm:w-8 sm:h-8" />
        ) : null}
      </div>

      {/* Right Text Stack */}
      <div className="flex flex-col text-left min-w-0 relative z-0">
        <h3 className="text-[11px] sm:text-base font-bold text-slate-900 line-clamp-3 sm:line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
          {toolName}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 font-normal leading-tight line-clamp-2 mt-0.5 sm:mt-1">
          {tool.description}
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
   ICON WRAPPER COMPONENTS
   Each function is a named export that wraps a single Lucide React icon.
   They are imported by `src/data/crodlegalpdf.js` and assigned to tool
   objects as the `icon` prop, allowing ToolCard to render them dynamically.

   Naming convention: <Category>Icon — matches the tool category name.
   All accept an optional `className` prop (default: "w-8 h-8") for sizing.
   ========================================================================== */

export function OrganizePdfIcon({ className = "w-8 h-8" }) { return <FolderTree className={className} />; }     // Organize PDF category
export function ConvertToPdfIcon({ className = "w-8 h-8" }) { return <FileUp className={className} />; }         // Convert to PDF category
export function ConvertFromPdfIcon({ className = "w-8 h-8" }) { return <FileDown className={className} />; }     // Convert from PDF category
export function PdfSecurityIcon({ className = "w-8 h-8" }) { return <ShieldCheck className={className} />; }     // PDF Security category
export function PdfSignatureIcon({ className = "w-8 h-8" }) { return <FileSignature className={className} />; } // PDF Signature category
export function PdfAiToolsIcon({ className = "w-8 h-8" }) { return <Sparkles className={className} />; }         // AI & Smart Features category
export function CompareRedactionIcon({ className = "w-8 h-8" }) { return <GitCompare className={className} />; }// Compare & Redaction category
export function TeamBusinessIcon({ className = "w-8 h-8" }) { return <Users className={className} />; }          // Team & Business category
export function AccessibilityIcon({ className = "w-8 h-8" }) { return <Eye className={className} />; }           // Accessibility category
export function DocumentManagementIcon({ className = "w-8 h-8" }) { return <FolderKanban className={className} />; } // Document Management
export function ImageProcessingIcon({ className = "w-8 h-8" }) { return <Image className={className} />; }       // Image Processing category
export function PdfReaderIcon({ className = "w-8 h-8" }) { return <BookOpen className={className} />; }          // PDF Reader category
export function ReviewAnnotationIcon({ className = "w-8 h-8" }) { return <MessageSquare className={className} />; } // Review & Annotation
export function FingerprintAuthIcon({ className = "w-8 h-8" }) { return <Fingerprint className={className} />; } // Fingerprint Auth category
export function PdfCopyrightIcon({ className = "w-8 h-8" }) { return <Copyright className={className} />; }      // PDF Copyright Protection
export function FolderSecurityIcon({ className = "w-8 h-8" }) { return <FolderLock className={className} />; }   // Folder Security category
export function PdfToolsIcon({ className = "w-8 h-8" }) { return <Wrench className={className} />; }             // PDF Tools (utility) category
export function SoftwareAboutUsIcon({ className = "w-8 h-8" }) { return <Info className={className} />; }        // About Us page
export function Demo1Icon({ className = "w-8 h-8" }) { return <Play className={className} />; }                  // AI Agent / Demo 1
export function Demo2Icon({ className = "w-8 h-8" }) { return <MonitorPlay className={className} />; }           // Contact Us / Demo 2

/**
 * Header
 * Sticky top application bar rendered on every page view.
 *
 * Layout (3-column flex row):
 *  LEFT  — CROD Legal PDF logo (scales responsively h-14 → h-32)
 *  CENTER — Page title, tagline divider, and the live search bar + Follow button
 *  RIGHT  — CR Cyber Crime Foundation logo
 *
 * The search bar is a controlled input; its value and change handler are
 * passed in from App.jsx so that search state lives at the top level.
 *
 * @component
 * @param {Object}   props                  - Component props
 * @param {string}   [props.searchQuery=""] - Current search input value (controlled)
 * @param {Function} [props.onSearchChange] - Callback fired on every keystroke with the new value
 * @returns {JSX.Element} A full-width <header> element
 */
export function Header({ searchQuery = "", onSearchChange = () => { } }) {
  return (
    <header className="w-full py-4 md:py-6 bg-[#e2ead8] shadow-sm border-b border-[#d2dcc8] mb-6 lg:mb-8 relative z-50">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10">
        {/* Header Row: Left Logo | Center Title & Subtitle | Right Logo */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6 w-full">
          {/* LEFT LOGO: CROD Legal PDF */}
          <div className="shrink-0 flex items-center justify-start">
            <img
              src={crodLegalPdfLogoHeader}
              alt="CROD Legal PDF"
              className="h-14 sm:h-20 md:h-26 lg:h-32 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-200"
            />
          </div>

          {/* CENTER: Page Title & Subtitle & Search */}
          <div className="flex-1 text-center flex flex-col items-center justify-center px-1 sm:px-2 min-w-0">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#1e2a52] tracking-tight leading-tight break-words pb-1">
              CR OD LEGAL PDF
            </h1>

            <div className="flex items-center justify-center w-full max-w-lg mt-1 sm:mt-2 mb-3 sm:mb-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#b0b8d6] to-transparent opacity-70"></div>
              <p className="px-1.5 sm:px-4 text-[10px] sm:text-sm md:text-[15px] font-medium text-[#4b5563] text-center leading-tight sm:whitespace-nowrap">
                One Secure Platform for <br className="block sm:hidden" /> Smarter, Faster PDF Management
              </p>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#b0b8d6] to-transparent opacity-70"></div>
            </div>

            {/* Search Bar & Follow Button */}
            <div className="flex items-center justify-center gap-2 sm:gap-3.5 w-full max-w-xl mx-auto">
              <div className="relative flex-1 group">
                <svg className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#1e2a52] transition-colors pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-white border-2 border-[#1e2a52]/40 hover:border-[#1e2a52] rounded-full py-1.5 sm:py-2.5 pl-9 sm:pl-11 pr-3 sm:pr-4 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-[#1e2a52]/20 focus:border-[#1e2a52] transition-all shadow-[0_4px_16px_rgba(30,42,82,0.12)] text-[#1e2a52] placeholder-[#1e2a52]/60"
                />
              </div>
              <button aria-label="Follow CR OD Legal PDF updates" className="flex items-center justify-center gap-1.5 bg-[#1e2a52] hover:bg-[#16203e] text-white p-2.5 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap group cursor-pointer shrink-0">
                <UserPlus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Follow</span>
              </button>
            </div>
          </div>

          {/* RIGHT LOGO: CR Cyber Crime Foundation Logo */}
          <div className="shrink-0 flex items-center justify-end">
            <img
              src={cyberCrimeLogo}
              alt="CR Cyber Crime Foundation"
              className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-32 lg:h-32 object-contain drop-shadow-md hover:scale-105 transition-transform duration-200"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Footer
 * Full-width dark footer displayed at the bottom of every page.
 *
 * Structure:
 *  TOP    — 12-column grid: Brand column (logo + tagline + stars + social icons)
 *           + 3 link columns (PDF Tools, Company, Support)
 *           + Feature highlight column (Secure / No Data / Fast / Anywhere)
 *  MIDDLE — 4-stat bar: 2M+ Users | 150+ Countries | 99.9% Uptime | 4.9/5 Rating
 *  BOTTOM — Policy links on the left, "Made with ❤" on the right
 *
 * @component
 * @param {Object}   props               - Component props
 * @param {Function} [props.onSelectLink] - Optional callback when a footer link is clicked (receives link label string)
 * @returns {JSX.Element} A full-width dark <footer> element
 */
export function Footer({ onSelectLink }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="w-full bg-[#e2ead8] text-[#1e2a52] font-sans border-t border-[#d2dcc8] pt-8 lg:pt-16 pb-6 mt-8 lg:mt-12 relative z-50">
      <div className="w-full max-w-[1500px] mx-auto px-4 lg:px-8">

        {/* TOP SECTION: 5 Columns */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 pb-6 lg:pb-12 border-b border-[#c8d4bd]">

          {/* Column 1: Brand & Socials (takes 4 cols space on lg screens) */}
          <div className="flex flex-col space-y-4 lg:space-y-6 lg:col-span-4">
            <div className="flex items-center gap-3 lg:gap-3.5">
              <img
                src={crodLegalPdfLogoFooter}
                alt="CROD Legal PDF"
                className="h-10 sm:h-12 lg:h-14 w-auto object-contain drop-shadow-sm shrink-0"
              />
              <span className="text-[#1e2a52] font-black text-lg sm:text-xl lg:text-2xl tracking-tight leading-tight">
                CR OD LEGAL PDF
              </span>
            </div>

            <div className="text-xs sm:text-sm text-[#4b5563] space-y-1 font-medium leading-relaxed">
              <p>Your all-in-one trusted platform for secure PDF conversion, editing, compression, merging, organization, and document management, delivering fast, reliable, and professional tools to simplify every workflow.</p>
            </div>

          </div>

          {/* LINKS WRAPPER (PDF TOOLS in 2 columns) */}
          <div className="grid grid-cols-1 lg:col-span-4 lg:pl-6 lg:border-l lg:border-[#c8d4bd]">
            {/* Column 2: PDF TOOLS */}
            <div className="flex flex-col space-y-3 lg:space-y-4">
              <h3 className="text-[#1e2a52] text-[11px] lg:text-[13px] font-black uppercase tracking-wider mb-1 lg:mb-2">PDF TOOLS</h3>
              <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 lg:gap-y-3">
                {['Merge PDF', 'Split PDF', 'Compress PDF', 'Edit PDF', 'Convert PDF', 'All PDF Tools'].map((link) => (
                  <button key={link} onClick={() => onSelectLink && onSelectLink(link)} className="flex items-center justify-between text-[11px] lg:text-[13px] text-[#4b5563] font-medium hover:text-[#1e2a52] group transition-colors text-left w-full max-w-[160px] py-0.5 lg:py-0">
                    <span>{link}</span>
                    <ChevronRight className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#6b7280] group-hover:text-[#1e2a52] shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Feature Highlights (2 columns) */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-6 lg:col-span-4 lg:pl-6 lg:border-l lg:border-[#c8d4bd] pt-3 border-t border-[#c8d4bd] lg:pt-0 lg:border-t-0">
            <div className="flex items-center gap-2 lg:items-start lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-[10px] bg-emerald-100/80 flex items-center justify-center shrink-0 border border-emerald-200/60">
                <ShieldCheck className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] lg:text-sm font-bold text-[#1e2a52] leading-tight">100% Secure</span>
                <span className="text-[9px] lg:text-[12px] text-[#6b7280] font-medium mt-0 lg:mt-1 hidden sm:block">Your data is protected</span>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:items-start lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-[10px] bg-purple-100/80 flex items-center justify-center shrink-0 border border-purple-200/60">
                <Lock className="w-4 h-4 lg:w-5 lg:h-5 text-purple-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] lg:text-sm font-bold text-[#1e2a52] leading-tight">No Data Stored</span>
                <span className="text-[9px] lg:text-[12px] text-[#6b7280] font-medium mt-0 lg:mt-1 hidden sm:block">Your files stay private</span>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:items-start lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-[10px] bg-blue-100/80 flex items-center justify-center shrink-0 border border-blue-200/60">
                <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-blue-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] lg:text-sm font-bold text-[#1e2a52] leading-tight">Fast & Reliable</span>
                <span className="text-[9px] lg:text-[12px] text-[#6b7280] font-medium mt-0 lg:mt-1 hidden sm:block">Quick processing</span>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:items-start lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-[10px] bg-teal-100/80 flex items-center justify-center shrink-0 border border-teal-200/60">
                <Globe className="w-4 h-4 lg:w-5 lg:h-5 text-teal-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] lg:text-sm font-bold text-[#1e2a52] leading-tight">Works Anywhere</span>
                <span className="text-[9px] lg:text-[12px] text-[#6b7280] font-medium mt-0 lg:mt-1 hidden sm:block">On any device, anytime</span>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: 3-column layout (Left: Date/Time | Center: Heart & Copyright | Right: Feedback & Help) */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center pt-5 lg:pt-8 pb-2 lg:pb-4 text-[10px] lg:text-[13px] text-[#4b5563] gap-4 font-medium border-t border-[#c8d4bd]/40 mt-4">

          {/* Left Side: Real-time Date and Time display */}
          <div className="flex items-center justify-center md:justify-start">
            <div className="flex items-center gap-2 sm:gap-3 bg-[#d5e0cb] px-3.5 py-1.5 rounded-md border border-[#c2cfb6] text-[#1e2a52] shadow-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#1e2a52]" />
                <span className="font-semibold text-[11px] lg:text-[13px]">
                  {currentDateTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <span className="text-[#899778] font-bold">•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#1e2a52]" />
                <span className="font-mono font-bold tracking-wider text-[11px] lg:text-[13px]">
                  {currentDateTime.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Heart & Copyright */}
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center justify-center gap-1.5">
              Made with <Heart className="w-3 h-3 lg:w-3.5 lg:h-3.5 fill-red-500 text-red-500" /> for everyone
            </div>
            <div className="font-bold text-[#1e2a52]">© 2026 CRCCF PDF</div>
          </div>

          {/* Right Side: Feedback & Help */}
          <div className="flex items-center justify-center md:justify-end gap-2.5">
            <button
              onClick={() => onSelectLink && onSelectLink('Feedback')}
              className="flex items-center gap-1.5 bg-[#d5e0cb] hover:bg-[#c7d5bc] px-3 py-1.5 rounded-md border border-[#c2cfb6] text-[#1e2a52] text-[11px] lg:text-[12px] font-semibold transition-colors shadow-xs cursor-pointer"
              title="Feedback"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#1e2a52]" />
              <span>Feedback</span>
            </button>

            <button
              onClick={() => onSelectLink && onSelectLink('Help & Support')}
              className="flex items-center gap-1.5 bg-[#d5e0cb] hover:bg-[#c7d5bc] px-3 py-1.5 rounded-md border border-[#c2cfb6] text-[#1e2a52] text-[11px] lg:text-[12px] font-semibold transition-colors shadow-xs cursor-pointer"
              title="Help & Support"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#1e2a52]" />
              <span>Help</span>
            </button>
          </div>

        </div>

      </div>
    </footer>
  );
}

