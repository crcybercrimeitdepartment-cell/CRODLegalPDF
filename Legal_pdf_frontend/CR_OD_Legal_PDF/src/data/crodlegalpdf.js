/**
 * @file crodlegalpdf.js
 * @description Central data registry for the CR OD Legal PDF home dashboard.
 *
 * Exports `PDF_TOOLS` — an ordered array of 20 top-level category card definitions.
 * Each entry maps directly to one <ToolCard> on the home grid and one sub-page route.
 *
 * Schema per tool object:
 *  @property {string}   id          - Unique slug used as the React key and route identifier
 *  @property {string}   name        - Display name shown on the card
 *  @property {string}   description - Short description shown below the name
 *  @property {Function} icon        - Icon wrapper component (from crodlegalpdf.jsx)
 *  @property {string}   bgColor     - Tailwind bg class for the icon badge background
 *  @property {string}   iconColor   - Tailwind text class for the Lucide icon color
 *
 * Icon components are thin wrappers around Lucide React icons defined in
 * `src/components/crodlegalpdf.jsx`. Centralising them here keeps the data
 * file free of inline SVG/JSX while still allowing per-card icon customisation.
 *
 * Color pairs follow a deliberate palette rotation so adjacent cards contrast
 * visually without repeating the same hue in consecutive rows.
 */
import {
  OrganizePdfIcon,
  ConvertToPdfIcon,
  ConvertFromPdfIcon,
  PdfSecurityIcon,
  PdfSignatureIcon,
  PdfAiToolsIcon,
  CompareRedactionIcon,
  TeamBusinessIcon,
  AccessibilityIcon,
  DocumentManagementIcon,
  ImageProcessingIcon,
  PdfReaderIcon,
  ReviewAnnotationIcon,
  FingerprintAuthIcon,
  PdfCopyrightIcon,
  FolderSecurityIcon,
  PdfToolsIcon,
  SoftwareAboutUsIcon,
  Demo1Icon,
  Demo2Icon
} from '../components/crodlegalpdf';

