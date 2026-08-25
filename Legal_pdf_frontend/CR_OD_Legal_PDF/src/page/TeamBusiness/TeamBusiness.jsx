/**
 * @file TeamBusiness.jsx
 * @description Team & Business sub-page. Provides 32 enterprise tools: team management, SSO, batch processing, role-based access, shared workspaces, compliance reporting, and enterprise integrations.
 *
 * Exports:
 *  - TeamBusinessPage, TeamBusinessCard (card), Header, TEAM_BUSINESS_TOOLS
 */
import React from 'react';
import SlideInText from '../../components/SlideInText';
import ToolWorkspace from '../ToolWorkspace';
import {
  ArrowRight,
  Users,
  Globe,
  Shield,
  Layers,
  Sparkles,
  HelpCircle,
  Infinity as InfinityIcon,
  HardDrive,
  Layout,
  UserCheck,
  Share2,
  Box,
  MessageSquare,
  PenTool,
  Reply,
  CheckCircle2,
  Activity,
  FileCheck,
  ClipboardList,
  History,
  GitCompare,
  Lock,
  Grid,
  Cloud,
  Database,
  Server,
  UserCog,
  Sliders,
  CreditCard,
  ShieldCheck,
  Palette
} from 'lucide-react';

/* ==========================================================================
   1. TEAM & BUSINESS ICON COMPONENTS (32 TOOLS)
   Har icon component Lucide React ke basic icons ko custom styling ke sath wrap karta hai.
   ========================================================================== */

// 1. Team Management - Administrative access & role management
function TeamManagementIcon({ className = "w-8 h-8" }) { return <Users className={className} />; }

// 2. Regional File Processing - Localized data storage & compliance
function RegionalFileProcessingIcon({ className = "w-8 h-8" }) { return <Globe className={className} />; }

// 3. Single Sign-On (SSO) - Enterprise SAML 2.0 & Okta authentication
function SingleSignOnIcon({ className = "w-8 h-8" }) { return <Shield className={className} />; }

// 4. Batch Processing - Multi-file bulk processing actions
function BatchProcessingIcon({ className = "w-8 h-8" }) { return <Layers className={className} />; }

// 5. AI Credits - High-volume document summarization credits
function AiCreditsIcon({ className = "w-8 h-8" }) { return <Sparkles className={className} />; }

// 6. Priority Support - 24/7 dedicated support engineers
function PrioritySupportIcon({ className = "w-8 h-8" }) { return <HelpCircle className={className} />; }

// 7. Unlimited Document Processing (Premium) - No daily processing limits
function UnlimitedDocumentProcessingIcon({ className = "w-8 h-8" }) { return <InfinityIcon className={className} />; }

// 8. Unlimited File Size (Premium) - Heavy document upload support
function UnlimitedFileSizeIcon({ className = "w-8 h-8" }) { return <HardDrive className={className} />; }

// 9. Ad-Free Workspace (Premium) - Clean distraction-free environment
function AdFreeWorkspaceIcon({ className = "w-8 h-8" }) { return <Layout className={className} />; }

// 10. Dedicated Account Manager (Business Plan) - Onboarding & consultations
function DedicatedAccountManagerIcon({ className = "w-8 h-8" }) { return <UserCheck className={className} />; }

// 11. Real-time Collaboration - Live document co-editing & review
function RealtimeCollaborationIcon({ className = "w-8 h-8" }) { return <Share2 className={className} />; }

// 12. Shared Workspace - Centralized team document repository
function SharedWorkspaceIcon({ className = "w-8 h-8" }) { return <Box className={className} />; }

// 13. Shared Comments - Discussion threads & callouts
function SharedCommentsIcon({ className = "w-8 h-8" }) { return <MessageSquare className={className} />; }

// 14. Annotation Sharing - Instant highlights & markup sharing
function AnnotationSharingIcon({ className = "w-8 h-8" }) { return <PenTool className={className} />; }

