/**
 * @file PDFtoConvert.jsx
 * @description Convert to PDF sub-page. Provides 38 converter tools: Word, Excel, PPT, images, HTML, Markdown, XML, JSON, CAD, e-books, and archive files converted to PDF.
 *
 * Exports:
 *  - PDFtoConvertPage, PDFtoConvertCard (card), Header, PDF_TOOLS
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
import PDFtoPDFAPage from './PDFtoPDFAPage';
import WordtoPDFPage from './WordtoPDFPage';
import ExceltoPDFPage from './ExceltoPDFPage';
import PowerPointtoPDFPage from './PowerPointtoPDFPage';
import JPGtoPDFPage from './JPGtoPDFPage';
import PNGtoPDFPage from './PNGtoPDFPage';
import ScreenshottoPDFPage from './ScreenshottoPDFPage';
import TexttoPDFPage from './TexttoPDFPage';
import HTMLtoPDFPage from './HTMLtoPDFPage';
import GIFtoPDFPage from './GIFtoPDFPage';
import BMPtoPDFPage from './BMPtoPDFPage';
import TIFFtoPDFPage from './TIFFtoPDFPage';
import WebPtoPDFPage from './WebPtoPDFPage';
import SVGtoPDFPage from './SVGtoPDFPage';
import HEICtoPDFPage from './HEICtoPDFPage';
import RAWImagetoPDFPage from './RAWImagetoPDFPage';
import RTFtoPDFPage from './RTFtoPDFPage';
import MarkdownMDtoPDFPage from './MarkdownMDtoPDFPage';
import XMLtoPDFPage from './XMLtoPDFPage';
import CSVtoPDFPage from './CSVtoPDFPage';
import JSONtoPDFPage from './JSONtoPDFPage';
import EPUBtoPDFPage from './EPUBtoPDFPage';
import MOBItoPDFPage from './MOBItoPDFPage';
import ODTtoPDFPage from './ODTtoPDFPage';
import ODStoPDFPage from './ODStoPDFPage';
import ODPtoPDFPage from './ODPtoPDFPage';
import VisiotoPDFPage from './VisiotoPDFPage';
import PublishertoPDFPage from './PublishertoPDFPage';
import XPStoPDFPage from './XPStoPDFPage';
import CADDWGDXFtoPDFPage from './CADDWGDXFtoPDFPage';
import PhotoshopPSDtoPDFPage from './PhotoshopPSDtoPDFPage';
import IllustratorAItoPDFPage from './IllustratorAItoPDFPage';
import EmailEMLtoPDFPage from './EmailEMLtoPDFPage';
import OutlookMSGtoPDFPage from './OutlookMSGtoPDFPage';
import WebPageURLtoPDFPage from './WebPageURLtoPDFPage';
import ZIPtoPDFPage from './ZIPtoPDFPage';
import FoldertoPDFPage from './FoldertoPDFPage';
import MultipleFilestoPDFPage from './MultipleFilestoPDFPage';

const COMPONENT_MAP = {
  "pdf-to-pdfa": PDFtoPDFAPage,
  "word-to-pdf": WordtoPDFPage,
  "excel-to-pdf": ExceltoPDFPage,
  "powerpoint-to-pdf": PowerPointtoPDFPage,
  "jpg-to-pdf": JPGtoPDFPage,
  "png-to-pdf": PNGtoPDFPage,
  "screenshot-to-pdf": ScreenshottoPDFPage,
  "text-to-pdf": TexttoPDFPage,
  "html-to-pdf": HTMLtoPDFPage,
  "gif-to-pdf": GIFtoPDFPage,
  "bmp-to-pdf": BMPtoPDFPage,
  "tiff-to-pdf": TIFFtoPDFPage,
  "webp-to-pdf": WebPtoPDFPage,
  "svg-to-pdf": SVGtoPDFPage,
  "heic-to-pdf": HEICtoPDFPage,
  "raw-image-to-pdf": RAWImagetoPDFPage,
  "rtf-to-pdf": RTFtoPDFPage,
  "markdown-to-pdf": MarkdownMDtoPDFPage,
  "xml-to-pdf": XMLtoPDFPage,
  "csv-to-pdf": CSVtoPDFPage,
  "json-to-pdf": JSONtoPDFPage,
  "epub-to-pdf": EPUBtoPDFPage,
  "mobi-to-pdf": MOBItoPDFPage,
  "odt-to-pdf": ODTtoPDFPage,
  "ods-to-pdf": ODStoPDFPage,
  "odp-to-pdf": ODPtoPDFPage,
  "visio-to-pdf": VisiotoPDFPage,
  "publisher-to-pdf": PublishertoPDFPage,
  "xps-to-pdf": XPStoPDFPage,
  "cad-to-pdf": CADDWGDXFtoPDFPage,
  "photoshop-to-pdf": PhotoshopPSDtoPDFPage,
  "illustrator-to-pdf": IllustratorAItoPDFPage,
  "email-to-pdf": EmailEMLtoPDFPage,
  "outlook-to-pdf": OutlookMSGtoPDFPage,
  "web-page-to-pdf": WebPageURLtoPDFPage,
  "zip-to-pdf": ZIPtoPDFPage,
  "folder-to-pdf": FoldertoPDFPage,
  "multiple-files-to-pdf": MultipleFilestoPDFPage,
};

import {
  ShieldCheck,
  FileText,
  Table,
  Presentation,
  Image,
  FileImage,
  Camera,
  Code,
  Film,
  Globe,
  Sparkles,
  Smartphone,
  Aperture,
  FileCode,
  Braces,
  BookOpen,
  Book,
  Network,
  LayoutGrid,
  Compass,
  Layers,
  Palette,
  Mail,
  FileArchive,
  FolderTree,
  Files,
  ArrowRight
} from 'lucide-react';

/* ==========================================================================
   1. CUSTOM CONVERT TO PDF TOOL ICONS (38 CONVERTERS)
   ========================================================================== */

