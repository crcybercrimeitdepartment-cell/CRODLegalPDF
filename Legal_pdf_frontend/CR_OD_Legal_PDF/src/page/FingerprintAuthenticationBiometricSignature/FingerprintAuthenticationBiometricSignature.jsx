/**
 * @file FingerprintAuthenticationBiometricSignature.jsx
 * @description Fingerprint Authentication & Biometric Signature sub-page. Provides 40 biometric tools: fingerprint capture, face scan, voice, iris, palm, hand-vein recognition, and tamper-evident signatures.
 *
 * Exports:
 *  - FingerprintAuthenticationBiometricSignaturePage, FingerprintAuthCard (card), Header, BIOMETRIC_TOOLS
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
/**
 * @file FingerprintAuthenticationBiometricSignature.jsx
 * @module components/FingerprintAuthenticationBiometricSignature
 * @description Master component library for Fingerprint Authentication & Biometric Signature interface.
 * Provides 40 custom biometric icon components, an animated hero Header section,
 * and a responsive tool card component with SVG stroke animation effects.
 *
 * @author DeepMind Pair Programming Suite
 * @version 6.1.0
 */
import { ArrowRight } from 'lucide-react';

import {
  Fingerprint,
  ScanFace,
  Eye,
  Hand,
  Mic,
  PenTool,
  Lock,
  Unlock,
  FileKey,
  Download,
  Upload,
  Copy,
  RotateCcw,
  ShieldCheck,
  History,
  ClipboardList,
  Clock,
  Award,
  Key,
  Archive,
  CalendarX,
  XCircle,
  RefreshCw,
  Sliders,
  GitCompare,
  Layers,
  UserCheck,
  UserX,
  FileSignature
} from 'lucide-react';

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

