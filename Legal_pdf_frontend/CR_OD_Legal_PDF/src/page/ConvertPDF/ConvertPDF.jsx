/**
 * @file ConvertPDF.jsx
 * @description Convert from PDF sub-page. Provides 38 converter tools: PDF to Word, Excel, PPT, JPG, PNG, SVG, HTML, CAD, e-book formats and more.
 *
 * Exports:
 *  - ConvertPDFPage, ConvertPDF (card), Header, PDF_TOOLS, plus named icon exports
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
import PDFtoWordPage from './PDFtoWordPage';
import PDFtoExcelPage from './PDFtoExcelPage';
import PDFtoPowerPointPage from './PDFtoPowerPointPage';
import PDFtoJPGPage from './PDFtoJPGPage';
import PDFtoPNGPage from './PDFtoPNGPage';
import PDFtoGIFPage from './PDFtoGIFPage';
import PDFtoBMPPage from './PDFtoBMPPage';
import PDFtoTIFFPage from './PDFtoTIFFPage';
import PDFtoWebPPage from './PDFtoWebPPage';
import PDFtoSVGPage from './PDFtoSVGPage';
import PDFtoTextTXTPage from './PDFtoTextTXTPage';
import PDFtoHTMLPage from './PDFtoHTMLPage';
import PDFtoXMLPage from './PDFtoXMLPage';
import PDFtoCSVPage from './PDFtoCSVPage';
import PDFtoJSONPage from './PDFtoJSONPage';
import PDFtoRTFPage from './PDFtoRTFPage';
import PDFtoMarkdownMDPage from './PDFtoMarkdownMDPage';
import PDFtoEPUBPage from './PDFtoEPUBPage';
import PDFtoXPSPage from './PDFtoXPSPage';
import PDFtoPDFAPage from './PDFtoPDFAPage';
import PDFtoSearchablePDFOCRPage from './PDFtoSearchablePDFOCRPage';
import PDFtoEditablePDFPage from './PDFtoEditablePDFPage';
import PDFtoZIPPage from './PDFtoZIPPage';
import PDFtoImageCollectionPage from './PDFtoImageCollectionPage';
import PDFtoIndividualPagesPage from './PDFtoIndividualPagesPage';
import PDFtoSingleLongImagePage from './PDFtoSingleLongImagePage';
import PDFtoHEICPage from './PDFtoHEICPage';
import PDFtoRAWImagePage from './PDFtoRAWImagePage';
import PDFtoODTOpenDocumentTextPage from './PDFtoODTOpenDocumentTextPage';
import PDFtoODSOpenDocumentSpreadsheetPage from './PDFtoODSOpenDocumentSpreadsheetPage';
import PDFtoODPOpenDocumentPresentationPage from './PDFtoODPOpenDocumentPresentationPage';
import PDFtoVisioVSDXPage from './PDFtoVisioVSDXPage';
import PDFtoPublisherPUBPage from './PDFtoPublisherPUBPage';
import PDFtoPhotoshopPSDPage from './PDFtoPhotoshopPSDPage';
import PDFtoIllustratorAIPage from './PDFtoIllustratorAIPage';
import PDFtoCADDWGDXFPage from './PDFtoCADDWGDXFPage';
import PDFtoEmailEMLPage from './PDFtoEmailEMLPage';
import PDFtoOutlookMSGPage from './PDFtoOutlookMSGPage';

const COMPONENT_MAP = {
  "pdf-to-word": PDFtoWordPage,
  "pdf-to-excel": PDFtoExcelPage,
  "pdf-to-powerpoint": PDFtoPowerPointPage,
  "pdf-to-jpg": PDFtoJPGPage,
  "pdf-to-png": PDFtoPNGPage,
  "pdf-to-gif": PDFtoGIFPage,
  "pdf-to-bmp": PDFtoBMPPage,
  "pdf-to-tiff": PDFtoTIFFPage,
  "pdf-to-webp": PDFtoWebPPage,
  "pdf-to-svg": PDFtoSVGPage,
  "pdf-to-text": PDFtoTextTXTPage,
  "pdf-to-html": PDFtoHTMLPage,
  "pdf-to-xml": PDFtoXMLPage,
  "pdf-to-csv": PDFtoCSVPage,
  "pdf-to-json": PDFtoJSONPage,
  "pdf-to-rtf": PDFtoRTFPage,
  "pdf-to-markdown": PDFtoMarkdownMDPage,
  "pdf-to-epub": PDFtoEPUBPage,
  "pdf-to-xps": PDFtoXPSPage,
  "pdf-to-pdfa": PDFtoPDFAPage,
  "pdf-to-ocr": PDFtoSearchablePDFOCRPage,
  "pdf-to-editable": PDFtoEditablePDFPage,
  "pdf-to-zip": PDFtoZIPPage,
  "pdf-to-image-collection": PDFtoImageCollectionPage,
  "pdf-to-individual-pages": PDFtoIndividualPagesPage,
  "pdf-to-long-image": PDFtoSingleLongImagePage,
  "pdf-to-heic": PDFtoHEICPage,
  "pdf-to-raw": PDFtoRAWImagePage,
  "pdf-to-odt": PDFtoODTOpenDocumentTextPage,
  "pdf-to-ods": PDFtoODSOpenDocumentSpreadsheetPage,
  "pdf-to-odp": PDFtoODPOpenDocumentPresentationPage,
  "pdf-to-visio": PDFtoVisioVSDXPage,
  "pdf-to-publisher": PDFtoPublisherPUBPage,
  "pdf-to-photoshop": PDFtoPhotoshopPSDPage,
  "pdf-to-illustrator": PDFtoIllustratorAIPage,
  "pdf-to-cad": PDFtoCADDWGDXFPage,
  "pdf-to-email": PDFtoEmailEMLPage,
  "pdf-to-outlook": PDFtoOutlookMSGPage,
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
   1. CUSTOM CONVERT PDF TOOL ICONS (38 CONVERTERS)
   ========================================================================== */

