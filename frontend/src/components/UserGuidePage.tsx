import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, ChevronRight, Activity, Telescope, AlertTriangle, 
  CheckCircle2, Keyboard, HelpCircle, Globe, BookOpen, Lightbulb, 
  Compass, Eye, Search, ArrowRight, Zap, Bookmark,
  FileText, ExternalLink, Menu, X, ArrowLeft,
  Sliders, ChevronDown, ChevronUp, Hash, BookMarked,
  ScrollText, Target
} from 'lucide-react';
import { AppViewMode, ThemeMode, Language } from '../types';
import { userGuideData } from '../data/userGuideData';
import { ScientificPipelineCanvas } from './ScientificPipelineCanvas';
import { MathEquation } from './MathEquation';

interface UserGuidePageProps {
  onNavigate: (mode: AppViewMode) => void;
  theme?: ThemeMode;
  lang?: Language;
  onLangChange?: (lang: Language) => void;
}

type ViewMode = 'all' | 'single';

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ 
  onNavigate, 
  lang: controlledLang,
  onLangChange 
}) => {
  const [internalLang, setInternalLang] = useState<Language>('vi');
  const [activeSectionId, setActiveSectionId] = useState<string>('modes');
  const [activeGlossaryCategory, setActiveGlossaryCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    modes: true,
    equations: true,
    glossary: false,
    workflow: false,
    artifacts: false,
    troubleshooting: false,
    references: false
  });

  const currentLang = controlledLang ?? internalLang;

  const handleLangChange = (nextLang: Language) => {
    if (onLangChange) {
      onLangChange(nextLang);
    } else {
      setInternalLang(nextLang);
    }
  };

  const content = userGuideData[currentLang];

  // Sidebar section definitions
  const sidebarSections = useMemo(() => [
    { 
      id: 'modes', 
      num: '1.0', 
      icon: Eye, 
      title: currentLang === 'vi' ? '5 Chế Độ Quan Sát' : '5 Observation Modes', 
      count: '5',
      subItems: [
        { id: 'mode-blink', num: '1.1', label: currentLang === 'vi' ? 'So Sánh Chớp Clyde Tombaugh' : 'Blink Comparator (Tombaugh)' },
        { id: 'mode-side-by-side', num: '1.2', label: currentLang === 'vi' ? 'Đồng Bộ Niên Kỷ Song Song' : 'Synchronized Epochs' },
        { id: 'mode-difference', num: '1.3', label: currentLang === 'vi' ? 'Ảnh Vi Phân Triệt Tiêu Sao (ΔI)' : 'Difference Imaging (ΔI)' },
        { id: 'mode-spectral', num: '1.4', label: currentLang === 'vi' ? 'Hồ Sơ Quang Phổ 102 Kênh (SED)' : 'Spectral Profile (102 Ch)' },
        { id: 'mode-candidates', num: '1.5', label: currentLang === 'vi' ? 'Sổ Bộ & Báo Cáo Ứng Viên' : 'Candidate Discovery Ledger' }
      ]
    },
    { 
      id: 'equations', 
      num: '2.0', 
      icon: Lightbulb, 
      title: currentLang === 'vi' ? 'Phương Trình Khoa Học' : 'Astrophysical Equations', 
      count: '5',
      subItems: [
        { id: 'eq-diff', num: '2.1', label: currentLang === 'vi' ? 'Trừ Ảnh Vi Phân (ΔI)' : 'Difference Residual (ΔI)' },
        { id: 'eq-sigma', num: '2.2', label: currentLang === 'vi' ? 'Ngưỡng Lọc Nhiễu 3.5σ' : 'Significance Threshold 3.5σ' },
        { id: 'eq-kepler', num: '2.3', label: currentLang === 'vi' ? 'Định Luật Kepler III & Chuyển Động Riêng' : 'Kepler III & Proper Motion' },
        { id: 'eq-asinh', num: '2.4', label: currentLang === 'vi' ? 'Hàm Co Giãn Phi Tuyến Asinh' : 'Lupton Asinh Stretch' },
        { id: 'eq-wcs', num: '2.5', label: currentLang === 'vi' ? 'Ma Trận Tọa Độ WCS' : 'WCS Coordinate Matrix' }
      ]
    },
    { 
      id: 'glossary', 
      num: '3.0', 
      icon: BookOpen, 
      title: currentLang === 'vi' ? 'Bách Khoa Thuật Ngữ A-Z' : 'Astrophysics Glossary', 
      count: '9',
      subItems: [
        { id: 'glossary-astrometry', num: '3.1', label: currentLang === 'vi' ? 'Định Dạng FITS & Trắc Tinh' : 'FITS Format & Astrometry' },
        { id: 'glossary-mechanics', num: '3.2', label: currentLang === 'vi' ? 'Cơ Học Thiên Thể & Planet 9' : 'Orbital Mechanics & Planet 9' },
        { id: 'glossary-spectroscopy', num: '3.3', label: currentLang === 'vi' ? 'Quang Phổ 102 Kênh & Băng Vũ Trụ' : '102-Ch SED & Volatile Ices' }
      ]
    },
    { 
      id: 'workflow', 
      num: '4.0', 
      icon: Compass, 
      title: currentLang === 'vi' ? 'Quy Trình Săn Planet 9' : '4-Step Hunting Protocol', 
      count: '4',
      subItems: [
        { id: 'step-1', num: '4.1', label: currentLang === 'vi' ? 'Bước 1: Chọn Vùng & Bước Sóng' : 'Step 1: Target & Wavelength' },
        { id: 'step-2', num: '4.2', label: currentLang === 'vi' ? 'Bước 2: So Sánh Chớp & Vi Phân' : 'Step 2: Blink & Difference' },
        { id: 'step-3', num: '4.3', label: currentLang === 'vi' ? 'Bước 3: Trích Xuất Phổ SED' : 'Step 3: Extract SED Profile' },
        { id: 'step-4', num: '4.4', label: currentLang === 'vi' ? 'Bước 4: Kiểm Tra Tốc Độ & Gắn Cờ' : 'Step 4: Check Motion & Flag' }
      ]
    },
    { 
      id: 'pipeline', 
      num: '5.0', 
      icon: Layers, 
      title: currentLang === 'vi' ? 'Pipeline Dữ Liệu Tương Tác' : 'Data Processing Pipeline', 
      count: 'Flow',
      subItems: []
    },
    { 
      id: 'artifacts', 
      num: '6.0', 
      icon: AlertTriangle, 
      title: currentLang === 'vi' ? 'Phân Biệt Thật vs Giả' : 'Artifact Atlas', 
      count: currentLang === 'vi' ? 'Sổ tay' : 'Atlas',
      subItems: [
        { id: 'artifacts-real', num: '6.1', label: currentLang === 'vi' ? 'Dấu Hiệu Thiên Thể Thật' : 'Genuine Celestial Signatures' },
        { id: 'artifacts-fake', num: '6.2', label: currentLang === 'vi' ? 'Nhiễu Cảm Biến Cần Loại Trừ' : 'Optical & Cosmic Noise to Discard' }
      ]
    },
    { 
      id: 'troubleshooting', 
      num: '7.0', 
      icon: HelpCircle, 
      title: currentLang === 'vi' ? 'Sự Cố & Phím Tắt' : 'Troubleshooting & Keys', 
      count: currentLang === 'vi' ? 'Hỗ trợ' : 'Guide',
      subItems: [
        { id: 'shortcuts', num: '7.1', label: currentLang === 'vi' ? 'Bảng Phím Tắt Điều Khiển' : 'Workstation Shortcuts' },
        { id: 'faq', num: '7.2', label: currentLang === 'vi' ? 'Khắc Phục Sự Cố Kỹ Thuật' : 'Technical Diagnostics Table' }
      ]
    },
    { 
      id: 'references', 
      num: '8.0', 
      icon: FileText, 
      title: currentLang === 'vi' ? 'Tài Liệu & Trích Dẫn' : 'Academic Citations', 
      count: '7',
      subItems: [
        { id: 'ref-batygin-2016', num: '8.1', label: '[1] Batygin & Brown (2016)' },
        { id: 'ref-batygin-2019', num: '8.2', label: '[2] Batygin et al. (2019)' },
        { id: 'ref-lupton-2004', num: '8.3', label: '[3] Lupton et al. (2004)' },
        { id: 'ref-calabretta-2002', num: '8.4', label: '[4] Calabretta & Greisen (2002)' },
        { id: 'ref-dore-2016', num: '8.5', label: '[5] Doré et al. (2016)' },
        { id: 'ref-cruikshank-2020', num: '8.6', label: '[6] Cruikshank et al. (2020)' },
        { id: 'ref-tombaugh-1946', num: '8.7', label: '[7] Tombaugh (1946)' }
      ]
    }
  ], [currentLang]);

  // Filter sections by search query
  const filteredSidebarSections = useMemo(() => {
    if (!searchQuery.trim()) return sidebarSections;
    const q = searchQuery.toLowerCase();
    return sidebarSections.filter(sec => 
      sec.title.toLowerCase().includes(q) ||
      sec.subItems.some(sub => sub.label.toLowerCase().includes(q))
    );
  }, [sidebarSections, searchQuery]);

  // ScrollSpy observer when in 'all' view mode
  useEffect(() => {
    if (viewMode !== 'all') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSectionId(entry.target.id);
        }
      });
    }, {
      rootMargin: '-10% 0px -70% 0px',
      threshold: 0
    });

    const sectionElements = sidebarSections
      .map(sec => document.getElementById(sec.id))
      .filter((el): el is HTMLElement => el !== null);

    sectionElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [viewMode, sidebarSections]);

  const handleNavigateSection = (sectionId: string, subId?: string) => {
    setActiveSectionId(sectionId);
    setMobileSidebarOpen(false);

    if (viewMode === 'all') {
      const targetId = subId || sectionId;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const filteredGlossaryItems = activeGlossaryCategory === 'all'
    ? content.glossarySection.items
    : content.glossarySection.items.filter(item => item.category === activeGlossaryCategory);

  // Index of active section for Prev/Next navigation
  const currentSectionIdx = sidebarSections.findIndex(s => s.id === activeSectionId);
  const prevSection = currentSectionIdx > 0 ? sidebarSections[currentSectionIdx - 1] : null;
  const nextSection = currentSectionIdx < sidebarSections.length - 1 ? sidebarSections[currentSectionIdx + 1] : null;

  return (
    <div className="w-full min-h-screen font-sans bg-slate-50 text-spaceapps-nearblack selection:bg-spaceapps-neonyellow selection:text-spaceapps-nearblack">
      {/* Header Banner (Compact & Non-Sticky so it never blocks content) */}
      <header className="bg-spaceapps-gradient text-white py-3.5 px-4 sm:px-6 lg:px-8 border-b border-spaceapps-electricblue shadow-xs">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            {/* Breadcrumb Navigation & Badge in single compact row */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-200" aria-label="Breadcrumb">
              <button 
                type="button" 
                onClick={() => onNavigate('landing')} 
                className="hover:text-spaceapps-neonyellow transition-colors cursor-pointer"
              >
                {content.breadcrumbHome}
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-spaceapps-neonyellow" />
              <span className="text-spaceapps-neonyellow font-semibold uppercase">
                {content.breadcrumbCurrent}
              </span>
              <span className="hidden md:inline-block rounded bg-spaceapps-neonyellow px-2 py-0.5 text-[10px] font-bold text-spaceapps-nearblack uppercase">
                {content.badge}
              </span>
            </div>

            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase">
              {content.title}
            </h1>
          </div>

          {/* Controls: Mode Switcher & Language Selector */}
          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-btn border border-white/30 bg-spaceapps-deepblue/80 p-0.5 text-xs font-mono backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                aria-pressed={viewMode === 'all'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-btn font-bold transition-all ${
                  viewMode === 'all'
                    ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs'
                    : 'text-white hover:text-spaceapps-neonyellow'
                }`}
                title={currentLang === 'vi' ? 'Xem cuộn toàn bộ các chuyên mục' : 'Scroll through all sections'}
              >
                <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{currentLang === 'vi' ? 'Cuộn Tất Cả' : 'All'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('single')}
                aria-pressed={viewMode === 'single'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-btn font-bold transition-all ${
                  viewMode === 'single'
                    ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs'
                    : 'text-white hover:text-spaceapps-neonyellow'
                }`}
                title={currentLang === 'vi' ? 'Chỉ xem chuyên mục đang chọn' : 'Focus view single section'}
              >
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{currentLang === 'vi' ? 'Từng Mục' : 'Focus'}</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center space-x-1 rounded-btn border border-white/30 p-0.5 bg-spaceapps-deepblue/80 text-xs font-mono backdrop-blur-xs">
              <Globe className="h-3 w-3 text-spaceapps-neonyellow ml-1" />
              <button
                type="button"
                onClick={() => handleLangChange('vi')}
                aria-pressed={currentLang === 'vi'}
                className={`px-2 py-0.5 rounded-btn font-bold transition-all ${
                  currentLang === 'vi'
                    ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs'
                    : 'text-white hover:text-spaceapps-neonyellow'
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                aria-pressed={currentLang === 'en'}
                className={`px-2 py-0.5 rounded-btn font-bold transition-all ${
                  currentLang === 'en'
                    ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs'
                    : 'text-white hover:text-spaceapps-neonyellow'
                }`}
              >
                EN
              </button>
            </div>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-1.5 rounded-btn bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Toggle wiki sidebar"
            >
              {mobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: WIKI SIDEBAR NAVIGATION                     */}
          {/* ========================================================= */}
          <aside 
            className={`
              w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-4 lg:self-start
              transition-all duration-200 z-20
              ${mobileSidebarOpen ? 'block' : 'hidden lg:block'}
            `}
            aria-label="Wiki navigation sidebar"
          >
            <div className="rounded-card border-2 border-slate-300 bg-white shadow-sm p-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-spaceapps-neonblue text-white">
                    <BookMarked className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-spaceapps-nearblack uppercase tracking-wider">
                      {currentLang === 'vi' ? 'Danh Mục Wiki' : 'Wiki Directory'}
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono">
                      8 {currentLang === 'vi' ? 'chuyên mục khoa học' : 'research sections'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-spaceapps-neonblue/10 text-spaceapps-neonblue">
                  MEF 7-HDU
                </span>
              </div>

              {/* Instant Search Bar in Sidebar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={currentLang === 'vi' ? 'Tìm bài viết, phương trình...' : 'Search articles, equations...'}
                  className="w-full pl-8 pr-3 py-1.5 rounded-btn border border-slate-300 bg-slate-50 text-xs text-spaceapps-nearblack focus:bg-white focus:border-spaceapps-neonblue outline-hidden transition-all"
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Mobile View Mode Switcher */}
              <div className="flex sm:hidden items-center justify-between p-1.5 rounded bg-slate-100 text-xs">
                <span className="text-[11px] font-bold text-slate-600">
                  {currentLang === 'vi' ? 'Chế độ xem:' : 'View Mode:'}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${viewMode === 'all' ? 'bg-spaceapps-neonblue text-white' : 'text-slate-700'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('single')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${viewMode === 'single' ? 'bg-spaceapps-neonblue text-white' : 'text-slate-700'}`}
                  >
                    Focus
                  </button>
                </div>
              </div>

              {/* Navigation List */}
              <nav className="space-y-1">
                {filteredSidebarSections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSectionId === sec.id;
                  const isExpanded = !!expandedSections[sec.id];

                  return (
                    <div key={sec.id} className="space-y-0.5">
                      <div className="flex items-center justify-between group">
                        <button
                          type="button"
                          onClick={() => handleNavigateSection(sec.id)}
                          className={`
                            flex-1 flex items-center gap-2.5 px-3 py-2 rounded-btn text-xs font-semibold text-left transition-all
                            ${isActive 
                              ? 'bg-spaceapps-neonblue text-white shadow-xs font-bold' 
                              : 'text-spaceapps-nearblack/90 hover:bg-slate-100 hover:text-spaceapps-neonblue'
                            }
                          `}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-spaceapps-neonyellow' : 'text-spaceapps-neonblue'}`} />
                          <span className="font-mono text-[11px] opacity-80">{sec.num}</span>
                          <span className="truncate">{sec.title}</span>
                        </button>

                        {sec.subItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleSectionExpand(sec.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            aria-label={`Toggle ${sec.title} subitems`}
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Sub-item Accordion */}
                      {isExpanded && sec.subItems.length > 0 && (
                        <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 ml-3">
                          {sec.subItems.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleNavigateSection(sec.id, sub.id)}
                              className="w-full flex items-baseline gap-1.5 px-2 py-1 rounded text-[11px] text-slate-600 hover:text-spaceapps-neonblue hover:bg-slate-100 transition-colors text-left"
                            >
                              <span className="font-mono text-[10px] text-slate-400 shrink-0">{sub.num}</span>
                              <span className="truncate">{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Sidebar Footer: Quick Action Shortcuts */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => onNavigate('workstation')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-spaceapps-neonyellow hover:bg-spaceapps-neonblue hover:text-white text-spaceapps-nearblack text-xs font-bold transition-all shadow-xs uppercase"
                >
                  <Telescope className="h-3.5 w-3.5" />
                  <span>{content.cta.workstationBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('overview')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-btn border border-slate-300 hover:border-spaceapps-neonblue text-slate-700 hover:text-spaceapps-neonblue text-xs font-bold transition-all"
                >
                  <Activity className="h-3.5 w-3.5 text-spaceapps-nasared" />
                  <span>{content.cta.overviewBtn}</span>
                </button>
              </div>

            </div>
          </aside>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: MAIN CONTENT AREA                          */}
          {/* ========================================================= */}
          <main className="flex-1 min-w-0 space-y-12">
            
            {/* View Mode Indicator Banner when in 'single' mode */}
            {viewMode === 'single' && (
              <div className="flex items-center justify-between p-3 rounded-card bg-spaceapps-neonblue/10 border border-spaceapps-neonblue/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-spaceapps-neonblue uppercase">
                    {currentLang === 'vi' ? 'Chế độ xem chuyên mục độc lập' : 'Single Section Focus Mode'}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-slate-700">
                    {sidebarSections.find(s => s.id === activeSectionId)?.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className="px-2.5 py-1 rounded bg-white font-bold text-spaceapps-neonblue border border-spaceapps-neonblue/30 hover:bg-spaceapps-neonblue hover:text-white transition-all shadow-xs"
                >
                  {currentLang === 'vi' ? 'Xem Toàn Bộ 8 Mục' : 'View All 8 Sections'}
                </button>
              </div>
            )}

            {/* SECTION 1: 5 OBSERVATION MODES */}
            {(viewMode === 'all' || activeSectionId === 'modes') && (
              <section id="modes" className="space-y-6 scroll-mt-24">
                <div className="space-y-1 border-b border-slate-200 pb-3">
                  <div className="inline-flex items-center space-x-1.5 rounded-btn bg-spaceapps-neonblue/10 px-2.5 py-0.5 text-xs font-bold text-spaceapps-neonblue uppercase">
                    <Eye className="h-3.5 w-3.5" />
                    <span>CÔNG CỤ QUAN SÁT · SECTION 01</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5 text-spaceapps-neonblue uppercase">
                    <Layers className="h-6 w-6 text-spaceapps-neonblue" />
                    <span>{content.modesSection.title}</span>
                  </h2>
                  <p className="text-xs text-spaceapps-nearblack/70">
                    {content.modesSection.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {content.modesSection.modes.map((mode) => (
                    <div 
                      key={mode.id} 
                      id={`mode-${mode.id}`} 
                      className="p-5 rounded-card border-2 border-slate-200 bg-white space-y-2 shadow-sm scale-on-hover scroll-mt-24"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-spaceapps-neonblue text-xs font-mono font-bold text-white">
                            {mode.step}
                          </span>
                          <h3 className="text-sm font-bold text-spaceapps-nearblack uppercase">
                            {mode.title}
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono text-spaceapps-neonblue font-bold px-2 py-0.5 rounded bg-spaceapps-neonblue/10">
                          {mode.meta}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-spaceapps-nearblack/90">
                        {mode.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: SCIENTIFIC EQUATIONS (KATEX FORMULAS & ANALOGIES) */}
            {(viewMode === 'all' || activeSectionId === 'equations') && (
              <section id="equations" className="space-y-6 scroll-mt-24 rounded-card border-2 border-spaceapps-neonblue/30 bg-white p-6 sm:p-8 shadow-sm">
                <div className="space-y-1 border-b border-slate-200 pb-3">
                  <div className="inline-flex items-center space-x-1.5 rounded-btn bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800 uppercase">
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span>{content.equationsSection.badge} · SECTION 02</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-spaceapps-neonblue uppercase">
                    {content.equationsSection.title}
                  </h2>
                  <p className="text-xs text-spaceapps-nearblack/70 leading-relaxed">
                    {content.equationsSection.subtitle}
                  </p>
                </div>

                <div className="space-y-8 divide-y divide-slate-200">
                  {content.equationsSection.items.map((eq) => (
                    <div key={eq.id} id={eq.id} className="pt-6 first:pt-0 space-y-4 scroll-mt-24">
                      {/* Header & KaTeX Formula Display */}
                      <div>
                        <h3 className="text-base font-bold text-spaceapps-nearblack uppercase flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-spaceapps-neonblue"></span>
                          <span>{eq.name}</span>
                        </h3>
                        
                        {/* Native KaTeX Rendered Formula */}
                        <div className="my-3 p-4 rounded-card bg-slate-900 border border-slate-700 shadow-inner overflow-x-auto text-white flex justify-center">
                          <MathEquation math={eq.formula} displayMode={true} />
                        </div>

                        <p className="mt-1.5 text-xs font-semibold text-spaceapps-nearblack/80 italic">
                          "{eq.plainSummary}"
                        </p>
                      </div>

                      {/* For Non-Experts (Everyday Analogy Box) */}
                      <div className="rounded-card border-2 border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase">
                          <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>{content.equationsSection.analogyTitle}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-spaceapps-nearblack">
                          {eq.nonExpertAnalogy}
                        </p>
                      </div>

                      {/* Scientific Astrophysical Rigor Box */}
                      <div className="rounded-card border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                        <div className="text-xs font-bold text-spaceapps-neonblue flex items-center gap-1.5 uppercase">
                          <Telescope className="h-4 w-4 text-spaceapps-neonblue shrink-0" />
                          <span>{content.equationsSection.scientificTitle}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-spaceapps-nearblack/90">
                          {eq.scientificContext}
                        </p>
                      </div>

                      {/* Parameters Breakdown */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {content.equationsSection.parametersTitle}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {eq.parameters.map((param, pIdx) => (
                            <div key={pIdx} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-start gap-2">
                              <code className="font-mono font-bold text-spaceapps-neonblue bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                {param.symbol}
                              </code>
                              <div>
                                <strong className="text-spaceapps-nearblack font-semibold">{param.name}: </strong>
                                <span className="text-spaceapps-nearblack/70">{param.meaning}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3: ASTROPHYSICS WIKI GLOSSARY */}
            {(viewMode === 'all' || activeSectionId === 'glossary') && (
              <section id="glossary" className="space-y-6 scroll-mt-24">
                <div className="space-y-1 border-b border-slate-200 pb-3">
                  <div className="inline-flex items-center space-x-1.5 rounded-btn bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{content.glossarySection.badge} · SECTION 03</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-spaceapps-neonblue uppercase">
                    {content.glossarySection.title}
                  </h2>
                  <p className="text-xs text-spaceapps-nearblack/70 leading-relaxed">
                    {content.glossarySection.subtitle}
                  </p>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                  {content.glossarySection.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveGlossaryCategory(cat.id)}
                      className={`focus-ring px-3 py-1.5 rounded-btn text-xs font-bold transition-all ${
                        activeGlossaryCategory === cat.id
                          ? 'bg-spaceapps-neonblue text-white shadow-sm'
                          : 'bg-slate-100 text-spaceapps-nearblack hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Glossary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredGlossaryItems.map((item) => (
                    <div 
                      key={item.id} 
                      id={`glossary-${item.category}`}
                      className="p-5 rounded-card border-2 border-slate-200 bg-white space-y-2.5 shadow-sm hover:border-spaceapps-neonblue transition-colors scroll-mt-24"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <h3 className="text-sm font-bold text-spaceapps-nearblack uppercase flex items-center gap-1.5">
                          <Bookmark className="h-3.5 w-3.5 text-spaceapps-neonblue shrink-0" />
                          <span>{item.term}</span>
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase shrink-0">
                          {item.categoryLabel}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-spaceapps-neonblue leading-relaxed">
                        {item.simpleDefinition}
                      </div>

                      <p className="text-xs text-spaceapps-nearblack/80 leading-relaxed">
                        {item.inDepthExplanation}
                      </p>

                      {item.practicalTip && (
                        <div className="p-2 rounded bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5 mt-2">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>{content.glossarySection.tipTitle}</strong> {item.practicalTip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4: 4-STEP CITIZEN SCIENCE HUNTING PROTOCOL */}
            {(viewMode === 'all' || activeSectionId === 'workflow') && (
              <section id="workflow" className="space-y-6 scroll-mt-24 rounded-card border-2 border-slate-200 bg-slate-50/60 p-6 sm:p-8 shadow-sm">
                <div className="space-y-1 border-b border-slate-200 pb-3">
                  <div className="inline-flex items-center space-x-1.5 rounded-btn bg-spaceapps-nasared/10 px-2.5 py-0.5 text-xs font-bold text-spaceapps-nasared uppercase">
                    <Compass className="h-3.5 w-3.5" />
                    <span>{content.workflowSection.badge} · SECTION 04</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-spaceapps-nearblack uppercase">
                    {content.workflowSection.title}
                  </h2>
                  <p className="text-xs text-spaceapps-nearblack/70 leading-relaxed">
                    {content.workflowSection.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {content.workflowSection.steps.map((st, sIdx) => (
                    <div key={sIdx} id={`step-${sIdx + 1}`} className="p-4 rounded-card border border-slate-200 bg-white space-y-2 shadow-xs scroll-mt-24">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-spaceapps-neonblue text-white text-[10px] font-mono font-bold">
                          {st.step}
                        </span>
                        <span className="text-xs font-bold text-spaceapps-neonblue font-mono">0{sIdx + 1}/04</span>
                      </div>
                      <h3 className="text-sm font-bold text-spaceapps-nearblack uppercase">
                        {st.title}
                      </h3>
                      <p className="text-xs text-spaceapps-nearblack/80 leading-relaxed">
                        {st.action}
                      </p>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700 italic flex items-start gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{st.tip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 5: INTERACTIVE DATA PROCESSING WORKFLOW */}
            {(viewMode === 'all' || activeSectionId === 'pipeline') && (
              <section id="pipeline" className="space-y-4 scroll-mt-24">
                <div className="space-y-1 border-b border-slate-200 pb-3">
                  <div className="inline-flex items-center space-x-1.5 rounded-btn bg-spaceapps-electricblue/10 px-2.5 py-0.5 text-xs font-bold text-spaceapps-electricblue uppercase">
                    <Layers className="h-3.5 w-3.5" />
                    <span>PIPELINE DỮ LIỆU TƯƠNG TÁC · SECTION 05</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5 text-spaceapps-neonblue uppercase">
                    <span>{currentLang === 'vi' ? 'Quy trình Khảo sát & Xử lý Dữ liệu Tương tác' : 'Interactive Data Processing Workflow'}</span>
                  </h2>
                </div>
                <ScientificPipelineCanvas lang={currentLang} />
              </section>
            )}

            {/* SECTION 6: ARTIFACT ATLAS */}
            {(viewMode === 'all' || activeSectionId === 'artifacts') && (
              <section id="artifacts" className="rounded-card border-2 border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm scroll-mt-24">
                <div className="space-y-1 border-b border-slate-200 pb-3">
                  <div className="inline-flex items-center space-x-1.5 rounded-btn bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-800 uppercase">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>CẨM NANG PHÂN BIỆT · SECTION 06</span>
                  </div>
                  <h2 className="text-xl font-bold flex items-center gap-2.5 text-spaceapps-nasared uppercase">
                    <span>{content.artifactAtlas.title}</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div id="artifacts-real" className="p-4 rounded-btn border border-emerald-300 bg-emerald-50/60 space-y-2 scroll-mt-24">
                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{content.artifactAtlas.real.badge}</span>
                    </div>
                    <ul className="text-xs text-spaceapps-nearblack space-y-1.5 list-disc pl-4">
                      {content.artifactAtlas.real.items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div id="artifacts-fake" className="p-4 rounded-btn border border-rose-300 bg-rose-50/60 space-y-2 scroll-mt-24">
                    <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5 uppercase">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>{content.artifactAtlas.fake.badge}</span>
                    </div>
                    <ul className="text-xs text-spaceapps-nearblack space-y-1.5 list-disc pl-4">
                      {content.artifactAtlas.fake.items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 7: TROUBLESHOOTING & KEYBOARD SHORTCUTS */}
            {(viewMode === 'all' || activeSectionId === 'troubleshooting') && (
              <section id="troubleshooting" className="space-y-8 scroll-mt-24">
                {/* Keyboard Shortcuts */}
                <div id="shortcuts" className="rounded-card border-2 border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm scroll-mt-24">
                  <div className="space-y-1 border-b border-slate-200 pb-3">
                    <div className="inline-flex items-center space-x-1.5 rounded-btn bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 uppercase">
                      <Keyboard className="h-3.5 w-3.5" />
                      <span>PHÍM TẮT THAO TÁC · SECTION 07.1</span>
                    </div>
                    <h2 className="text-xl font-bold flex items-center gap-2.5 text-spaceapps-neonblue uppercase">
                      <span>{content.shortcuts.title}</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {content.shortcuts.items.map((shortcut, idx) => (
                      <div key={idx} className="p-3 rounded-btn border border-slate-200 bg-slate-50 text-center">
                        <kbd className="px-2 py-1 rounded bg-slate-200 text-xs font-mono font-bold text-spaceapps-nearblack">
                          {shortcut.key}
                        </kbd>
                        <div className="text-[11px] text-spaceapps-nearblack mt-1.5 font-medium">
                          {shortcut.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Troubleshooting Table */}
                <div id="faq" className="rounded-card border-2 border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm scroll-mt-24">
                  <div className="space-y-1 border-b border-slate-200 pb-3">
                    <div className="inline-flex items-center space-x-1.5 rounded-btn bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>XỬ LÝ SỰ CỐ · SECTION 07.2</span>
                    </div>
                    <h2 className="text-xl font-bold flex items-center gap-2.5 text-emerald-700 uppercase">
                      <span>{content.troubleshooting.title}</span>
                    </h2>
                    <p className="text-xs text-spaceapps-nearblack/70">
                      {content.troubleshooting.subtitle}
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-card border-2 border-slate-200 mt-3 shadow-xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-spaceapps-cloudgray text-spaceapps-nearblack">
                          <th className="p-3.5 font-bold uppercase w-1/4">{content.troubleshooting.headers[0]}</th>
                          <th className="p-3.5 font-bold uppercase w-1/3">{content.troubleshooting.headers[1]}</th>
                          <th className="p-3.5 font-bold uppercase text-spaceapps-neonblue">{content.troubleshooting.headers[2]}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {content.troubleshooting.rows.map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-3.5 font-bold text-spaceapps-nearblack">{row.issue}</td>
                            <td className="p-3.5 text-spaceapps-nearblack/70">{row.cause}</td>
                            <td className="p-3.5 text-emerald-700 font-semibold">{row.solution}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 8: SCIENTIFIC REFERENCES & ACADEMIC CITATIONS */}
            {(viewMode === 'all' || activeSectionId === 'references') && (
              <section id="references" className="space-y-6 scroll-mt-24 rounded-card border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="space-y-1 border-b border-slate-200 pb-3">
                  <div className="inline-flex items-center space-x-1.5 rounded-btn bg-indigo-500/15 px-2.5 py-0.5 text-xs font-bold text-indigo-800 uppercase">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{content.referencesSection.badge} · SECTION 08</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-spaceapps-neonblue uppercase">
                    {content.referencesSection.title}
                  </h2>
                  <p className="text-xs text-spaceapps-nearblack/70 leading-relaxed">
                    {content.referencesSection.subtitle}
                  </p>
                </div>

                <div className="space-y-4 divide-y divide-slate-100">
                  {content.referencesSection.items.map((ref) => (
                    <div key={ref.id} id={ref.id} className="pt-4 first:pt-0 space-y-2 scroll-mt-24">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="px-2 py-0.5 rounded bg-spaceapps-neonblue text-white text-xs font-mono font-bold">
                          {ref.citationKey}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {ref.authors} ({ref.year}).
                        </span>
                        <h3 className="text-xs font-bold text-spaceapps-nearblack italic inline">
                          "{ref.title}".
                        </h3>
                        <span className="text-xs text-slate-600">
                          {ref.venue}.
                        </span>
                      </div>

                      <p className="text-xs text-spaceapps-nearblack/80 pl-3 border-l-2 border-spaceapps-neonblue/40 leading-relaxed">
                        {ref.relevance}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {ref.doi && (
                          <a
                            href={`https://doi.org/${ref.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-spaceapps-neonblue hover:text-white text-[11px] font-mono text-spaceapps-neonblue font-semibold border border-slate-200 transition-colors"
                          >
                            <span>DOI: {ref.doi}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {ref.arxivId && (
                          <a
                            href={`https://arxiv.org/abs/${ref.arxivId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-spaceapps-nasared hover:text-white text-[11px] font-mono text-spaceapps-nasared font-semibold border border-slate-200 transition-colors"
                          >
                            <span>arXiv: {ref.arxivId}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {ref.url && !ref.doi && !ref.arxivId && (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-spaceapps-neonblue hover:text-white text-[11px] font-mono text-spaceapps-neonblue font-semibold border border-slate-200 transition-colors"
                          >
                            <span>ADS Abstract Record</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* In Single-Section Mode: Chapter Pagination Controls */}
            {viewMode === 'single' && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
                {prevSection ? (
                  <button
                    type="button"
                    onClick={() => handleNavigateSection(prevSection.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-btn border border-slate-300 bg-white hover:border-spaceapps-neonblue text-xs font-bold text-spaceapps-nearblack transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 text-spaceapps-neonblue" />
                    <span>{currentLang === 'vi' ? 'Mục Trước:' : 'Previous:'} {prevSection.title}</span>
                  </button>
                ) : <div />}

                {nextSection && (
                  <button
                    type="button"
                    onClick={() => handleNavigateSection(nextSection.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-btn bg-spaceapps-neonblue text-white hover:bg-spaceapps-deepblue text-xs font-bold transition-colors shadow-xs ml-auto"
                  >
                    <span>{currentLang === 'vi' ? 'Mục Tiếp:' : 'Next:'} {nextSection.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-spaceapps-neonyellow" />
                  </button>
                )}
              </div>
            )}

            {/* Bottom Global Navigation CTAs */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="text-xs font-bold text-spaceapps-nearblack hover:text-spaceapps-neonblue transition-colors uppercase"
              >
                {content.cta.backHome}
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => onNavigate('overview')}
                  className="focus-ring flex items-center space-x-1.5 px-4 py-2.5 rounded-btn border-2 border-slate-300 bg-white text-xs font-bold text-spaceapps-nearblack hover:border-spaceapps-neonblue uppercase"
                >
                  <Activity className="h-4 w-4 text-spaceapps-nasared" />
                  <span>{content.cta.overviewBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('workstation')}
                  className="focus-ring flex items-center space-x-2 px-5 py-2.5 rounded-btn bg-spaceapps-neonyellow text-xs font-bold text-spaceapps-nearblack shadow-md hover:bg-spaceapps-neonblue hover:text-white transition-all uppercase"
                >
                  <Telescope className="h-4 w-4" />
                  <span>{content.cta.workstationBtn}</span>
                </button>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};