function PdfToPdfAIcon({ className = "w-8 h-8" }) { return <ShieldCheck className={className} />; }
function WordToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
function ExcelToPdfIcon({ className = "w-8 h-8" }) { return <Table className={className} />; }
function PowerPointToPdfIcon({ className = "w-8 h-8" }) { return <Presentation className={className} />; }
function JpgToPdfIcon({ className = "w-8 h-8" }) { return <Image className={className} />; }
function PngToPdfIcon({ className = "w-8 h-8" }) { return <FileImage className={className} />; }
function ScreenshotToPdfIcon({ className = "w-8 h-8" }) { return <Camera className={className} />; }
function TextToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
function HtmlToPdfIcon({ className = "w-8 h-8" }) { return <Code className={className} />; }
function GifToPdfIcon({ className = "w-8 h-8" }) { return <Film className={className} />; }
function BmpToPdfIcon({ className = "w-8 h-8" }) { return <FileImage className={className} />; }
function TiffToPdfIcon({ className = "w-8 h-8" }) { return <Image className={className} />; }
function WebpToPdfIcon({ className = "w-8 h-8" }) { return <Globe className={className} />; }
function SvgToPdfIcon({ className = "w-8 h-8" }) { return <Sparkles className={className} />; }
function HeicToPdfIcon({ className = "w-8 h-8" }) { return <Smartphone className={className} />; }
function RawImageToPdfIcon({ className = "w-8 h-8" }) { return <Aperture className={className} />; }
function RtfToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
function MarkdownToPdfIcon({ className = "w-8 h-8" }) { return <FileCode className={className} />; }
function XmlToPdfIcon({ className = "w-8 h-8" }) { return <Code className={className} />; }
function CsvToPdfIcon({ className = "w-8 h-8" }) { return <Table className={className} />; }
function JsonToPdfIcon({ className = "w-8 h-8" }) { return <Braces className={className} />; }
function EpubToPdfIcon({ className = "w-8 h-8" }) { return <BookOpen className={className} />; }
function MobiToPdfIcon({ className = "w-8 h-8" }) { return <Book className={className} />; }
function OdtToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
function OdsToPdfIcon({ className = "w-8 h-8" }) { return <Table className={className} />; }
function OdpToPdfIcon({ className = "w-8 h-8" }) { return <Presentation className={className} />; }
function VisioToPdfIcon({ className = "w-8 h-8" }) { return <Network className={className} />; }
function PublisherToPdfIcon({ className = "w-8 h-8" }) { return <LayoutGrid className={className} />; }
function XpsToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
function CadToPdfIcon({ className = "w-8 h-8" }) { return <Compass className={className} />; }
function PhotoshopToPdfIcon({ className = "w-8 h-8" }) { return <Layers className={className} />; }
function IllustratorToPdfIcon({ className = "w-8 h-8" }) { return <Palette className={className} />; }
function EmailToPdfIcon({ className = "w-8 h-8" }) { return <Mail className={className} />; }
function OutlookToPdfIcon({ className = "w-8 h-8" }) { return <Mail className={className} />; }
function WebPageToPdfIcon({ className = "w-8 h-8" }) { return <Globe className={className} />; }
function ZipToPdfIcon({ className = "w-8 h-8" }) { return <FileArchive className={className} />; }
function FolderToPdfIcon({ className = "w-8 h-8" }) { return <FolderTree className={className} />; }
function MultipleFilesToPdfIcon({ className = "w-8 h-8" }) { return <Files className={className} />; }

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
            <SlideInText text="Convert to PDF" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Convert Word, Excel, PowerPoint, images, and other formats to PDF instantly.
          </p>
        </div>
      </div>
    </header>
  );
}

