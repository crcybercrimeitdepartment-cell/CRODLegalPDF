import React from 'react';
import ToolWorkspace from '../ToolWorkspace';
import SlideInText from '../../components/SlideInText';
import AiInnovationPage from './AiInnovation/AiInnovationPage';
import ContactAndSupportPage from './ContactAndSupport/ContactAndSupportPage';
import DataProtectionPage from './DataProtection/DataProtectionPage';
import GlobalPresencePage from './GlobalPresence/GlobalPresencePage';
import LegalPDFIntroductionPage from './LegalPDFIntroduction/LegalPDFIntroductionPage';
import LegalPDFOverviewPage from './LegalPDFOverview/LegalPDFOverviewPage';
import OurCoreValuesPage from './OurCoreValues/OurCoreValuesPage';
import OurMissionPage from './OurMission/OurMissionPage';
import OurServicesPage from './OurServices/OurServicesPage';
import OurVisionPage from './OurVision/OurVisionPage';
import PerformanceAndReliabilityPage from './PerformanceAndReliability/PerformanceAndReliabilityPage';
import ProductRoadmapPage from './ProductRoadmap/ProductRoadmapPage';
import ProductStatisticsPage from './ProductStatistics/ProductStatisticsPage';
import QualityAssurancePage from './QualityAssurance/QualityAssurancePage';
import ResearchAndDevelopmentPage from './ResearchAndDevelopment/ResearchAndDevelopmentPage';
import TechnologyStackPage from './TechnologyStack/TechnologyStackPage';
import WhoWeArePage from './WhoWeAre/WhoWeArePage';
import WhyChooseUsPage from './WhyChooseUs/WhyChooseUsPage';
import WorkflowAutomationPage from './WorkflowAutomation/WorkflowAutomationPage';

const PAGE_MAP = {
  'legal-pdf-intro': LegalPDFIntroductionPage,
  'legal-pdf-overview': LegalPDFOverviewPage,
  'who-we-are': WhoWeArePage,
  'our-mission': OurMissionPage,
  'our-vision': OurVisionPage,
  'our-core-values': OurCoreValuesPage,
  'why-choose-us': WhyChooseUsPage,
  'ai-innovation': AiInnovationPage,
  'our-services': OurServicesPage,
  'technology-stack': TechnologyStackPage,
  'product-statistics': ProductStatisticsPage,
  'global-presence': GlobalPresencePage,
  'product-roadmap': ProductRoadmapPage,
  'contact-support': ContactAndSupportPage,
  'research-development': ResearchAndDevelopmentPage,
  'quality-assurance': QualityAssurancePage,
  'performance-reliability': PerformanceAndReliabilityPage,
  'data-protection': DataProtectionPage,
  'workflow-automation': WorkflowAutomationPage
};

import {
  Info,
  BookOpen,
  Users,
  Target,
  Eye,
  Clock,
  Heart,
  CheckCircle,
  Zap,
  Briefcase,
  Code,
  BarChart,
  Globe,
  Map,
  PhoneCall,
  FlaskConical,
  ShieldCheck,
  Activity,
  Lock,
  Workflow,
  FileText,
  Key,
  Shield,
  EyeOff,
  Archive,
  Edit3,
  FileSignature,
  AlertTriangle,
  AlertCircle,
  FileCode,
  ArrowRight
} from 'lucide-react';

/* ==========================================================================
   1. CUSTOM PDF TOOL ICONS
   ========================================================================== */
