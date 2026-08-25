/**
 * @file DocumentManagement.jsx
 * @description Document Management sub-page. Provides 40 tools: file manager, batch import/export, version control, cloud storage, metadata editor, OCR, tagging, and archiving.
 *
 * Exports:
 *  - DocumentManagementPage, DocumentManagement (card), Header, PDF_TOOLS, plus named icon exports
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
import FileManagerPage from './FileManagerPage';
import SaveAsPage from './SaveAsPage';
import BatchImportPage from './BatchImportPage';
import BatchExportPage from './BatchExportPage';
import BatchRenamePage from './BatchRenamePage';
import BatchConversionPage from './BatchConversionPage';
import BatchPrintingPage from './BatchPrintingPage';
import BatchCompressionPage from './BatchCompressionPage';
import BatchWatermarkPage from './BatchWatermarkPage';
import BatchEncryptionPage from './BatchEncryptionPage';
import BatchDecryptionPage from './BatchDecryptionPage';
import FindReplacePage from './FindReplacePage';
import AdvancedSearchPage from './AdvancedSearchPage';
import BookmarkManagementPage from './BookmarkManagementPage';
import TableOfContentsPage from './TableOfContentsPage';
import HyperlinkSupportPage from './HyperlinkSupportPage';
import InternalLinksPage from './InternalLinksPage';
import ExternalLinksPage from './ExternalLinksPage';
import NamedDestinationsPage from './NamedDestinationsPage';
import QuickNavigationPage from './QuickNavigationPage';
import FavoritesPage from './FavoritesPage';
import EditMetadataPage from './EditMetadataPage';
import ViewMetadataPage from './ViewMetadataPage';
import DocumentPropertiesPage from './DocumentPropertiesPage';
import CustomPropertiesPage from './CustomPropertiesPage';
import XmpMetadataSupportPage from './XmpMetadataSupportPage';
import FileAttachmentsPage from './FileAttachmentsPage';
import AddAttachmentsPage from './AddAttachmentsPage';
import ExtractAttachmentsPage from './ExtractAttachmentsPage';
import RemoveAttachmentsPage from './RemoveAttachmentsPage';
import DocumentTemplatesPage from './DocumentTemplatesPage';
import TemplateLibraryPage from './TemplateLibraryPage';
import SilentPrintingPage from './SilentPrintingPage';
import PrintBookletPage from './PrintBookletPage';
import PrintMultiplePagesPage from './PrintMultiplePagesPage';
import AutoRecoveryPage from './AutoRecoveryPage';
import BackupRecoveryPage from './BackupRecoveryPage';
import PdfValidationPage from './PdfValidationPage';
import DigitalSignatureValidationPage from './DigitalSignatureValidationPage';
import DocumentArchivingPage from './DocumentArchivingPage';

const TOOL_COMPONENTS = {
  'file-manager': FileManagerPage,
  'save-as': SaveAsPage,
  'batch-import': BatchImportPage,
  'batch-export': BatchExportPage,
  'batch-rename': BatchRenamePage,
  'batch-conversion': BatchConversionPage,
  'batch-printing': BatchPrintingPage,
  'batch-compression': BatchCompressionPage,
  'batch-watermark': BatchWatermarkPage,
  'batch-encryption': BatchEncryptionPage,
  'batch-decryption': BatchDecryptionPage,
  'find-replace': FindReplacePage,
  'advanced-search': AdvancedSearchPage,
  'bookmark-management': BookmarkManagementPage,
  'table-of-contents': TableOfContentsPage,
  'hyperlink-support': HyperlinkSupportPage,
  'internal-links': InternalLinksPage,
  'external-links': ExternalLinksPage,
  'named-destinations': NamedDestinationsPage,
  'quick-navigation': QuickNavigationPage,
  'favorites': FavoritesPage,
  'edit-metadata': EditMetadataPage,
  'view-metadata': ViewMetadataPage,
  'document-properties': DocumentPropertiesPage,
  'custom-properties': CustomPropertiesPage,
  'xmp-metadata-support': XmpMetadataSupportPage,
  'file-attachments': FileAttachmentsPage,
  'add-attachments': AddAttachmentsPage,
  'extract-attachments': ExtractAttachmentsPage,
  'remove-attachments': RemoveAttachmentsPage,
  'document-templates': DocumentTemplatesPage,
  'template-library': TemplateLibraryPage,
  'silent-printing': SilentPrintingPage,
  'print-booklet': PrintBookletPage,
  'print-multiple-pages': PrintMultiplePagesPage,
  'auto-recovery': AutoRecoveryPage,
  'backup-recovery': BackupRecoveryPage,
  'pdf-validation': PdfValidationPage,
  'digital-signature-validation': DigitalSignatureValidationPage,
  'document-archiving': DocumentArchivingPage
};

/**
 * @file DocumentManagement.jsx
 * @module components/DocumentManagement
 * @description Master component library for the Document Management Suite interface.
 * Provides 40 custom SVG tool icon components, an animated hero Header section,
 * and a responsive tool card component with SVG stroke animation effects.
 *
 * @author DeepMind Pair Programming Suite
 * @version 6.1.0
 */
