/**
 * @file ImageProcessing.jsx
 * @description Image Processing sub-page. Provides 32 tools: image editor, flip, crop, resize, rotate, AI enhancement, watermark removal, background removal, OCR, and EXIF metadata editing.
 *
 * Exports:
 *  - ImageProcessingPage, ImageProcessingCard (card), Header, IMAGE_PROCESSING_TOOLS
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
/**
 * @file ImageProcessing.jsx
 * @module components/ImageProcessing
 * @description Master component library for the Image Processing Suite interface.
 * Provides 32 custom SVG tool icon components, an animated hero Header section,
 * and a responsive tool card component with SVG stroke animation effects.
 *
 * @author DeepMind Pair Programming Suite
 * @version 6.1.0
 */
import { ArrowRight } from 'lucide-react';


import ImageEditorPage from './ImageEditorPage';
import FlipImagesPage from './FlipImagesPage';
import CropImagesPage from './CropImagesPage';
import ResizeImagesPage from './ResizeImagesPage';
import RotateImagesPage from './RotateImagesPage';
import EnhanceImagesPage from './EnhanceImagesPage';
import SharpenImagesPage from './SharpenImagesPage';
import AdjustBrightnessPage from './AdjustBrightnessPage';
import AdjustContrastPage from './AdjustContrastPage';
import AdjustSaturationPage from './AdjustSaturationPage';
import AutoColorCorrectionPage from './AutoColorCorrectionPage';
import WhiteBalanceAdjustmentPage from './WhiteBalanceAdjustmentPage';
import GammaCorrectionPage from './GammaCorrectionPage';
import ConvertImageFormatPage from './ConvertImageFormatPage';
import ImageCompressionPage from './ImageCompressionPage';
import ImageUpscalingAISuperResolutionPage from './ImageUpscalingAISuperResolutionPage';
import RemoveBackgroundPage from './RemoveBackgroundPage';
import BackgroundReplacementPage from './BackgroundReplacementPage';
import WatermarkImagesPage from './WatermarkImagesPage';
import ReplaceImagesPage from './ReplaceImagesPage';
import ScanDocumentsPage from './ScanDocumentsPage';
import MultipageScanningPage from './MultipageScanningPage';
import AutoDetectPageBordersPage from './AutoDetectPageBordersPage';
import DeskewImagesPage from './DeskewImagesPage';
import RemoveNoisePage from './RemoveNoisePage';
import PerspectiveCorrectionPage from './PerspectiveCorrectionPage';
import LensDistortionCorrectionPage from './LensDistortionCorrectionPage';
import DeblurImagesAIPage from './DeblurImagesAIPage';
import ImageDenoiseAIPage from './ImageDenoiseAIPage';
import EXIFMetadataEditorPage from './EXIFMetadataEditorPage';
import EXIFMetadataRemoverPage from './EXIFMetadataRemoverPage';
import ImageResolutionDPIConverterPage from './ImageResolutionDPIConverterPage';

const COMPONENT_MAP = {
  'image-editor': ImageEditorPage,
  'flip-images': FlipImagesPage,
  'crop-images': CropImagesPage,
  'resize-images': ResizeImagesPage,
  'rotate-images': RotateImagesPage,
  'enhance-images': EnhanceImagesPage,
  'sharpen-images': SharpenImagesPage,
  'adjust-brightness': AdjustBrightnessPage,
  'adjust-contrast': AdjustContrastPage,
  'adjust-saturation': AdjustSaturationPage,
  'auto-color-correction': AutoColorCorrectionPage,
  'white-balance-adjustment': WhiteBalanceAdjustmentPage,
  'gamma-correction': GammaCorrectionPage,
  'convert-image-format': ConvertImageFormatPage,
  'image-compression': ImageCompressionPage,
  'image-upscaling-ai-super-resolution': ImageUpscalingAISuperResolutionPage,
  'remove-background': RemoveBackgroundPage,
  'background-replacement': BackgroundReplacementPage,
  'watermark-images': WatermarkImagesPage,
  'replace-images': ReplaceImagesPage,
  'scan-documents': ScanDocumentsPage,
  'multi-page-scanning': MultipageScanningPage,
  'auto-detect-page-borders': AutoDetectPageBordersPage,
  'deskew-images': DeskewImagesPage,
  'remove-noise': RemoveNoisePage,
  'perspective-correction': PerspectiveCorrectionPage,
  'lens-distortion-correction': LensDistortionCorrectionPage,
  'deblur-images-ai': DeblurImagesAIPage,
  'image-denoise-ai': ImageDenoiseAIPage,
  'exif-metadata-editor': EXIFMetadataEditorPage,
  'exif-metadata-remover': EXIFMetadataRemoverPage,
  'image-resolution-dpi-converter': ImageResolutionDPIConverterPage,
};
import {
  Edit3,
  FlipHorizontal,
  Crop,
  Maximize2,
  RotateCw,
  Sparkles,
  Zap,
  Sun,
  Contrast,
  Droplet,
  Wand2,
  SunMedium,
  Activity,
  RefreshCw,
  Minimize2,
  TrendingUp,
  Scissors,
  Layers,
  Stamp,
  Replace,
  Scan,
  Files,
  BoxSelect,
  AlignLeft,
  SlidersHorizontal,
  Move,
  Aperture,
  Eye,
  Cpu,
  FileText,
  FileX,
  Grid
} from 'lucide-react';

