/**
 * @file Organizepdf.jsx
 * @description Organize PDF sub-page. Provides tools for merging, splitting, reordering, numbering, stamping, compressing, and batch-processing PDF pages and files.
 *
 * Exports:
 *  - OrganizepdfPage (default), OrganizepdfCard, Header, PDF_TOOLS
 */
import ToolWorkspace from '../ToolWorkspace';
import SlideInText from '../../components/SlideInText';
import MergePDFPage from './MergePDFPage';
import SplitPDFPage from './SplitPDFPage';
import OrganizePDFPage from './OrganizePDFPage';
import RemovePDFPagesPage from './RemovePDFPagesPage';
import ExtractPDFPagesPage from './ExtractPDFPagesPage';
import ScantoPDFPage from './ScantoPDFPage';
import CompressPDFPage from './CompressPDFPage';
import RepairPDFPage from './RepairPDFPage';
import OCRPDFPage from './OCRPDFPage';
import EditPDFPage from './EditPDFPage';
import RotatePDFPage from './RotatePDFPage';
import AddPageNumbersPage from './AddPageNumbersPage';
import AddWatermarkPage from './AddWatermarkPage';
import CropPDFPage from './CropPDFPage';
import FlattenPDFPage from './FlattenPDFPage';
import MergePDFPagesintoOnePagePage from './MergePDFPagesintoOnePagePage';
import RichMediaSupportEmbedAudioVideoPage from './RichMediaSupportEmbedAudioVideoPage';
import BackgroundManagementPage from './BackgroundManagementPage';
import WebOptimizationPage from './WebOptimizationPage';
import PDFLinearizationFastWebViewPage from './PDFLinearizationFastWebViewPage';
import PDFtoImageCollectionPage from './PDFtoImageCollectionPage';
import PDFtoIndividualPagesPage from './PDFtoIndividualPagesPage';
import PDFtoSingleLongImagePage from './PDFtoSingleLongImagePage';
import PDFtoEditablePDFPage from './PDFtoEditablePDFPage';
import PDFtoSearchablePDFOCRPage from './PDFtoSearchablePDFOCRPage';
import DownloadOptimizedPDFPage from './DownloadOptimizedPDFPage';
import DuplicatePDFPagesPage from './DuplicatePDFPagesPage';
import InsertBlankPagePage from './InsertBlankPagePage';
import ReplacePDFPagesPage from './ReplacePDFPagesPage';
import ReorderBookmarksAfterPageChangesPage from './ReorderBookmarksAfterPageChangesPage';
import PageLabelManagementPage from './PageLabelManagementPage';
import PageSizeNormalizationPage from './PageSizeNormalizationPage';

const componentMap = {
  'merge-pdf': MergePDFPage,
  'split-pdf': SplitPDFPage,
  'organize-pdf': OrganizePDFPage,
  'remove-pdf-pages': RemovePDFPagesPage,
  'extract-pdf-pages': ExtractPDFPagesPage,
  'scan-to-pdf': ScantoPDFPage,
  'compress-pdf': CompressPDFPage,
  'repair-pdf': RepairPDFPage,
  'ocr-pdf': OCRPDFPage,
  'edit-pdf': EditPDFPage,
  'rotate-pdf': RotatePDFPage,
  'add-page-numbers': AddPageNumbersPage,
  'add-watermark': AddWatermarkPage,
  'crop-pdf': CropPDFPage,
  'flatten-pdf': FlattenPDFPage,
  'merge-pdf-pages-into-one-page': MergePDFPagesintoOnePagePage,
  'rich-media-support': RichMediaSupportEmbedAudioVideoPage,
  'background-management': BackgroundManagementPage,
  'web-optimization': WebOptimizationPage,
  'pdf-linearization': PDFLinearizationFastWebViewPage,
  'pdf-to-image-collection': PDFtoImageCollectionPage,
  'pdf-to-individual-pages': PDFtoIndividualPagesPage,
  'pdf-to-single-long-image': PDFtoSingleLongImagePage,
  'pdf-to-editable-pdf': PDFtoEditablePDFPage,
  'pdf-to-searchable-pdf': PDFtoSearchablePDFOCRPage,
  'download-optimized-pdf': DownloadOptimizedPDFPage,
  'duplicate-pdf-pages': DuplicatePDFPagesPage,
  'insert-blank-page': InsertBlankPagePage,
  'replace-pdf-pages': ReplacePDFPagesPage,
  'reorder-bookmarks-after-page-changes': ReorderBookmarksAfterPageChangesPage,
  'page-label-management': PageLabelManagementPage,
  'page-size-normalization': PageSizeNormalizationPage,
};