// 15. Reply to Comments - Page-level discussion replies
function ReplyToCommentsIcon({ className = "w-8 h-8" }) { return <Reply className={className} />; }

// 16. Resolve Comments - Mark document feedback as resolved
function ResolveCommentsIcon({ className = "w-8 h-8" }) { return <CheckCircle2 className={className} />; }

// 17. Review Tracking - Reader progress & sign-off monitoring
function ReviewTrackingIcon({ className = "w-8 h-8" }) { return <Activity className={className} />; }

// 18. Approval Requests - Multi-stage approval routing
function ApprovalRequestsIcon({ className = "w-8 h-8" }) { return <FileCheck className={className} />; }

// 19. Approval Status Tracking - Milestones & timestamp audit logs
function ApprovalStatusTrackingIcon({ className = "w-8 h-8" }) { return <ClipboardList className={className} />; }

// 20. Restore Previous Versions - Revert document revisions
function RestorePreviousVersionsIcon({ className = "w-8 h-8" }) { return <History className={className} />; }

// 21. Compare Versions - Side-by-side file comparison & diffing
function CompareVersionsIcon({ className = "w-8 h-8" }) { return <GitCompare className={className} />; }

// 22. Team Permissions - Role-based access control (RBAC)
function TeamPermissionsIcon({ className = "w-8 h-8" }) { return <Lock className={className} />; }

// 23. Microsoft 365 Integration - Word, Excel & Teams document workflow
function Microsoft365IntegrationIcon({ className = "w-8 h-8" }) { return <Grid className={className} />; }

// 24. Google Workspace Integration - Google Drive & Docs sync
function GoogleWorkspaceIntegrationIcon({ className = "w-8 h-8" }) { return <Cloud className={className} />; }

// 25. OneDrive for Business - Enterprise Microsoft OneDrive syncing
function OneDriveForBusinessIcon({ className = "w-8 h-8" }) { return <Cloud className={className} />; }

// 26. Salesforce Integration - Attach & generate PDFs in Salesforce CRM
function SalesforceIntegrationIcon({ className = "w-8 h-8" }) { return <Database className={className} />; }

// 27. Enterprise Cloud Integration - AWS S3 & Azure Blob storage
function EnterpriseCloudIntegrationIcon({ className = "w-8 h-8" }) { return <Server className={className} />; }

// 28. SCIM User Provisioning - Automated user onboarding & deprovisioning
function ScimUserProvisioningIcon({ className = "w-8 h-8" }) { return <UserCog className={className} />; }

// 29. System Management - Central administrator security controls
function SystemManagementIcon({ className = "w-8 h-8" }) { return <Sliders className={className} />; }

// 30. Subscription Management - License allocation & invoice billing
function SubscriptionManagementIcon({ className = "w-8 h-8" }) { return <CreditCard className={className} />; }

// 31. Audit Logs & Activity Monitoring - Comprehensive security tracking
function AuditLogsActivityMonitoringIcon({ className = "w-8 h-8" }) { return <ShieldCheck className={className} />; }

// 32. Custom Branding (White Label) - Company logos & brand styling
function CustomBrandingWhiteLabelIcon({ className = "w-8 h-8" }) { return <Palette className={className} />; }

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
 * TEAM_BUSINESS_TOOLS Array
 * List of 32 tool configurations displayed in the main application grid.
 */