export function PdfToPdfAIcon({ className = "w-8 h-8" }) { return <ShieldCheck className={className} />; }
export function WordToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
export function ExcelToPdfIcon({ className = "w-8 h-8" }) { return <Table className={className} />; }
export function PowerPointToPdfIcon({ className = "w-8 h-8" }) { return <Presentation className={className} />; }
export function JpgToPdfIcon({ className = "w-8 h-8" }) { return <Image className={className} />; }
export function PngToPdfIcon({ className = "w-8 h-8" }) { return <FileImage className={className} />; }
export function ScreenshotToPdfIcon({ className = "w-8 h-8" }) { return <Camera className={className} />; }
export function TextToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
export function HtmlToPdfIcon({ className = "w-8 h-8" }) { return <Code className={className} />; }
export function GifToPdfIcon({ className = "w-8 h-8" }) { return <Film className={className} />; }
export function BmpToPdfIcon({ className = "w-8 h-8" }) { return <FileImage className={className} />; }
export function TiffToPdfIcon({ className = "w-8 h-8" }) { return <Image className={className} />; }
export function WebpToPdfIcon({ className = "w-8 h-8" }) { return <Globe className={className} />; }
export function SvgToPdfIcon({ className = "w-8 h-8" }) { return <Sparkles className={className} />; }
export function HeicToPdfIcon({ className = "w-8 h-8" }) { return <Smartphone className={className} />; }
export function RawImageToPdfIcon({ className = "w-8 h-8" }) { return <Aperture className={className} />; }
export function RtfToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
export function MarkdownToPdfIcon({ className = "w-8 h-8" }) { return <FileCode className={className} />; }
export function XmlToPdfIcon({ className = "w-8 h-8" }) { return <Code className={className} />; }
export function CsvToPdfIcon({ className = "w-8 h-8" }) { return <Table className={className} />; }
export function JsonToPdfIcon({ className = "w-8 h-8" }) { return <Braces className={className} />; }
export function EpubToPdfIcon({ className = "w-8 h-8" }) { return <BookOpen className={className} />; }
export function MobiToPdfIcon({ className = "w-8 h-8" }) { return <Book className={className} />; }
export function OdtToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
export function OdsToPdfIcon({ className = "w-8 h-8" }) { return <Table className={className} />; }
export function OdpToPdfIcon({ className = "w-8 h-8" }) { return <Presentation className={className} />; }
export function VisioToPdfIcon({ className = "w-8 h-8" }) { return <Network className={className} />; }
export function PublisherToPdfIcon({ className = "w-8 h-8" }) { return <LayoutGrid className={className} />; }
export function XpsToPdfIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
export function CadToPdfIcon({ className = "w-8 h-8" }) { return <Compass className={className} />; }
export function PhotoshopToPdfIcon({ className = "w-8 h-8" }) { return <Layers className={className} />; }
export function IllustratorToPdfIcon({ className = "w-8 h-8" }) { return <Palette className={className} />; }
export function EmailToPdfIcon({ className = "w-8 h-8" }) { return <Mail className={className} />; }
export function OutlookToPdfIcon({ className = "w-8 h-8" }) { return <Mail className={className} />; }
export function WebPageToPdfIcon({ className = "w-8 h-8" }) { return <Globe className={className} />; }
export function ZipToPdfIcon({ className = "w-8 h-8" }) { return <FileArchive className={className} />; }
export function FolderToPdfIcon({ className = "w-8 h-8" }) { return <FolderTree className={className} />; }
export function MultipleFilesToPdfIcon({ className = "w-8 h-8" }) { return <Files className={className} />; }