/**
 * OrganizePDF Components and Data
 * 
 * This file contains:
 * 1. Internal functional components for Lucide icons.
 * 2. Header component for the application.
 * 3. Organizepdf tool card component for rendering individual tool options.
 * 4. PDF_TOOLS array containing configuration data for all available PDF tools.
 */
import React from 'react';
import {
  Merge,
  Scissors,
  FolderTree,
  FileMinus,
  FileOutput,
  Scan,
  FileArchive,
  Wrench,
  ScanText,
  Edit3,
  RotateCw,
  Hash,
  Stamp,
  Crop,
  Layers,
  LayoutGrid,
  Video,
  Palette,
  Globe,
  Gauge,
  Image,
  Files,
  Maximize2,
  FileCode,
  Search,
  Download,
  CopyPlus,
  FilePlus,
  Repeat,
  BookmarkCheck,
  Tag,
  Scaling,
  ArrowRight
} from 'lucide-react';


/* ==========================================================================
   1. CUSTOM PDF TOOL ICONS
   These internal functional components render the specific Lucide icons 
   used in the PDF tools array.
   ========================================================================== */

function MergePdfIcon({ className = "w-8 h-8" }) {
  return <Merge className={className} />;
}

function SplitPdfIcon({ className = "w-8 h-8" }) {
  return <Scissors className={className} />;
}

function OrganizePdfIcon({ className = "w-8 h-8" }) {
  return <FolderTree className={className} />;
}

function RemovePagesIcon({ className = "w-8 h-8" }) {
  return <FileMinus className={className} />;
}

function ExtractPagesIcon({ className = "w-8 h-8" }) {
  return <FileOutput className={className} />;
}

function ScanToPdfIcon({ className = "w-8 h-8" }) {
  return <Scan className={className} />;
}

function CompressPdfIcon({ className = "w-8 h-8" }) {
  return <FileArchive className={className} />;
}

function RepairPdfIcon({ className = "w-8 h-8" }) {
  return <Wrench className={className} />;
}

function OcrPdfIcon({ className = "w-8 h-8" }) {
  return <ScanText className={className} />;
}

function EditPdfIcon({ className = "w-8 h-8" }) {
  return <Edit3 className={className} />;
}

function RotatePdfIcon({ className = "w-8 h-8" }) {
  return <RotateCw className={className} />;
}

function AddPageNumbersIcon({ className = "w-8 h-8" }) {
  return <Hash className={className} />;
}

function AddWatermarkIcon({ className = "w-8 h-8" }) {
  return <Stamp className={className} />;
}

function CropPdfIcon({ className = "w-8 h-8" }) {
  return <Crop className={className} />;
}

function FlattenPdfIcon({ className = "w-8 h-8" }) {
  return <Layers className={className} />;
}

function MergePagesOnePageIcon({ className = "w-8 h-8" }) {
  return <LayoutGrid className={className} />;
}

function RichMediaIcon({ className = "w-8 h-8" }) {
  return <Video className={className} />;
}

function BackgroundMgmtIcon({ className = "w-8 h-8" }) {
  return <Palette className={className} />;
}

function WebOptIcon({ className = "w-8 h-8" }) {
  return <Globe className={className} />;
}