/* ==========================================================================
   SECTION 1: IMAGE PROCESSING TOOL ICON WRAPPER COMPONENTS (32 ITEMS)
   ========================================================================== */

/** @typedef {Object} IconProps @property {string} [className="w-8 h-8"] - Tailwind CSS sizing & styling classes */

/** @param {IconProps} props @returns {JSX.Element} 1. Image Editor Icon */
function ImageEditorIcon({ className = "w-8 h-8" }) { return <Edit3 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 2. Flip Images Icon */
function FlipImagesIcon({ className = "w-8 h-8" }) { return <FlipHorizontal className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 3. Crop Images Icon */
function CropImagesIcon({ className = "w-8 h-8" }) { return <Crop className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 4. Resize Images Icon */
function ResizeImagesIcon({ className = "w-8 h-8" }) { return <Maximize2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 5. Rotate Images Icon */
function RotateImagesIcon({ className = "w-8 h-8" }) { return <RotateCw className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 6. Enhance Images Icon */
function EnhanceImagesIcon({ className = "w-8 h-8" }) { return <Sparkles className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 7. Sharpen Images Icon */
function SharpenImagesIcon({ className = "w-8 h-8" }) { return <Zap className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 8. Adjust Brightness Icon */
function AdjustBrightnessIcon({ className = "w-8 h-8" }) { return <Sun className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 9. Adjust Contrast Icon */
function AdjustContrastIcon({ className = "w-8 h-8" }) { return <Contrast className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 10. Adjust Saturation Icon */
function AdjustSaturationIcon({ className = "w-8 h-8" }) { return <Droplet className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 11. Auto Color Correction Icon */
function AutoColorCorrectionIcon({ className = "w-8 h-8" }) { return <Wand2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 12. White Balance Adjustment Icon */
function WhiteBalanceAdjustmentIcon({ className = "w-8 h-8" }) { return <SunMedium className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 13. Gamma Correction Icon */
function GammaCorrectionIcon({ className = "w-8 h-8" }) { return <Activity className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 14. Convert Image Format Icon */
function ConvertImageFormatIcon({ className = "w-8 h-8" }) { return <RefreshCw className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 15. Image Compression Icon */
function ImageCompressionIcon({ className = "w-8 h-8" }) { return <Minimize2 className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 16. Image Upscaling (AI Super Resolution) Icon */
function ImageUpscalingIcon({ className = "w-8 h-8" }) { return <TrendingUp className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 17. Remove Background Icon */
function RemoveBackgroundIcon({ className = "w-8 h-8" }) { return <Scissors className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 18. Background Replacement Icon */
function BackgroundReplacementIcon({ className = "w-8 h-8" }) { return <Layers className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 19. Watermark Images Icon */
function WatermarkImagesIcon({ className = "w-8 h-8" }) { return <Stamp className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 20. Replace Images Icon */
function ReplaceImagesIcon({ className = "w-8 h-8" }) { return <Replace className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 21. Scan Documents Icon */
function ScanDocumentsIcon({ className = "w-8 h-8" }) { return <Scan className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 22. Multi-page Scanning Icon */
function MultipageScanningIcon({ className = "w-8 h-8" }) { return <Files className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 23. Auto Detect Page Borders Icon */
function AutoDetectPageBordersIcon({ className = "w-8 h-8" }) { return <BoxSelect className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 24. Deskew Images Icon */
function DeskewImagesIcon({ className = "w-8 h-8" }) { return <AlignLeft className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 25. Remove Noise Icon */
function RemoveNoiseIcon({ className = "w-8 h-8" }) { return <SlidersHorizontal className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 26. Perspective Correction Icon */
function PerspectiveCorrectionIcon({ className = "w-8 h-8" }) { return <Move className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 27. Lens Distortion Correction Icon */
function LensDistortionCorrectionIcon({ className = "w-8 h-8" }) { return <Aperture className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 28. Deblur Images (AI) Icon */
function DeblurImagesIcon({ className = "w-8 h-8" }) { return <Eye className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 29. Image Denoise (AI) Icon */
function ImageDenoiseAiIcon({ className = "w-8 h-8" }) { return <Cpu className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 30. EXIF Metadata Editor Icon */
function ExifMetadataEditorIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 31. EXIF Metadata Remover Icon */
function ExifMetadataRemoverIcon({ className = "w-8 h-8" }) { return <FileX className={className} />; }

/** @param {IconProps} props @returns {JSX.Element} 32. Image Resolution (DPI) Converter Icon */
function ImageResolutionDpiConverterIcon({ className = "w-8 h-8" }) { return <Grid className={className} />; }

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
 * ImageProcessing Tool Card Component
 * Renders an individual interactive feature card with custom SVG badge, responsive typography,
 * subtle hover height expansion, stroke-draw animation, and drop-shadow elevation.
 *
 * @component
 * @param {Object} props Component properties
 * @param {Object} props.tool Tool configuration object (id, name, description, icon, bgColor, iconColor)
 * @param {number} [props.index=0] Staggered animation index multiplier for entrance effect
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
            <SlideInText text="Image Processing & OCR" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Extract images, compress graphics, perform OCR text recognition, and enhance scans.
          </p>
        </div>
      </div>
    </header>
  );
}

export function ImageProcessing({ tool, index = 0, onClick }) {
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

/**
 * Curated palette of 10 pastel background colors and matching vibrant icon colors.
 * Used sequentially to provide visual variety across tool grid cards.
 *
 * @type {Array<{bg: string, icon: string}>}
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
 * IMAGE_PROCESSING_TOOLS Configuration Dataset
 * Array of 32 Image Processing tool objects displayed in the main application grid.
 *
 * @type {Array<{id: string, name: string, description: string, icon: React.ComponentType, bgColor: string, iconColor: string}>}
 */
export const IMAGE_PROCESSING_TOOLS = [
  {
    id: 'image-editor',
    name: 'Image Editor',
    description: 'Comprehensive file organization, folder structures, and document browsing.',
    icon: ImageEditorIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'flip-images',
    name: 'Flip Images',
    description: 'Export documents in custom file formats, naming schemes, and destination paths.',
    icon: FlipImagesIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'crop-images',
    name: 'Crop Images',
    description: 'Import multiple PDF files simultaneously into your workspace in bulk.',
    icon: CropImagesIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'resize-images',
    name: 'Resize Images',
    description: 'Bulk export multiple documents into desired file formats at once.',
    icon: ResizeImagesIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'rotate-images',
    name: 'Rotate Images',
    description: 'Batch rename multiple documents using flexible pattern templates and counters.',
    icon: RotateImagesIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'enhance-images',
    name: 'Enhance Images',
    description: 'Convert batches of documents to target formats with custom settings.',
    icon: EnhanceImagesIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'sharpen-images',
    name: 'Sharpen Images',
    description: 'Send multiple PDF documents directly to your printer queue in one single action.',
    icon: SharpenImagesIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'adjust-brightness',
    name: 'Adjust Brightness',
    description: 'Reduce file size of multiple PDF documents simultaneously without losing quality.',
    icon: AdjustBrightnessIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'adjust-contrast',
    name: 'Adjust Contrast',
    description: 'Apply text or image watermarks to multiple PDF files across defined page ranges.',
    icon: AdjustContrastIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'adjust-saturation',
    name: 'Adjust Saturation',
    description: 'Secure multiple document files with password protection and 256-bit AES encryption.',
    icon: AdjustSaturationIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'auto-color-correction',
    name: 'Auto Color Correction',
    description: 'Remove passwords and permissions security from multiple authorized document files.',
    icon: AutoColorCorrectionIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'white-balance-adjustment',
    name: 'White Balance Adjustment',
    description: 'Search and replace text strings seamlessly across entire document pages.',
    icon: WhiteBalanceAdjustmentIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'gamma-correction',
    name: 'Gamma Correction',
    description: 'Advanced regex search, boolean filters, and proximity keyword queries.',
    icon: GammaCorrectionIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'convert-image-format',
    name: 'Convert Image Format',
    description: 'Create, organize, edit, and navigate structured PDF document outline bookmarks.',
    icon: ConvertImageFormatIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'image-compression',
    name: 'Image Compression',
    description: 'Generate and customize interactive table of contents with page number references.',
    icon: ImageCompressionIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'image-upscaling-ai-super-resolution',
    name: 'Image Upscaling (AI Super Resolution)',
    description: 'Add clickable web URLs and email hyperlinks to text regions across documents.',
    icon: ImageUpscalingIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'remove-background',
    name: 'Remove Background',
    description: 'Link specific text or regions to other pages or chapters inside the document.',
    icon: RemoveBackgroundIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'background-replacement',
    name: 'Background Replacement',
    description: 'Attach cross-document external links to external files, websites, and endpoints.',
    icon: BackgroundReplacementIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'watermark-images',
    name: 'Watermark Images',
    description: 'Define target anchors for precise cross-document and intra-document deep linking.',
    icon: WatermarkImagesIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'replace-images',
    name: 'Replace Images',
    description: 'Quick jump navigation bar with page preview thumbnails and history tracking.',
    icon: ReplaceImagesIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'scan-documents',
    name: 'Scan Documents',
    description: 'Bookmark important documents and frequently visited pages for 1-click access.',
    icon: ScanDocumentsIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'multi-page-scanning',
    name: 'Multi-page Scanning',
    description: 'Modify document title, author, subject, keywords, and creation properties.',
    icon: MultipageScanningIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'auto-detect-page-borders',
    name: 'Auto Detect Page Borders',
    description: 'Inspect hidden document metadata, author details, software version, and logs.',
    icon: AutoDetectPageBordersIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'deskew-images',
    name: 'Deskew Images',
    description: 'Manage standard document info dictionary fields and custom metadata keys.',
    icon: DeskewImagesIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'remove-noise',
    name: 'Remove Noise',
    description: 'Define custom key-value metadata pairs for advanced indexing and cataloging.',
    icon: RemoveNoiseIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'perspective-correction',
    name: 'Perspective Correction',
    description: 'Read and write standardized Adobe XMP metadata packets embedded in documents.',
    icon: PerspectiveCorrectionIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'lens-distortion-correction',
    name: 'Lens Distortion Correction',
    description: 'Manage files attached to PDF documents with full extraction and preview.',
    icon: LensDistortionCorrectionIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'deblur-images-ai',
    name: 'Deblur Images (AI)',
    description: 'Embed supplemental file attachments directly inside document structures.',
    icon: DeblurImagesIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'image-denoise-ai',
    name: 'Image Denoise (AI)',
    description: 'Extract attached files and embedded media assets to local storage folders.',
    icon: ImageDenoiseAiIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'exif-metadata-editor',
    name: 'EXIF Metadata Editor',
    description: 'Delete unwanted embedded files to clean up document container size.',
    icon: ExifMetadataEditorIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'exif-metadata-remover',
    name: 'EXIF Metadata Remover',
    description: 'Create reusable document layouts and standardized form structures.',
    icon: ExifMetadataRemoverIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'image-resolution-dpi-converter',
    name: 'Image Resolution (DPI) Converter',
    description: 'Access curated library of pre-built professional document templates.',
    icon: ImageResolutionDpiConverterIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  }
];

export function ImageProcessingPage({ onBack, searchQuery = "" }) {
    const [selectedTool, setSelectedTool] = React.useState(() => {
    const hashParts = window.location.hash.replace('#', '').split('/');
    if (hashParts.length > 1) {
      const toolId = hashParts[1];
      return IMAGE_PROCESSING_TOOLS.find(t => t.id === toolId) || null;
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
          <button onClick={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }}
            className="absolute top-1.5 left-3 sm:top-5 sm:left-6 md:left-10 z-50 text-[#1e2a52] hover:text-blue-950 font-bold flex items-center gap-1.5 sm:gap-2 bg-white/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm backdrop-blur-md border border-slate-200/90 transition-all hover:shadow-md hover:scale-105 cursor-pointer text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 text-[#1e2a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span>Back to Tools</span>
          </button>
          <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4 relative z-40">
            <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
              {selectedTool.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              {selectedTool.description}
            </p>
          </div>
          <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full">
            <Component tool={selectedTool} onBack={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }} />
          </div>
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
            {IMAGE_PROCESSING_TOOLS.filter(tool => {
              const q = (searchQuery || "").trim().toLowerCase();
              if (!q) return true;
              const name = (tool.name || tool.title || "").toLowerCase(); return name.includes(q);
            }).map((tool, idx) => (
              <ImageProcessing
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