export const TEAM_BUSINESS_TOOLS = [
  {
    id: 'team-management',
    name: 'Team Management',
    description: 'Manage members, roles, and administrative access controls across your organization.',
    icon: TeamManagementIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'regional-file-processing',
    name: 'Regional File Processing',
    description: 'Process and store documents in localized data centers for strict data compliance.',
    icon: RegionalFileProcessingIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'single-sign-on',
    name: 'Single Sign-On (SSO)',
    description: 'Authenticate seamlessly using enterprise SAML 2.0, Okta, Azure AD, or OAuth.',
    icon: SingleSignOnIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'batch-processing',
    name: 'Batch Processing',
    description: 'Execute automated actions on hundreds of PDF files simultaneously in seconds.',
    icon: BatchProcessingIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'ai-credits',
    name: 'AI Credits',
    description: 'Flexible credit allocation for high-volume document summarization and insights.',
    icon: AiCreditsIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'priority-support',
    name: 'Priority Support',
    description: '24/7 direct access to dedicated technical support engineers with fast SLA responses.',
    icon: PrioritySupportIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'unlimited-document-processing',
    name: 'Unlimited Document Processing (Premium)',
    description: 'Process unlimited files without daily limits or volume constraints.',
    icon: UnlimitedDocumentProcessingIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'unlimited-file-size',
    name: 'Unlimited File Size (Premium)',
    description: 'Upload and edit massive PDF documents without size or page restrictions.',
    icon: UnlimitedFileSizeIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'ad-free-workspace',
    name: 'Ad-Free Workspace (Premium)',
    description: 'Enjoy a clean, distraction-free environment optimized for maximum team productivity.',
    icon: AdFreeWorkspaceIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'dedicated-account-manager',
    name: 'Dedicated Account Manager (Business Plan)',
    description: 'Get personalized onboarding, workflow consultations, and enterprise support.',
    icon: DedicatedAccountManagerIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'realtime-collaboration',
    name: 'Real-time Collaboration',
    description: 'Co-edit and review PDF documents live with team members across devices.',
    icon: RealtimeCollaborationIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'shared-workspace',
    name: 'Shared Workspace',
    description: 'Centralized cloud repository for organizing team documents, templates, and assets.',
    icon: SharedWorkspaceIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'shared-comments',
    name: 'Shared Comments',
    description: 'Collaborative commenting threads with contextual document callouts and tags.',
    icon: SharedCommentsIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'annotation-sharing',
    name: 'Annotation Sharing',
    description: 'Share highlights, drawings, callouts, and markup layers instantly with team members.',
    icon: AnnotationSharingIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'reply-to-comments',
    name: 'Reply to Comments',
    description: 'Engage in structured discussion threads directly inside document pages.',
    icon: ReplyToCommentsIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'resolve-comments',
    name: 'Resolve Comments',
    description: 'Mark discussions as completed to keep document reviews organized and clear.',
    icon: ResolveCommentsIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'review-tracking',
    name: 'Review Tracking',
    description: 'Monitor reader progress, pending sign-offs, and reviewer activity in real time.',
    icon: ReviewTrackingIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'approval-requests',
    name: 'Approval Requests',
    description: 'Route documents through formal multi-stage approval workflows automatically.',
    icon: ApprovalRequestsIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'approval-status-tracking',
    name: 'Approval Status Tracking',
    description: 'Track approval bottlenecks, pending signatures, and timestamped audit milestones.',
    icon: ApprovalStatusTrackingIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'restore-previous-versions',
    name: 'Restore Previous Versions',
    description: 'Revert to any historic revision with complete change history and rollbacks.',
    icon: RestorePreviousVersionsIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'compare-versions',
    name: 'Compare Versions',
    description: 'Side-by-side visual and text diffing to identify changes between file versions.',
    icon: CompareVersionsIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'team-permissions',
    name: 'Team Permissions',
    description: 'Granular role-based access control (RBAC) for viewing, editing, and sharing.',
    icon: TeamPermissionsIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  },
  {
    id: 'microsoft-365-integration',
    name: 'Microsoft 365 Integration',
    description: 'Direct integration with Word, Excel, PowerPoint, and Teams document flows.',
    icon: Microsoft365IntegrationIcon,
    bgColor: colors[2].bg,
    iconColor: colors[2].icon
  },
  {
    id: 'google-workspace-integration',
    name: 'Google Workspace Integration',
    description: 'Seamlessly open, edit, and save PDFs directly within Google Drive and Docs.',
    icon: GoogleWorkspaceIntegrationIcon,
    bgColor: colors[3].bg,
    iconColor: colors[3].icon
  },
  {
    id: 'onedrive-for-business',
    name: 'OneDrive for Business',
    description: 'Enterprise Microsoft OneDrive file syncing with encrypted cloud backup.',
    icon: OneDriveForBusinessIcon,
    bgColor: colors[4].bg,
    iconColor: colors[4].icon
  },
  {
    id: 'salesforce-integration',
    name: 'Salesforce Integration',
    description: 'Attach, generate, and process PDFs directly within Salesforce CRM records.',
    icon: SalesforceIntegrationIcon,
    bgColor: colors[5].bg,
    iconColor: colors[5].icon
  },
  {
    id: 'enterprise-cloud-integration',
    name: 'Enterprise Cloud Integration',
    description: 'Connect custom AWS S3, Azure Blob, or private S3-compatible cloud storage.',
    icon: EnterpriseCloudIntegrationIcon,
    bgColor: colors[6].bg,
    iconColor: colors[6].icon
  },
  {
    id: 'scim-user-provisioning',
    name: 'SCIM User Provisioning',
    description: 'Automate user onboarding and deprovisioning via standard SCIM 2.0 protocol.',
    icon: ScimUserProvisioningIcon,
    bgColor: colors[7].bg,
    iconColor: colors[7].icon
  },
  {
    id: 'system-management',
    name: 'System Management',
    description: 'Central administrator dashboard for managing policies, security, and global settings.',
    icon: SystemManagementIcon,
    bgColor: colors[8].bg,
    iconColor: colors[8].icon
  },
  {
    id: 'subscription-management',
    name: 'Subscription Management',
    description: 'Manage seat licenses, plan upgrades, invoices, and billing contact details.',
    icon: SubscriptionManagementIcon,
    bgColor: colors[9].bg,
    iconColor: colors[9].icon
  },
  {
    id: 'audit-logs-activity-monitoring',
    name: 'Audit Logs & Activity Monitoring',
    description: 'Comprehensive security audit logs tracking every file action, download, and login.',
    icon: AuditLogsActivityMonitoringIcon,
    bgColor: colors[0].bg,
    iconColor: colors[0].icon
  },
  {
    id: 'custom-branding-white-label',
    name: 'Custom Branding (White Label)',
    description: 'Apply your company logo, custom domain, and brand colors across all PDF tools.',
    icon: CustomBrandingWhiteLabelIcon,
    bgColor: colors[1].bg,
    iconColor: colors[1].icon
  }
];