function PdfLinearizationIcon({ className = "w-8 h-8" }) {
  return <Gauge className={className} />;
}

function PdfToImageColIcon({ className = "w-8 h-8" }) {
  return <Image className={className} />;
}

function PdfToIndivPagesIcon({ className = "w-8 h-8" }) {
  return <Files className={className} />;
}

function PdfToSingleLongImgIcon({ className = "w-8 h-8" }) {
  return <Maximize2 className={className} />;
}

function PdfToEditableIcon({ className = "w-8 h-8" }) {
  return <FileCode className={className} />;
}

function PdfToSearchableIcon({ className = "w-8 h-8" }) {
  return <Search className={className} />;
}

function DownloadOptPdfIcon({ className = "w-8 h-8" }) {
  return <Download className={className} />;
}

function DuplicatePagesIcon({ className = "w-8 h-8" }) {
  return <CopyPlus className={className} />;
}

function InsertBlankPageIcon({ className = "w-8 h-8" }) {
  return <FilePlus className={className} />;
}

function ReplacePagesIcon({ className = "w-8 h-8" }) {
  return <Repeat className={className} />;
}

function ReorderBookmarksIcon({ className = "w-8 h-8" }) {
  return <BookmarkCheck className={className} />;
}

function PageLabelMgmtIcon({ className = "w-8 h-8" }) {
  return <Tag className={className} />;
}

function PageSizeNormIcon({ className = "w-8 h-8" }) {
  return <Scaling className={className} />;
}





/* ==========================================================================
   3. ORGANIZEPDF TOOL CARD COMPONENT
   ========================================================================== */

/**
 * Organizepdf Component
 * Renders individual PDF tool cards with animation, icon, and label layout.
 *
 * @param {Object} props
 * @param {Object} props.tool - Tool item configuration object
 * @param {number} [props.index=0] - Position index used for staggered row animations
 * @param {Function} [props.onClick] - Optional click handler callback
 */