function IntroIcon({ className = "w-8 h-8" }) { return <Info className={className} />; }
function OverviewIcon({ className = "w-8 h-8" }) { return <BookOpen className={className} />; }
function WhoWeAreIcon({ className = "w-8 h-8" }) { return <Users className={className} />; }
function MissionIcon({ className = "w-8 h-8" }) { return <Target className={className} />; }
function VisionIcon({ className = "w-8 h-8" }) { return <Eye className={className} />; }
function TimelineIcon({ className = "w-8 h-8" }) { return <Clock className={className} />; }
function CoreValuesIcon({ className = "w-8 h-8" }) { return <Heart className={className} />; }
function ChooseUsIcon({ className = "w-8 h-8" }) { return <CheckCircle className={className} />; }
function AiIcon({ className = "w-8 h-8" }) { return <Zap className={className} />; }
function ServicesIcon({ className = "w-8 h-8" }) { return <Briefcase className={className} />; }
function TechStackIcon({ className = "w-8 h-8" }) { return <Code className={className} />; }
function StatsIcon({ className = "w-8 h-8" }) { return <BarChart className={className} />; }
function GlobalIcon({ className = "w-8 h-8" }) { return <Globe className={className} />; }
function RoadmapIcon({ className = "w-8 h-8" }) { return <Map className={className} />; }
function ContactIcon({ className = "w-8 h-8" }) { return <PhoneCall className={className} />; }
function RandDIcon({ className = "w-8 h-8" }) { return <FlaskConical className={className} />; }
function QaIcon({ className = "w-8 h-8" }) { return <ShieldCheck className={className} />; }
function PerformanceIcon({ className = "w-8 h-8" }) { return <Activity className={className} />; }
function DataProtectionIcon({ className = "w-8 h-8" }) { return <Lock className={className} />; }
function WorkflowIcon({ className = "w-8 h-8" }) { return <Workflow className={className} />; }
function PrivacyIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
function DataPolicyIcon({ className = "w-8 h-8" }) { return <Shield className={className} />; }
function TermsIcon({ className = "w-8 h-8" }) { return <FileText className={className} />; }
function IntellectualPropertyIcon({ className = "w-8 h-8" }) { return <Key className={className} />; }
function InfoSecurityIcon({ className = "w-8 h-8" }) { return <Lock className={className} />; }
function ConfidentialityIcon({ className = "w-8 h-8" }) { return <EyeOff className={className} />; }
function RecordsMgmtIcon({ className = "w-8 h-8" }) { return <Archive className={className} />; }
function ElectronicSigIcon({ className = "w-8 h-8" }) { return <FileSignature className={className} />; }
function DigitalDocIcon({ className = "w-8 h-8" }) { return <Edit3 className={className} />; }
function IncidentRespIcon({ className = "w-8 h-8" }) { return <AlertTriangle className={className} />; }
function DisclaimerIcon({ className = "w-8 h-8" }) { return <AlertCircle className={className} />; }
function OpenSourceIcon({ className = "w-8 h-8" }) { return <FileCode className={className} />; }

/* ==========================================================================
   3. SOFTWARE ABOUT US TOOL CARD COMPONENT
   ========================================================================== */