/* ==========================================================================
   2. HEADER COMPONENT WITH FLOATING BRANDING & DECORATIVE ANIMATIONS
   Header component handles top page branding, main title, subtitle, floating SVG file badges,
   aur background dashed curve lines.
   ========================================================================== */

/**
 * Header Component
 * Renders top hero section with dynamic floating file badges and gradient title.
 */


/* ==========================================================================
   3. TEAM & BUSINESS TOOL CARD COMPONENT
   Component displaying each Team & Business feature card in the grid.
   Includes slide-in entrance animations, hover expansion, icon badge, and action link.
   ========================================================================== */

/**
 * TeamBusiness Component
 * Renders individual feature tool card inside grid.
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
            <SlideInText text="Team & Business" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Collaborate with team members, manage enterprise documents, and streamline workflows.
          </p>
        </div>
      </div>
    </header>
  );
}

export function TeamBusiness({ tool, index = 0, onClick }) {
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

export function TeamBusinessPage({ onBack, searchQuery = "" }) {
    const [selectedTool, setSelectedTool] = React.useState(() => {
    const hashParts = window.location.hash.replace('#', '').split('/');
    if (hashParts.length > 1) {
      const toolId = hashParts[1];
      return TEAM_BUSINESS_TOOLS.find(t => t.id === toolId) || null;
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
            {TEAM_BUSINESS_TOOLS.filter(tool => {
              const q = (searchQuery || "").trim().toLowerCase();
              if (!q) return true;
              const name = (tool.name || tool.title || "").toLowerCase(); return name.includes(q);
            }).map((tool, idx) => (
              <TeamBusiness
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