export const BIOMETRIC_TOOLS = [
  /* --------------------------------------------------------------------------
   * CATEGORY 1: FINGERPRINT AUTHENTICATION & MATCHING TOOLS (ITEMS 1-6)
   * -------------------------------------------------------------------------- */
  // 1. Add Fingerprint
  {
    id: 'add-fingerprint',
    name: 'Add Fingerprint',
    description: 'Enroll a new biometric fingerprint profile for identity verification and document signing.',
    icon: Fingerprint,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  // 2. Remove Fingerprint
  {
    id: 'remove-fingerprint',
    name: 'Remove Fingerprint',
    description: 'Revoke or delete an enrolled fingerprint template from the biometric security registry.',
    icon: Fingerprint,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  // 3. Replace Fingerprint
  {
    id: 'replace-fingerprint',
    name: 'Replace Fingerprint',
    description: 'Update and re-register an existing fingerprint template with a fresh high-resolution scan.',
    icon: RefreshCw,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  // 4. Update Fingerprint
  {
    id: 'update-fingerprint',
    name: 'Update Fingerprint',
    description: 'Modify biometric metadata, quality thresholds, or expiration dates for enrolled prints.',
    icon: Sliders,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  // 5. Verify Fingerprint
  {
    id: 'verify-fingerprint',
    name: 'Verify Fingerprint',
    description: 'Perform 1:1 live fingerprint verification against stored biometric credentials.',
    icon: ShieldCheck,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  // 6. Fingerprint Matching
  {
    id: 'fingerprint-matching',
    name: 'Fingerprint Matching',
    description: 'Run automated minutiae matching algorithms across multi-gallery biometric databases.',
    icon: GitCompare,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 2: MULTIMODAL BIOMETRIC SIGNATURES (ITEMS 7-18)
   * -------------------------------------------------------------------------- */
  // 7. Add Face Signature
  {
    id: 'add-face-signature',
    name: 'Add Face Signature',
    description: 'Register 3D facial recognition vector signature for biometric document authorization.',
    icon: ScanFace,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  // 8. Remove Face Signature
  {
    id: 'remove-face-signature',
    name: 'Remove Face Signature',
    description: 'Delete face signature template and associated biometric facial feature vectors.',
    icon: UserX,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  // 9. Verify Face Signature
  {
    id: 'verify-face-signature',
    name: 'Verify Face Signature',
    description: 'Authenticate signer identity using real-time liveness and facial feature matching.',
    icon: UserCheck,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  // 10. Add Iris Signature
  {
    id: 'add-iris-signature',
    name: 'Add Iris Signature',
    description: 'Enroll high-precision iris scan signature for maximum security authentication.',
    icon: Eye,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  // 11. Remove Iris Signature
  {
    id: 'remove-iris-signature',
    name: 'Remove Iris Signature',
    description: 'De-register iris biometric signature profile from secure cryptographic key store.',
    icon: Eye,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  // 12. Verify Iris Signature
  {
    id: 'verify-iris-signature',
    name: 'Verify Iris Signature',
    description: 'Perform instant optical iris pattern verification for document seal validation.',
    icon: ShieldCheck,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  // 13. Add Palm Signature
  {
    id: 'add-palm-signature',
    name: 'Add Palm Signature',
    description: 'Register palm print and vascular vein pattern signature for touchless signing.',
    icon: Hand,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  // 14. Remove Palm Signature
  {
    id: 'remove-palm-signature',
    name: 'Remove Palm Signature',
    description: 'Purge registered palm print and vascular pattern biometric signature records.',
    icon: Hand,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  // 15. Verify Palm Signature
  {
    id: 'verify-palm-signature',
    name: 'Verify Palm Signature',
    description: 'Match live palm vein and surface scan with authorized biometric signatures.',
    icon: ShieldCheck,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  // 16. Add Voice Signature
  {
    id: 'add-voice-signature',
    name: 'Add Voice Signature',
    description: 'Enroll acoustic voiceprint biometric signature for verbal approval validation.',
    icon: Mic,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  // 17. Remove Voice Signature
  {
    id: 'remove-voice-signature',
    name: 'Remove Voice Signature',
    description: 'Remove voice cadence and spectral biometric signature authorization credentials.',
    icon: Mic,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  // 18. Verify Voice Signature
  {
    id: 'verify-voice-signature',
    name: 'Verify Voice Signature',
    description: 'Validate audio biometric signature against enrolled voice spectral models.',
    icon: ShieldCheck,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 3: HANDWRITTEN BIOMETRIC SIGNATURES (ITEMS 19-21)
   * -------------------------------------------------------------------------- */
  // 19. Add Handwritten Biometric Signature
  {
    id: 'add-handwritten-biometric-signature',
    name: 'Add Handwritten Biometric Signature',
    description: 'Capture dynamic handwritten signature stroke speed, pressure, and pen trajectory.',
    icon: PenTool,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  // 20. Remove Handwritten Biometric Signature
  {
    id: 'remove-handwritten-biometric-signature',
    name: 'Remove Handwritten Biometric Signature',
    description: 'Delete dynamic handwritten biometric signature profile from secure key store.',
    icon: PenTool,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  // 21. Verify Handwritten Signature
  {
    id: 'verify-handwritten-signature',
    name: 'Verify Handwritten Signature',
    description: 'Verify pen pressure, velocity vector, and stroke geometry against enrolled templates.',
    icon: FileSignature,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 4: BIOMETRIC LIFECYCLE & ACCESS CONTROL (ITEMS 22-30)
   * -------------------------------------------------------------------------- */
  // 22. Replace Biometric Signature
  {
    id: 'replace-biometric-signature',
    name: 'Replace Biometric Signature',
    description: 'Swap active biometric signature key with an updated multi-modal credential.',
    icon: RefreshCw,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  // 23. Lock Biometric Signature
  {
    id: 'lock-biometric-signature',
    name: 'Lock Biometric Signature',
    description: 'Freeze biometric signature capability on sensitive documents against edits.',
    icon: Lock,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  // 24. Unlock Biometric Signature
  {
    id: 'unlock-biometric-signature',
    name: 'Unlock Biometric Signature',
    description: 'Unfreeze biometric signature verification capability using master admin authority.',
    icon: Unlock,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  // 25. Extract Biometric Signature
  {
    id: 'extract-biometric-signature',
    name: 'Extract Biometric Signature',
    description: 'Extract embedded biometric signature metadata and raw vector validation payload.',
    icon: FileKey,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  // 26. Export Biometric Signature
  {
    id: 'export-biometric-signature',
    name: 'Export Biometric Signature',
    description: 'Export encrypted biometric signature package for offline auditing and compliance.',
    icon: Download,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  // 27. Import Biometric Signature
  {
    id: 'import-biometric-signature',
    name: 'Import Biometric Signature',
    description: 'Load externally signed biometric signature bundle into active document workspace.',
    icon: Upload,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  // 28. Clone Biometric Signature (Admin)
  {
    id: 'clone-biometric-signature-admin',
    name: 'Clone Biometric Signature (Admin)',
    description: 'Administrative tool to duplicate authorized biometric templates for failover backups.',
    icon: Copy,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  // 29. Reuse Biometric Signature
  {
    id: 'reuse-biometric-signature',
    name: 'Reuse Biometric Signature',
    description: 'Apply verified biometric signature to multiple batch documents in a secure session.',
    icon: RotateCcw,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  // 30. Multi-Biometric Signature
  {
    id: 'multi-biometric-signature',
    name: 'Multi-Biometric Signature',
    description: 'Combine fingerprint, face, and iris signatures for multi-factor authorization.',
    icon: Layers,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 5: SECURITY, AUDIT & PKI VALIDATION (ITEMS 31-36)
   * -------------------------------------------------------------------------- */
  // 31. Biometric Signature History
  {
    id: 'biometric-signature-history',
    name: 'Biometric Signature History',
    description: 'Access complete historical log of all biometric signature operations and events.',
    icon: History,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  // 32. Biometric Signature Audit Trail
  {
    id: 'biometric-signature-audit-trail',
    name: 'Biometric Signature Audit Trail',
    description: 'Generate tamper-evident forensic audit logs for regulatory ISO/IEC compliance.',
    icon: ClipboardList,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  // 33. Biometric Signature Validation
  {
    id: 'biometric-signature-validation',
    name: 'Biometric Signature Validation',
    description: 'Validate cryptographic hash integrity and biometric certificate authority chain.',
    icon: ShieldCheck,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  // 34. Biometric Signature Timestamp
  {
    id: 'biometric-signature-timestamp',
    name: 'Biometric Signature Timestamp',
    description: 'Apply RFC 3161 compliant cryptographic timestamp to biometric signatures.',
    icon: Clock,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  // 35. Biometric Signature Certificate Binding
  {
    id: 'biometric-signature-certificate-binding',
    name: 'Biometric Signature Certificate Binding',
    description: 'Bind PKI digital X.509 certificate to biometric signature payload securely.',
    icon: Award,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  // 36. Biometric Signature Encryption
  {
    id: 'biometric-signature-encryption',
    name: 'Biometric Signature Encryption',
    description: 'Encrypt biometric vectors using AES-256 GCM envelope encryption standards.',
    icon: Key,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },

  /* --------------------------------------------------------------------------
   * CATEGORY 6: VAULT, LIFESPAN & REVOCATION (ITEMS 37-40)
   * -------------------------------------------------------------------------- */
  // 37. Biometric Signature Backup
  {
    id: 'biometric-signature-backup',
    name: 'Biometric Signature Backup',
    description: 'Securely back up biometric templates to encrypted cloud vault storage.',
    icon: Archive,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  // 38. Restore Biometric Signature
  {
    id: 'restore-biometric-signature',
    name: 'Restore Biometric Signature',
    description: 'Restore biometric signature keys and profiles from encrypted backup archive.',
    icon: RotateCcw,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  // 39. Biometric Signature Expiration
  {
    id: 'biometric-signature-expiration',
    name: 'Biometric Signature Expiration',
    description: 'Configure validity duration and auto-expiration policies for biometric signatures.',
    icon: CalendarX,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  // 40. Biometric Signature Revocation
  {
    id: 'biometric-signature-revocation',
    name: 'Biometric Signature Revocation',
    description: 'Revoke compromised biometric signatures via CRL and live OCSP protocol.',
    icon: XCircle,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
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
 * FingerprintAuthenticationBiometricSignature Tool Card Component
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
            <SlideInText text="Biometric & Fingerprint Auth" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Secure your PDF documents using biometric fingerprint authentication and secure signatures.
          </p>
        </div>
      </div>
    </header>
  );
}

export function FingerprintAuthenticationBiometricSignature({ tool, index = 0, onClick }) {
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

      <div className="w-8 h-10 sm:w-13 sm:h-15 shrink-0 relative flex items-center justify-center group-hover:scale-108 transition-transform duration-200 mt-0.5" style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.06))" }}>
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
        <div className={`relative ${toolIconColor}`} style={{ zIndex: 2 }}>
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

export function FingerprintAuthenticationBiometricSignaturePage({ onBack, searchQuery = "" }) {
    const [selectedTool, setSelectedTool] = React.useState(() => {
    const hashParts = window.location.hash.replace('#', '').split('/');
    if (hashParts.length > 1) {
      const toolId = hashParts[1];
      return BIOMETRIC_TOOLS.find(t => t.id === toolId) || null;
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
            {BIOMETRIC_TOOLS.filter(tool => {
              const q = (searchQuery || "").trim().toLowerCase();
              if (!q) return true;
              const name = (tool.name || tool.title || "").toLowerCase(); return name.includes(q);
            }).map((tool, idx) => (
              <FingerprintAuthenticationBiometricSignature
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