export function SoftwareAboutUsCard({ tool, index = 0, onClick }) {
  if (!tool) return null;
  const IconComponent = tool.icon;
  const isElement = React.isValidElement(tool.icon);
  const toolName = tool.name || tool.title || 'About Us Tool';
  const toolBg = tool.bgColor || tool.bg || '#F0FDF4';
  const toolIconColor = tool.iconColor || tool.color || 'text-green-600';

  const rowIndex = Math.floor(index / 2);
  const delayMs = rowIndex * 120;
  const slideAnimation = rowIndex % 2 === 0 ? 'animate-card-slide-left' : 'animate-card-slide-right';

  const fillHex = (typeof toolBg === 'string' ? toolBg.match(/#[A-Fa-f0-9]{6}/)?.[0] : null) || '#ECFDF5';

  return (
    <div
      onClick={() => onClick?.(tool)}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`${slideAnimation} bg-white rounded-[16px] sm:rounded-[22px] p-2.5 sm:p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(22,163,74,0.15)] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center gap-2 sm:gap-4 group select-none relative overflow-hidden h-[98px] sm:h-[112px] z-10 hover:z-30`}
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
          stroke="#16A34A"
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
        <h3 className="text-[11.5px] sm:text-base font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-green-600 transition-colors">
          {toolName}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 font-normal leading-tight line-clamp-2 mt-0.5 sm:mt-1">
          {tool.description}
        </p>

        <div className="max-h-0 opacity-0 group-hover:max-h-8 group-hover:opacity-100 group-hover:mt-1.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center gap-1.5 text-xs sm:text-sm font-bold text-green-600">
          <span>Read More</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
        </div>
      </div>
    </div>
  );
}

export const SOFTWARE_ABOUT_US_TOOLS = [
  { id: 'legal-pdf-intro', name: 'Legal PDF Introduction', description: 'Overview and brief introduction to the Legal PDF platform', icon: IntroIcon, bgColor: 'bg-[#F0FDF4]', iconColor: 'text-[#16A34A]' },
  { id: 'legal-pdf-overview', name: 'Legal PDF Overview', description: 'Comprehensive overview of the platform features and benefits', icon: OverviewIcon, bgColor: 'bg-[#ECFDF5]', iconColor: 'text-[#059669]' },
  { id: 'who-we-are', name: 'Who We Are', description: 'Learn about the team and organization behind Legal PDF', icon: WhoWeAreIcon, bgColor: 'bg-[#DCFCE7]', iconColor: 'text-[#15803D]' },
  { id: 'our-mission', name: 'Our Mission', description: 'Our purpose and mission to secure digital document workflows', icon: MissionIcon, bgColor: 'bg-[#FEF3C7]', iconColor: 'text-[#D97706]' },
  { id: 'our-vision', name: 'Our Vision', description: 'The long-term vision and future direction of our platform', icon: VisionIcon, bgColor: 'bg-[#E0F2FE]', iconColor: 'text-[#0284C7]' },
  { id: 'our-journey', name: 'Our Journey Timeline', description: 'Explore the milestones and history of our product development', icon: TimelineIcon, bgColor: 'bg-[#F3E5F5]', iconColor: 'text-[#9333EA]' },
  { id: 'our-core-values', name: 'Our Core Values', description: 'The guiding principles that shape our organizational culture', icon: CoreValuesIcon, bgColor: 'bg-[#FCE4EC]', iconColor: 'text-[#DB2777]' },
  { id: 'why-choose-us', name: 'Why Choose Us', description: 'Key differentiators and reasons to trust our PDF solutions', icon: ChooseUsIcon, bgColor: 'bg-[#EFF6FF]', iconColor: 'text-[#2563EB]' },
  { id: 'ai-innovation', name: 'AI Innovation', description: 'Discover our advanced artificial intelligence capabilities', icon: AiIcon, bgColor: 'bg-[#F5F3FF]', iconColor: 'text-[#7C3AED]' },
  { id: 'our-services', name: 'Our Services', description: 'Detailed breakdown of the professional services we provide', icon: ServicesIcon, bgColor: 'bg-[#FFFBEB]', iconColor: 'text-[#B45309]' },
  { id: 'technology-stack', name: 'Technology Stack', description: 'Insights into the robust architecture powering our application', icon: TechStackIcon, bgColor: 'bg-[#F1F5F9]', iconColor: 'text-[#475569]' },
  { id: 'product-statistics', name: 'Product Statistics', description: 'Usage data, platform metrics, and performance analytics', icon: StatsIcon, bgColor: 'bg-[#E0F7FA]', iconColor: 'text-[#0891B2]' },
  { id: 'global-presence', name: 'Global Presence', description: 'Our worldwide reach and international operations footprint', icon: GlobalIcon, bgColor: 'bg-[#FFF7ED]', iconColor: 'text-[#EA580C]' },
  { id: 'product-roadmap', name: 'Product Roadmap', description: 'Upcoming features and future updates planned for release', icon: RoadmapIcon, bgColor: 'bg-[#FDF2F8]', iconColor: 'text-[#BE185D]' },
  { id: 'contact-support', name: 'Contact & Support', description: 'Get in touch with our customer service and technical support', icon: ContactIcon, bgColor: 'bg-[#EEF2FF]', iconColor: 'text-[#4F46E5]' },
  { id: 'research-development', name: 'Research & Development', description: 'Learn about our R&D initiatives and technological research', icon: RandDIcon, bgColor: 'bg-[#FDF4FF]', iconColor: 'text-[#A21CAF]' },
  { id: 'quality-assurance', name: 'Quality Assurance', description: 'Our rigorous testing processes to ensure software reliability', icon: QaIcon, bgColor: 'bg-[#ECFDF5]', iconColor: 'text-[#10B981]' },
  { id: 'performance-reliability', name: 'Performance & Reliability', description: 'Uptime guarantees and system performance benchmarks', icon: PerformanceIcon, bgColor: 'bg-[#FEF2F2]', iconColor: 'text-[#DC2626]' },
  { id: 'data-protection', name: 'Data Protection', description: 'How we safeguard user data and maintain strict privacy', icon: DataProtectionIcon, bgColor: 'bg-[#FFF3E0]', iconColor: 'text-[#F97316]' },
  { id: 'workflow-automation', name: 'Workflow Automation', description: 'Streamline your processes with automated document handling', icon: WorkflowIcon, bgColor: 'bg-[#E3F2FD]', iconColor: 'text-[#3B82F6]' },
  { id: 'privacy-policy', name: 'Privacy Policy', description: 'Read our comprehensive policy on user privacy and data collection', icon: PrivacyIcon, bgColor: 'bg-[#F1F5F9]', iconColor: 'text-[#334155]' },
  { id: 'data-protection-policy', name: 'Data Protection Policy', description: 'Official guidelines on data security and compliance measures', icon: DataPolicyIcon, bgColor: 'bg-[#E0F7FA]', iconColor: 'text-[#06B6D4]' },
  { id: 'terms-conditions', name: 'Terms & Conditions', description: 'Legal agreements and terms of service for using our platform', icon: TermsIcon, bgColor: 'bg-[#F3E5F5]', iconColor: 'text-[#A855F7]' },
  { id: 'intellectual-property', name: 'Intellectual Property Policy', description: 'Rules regarding copyrights, trademarks, and content ownership', icon: IntellectualPropertyIcon, bgColor: 'bg-[#FFF7ED]', iconColor: 'text-[#C2410C]' },
  { id: 'information-security', name: 'Information Security Policy', description: 'Our framework for managing and protecting critical information', icon: InfoSecurityIcon, bgColor: 'bg-[#FEF2F2]', iconColor: 'text-[#B91C1C]' },
  { id: 'confidentiality-policy', name: 'Confidentiality Policy', description: 'Commitment to keeping sensitive information private and secure', icon: ConfidentialityIcon, bgColor: 'bg-[#FCE4EC]', iconColor: 'text-[#9D174D]' },
  { id: 'records-management', name: 'Records Management Policy', description: 'Procedures for maintaining and retaining business records', icon: RecordsMgmtIcon, bgColor: 'bg-[#EFF6FF]', iconColor: 'text-[#1D4ED8]' },
  { id: 'electronic-signature', name: 'Electronic Signature Policy', description: 'Legal validity and guidelines for using digital signatures', icon: ElectronicSigIcon, bgColor: 'bg-[#F5F3FF]', iconColor: 'text-[#6D28D9]' },
  { id: 'digital-document', name: 'Digital Document Policy', description: 'Standards for handling, storing, and sharing digital files', icon: DigitalDocIcon, bgColor: 'bg-[#DCFCE7]', iconColor: 'text-[#15803D]' },
  { id: 'security-incident', name: 'Security Incident Response', description: 'Protocols for addressing and mitigating security breaches', icon: IncidentRespIcon, bgColor: 'bg-[#FEF2F2]', iconColor: 'text-[#991B1B]' },
  { id: 'legal-disclaimer', name: 'Legal Disclaimer', description: 'Important legal notices and limitation of liability statements', icon: DisclaimerIcon, bgColor: 'bg-[#FFFBEB]', iconColor: 'text-[#92400E]' },
  { id: 'open-source-license', name: 'Open Source License Policy', description: 'Information regarding third-party open-source components used', icon: OpenSourceIcon, bgColor: 'bg-[#F8FAFC]', iconColor: 'text-[#0F172A]' }
];

/* ==========================================================================
   2. HEADER COMPONENT
   ========================================================================== */

export function Header() {
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
      <div className="absolute hidden sm:block left-[13%] top-[32%] w-3 h-3 rounded-full bg-green-500 shadow pointer-events-none z-10 animate-float-3" />
      <div className="absolute hidden sm:block left-[35%] top-[62%] w-2.5 h-2.5 rounded-full bg-green-400 shadow-sm pointer-events-none z-10 animate-float-1" />
      <div className="absolute hidden sm:block right-[34%] top-[20%] w-3 h-3 rounded-full bg-emerald-400 shadow pointer-events-none z-10 animate-float-5" />
      <div className="absolute hidden sm:block right-[19%] top-[58%] w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm pointer-events-none z-10 animate-float-2" />
      <div className="absolute hidden sm:block right-[37%] top-[74%] w-2 h-2 rounded-full bg-lime-400 shadow-sm pointer-events-none z-10 animate-float-4" />

      <div className="absolute flex left-0 sm:left-4 md:left-[17%]" style={{ top: '45%', zIndex: 15 }}>
        <FileIcon bg="#16A34A" rotate={-13} size={32} floatClass="animate-float-1"
          icon={
            <>
              <circle cx="18" cy="30" r="3.5" fill="rgba(255,255,255,0.7)" />
              <path d="M6 48 L18 35 L27 43 L36 33 L50 47 L50 54 L6 54Z" fill="rgba(255,255,255,0.55)" />
            </>
          }
        />
      </div>

      <div className="absolute flex left-6 sm:left-20 md:left-[26%]" style={{ top: '4%', zIndex: 15 }}>
        <FileIcon bg="#059669" rotate={7} size={38} floatClass="animate-float-2"
          icon={
            <text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">INFO</text>
          }
        />
      </div>

      <div className="absolute flex right-6 sm:right-20 md:right-[26%]" style={{ top: '4%', zIndex: 15 }}>
        <FileIcon bg="#10B981" rotate={-7} size={38} floatClass="animate-float-4"
          icon={
            <text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">R&D</text>
          }
        />
      </div>

      <div className="absolute flex right-0 sm:right-4 md:right-[20%]" style={{ top: '42%', zIndex: 15 }}>
        <FileIcon bg="#34D399" rotate={9} size={32} floatClass="animate-float-5"
          icon={
            <text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">T&C</text>
          }
        />
      </div>

      <div className="flex items-center justify-center w-full relative z-20">
        <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0 pt-1 sm:pt-2 md:pt-3 px-2">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1e2a52] tracking-tight leading-tight break-words pb-1">
            <SlideInText text="Software About Us" />
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Discover our mission, team, security policies, and technical innovations that drive the Legal PDF platform forward.
          </p>
        </div>
      </div>
    </header>
  );
}