export const PDF_TOOLS = [
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDF documents to editable Word (DOC/DOCX) files',
    icon: WordToPdfIcon,
    bgColor: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]'
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    description: 'Extract tables from PDFs to Excel (XLS/XLSX) spreadsheets',
    icon: ExcelToPdfIcon,
    bgColor: 'bg-[#DCFCE7]',
    iconColor: 'text-[#16A34A]'
  },
  {
    id: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    description: 'Convert PDF pages into editable PowerPoint (PPT/PPTX) slides',
    icon: PowerPointToPdfIcon,
    bgColor: 'bg-[#FFEDD5]',
    iconColor: 'text-[#EA580C]'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Extract pages as high-quality JPG image files',
    icon: JpgToPdfIcon,
    bgColor: 'bg-[#FEF3C7]',
    iconColor: 'text-[#D97706]'
  },
  {
    id: 'pdf-to-png',
    name: 'PDF to PNG',
    description: 'Convert PDF pages to PNG images with transparent backgrounds',
    icon: PngToPdfIcon,
    bgColor: 'bg-[#F3E8FF]',
    iconColor: 'text-[#9333EA]'
  },
  {
    id: 'pdf-to-gif',
    name: 'PDF to GIF',
    description: 'Convert PDF pages to GIF format',
    icon: GifToPdfIcon,
    bgColor: 'bg-[#FCE7F3]',
    iconColor: 'text-[#DB2777]'
  },
  {
    id: 'pdf-to-bmp',
    name: 'PDF to BMP',
    description: 'Convert PDF documents to uncompressed BMP images',
    icon: BmpToPdfIcon,
    bgColor: 'bg-[#E0F7FA]',
    iconColor: 'text-[#00838F]'
  },
  {
    id: 'pdf-to-tiff',
    name: 'PDF to TIFF',
    description: 'Convert PDF files to high-quality TIFF format',
    icon: TiffToPdfIcon,
    bgColor: 'bg-[#EDE7F6]',
    iconColor: 'text-[#512DA8]'
  },
  {
    id: 'pdf-to-webp',
    name: 'PDF to WebP',
    description: 'Convert PDF to modern, web-optimized WebP images',
    icon: WebpToPdfIcon,
    bgColor: 'bg-[#E8F5E9]',
    iconColor: 'text-[#2E7D32]'
  },
  {
    id: 'pdf-to-svg',
    name: 'PDF to SVG',
    description: 'Convert PDF to scalable vector graphics (SVG)',
    icon: SvgToPdfIcon,
    bgColor: 'bg-[#FFF8E1]',
    iconColor: 'text-[#F57F17]'
  },
  {
    id: 'pdf-to-text',
    name: 'PDF to Text (TXT)',
    description: 'Extract all text from PDF documents into a plain TXT file',
    icon: TextToPdfIcon,
    bgColor: 'bg-[#F1F5F9]',
    iconColor: 'text-[#475569]'
  },
  {
    id: 'pdf-to-html',
    name: 'PDF to HTML',
    description: 'Convert PDF into HTML web pages while retaining layout',
    icon: HtmlToPdfIcon,
    bgColor: 'bg-[#FFE4E6]',
    iconColor: 'text-[#E11D48]'
  },
  {
    id: 'pdf-to-xml',
    name: 'PDF to XML',
    description: 'Extract structured data from PDF to XML format',
    icon: XmlToPdfIcon,
    bgColor: 'bg-[#FFF9C4]',
    iconColor: 'text-[#FBC02D]'
  },
  {
    id: 'pdf-to-csv',
    name: 'PDF to CSV',
    description: 'Convert PDF tables into Comma-Separated Values (CSV)',
    icon: CsvToPdfIcon,
    bgColor: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]'
  },
  {
    id: 'pdf-to-json',
    name: 'PDF to JSON',
    description: 'Extract PDF data and structure into a JSON object',
    icon: JsonToPdfIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#8E24AA]'
  },
  {
    id: 'pdf-to-rtf',
    name: 'PDF to RTF',
    description: 'Convert PDF to Rich Text Format (RTF) keeping styling intact',
    icon: RtfToPdfIcon,
    bgColor: 'bg-[#F0F4F8]',
    iconColor: 'text-[#334E68]'
  },
  {
    id: 'pdf-to-markdown',
    name: 'PDF to Markdown (MD)',
    description: 'Convert PDF content into styled Markdown formatting',
    icon: MarkdownToPdfIcon,
    bgColor: 'bg-[#ECEFF1]',
    iconColor: 'text-[#37474F]'
  },
  {
    id: 'pdf-to-epub',
    name: 'PDF to EPUB',
    description: 'Convert PDFs to reflowable EPUB formats for e-readers',
    icon: EpubToPdfIcon,
    bgColor: 'bg-[#E1F5FE]',
    iconColor: 'text-[#0288D1]'
  },
  {
    id: 'pdf-to-xps',
    name: 'PDF to XPS',
    description: 'Convert PDF files to XML Paper Specification (XPS) format',
    icon: XpsToPdfIcon,
    bgColor: 'bg-[#FCE4EC]',
    iconColor: 'text-[#C2185B]'
  },
  {
    id: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    description: 'Convert standard PDF documents into ISO-compliant PDF/A',
    icon: PdfToPdfAIcon,
    bgColor: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]'
  },
  {
    id: 'pdf-to-ocr',
    name: 'PDF to Searchable PDF (OCR)',
    description: 'Make scanned PDFs searchable using Optical Character Recognition',
    icon: ScreenshotToPdfIcon,
    bgColor: 'bg-[#E0E7FF]',
    iconColor: 'text-[#6366F1]'
  },
  {
    id: 'pdf-to-editable',
    name: 'PDF to Editable PDF',
    description: 'Convert flattened PDFs into fully editable PDF forms',
    icon: MobiToPdfIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#EF6C00]'
  },
  {
    id: 'pdf-to-zip',
    name: 'PDF to ZIP',
    description: 'Compress PDF files into a single ZIP archive',
    icon: ZipToPdfIcon,
    bgColor: 'bg-[#FEF3C7]',
    iconColor: 'text-[#B45309]'
  },
  {
    id: 'pdf-to-image-collection',
    name: 'PDF to Image Collection',
    description: 'Extract all embedded images from a PDF document',
    icon: MultipleFilesToPdfIcon,
    bgColor: 'bg-[#FAF5FF]',
    iconColor: 'text-[#7E22CE]'
  },
  {
    id: 'pdf-to-individual-pages',
    name: 'PDF to Individual Pages',
    description: 'Split a multi-page PDF into single, individual PDF pages',
    icon: FolderToPdfIcon,
    bgColor: 'bg-[#EFF6FF]',
    iconColor: 'text-[#1D4ED8]'
  },
  {
    id: 'pdf-to-long-image',
    name: 'PDF to Single Long Image',
    description: 'Stitch all PDF pages into one continuous long image',
    icon: WebPageToPdfIcon,
    bgColor: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]'
  },
  {
    id: 'pdf-to-heic',
    name: 'PDF to HEIC',
    description: 'Convert PDF documents to Apple HEIC image format',
    icon: HeicToPdfIcon,
    bgColor: 'bg-[#F3F4F6]',
    iconColor: 'text-[#374151]'
  },
  {
    id: 'pdf-to-raw',
    name: 'PDF to RAW Image',
    description: 'Convert PDF pages into RAW image files',
    icon: RawImageToPdfIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#E65100]'
  },
  {
    id: 'pdf-to-odt',
    name: 'PDF to ODT (OpenDocument Text)',
    description: 'Convert PDF to OpenOffice text document format',
    icon: OdtToPdfIcon,
    bgColor: 'bg-[#E0F2F1]',
    iconColor: 'text-[#00695C]'
  },
  {
    id: 'pdf-to-ods',
    name: 'PDF to ODS (OpenDocument Spreadsheet)',
    description: 'Convert PDF tables into OpenOffice Calc format',
    icon: OdsToPdfIcon,
    bgColor: 'bg-[#F1F8E9]',
    iconColor: 'text-[#558B2F]'
  },
  {
    id: 'pdf-to-odp',
    name: 'PDF to ODP (OpenDocument Presentation)',
    description: 'Convert PDF to OpenOffice Impress slides',
    icon: OdpToPdfIcon,
    bgColor: 'bg-[#FBE9E7]',
    iconColor: 'text-[#D84315]'
  },
  {
    id: 'pdf-to-visio',
    name: 'PDF to Visio (VSDX)',
    description: 'Convert PDF vector diagrams into editable Microsoft Visio formats',
    icon: VisioToPdfIcon,
    bgColor: 'bg-[#E8EAF6]',
    iconColor: 'text-[#283593]'
  },
  {
    id: 'pdf-to-publisher',
    name: 'PDF to Publisher (PUB)',
    description: 'Convert PDFs to Microsoft Publisher format',
    icon: PublisherToPdfIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#7B1FA2]'
  },
  {
    id: 'pdf-to-photoshop',
    name: 'PDF to Photoshop (PSD)',
    description: 'Convert PDFs into layered Adobe Photoshop files',
    icon: PhotoshopToPdfIcon,
    bgColor: 'bg-[#E3F2FD]',
    iconColor: 'text-[#1565C0]'
  },
  {
    id: 'pdf-to-illustrator',
    name: 'PDF to Illustrator (AI)',
    description: 'Convert vector PDFs into Adobe Illustrator artwork',
    icon: IllustratorToPdfIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#FF6F00]'
  },
  {
    id: 'pdf-to-cad',
    name: 'PDF to CAD (DWG/DXF)',
    description: 'Convert PDF drawings to AutoCAD DWG/DXF vectors',
    icon: CadToPdfIcon,
    bgColor: 'bg-[#E0F7FA]',
    iconColor: 'text-[#0097A7]'
  },
  {
    id: 'pdf-to-email',
    name: 'PDF to Email (EML)',
    description: 'Convert PDF content into EML format for mailing',
    icon: EmailToPdfIcon,
    bgColor: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0369A1]'
  },
  {
    id: 'pdf-to-outlook',
    name: 'PDF to Outlook (MSG)',
    description: 'Convert PDFs into Microsoft Outlook MSG files',
    icon: OutlookToPdfIcon,
    bgColor: 'bg-[#EEF2FF]',
    iconColor: 'text-[#3730A3]'
  }
];



/**
 * Header Component
 * Displays the main title, description, and an animated background 
 * featuring floating file icons and glowing dots.
 */


/* ==========================================================================
   3. CONVERTTOPDF TOOL CARD COMPONENT
   ========================================================================== */

/**
 * ConvertPDF Component
 * Renders individual PDF tool cards with animation, icon, and label layout.
 *
 * @param {Object} props
 * @param {Object} props.tool - Tool item configuration object
 * @param {number} [props.index=0] - Position index used for staggered row animations
 * @param {Function} [props.onClick] - Optional click handler callback
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
            <SlideInText text="Convert from PDF" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Turn your PDF files into editable Word, Excel, PowerPoint, images, and text documents.
          </p>
        </div>
      </div>
    </header>
  );
}

export function ConvertPDF({ tool, index = 0, onClick }) {
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

export function ConvertPDFPage({ onBack, searchQuery = "" }) {
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
              <ConvertPDF
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