export function OrganizepdfCard({ tool, index = 0, onClick }) {
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

export const PDF_TOOLS = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF documents into a single organized file seamlessly',
    icon: MergePdfIcon,
    bgColor: 'bg-[#FFECEC]',
    iconColor: 'text-[#EF4444]'
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Separate pages or extract custom page ranges into independent PDFs',
    icon: SplitPdfIcon,
    bgColor: 'bg-[#E3F2FD]',
    iconColor: 'text-[#3B82F6]'
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    description: 'Rearrange, sort, and manage page sequences with simple drag and drop',
    icon: OrganizePdfIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#A855F7]'
  },
  {
    id: 'remove-pdf-pages',
    name: 'Remove PDF Pages',
    description: 'Delete unnecessary or blank pages from your PDF documents instantly',
    icon: RemovePagesIcon,
    bgColor: 'bg-[#FEF2F2]',
    iconColor: 'text-[#DC2626]'
  },
  {
    id: 'extract-pdf-pages',
    name: 'Extract PDF Pages',
    description: 'Extract specific pages and save them as standalone PDF files',
    icon: ExtractPagesIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#F97316]'
  },
  {
    id: 'scan-to-pdf',
    name: 'Scan to PDF',
    description: 'Convert paper documents and photos directly into clean digital PDFs',
    icon: ScanToPdfIcon,
    bgColor: 'bg-[#ECFDF5]',
    iconColor: 'text-[#10B981]'
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF filesize while preserving high visual document quality',
    icon: CompressPdfIcon,
    bgColor: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]'
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF',
    description: 'Fix corrupted PDF files and restore lost document content efficiently',
    icon: RepairPdfIcon,
    bgColor: 'bg-[#FEF3C7]',
    iconColor: 'text-[#D97706]'
  },
  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    description: 'Recognize text inside scanned PDFs and make documents searchable',
    icon: OcrPdfIcon,
    bgColor: 'bg-[#F5F3FF]',
    iconColor: 'text-[#7C3AED]'
  },
  {
    id: 'edit-pdf',
    name: 'Edit PDF',
    description: 'Add text, drawings, shapes, and images directly onto PDF pages',
    icon: EditPdfIcon,
    bgColor: 'bg-[#FCE4EC]',
    iconColor: 'text-[#EC4899]'
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate individual pages or entire documents clockwise or counter-clockwise',
    icon: RotatePdfIcon,
    bgColor: 'bg-[#E0F7FA]',
    iconColor: 'text-[#06B6D4]'
  },
  {
    id: 'add-page-numbers',
    name: 'Add Page Numbers',
    description: 'Insert header or footer page numbers with custom formats and positions',
    icon: AddPageNumbersIcon,
    bgColor: 'bg-[#F1F5F9]',
    iconColor: 'text-[#475569]'
  },
  {
    id: 'add-watermark',
    name: 'Add Watermark',
    description: 'Apply text or image watermarks for copyright and security protection',
    icon: AddWatermarkIcon,
    bgColor: 'bg-[#FDF4FF]',
    iconColor: 'text-[#C026D3]'
  },
  {
    id: 'crop-pdf',
    name: 'Crop PDF',
    description: 'Trim page margins and crop selected document areas with precision',
    icon: CropPdfIcon,
    bgColor: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]'
  },
  {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    description: 'Merge annotations, form fields, and layers into an uneditable layer',
    icon: FlattenPdfIcon,
    bgColor: 'bg-[#FFF7ED]',
    iconColor: 'text-[#EA580C]'
  },
  {
    id: 'merge-pdf-pages-into-one-page',
    name: 'Merge PDF Pages into One Page',
    description: 'Layout N-up multiple PDF pages onto a single consolidated page sheet',
    icon: MergePagesOnePageIcon,
    bgColor: 'bg-[#F0FDF4]',
    iconColor: 'text-[#16A34A]'
  },
  {
    id: 'rich-media-support',
    name: 'Rich Media Support (Embed Audio/Video)',
    description: 'Embed interactive audio tracks, video clips, and media elements in PDF',
    icon: RichMediaIcon,
    bgColor: 'bg-[#EFF6FF]',
    iconColor: 'text-[#2563EB]'
  },
  {
    id: 'background-management',
    name: 'Background Management',
    description: 'Customize, swap, or clear background colors and images across pages',
    icon: BackgroundMgmtIcon,
    bgColor: 'bg-[#FDF2F8]',
    iconColor: 'text-[#DB2777]'
  },
  {
    id: 'web-optimization',
    name: 'Web Optimization',
    description: 'Optimize PDF internal structures for fast browser rendering and web viewing',
    icon: WebOptIcon,
    bgColor: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]'
  },
  {
    id: 'pdf-linearization',
    name: 'PDF Linearization (Fast Web View)',
    description: 'Enable progressive streaming page loads for seamless online viewing',
    icon: PdfLinearizationIcon,
    bgColor: 'bg-[#F5F3FF]',
    iconColor: 'text-[#6D28D9]'
  },
  {
    id: 'pdf-to-image-collection',
    name: 'PDF to Image Collection',
    description: 'Convert every PDF page into high-quality JPG or PNG image files archive',
    icon: PdfToImageColIcon,
    bgColor: 'bg-[#FFFBEB]',
    iconColor: 'text-[#B45309]'
  },
  {
    id: 'pdf-to-individual-pages',
    name: 'PDF to Individual Pages',
    description: 'Split your entire PDF document into separate single-page PDF files',
    icon: PdfToIndivPagesIcon,
    bgColor: 'bg-[#EFF6FF]',
    iconColor: 'text-[#1D4ED8]'
  },
  {
    id: 'pdf-to-single-long-image',
    name: 'PDF to Single Long Image',
    description: 'Stitch multi-page PDF into one continuous vertical high-res image',
    icon: PdfToSingleLongImgIcon,
    bgColor: 'bg-[#FCE4EC]',
    iconColor: 'text-[#BE185D]'
  },
  {
    id: 'pdf-to-editable-pdf',
    name: 'PDF to Editable PDF',
    description: 'Transform read-only PDFs into fully editable document layouts',
    icon: PdfToEditableIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#9333EA]'
  },
  {
    id: 'pdf-to-searchable-pdf',
    name: 'PDF to Searchable PDF (OCR)',
    description: 'Make text inside image PDFs searchable and selectable via OCR engines',
    icon: PdfToSearchableIcon,
    bgColor: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0369A1]'
  },
  {
    id: 'download-optimized-pdf',
    name: 'Download Optimized PDF',
    description: 'Generate fast-loading, highly compressed PDF ready for instant download',
    icon: DownloadOptPdfIcon,
    bgColor: 'bg-[#DCFCE7]',
    iconColor: 'text-[#15803D]'
  },
  {
    id: 'duplicate-pdf-pages',
    name: 'Duplicate PDF Pages',
    description: 'Clone selected PDF pages and insert duplicate copies anywhere in file',
    icon: DuplicatePagesIcon,
    bgColor: 'bg-[#F1F5F9]',
    iconColor: 'text-[#334155]'
  },
  {
    id: 'insert-blank-page',
    name: 'Insert Blank Page',
    description: 'Insert new blank pages at any position within your PDF document',
    icon: InsertBlankPageIcon,
    bgColor: 'bg-[#EFF6FF]',
    iconColor: 'text-[#3B82F6]'
  },
  {
    id: 'replace-pdf-pages',
    name: 'Replace PDF Pages',
    description: 'Swap specific PDF pages with replacement pages from another file',
    icon: ReplacePagesIcon,
    bgColor: 'bg-[#FEF2F2]',
    iconColor: 'text-[#B91C1C]'
  },
  {
    id: 'reorder-bookmarks-after-page-changes',
    name: 'Reorder Bookmarks After Page Changes',
    description: 'Automatically synchronize and re-index PDF bookmarks and navigation tree',
    icon: ReorderBookmarksIcon,
    bgColor: 'bg-[#FDF4FF]',
    iconColor: 'text-[#A21CAF]'
  },
  {
    id: 'page-label-management',
    name: 'Page Label Management',
    description: 'Configure custom page numbering styles like Roman numerals and prefixes',
    icon: PageLabelMgmtIcon,
    bgColor: 'bg-[#E0F7FA]',
    iconColor: 'text-[#0891B2]'
  },
  {
    id: 'page-size-normalization',
    name: 'Page Size Normalization',
    description: 'Standardize non-uniform PDF page dimensions into consistent standard sizes',
    icon: PageSizeNormIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#C2410C]'
  }
];

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
            <SlideInText text="Organize PDF" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Rearrange, delete, rotate, and manage pages within your PDF documents effortlessly.
          </p>
        </div>
      </div>
    </header>
  );
}

export default function OrganizepdfPage({ onBack, searchQuery = "" }) {
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
      window.history.pushState({ toolOpen: true }, '', `#organize-pdf/${selectedTool.id}`);
      window.scrollTo(0, 0);
    }
  }, [selectedTool]);

  React.useEffect(() => {
    const handlePopState = () => {
      const hashParts = window.location.hash.split('/');
      if (hashParts.length <= 1) {
          setSelectedTool(null);
      } else {
          const toolId = hashParts[1];
          const found = PDF_TOOLS.find(t => t.id === toolId);
          if (found) setSelectedTool(found);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (selectedTool) {
    const Component = componentMap[selectedTool.id];
    if (Component) {
      return (
        <div className="flex-1 flex flex-col w-full relative z-20 min-h-screen pb-20">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5 pb-4">
            <button
              onClick={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }}
              className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Back to Tools
            </button>
          </div>
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 w-full-container"><Component tool={selectedTool} /></div>
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
              <OrganizepdfCard
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