export function PDFtoConvert({ tool, index = 0, onClick }) {
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
   4. PDF_TOOLS DATA
   ========================================================================== */

export const PDF_TOOLS = [
  {
    id: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    description: 'Convert standard PDF documents into ISO-compliant PDF/A format for long-term archiving',
    icon: PdfToPdfAIcon,
    bgColor: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]'
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Convert DOC and DOCX documents to high-quality PDF files instantly',
    icon: WordToPdfIcon,
    bgColor: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]'
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Transform XLS and XLSX spreadsheets into clean, printable PDF tables',
    icon: ExcelToPdfIcon,
    bgColor: 'bg-[#DCFCE7]',
    iconColor: 'text-[#16A34A]'
  },
  {
    id: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    description: 'Convert PPT and PPTX presentations into PDF slide decks seamlessly',
    icon: PowerPointToPdfIcon,
    bgColor: 'bg-[#FFEDD5]',
    iconColor: 'text-[#EA580C]'
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert JPG image files into clean, professional PDF documents',
    icon: JpgToPdfIcon,
    bgColor: 'bg-[#FEF3C7]',
    iconColor: 'text-[#D97706]'
  },
  {
    id: 'png-to-pdf',
    name: 'PNG to PDF',
    description: 'Turn PNG images with transparency into high-resolution PDF pages',
    icon: PngToPdfIcon,
    bgColor: 'bg-[#F3E8FF]',
    iconColor: 'text-[#9333EA]'
  },
  {
    id: 'screenshot-to-pdf',
    name: 'Screenshot to PDF',
    description: 'Combine desktop and mobile screen captures directly into a PDF report',
    icon: ScreenshotToPdfIcon,
    bgColor: 'bg-[#E0E7FF]',
    iconColor: 'text-[#6366F1]'
  },
  {
    id: 'text-to-pdf',
    name: 'Text to PDF',
    description: 'Convert plain text (TXT) files into beautifully formatted PDF documents',
    icon: TextToPdfIcon,
    bgColor: 'bg-[#F1F5F9]',
    iconColor: 'text-[#475569]'
  },
  {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    description: 'Render raw HTML code or web page files directly into structured PDF files',
    icon: HtmlToPdfIcon,
    bgColor: 'bg-[#FFE4E6]',
    iconColor: 'text-[#E11D48]'
  },
  {
    id: 'gif-to-pdf',
    name: 'GIF to PDF',
    description: 'Convert GIF images into clean single or multi-page PDF files',
    icon: GifToPdfIcon,
    bgColor: 'bg-[#FCE7F3]',
    iconColor: 'text-[#DB2777]'
  },
  {
    id: 'bmp-to-pdf',
    name: 'BMP to PDF',
    description: 'Convert bitmap graphics (BMP) to high-clarity PDF format',
    icon: BmpToPdfIcon,
    bgColor: 'bg-[#E0F7FA]',
    iconColor: 'text-[#00838F]'
  },
  {
    id: 'tiff-to-pdf',
    name: 'TIFF to PDF',
    description: 'Convert multi-page TIFF and TIF image archives into PDF documents',
    icon: TiffToPdfIcon,
    bgColor: 'bg-[#EDE7F6]',
    iconColor: 'text-[#512DA8]'
  },
  {
    id: 'webp-to-pdf',
    name: 'WebP to PDF',
    description: 'Convert modern WebP images into universal PDF format easily',
    icon: WebpToPdfIcon,
    bgColor: 'bg-[#E8F5E9]',
    iconColor: 'text-[#2E7D32]'
  },
  {
    id: 'svg-to-pdf',
    name: 'SVG to PDF',
    description: 'Vector SVG graphics converted to scalable vector PDF files',
    icon: SvgToPdfIcon,
    bgColor: 'bg-[#FFF8E1]',
    iconColor: 'text-[#F57F17]'
  },
  {
    id: 'heic-to-pdf',
    name: 'HEIC to PDF',
    description: 'Convert Apple iPhone HEIC photo files directly into PDF documents',
    icon: HeicToPdfIcon,
    bgColor: 'bg-[#F3F4F6]',
    iconColor: 'text-[#374151]'
  },
  {
    id: 'raw-image-to-pdf',
    name: 'RAW Image to PDF',
    description: 'Convert camera RAW photos (CR2, NEF, ARW) into high-res PDF files',
    icon: RawImageToPdfIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#E65100]'
  },
  {
    id: 'rtf-to-pdf',
    name: 'RTF to PDF',
    description: 'Convert Rich Text Format (RTF) documents to PDF while retaining styling',
    icon: RtfToPdfIcon,
    bgColor: 'bg-[#F0F4F8]',
    iconColor: 'text-[#334E68]'
  },
  {
    id: 'markdown-to-pdf',
    name: 'Markdown (MD) to PDF',
    description: 'Convert Markdown files (.md) into styled and formatted PDF documents',
    icon: MarkdownToPdfIcon,
    bgColor: 'bg-[#ECEFF1]',
    iconColor: 'text-[#37474F]'
  },
  {
    id: 'xml-to-pdf',
    name: 'XML to PDF',
    description: 'Transform structured XML data files into human-readable PDF reports',
    icon: XmlToPdfIcon,
    bgColor: 'bg-[#FFF9C4]',
    iconColor: 'text-[#FBC02D]'
  },
  {
    id: 'csv-to-pdf',
    name: 'CSV to PDF',
    description: 'Convert Comma-Separated Values (CSV) data into formatted PDF tables',
    icon: CsvToPdfIcon,
    bgColor: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]'
  },
  {
    id: 'json-to-pdf',
    name: 'JSON to PDF',
    description: 'Convert JSON objects and API payloads into structured PDF files',
    icon: JsonToPdfIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#8E24AA]'
  },
  {
    id: 'epub-to-pdf',
    name: 'EPUB to PDF',
    description: 'Convert EPUB e-books into print-ready PDF book documents',
    icon: EpubToPdfIcon,
    bgColor: 'bg-[#E1F5FE]',
    iconColor: 'text-[#0288D1]'
  },
  {
    id: 'mobi-to-pdf',
    name: 'MOBI to PDF',
    description: 'Convert Kindle MOBI electronic books into standard PDF files',
    icon: MobiToPdfIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#EF6C00]'
  },
  {
    id: 'odt-to-pdf',
    name: 'ODT to PDF',
    description: 'Convert OpenOffice and LibreOffice Writer (ODT) text documents to PDF',
    icon: OdtToPdfIcon,
    bgColor: 'bg-[#E0F2F1]',
    iconColor: 'text-[#00695C]'
  },
  {
    id: 'ods-to-pdf',
    name: 'ODS to PDF',
    description: 'Convert OpenOffice Calc (ODS) spreadsheets into PDF sheets',
    icon: OdsToPdfIcon,
    bgColor: 'bg-[#F1F8E9]',
    iconColor: 'text-[#558B2F]'
  },
  {
    id: 'odp-to-pdf',
    name: 'ODP to PDF',
    description: 'Convert OpenOffice Impress (ODP) presentations into PDF slide decks',
    icon: OdpToPdfIcon,
    bgColor: 'bg-[#FBE9E7]',
    iconColor: 'text-[#D84315]'
  },
  {
    id: 'visio-to-pdf',
    name: 'Visio to PDF',
    description: 'Convert Microsoft Visio VSD and VSDX diagrams into vector PDF files',
    icon: VisioToPdfIcon,
    bgColor: 'bg-[#E8EAF6]',
    iconColor: 'text-[#283593]'
  },
  {
    id: 'publisher-to-pdf',
    name: 'Publisher to PDF',
    description: 'Convert Microsoft Publisher PUB files into ready-to-print PDFs',
    icon: PublisherToPdfIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#7B1FA2]'
  },
  {
    id: 'xps-to-pdf',
    name: 'XPS to PDF',
    description: 'Convert XML Paper Specification (XPS and OXPS) files into PDF',
    icon: XpsToPdfIcon,
    bgColor: 'bg-[#FCE4EC]',
    iconColor: 'text-[#C2185B]'
  },
  {
    id: 'cad-to-pdf',
    name: 'CAD (DWG/DXF) to PDF',
    description: 'Convert AutoCAD DWG and DXF technical drawings into vector PDF blueprints',
    icon: CadToPdfIcon,
    bgColor: 'bg-[#E0F7FA]',
    iconColor: 'text-[#0097A7]'
  },
  {
    id: 'photoshop-to-pdf',
    name: 'Photoshop (PSD) to PDF',
    description: 'Convert Adobe Photoshop PSD layers and designs into high-res PDF files',
    icon: PhotoshopToPdfIcon,
    bgColor: 'bg-[#E3F2FD]',
    iconColor: 'text-[#1565C0]'
  },
  {
    id: 'illustrator-to-pdf',
    name: 'Illustrator (AI) to PDF',
    description: 'Convert Adobe Illustrator AI vector artwork into crisp PDF documents',
    icon: IllustratorToPdfIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#FF6F00]'
  },
  {
    id: 'email-to-pdf',
    name: 'Email (EML) to PDF',
    description: 'Convert EML email messages and attachments into clean PDF documents',
    icon: EmailToPdfIcon,
    bgColor: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0369A1]'
  },
  {
    id: 'outlook-to-pdf',
    name: 'Outlook (MSG) to PDF',
    description: 'Convert Microsoft Outlook MSG emails into archived PDF files',
    icon: OutlookToPdfIcon,
    bgColor: 'bg-[#EEF2FF]',
    iconColor: 'text-[#3730A3]'
  },
  {
    id: 'web-page-to-pdf',
    name: 'Web Page (URL) to PDF',
    description: 'Convert any live website URL or webpage into a full PDF document',
    icon: WebPageToPdfIcon,
    bgColor: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]'
  },
  {
    id: 'zip-to-pdf',
    name: 'ZIP to PDF',
    description: 'Extract and combine all files inside a ZIP archive into a single PDF',
    icon: ZipToPdfIcon,
    bgColor: 'bg-[#FEF3C7]',
    iconColor: 'text-[#B45309]'
  },
  {
    id: 'folder-to-pdf',
    name: 'Folder to PDF',
    description: 'Batch convert an entire directory folder of documents into one PDF file',
    icon: FolderToPdfIcon,
    bgColor: 'bg-[#EFF6FF]',
    iconColor: 'text-[#1D4ED8]'
  },
  {
    id: 'multiple-files-to-pdf',
    name: 'Multiple Files to PDF',
    description: 'Combine different document formats (Word, Images, Excel) into a single PDF',
    icon: MultipleFilesToPdfIcon,
    bgColor: 'bg-[#FAF5FF]',
    iconColor: 'text-[#7E22CE]'
  }
];

export function PDFtoConvertPage({ onBack, searchQuery = "" }) {
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
              <PDFtoConvert
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