export const PDF_TOOLS = [
  // Row 1
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    description: 'Free Merge PDF, Split PDF File, Reorder & Extract PDF pages fast',
    icon: OrganizePdfIcon,
    bgColor: 'bg-[#FFECEC]',
    iconColor: 'text-[#EF4444]'
  },
  {
    id: 'convert-to-pdf',
    name: 'Convert to PDF',
    description: 'Online Convert Word, Excel, PPT, images, and HTML into PDF format',
    icon: ConvertToPdfIcon,
    bgColor: 'bg-[#E3F2FD]',
    iconColor: 'text-[#3B82F6]'
  },
  {
    id: 'convert-from-pdf',
    name: 'Convert from PDF',
    description: 'Free Convert PDF Document to editable Word, Excel, PPT, or images',
    icon: ConvertFromPdfIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#A855F7]'
  },
  {
    id: 'pdf-security',
    name: 'PDF Security',
    description: 'Secure Protect PDF File with strong password encryption and unlock permissions',
    icon: PdfSecurityIcon,
    bgColor: 'bg-[#FFF3E0]',
    iconColor: 'text-[#F97316]'
  },

  // Row 2
  {
    id: 'pdf-signature',
    name: 'PDF Signature',
    description: 'Online Sign PDF Document with legally binding digital & e-signatures',
    icon: PdfSignatureIcon,
    bgColor: 'bg-[#FCE4EC]',
    iconColor: 'text-[#EC4899]'
  },
  {
    id: 'pdf-ai-tools',
    name: 'PDF AI Tools',
    description: 'Online Search & Chat with PDF, extract AI summaries, and analyze text',
    icon: PdfAiToolsIcon,
    bgColor: 'bg-[#F5F3FF]',
    iconColor: 'text-[#7C3AED]'
  },
  {
    id: 'compare-redaction',
    name: 'Compare & Redaction',
    description: 'Online Redact PDF File & compare document versions side-by-side',
    icon: CompareRedactionIcon,
    bgColor: 'bg-[#EFF6FF]',
    iconColor: 'text-[#2563EB]'
  },
  {
    id: 'team-business',
    name: 'Team & Business',
    description: 'Secure PDF Management, multi-user collaboration, and enterprise tools',
    icon: TeamBusinessIcon,
    bgColor: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]'
  },

  // Row 3
  {
    id: 'accessibility',
    name: 'Accessibility',
    description: 'Optimize PDF Document for screen readers, alt text, and PDF/UA accessibility',
    icon: AccessibilityIcon,
    bgColor: 'bg-[#E0F7FA]',
    iconColor: 'text-[#06B6D4]'
  },
  {
    id: 'document-management',
    name: 'Document Management',
    description: 'Best PDF Management to catalog, index, tag, and organize large PDF libraries',
    icon: DocumentManagementIcon,
    bgColor: 'bg-[#ECFDF5]',
    iconColor: 'text-[#10B981]'
  },
  {
    id: 'image-processing',
    name: 'Image Processing',
    description: 'Free Compress PDF File images, optimize resolution, and crop photos in PDF',
    icon: ImageProcessingIcon,
    bgColor: 'bg-[#FEF3C7]',
    iconColor: 'text-[#D97706]'
  },
  {
    id: 'pdf-reader',
    name: 'PDF Reader',
    description: 'Online View PDF File with high-speed PDF Viewer & dark reading mode',
    icon: PdfReaderIcon,
    bgColor: 'bg-[#F1F5F9]',
    iconColor: 'text-[#475569]'
  },

  // Row 4
  {
    id: 'review-annotation',
    name: 'Review & Annotation',
    description: 'Free Edit PDF Document with sticky notes, freehand drawing, & highlights',
    icon: ReviewAnnotationIcon,
    bgColor: 'bg-[#FDF4FF]',
    iconColor: 'text-[#C026D3]'
  },
  {
    id: 'fingerprint-auth-signature',
    name: 'Fingerprint Authentication & Signature',
    description: 'Fast Sign Digital PDF with biometric fingerprint authorization & tamper protection',
    icon: FingerprintAuthIcon,
    bgColor: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]'
  },
  {
    id: 'pdf-copyright-protection',
    name: 'PDF Copyright Protection',
    description: 'Secure Protect Digital PDF with custom watermarks, copyright text, & DRM',
    icon: PdfCopyrightIcon,
    bgColor: 'bg-[#FFF7ED]',
    iconColor: 'text-[#EA580C]'
  },
  {
    id: 'folder-security',
    name: 'Folder Security',
    description: 'Secure Protect PDF File folders with strong password encryption',
    icon: FolderSecurityIcon,
    bgColor: 'bg-[#FEF2F2]',
    iconColor: 'text-[#DC2626]'
  },

  // Row 5
  {
    id: 'pdf-tools',
    name: 'PDF Tools',
    description: 'All-in-one suite of essential utility tools for PDF management',
    icon: PdfToolsIcon,
    bgColor: 'bg-[#F3E5F5]',
    iconColor: 'text-[#A855F7]'
  },
  {
    id: 'software-about-us',
    name: 'Software About Us',
    description: 'Learn more about our mission, platform architecture, and team',
    icon: SoftwareAboutUsIcon,
    bgColor: 'bg-[#F0FDF4]',
    iconColor: 'text-[#16A34A]'
  },
  {
    id: 'AI-Agent',
    name: 'AI Agent',
    description: 'Interact with our advanced AI agent to automate your PDF workflows',
    icon: Demo1Icon,
    bgColor: 'bg-[#EFF6FF]',
    iconColor: 'text-[#3B82F6]'
  },
  {
    id: 'Contact-Us',
    name: 'Contact Us',
    description: 'Get in touch with our support team for enterprise features and queries',
    icon: Demo2Icon,
    bgColor: 'bg-[#FDF2F8]',
    iconColor: 'text-[#DB2777]'
  }
];