import { ArrowRight } from 'lucide-react';

import {
  Folder,
  Save,
  Upload,
  Download,
  Edit3,
  Repeat,
  Printer,
  Archive,
  Stamp,
  Lock,
  Unlock,
  Search,
  Sliders,
  Bookmark,
  BookOpen,
  Link,
  ExternalLink,
  Target,
  Compass,
  Star,
  FileEdit,
  Eye,
  Info,
  Database,
  Paperclip,
  PlusCircle,
  Trash2,
  LayoutTemplate,
  Library,
  Book,
  Grid,
  RotateCcw,
  HardDrive,
  CheckSquare,
  ShieldCheck,
  Box
} from 'lucide-react';

/* ==========================================================================
   SECTION 1: DOCUMENT MANAGEMENT TOOL ICON WRAPPER COMPONENTS (40 ITEMS)
   ========================================================================== */

/** @typedef {Object} IconProps @property {string} [className="w-8 h-8"] - Tailwind CSS sizing & styling classes */

/** @param {IconProps} props @returns {JSX.Element} 1. File Manager Icon */
export function FileManagerIcon({ className = "w-8 h-8" }) { return <Folder className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 2. Save As Icon */
export function SaveAsIcon({ className = "w-8 h-8" }) { return <Save className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 3. Batch Import Icon */
export function BatchImportIcon({ className = "w-8 h-8" }) { return <Upload className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 4. Batch Export Icon */
export function BatchExportIcon({ className = "w-8 h-8" }) { return <Download className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 5. Batch Rename Icon */
export function BatchRenameIcon({ className = "w-8 h-8" }) { return <Edit3 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 6. Batch Conversion Icon */
export function BatchConversionIcon({ className = "w-8 h-8" }) { return <Repeat className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 7. Batch Printing Icon */
export function BatchPrintingIcon({ className = "w-8 h-8" }) { return <Printer className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 8. Batch Compression Icon */
export function BatchCompressionIcon({ className = "w-8 h-8" }) { return <Archive className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 9. Batch Watermark Icon */
export function BatchWatermarkIcon({ className = "w-8 h-8" }) { return <Stamp className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 10. Batch Encryption Icon */
export function BatchEncryptionIcon({ className = "w-8 h-8" }) { return <Lock className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 11. Batch Decryption Icon */
export function BatchDecryptionIcon({ className = "w-8 h-8" }) { return <Unlock className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 12. Find & Replace Icon */
export function FindReplaceIcon({ className = "w-8 h-8" }) { return <Search className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 13. Advanced Search Icon */
export function AdvancedSearchIcon({ className = "w-8 h-8" }) { return <Sliders className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 14. Bookmark Management Icon */
export function BookmarkManagementIcon({ className = "w-8 h-8" }) { return <Bookmark className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 15. Table of Contents Icon */
export function TableOfContentsIcon({ className = "w-8 h-8" }) { return <BookOpen className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 16. Hyperlink Support Icon */
export function HyperlinkSupportIcon({ className = "w-8 h-8" }) { return <Link className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 17. Internal Links Icon */
export function InternalLinksIcon({ className = "w-8 h-8" }) { return <Link className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 18. External Links Icon */
export function ExternalLinksIcon({ className = "w-8 h-8" }) { return <ExternalLink className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 19. Named Destinations Icon */
export function NamedDestinationsIcon({ className = "w-8 h-8" }) { return <Target className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 20. Quick Navigation Icon */
export function QuickNavigationIcon({ className = "w-8 h-8" }) { return <Compass className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 21. Favorites Icon */
export function FavoritesIcon({ className = "w-8 h-8" }) { return <Star className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 22. Edit Metadata Icon */
export function EditMetadataIcon({ className = "w-8 h-8" }) { return <FileEdit className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 23. View Metadata Icon */
export function ViewMetadataIcon({ className = "w-8 h-8" }) { return <Eye className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 24. Document Properties Icon */
export function DocumentPropertiesIcon({ className = "w-8 h-8" }) { return <Info className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 25. Custom Properties Icon */
export function CustomPropertiesIcon({ className = "w-8 h-8" }) { return <Sliders className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 26. XMP Metadata Support Icon */
export function XmpMetadataSupportIcon({ className = "w-8 h-8" }) { return <Database className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 27. File Attachments Icon */
export function FileAttachmentsIcon({ className = "w-8 h-8" }) { return <Paperclip className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 28. Add Attachments Icon */
export function AddAttachmentsIcon({ className = "w-8 h-8" }) { return <PlusCircle className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 29. Extract Attachments Icon */
export function ExtractAttachmentsIcon({ className = "w-8 h-8" }) { return <Download className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 30. Remove Attachments Icon */
export function RemoveAttachmentsIcon({ className = "w-8 h-8" }) { return <Trash2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 31. Document Templates Icon */
export function DocumentTemplatesIcon({ className = "w-8 h-8" }) { return <LayoutTemplate className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 32. Template Library Icon */
export function TemplateLibraryIcon({ className = "w-8 h-8" }) { return <Library className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 33. Silent Printing Icon */
export function SilentPrintingIcon({ className = "w-8 h-8" }) { return <Printer className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 34. Print Booklet Icon */
export function PrintBookletIcon({ className = "w-8 h-8" }) { return <Book className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 35. Print Multiple Pages per Sheet Icon */
export function PrintMultiplePagesIcon({ className = "w-8 h-8" }) { return <Grid className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 36. Auto Recovery Icon */
export function AutoRecoveryIcon({ className = "w-8 h-8" }) { return <RotateCcw className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 37. Backup Recovery Icon */
export function BackupRecoveryIcon({ className = "w-8 h-8" }) { return <HardDrive className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 38. PDF Validation Icon */
export function PdfValidationIcon({ className = "w-8 h-8" }) { return <CheckSquare className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 39. Digital Signature Validation Icon */
export function DigitalSignatureValidationIcon({ className = "w-8 h-8" }) { return <ShieldCheck className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 40. Document Archiving Icon */
export function DocumentArchivingIcon({ className = "w-8 h-8" }) { return <Box className={className} />; }

/**
 * @typedef {Object} ColorTheme
 * @property {string} bg - Tailwind background color class (e.g., 'bg-[#FFECEC]')
 * @property {string} icon - Tailwind text color class for Lucide icon (e.g., 'text-[#EF4444]')
 */

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
 * @typedef {Object} DocumentTool
 * @property {string} id - Unique slug identifier for routing and key rendering
 * @property {string} name - Display title of the tool card
 * @property {string} description - Brief feature summary text
 * @property {React.ComponentType} icon - React component for rendering card icon
 * @property {string} bgColor - Tailwind background color class
 * @property {string} iconColor - Tailwind icon text color class
 */

/**
 * PDF_TOOLS Configuration Dataset
 * Array of 40 Document Management tool objects displayed in the main application grid.
 *
 * @type {DocumentTool[]}
 */
export const PDF_TOOLS = [
  {
    id: 'file-manager',
    name: 'File Manager',
    description: 'Comprehensive file organization, folder structures, and document browsing.',
    icon: FileManagerIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'save-as',
    name: 'Save As',
    description: 'Export documents in custom file formats, naming schemes, and destination paths.',
    icon: SaveAsIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'batch-import',
    name: 'Batch Import',
    description: 'Import multiple PDF files simultaneously into your workspace in bulk.',
    icon: BatchImportIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'batch-export',
    name: 'Batch Export',
    description: 'Bulk export multiple documents into desired file formats at once.',
    icon: BatchExportIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'batch-rename',
    name: 'Batch Rename',
    description: 'Rename multiple PDF files at once using custom rule patterns and counters.',
    icon: BatchRenameIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'batch-conversion',
    name: 'Batch Conversion',
    description: 'Convert multiple files to and from PDF format in single bulk operations.',
    icon: BatchConversionIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'batch-printing',
    name: 'Batch Printing',
    description: 'Send multiple PDF documents directly to your printer queue in one single action.',
    icon: BatchPrintingIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'batch-compression',
    name: 'Batch Compression',
    description: 'Reduce file size of multiple PDF documents simultaneously without losing quality.',
    icon: BatchCompressionIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'batch-watermark',
    name: 'Batch Watermark',
    description: 'Apply custom text, logo, or image watermarks across multiple PDFs in bulk.',
    icon: BatchWatermarkIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'batch-encryption',
    name: 'Batch Encryption',
    description: 'Secure multiple PDF files with strong password protection and permissions.',
    icon: BatchEncryptionIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'batch-decryption',
    name: 'Batch Decryption',
    description: 'Remove passwords and security restrictions from multiple PDFs at once.',
    icon: BatchDecryptionIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'find-replace',
    name: 'Find & Replace',
    description: 'Search and replace text strings seamlessly across entire document pages.',
    icon: FindReplaceIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'advanced-search',
    name: 'Advanced Search',
    description: 'Deep search with custom filters, regex patterns, and metadata matching.',
    icon: AdvancedSearchIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'bookmark-management',
    name: 'Bookmark Management',
    description: 'Create, organize, edit, and navigate structured PDF document outline bookmarks.',
    icon: BookmarkManagementIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'table-of-contents',
    name: 'Table of Contents',
    description: 'Auto-generate and customize interactive Table of Contents for easy navigation.',
    icon: TableOfContentsIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'hyperlink-support',
    name: 'Hyperlink Support',
    description: 'Add, edit, test, and manage active web URL hyperlinks within pages.',
    icon: HyperlinkSupportIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'internal-links',
    name: 'Internal Links',
    description: 'Link specific text or regions to other pages or chapters inside the document.',
    icon: InternalLinksIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'external-links',
    name: 'External Links',
    description: 'Create clickable links to external files, websites, or network locations.',
    icon: ExternalLinksIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'named-destinations',
    name: 'Named Destinations',
    description: 'Define target anchors for precise cross-document and intra-document deep linking.',
    icon: NamedDestinationsIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'quick-navigation',
    name: 'Quick Navigation',
    description: 'Jump instantly to specific pages, chapters, or recently visited sections.',
    icon: QuickNavigationIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Bookmark important documents and frequently visited pages for 1-click access.',
    icon: FavoritesIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'edit-metadata',
    name: 'Edit Metadata',
    description: 'Modify document title, author, subject, keywords, and creation properties.',
    icon: EditMetadataIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'view-metadata',
    name: 'View Metadata',
    description: 'Inspect hidden document metadata, author details, software version, and logs.',
    icon: ViewMetadataIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'document-properties',
    name: 'Document Properties',
    description: 'View detailed file dimensions, font lists, security settings, and specs.',
    icon: DocumentPropertiesIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'custom-properties',
    name: 'Custom Properties',
    description: 'Add custom key-value metadata fields for specialized tracking and indexing.',
    icon: CustomPropertiesIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'xmp-metadata-support',
    name: 'XMP Metadata Support',
    description: 'Embed and manage Adobe XMP standardized extensible metadata streams.',
    icon: XmpMetadataSupportIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'file-attachments',
    name: 'File Attachments',
    description: 'View and manage embedded file attachments stored inside the PDF container.',
    icon: FileAttachmentsIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'add-attachments',
    name: 'Add Attachments',
    description: 'Embed additional files, images, or spreadsheets directly into the PDF container.',
    icon: AddAttachmentsIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'extract-attachments',
    name: 'Extract Attachments',
    description: 'Save embedded PDF attachments out onto your local computer disk.',
    icon: ExtractAttachmentsIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'remove-attachments',
    name: 'Remove Attachments',
    description: 'Delete unwanted embedded files to clean up document container size.',
    icon: RemoveAttachmentsIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'document-templates',
    name: 'Document Templates',
    description: 'Create reusable document layouts and standardized form structures.',
    icon: DocumentTemplatesIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'template-library',
    name: 'Template Library',
    description: 'Browse pre-made professional templates for contracts, invoices, and reports.',
    icon: TemplateLibraryIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'silent-printing',
    name: 'Silent Printing',
    description: 'Background automated printing without pop-up print dialog prompts.',
    icon: SilentPrintingIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'print-booklet',
    name: 'Print Booklet',
    description: 'Print pages in double-sided booklet, brochure, and magazine folding layouts.',
    icon: PrintBookletIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'print-multiple-pages',
    name: 'Print Multiple Pages per Sheet',
    description: 'N-up printing layout to fit 2, 4, or 8 pages onto a single sheet of paper.',
    icon: PrintMultiplePagesIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'auto-recovery',
    name: 'Auto Recovery',
    description: 'Automatically restore unsaved changes after unexpected app or system shutdowns.',
    icon: AutoRecoveryIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'backup-recovery',
    name: 'Backup Recovery',
    description: 'Create and restore automatic document backup versions safely and reliably.',
    icon: BackupRecoveryIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'pdf-validation',
    name: 'PDF Validation',
    description: 'Validate PDFs against ISO standards like PDF/A, PDF/E, and PDF/X.',
    icon: PdfValidationIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'digital-signature-validation',
    name: 'Digital Signature Validation',
    description: 'Verify authenticity, integrity, and certificate validity of signed PDFs.',
    icon: DigitalSignatureValidationIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'document-archiving',
    name: 'Document Archiving',
    description: 'Convert and optimize documents for long-term ISO PDF/A compliance.',
    icon: DocumentArchivingIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
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
 * DocumentManagement Tool Card Component
 * Renders individual interactive feature card with responsive dimensions, custom SVG badge,
 * hover elevation scale, and stroke draw animation.
 *
 * @component
 * @param {Object} props Component properties
 * @param {Object} props.tool Tool configuration object (id, name, description, icon, bgColor, iconColor)
 * @param {number} [props.index=0] Staggered animation index multiplier
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
            <SlideInText text="Document Management" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Organize, index, batch process, and catalog your PDF document library efficiently.
          </p>
        </div>
      </div>
    </header>
  );
}

export function DocumentManagement({ tool, index = 0, onClick }) {
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
          ) : typeof IconComponent === 'function' ? (
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
export function DocumentManagementPage({ onBack, searchQuery = "" }) {
  const [selectedTool, setSelectedTool] = React.useState(() => {
    const hashParts = window.location.hash.replace(/^#/, '').split('/');
    if (hashParts[0] === 'document-management' && hashParts[1]) {
      return PDF_TOOLS.find(t => t.id === hashParts[1]) || null;
    }
    return null;
  });

  React.useEffect(() => {
    if (selectedTool) {
      window.history.pushState({ toolOpen: true }, '', `#document-management/${selectedTool.id}`);
      window.scrollTo(0, 0);
    }
  }, [selectedTool]);

  React.useEffect(() => {
    const handlePopState = () => {
      setSelectedTool(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (selectedTool) {
    const Component = TOOL_COMPONENTS[selectedTool.id];
    if (Component) {
      return <Component onBack={() => { setSelectedTool(null); window.scrollTo(0, 0); }} />;
    }
    return <ToolWorkspace tool={selectedTool} onBack={() => { setSelectedTool(null); window.scrollTo(0, 0); }} />;
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
              <DocumentManagement
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