export default function SoftwareAboutUsPage({ onBack, searchQuery = "" }) {
  const [selectedTool, setSelectedTool] = React.useState(() => {
    const hashParts = window.location.hash.replace('#', '').split('/');
    if (hashParts.length > 1) {
      const toolId = hashParts[1];
      return SOFTWARE_ABOUT_US_TOOLS.find(t => t.id === toolId) || null;
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
    const CustomPage = PAGE_MAP[selectedTool.id];
    if (CustomPage) {
      return (
        <div className="flex-1 flex flex-col w-full relative">
          <button onClick={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }}
            className="absolute top-1.5 left-3 sm:top-5 sm:left-6 md:left-10 z-50 text-[#1e2a52] hover:text-green-950 font-bold flex items-center gap-1.5 sm:gap-2 bg-white/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm backdrop-blur-md border border-slate-200/90 transition-all hover:shadow-md hover:scale-105 cursor-pointer text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 text-[#1e2a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span>Back</span>
          </button>
          <CustomPage />
        </div>
      );
    }
    return <ToolWorkspace tool={selectedTool} onBack={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }} />;
  }

  return (
    <div className="flex-1 flex flex-col w-full relative pt-11 sm:pt-4">
      {onBack && (
        <button onClick={onBack}
          className="absolute top-1.5 left-3 sm:top-5 sm:left-6 md:left-10 z-50 text-[#1e2a52] hover:text-green-950 font-bold flex items-center gap-1.5 sm:gap-2 bg-white/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm backdrop-blur-md border border-slate-200/90 transition-all hover:shadow-md hover:scale-105 cursor-pointer text-xs sm:text-sm"
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
            {SOFTWARE_ABOUT_US_TOOLS.filter(tool => {
              const q = (searchQuery || "").trim().toLowerCase();
              if (!q) return true;
              const name = (tool.name || tool.title || "").toLowerCase(); return name.includes(q);
            }).map((tool, idx) => (
              <SoftwareAboutUsCard
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
