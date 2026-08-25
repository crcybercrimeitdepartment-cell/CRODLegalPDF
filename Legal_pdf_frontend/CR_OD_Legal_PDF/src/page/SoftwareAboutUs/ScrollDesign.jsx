import React, { useState, useRef, useEffect } from 'react';

// Sage Green Metallic Cylinder matching the user's color swatch
const ModernCylinder = ({ className }) => (
  <div
    className={`bg-[linear-gradient(to_bottom,#cdd6c1_0%,#e1e9d8_15%,#bcc6ae_35%,#ffffff_55%,#a6b396_70%,#bcc6ae_85%,#8a967a_100%)] ${className}`}
  ></div>
);

const ScrollHandleLeft = () => (
  <div className="flex items-center">
    <ModernCylinder className="w-1 sm:w-2 h-2 sm:h-3 rounded-l-full" />
    <ModernCylinder className="w-2 sm:w-4 h-2 sm:h-3" />
    <ModernCylinder className="w-1.5 sm:w-2.5 h-5 sm:h-6 rounded-full shadow-[3px_0_4px_rgba(13,23,46,0.5)] z-10" />
    <ModernCylinder className="w-2 sm:w-4 h-3 sm:h-4" />
    <ModernCylinder className="w-1.5 sm:w-3 h-8 sm:h-10 rounded-full shadow-[4px_0_5px_rgba(13,23,46,0.6)] z-10" />
    <ModernCylinder className="w-2.5 sm:w-5 h-5 sm:h-6" />
  </div>
);

const ScrollHandleRight = () => (
  <div className="flex items-center">
    <ModernCylinder className="w-2.5 sm:w-5 h-5 sm:h-6" />
    <ModernCylinder className="w-1.5 sm:w-3 h-8 sm:h-10 rounded-full shadow-[-4px_0_5px_rgba(13,23,46,0.6)] z-10" />
    <ModernCylinder className="w-2 sm:w-4 h-3 sm:h-4" />
    <ModernCylinder className="w-1.5 sm:w-2.5 h-5 sm:h-6 rounded-full shadow-[-3px_0_4px_rgba(13,23,46,0.5)] z-10" />
    <ModernCylinder className="w-2 sm:w-4 h-2 sm:h-3" />
    <ModernCylinder className="w-1 sm:w-2 h-2 sm:h-3 rounded-r-full" />
  </div>
);

function Latter({ pages = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const toggleScroll = () => {
    if (isAnimating) return;
    setIsOpen(!isOpen);
    setIsDropdownOpen(false);
  };

  const changePage = (e, direction) => {
    e.stopPropagation();
    if (isAnimating) return;

    if (direction === 'next' && currentPage === pages.length - 1) return;
    if (direction === 'prev' && currentPage === 0) return;

    setIsAnimating(true);
    setIsOpen(false);
    setIsDropdownOpen(false);

    setTimeout(() => {
      setCurrentPage(prev => direction === 'next' ? prev + 1 : prev - 1);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }

      setTimeout(() => {
        setIsOpen(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 600);
      }, 150);
    }, 600);
  };

  const jumpToPage = (e, targetPage) => {
    e.stopPropagation();
    if (isAnimating || targetPage === currentPage) return;

    setIsAnimating(true);
    setIsOpen(false);
    setIsDropdownOpen(false);

    setTimeout(() => {
      setCurrentPage(targetPage);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }

      setTimeout(() => {
        setIsOpen(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 600);
      }, 150);
    }, 600);
  };

  return (
    <div
      ref={wrapperRef}
      className={`w-full relative transition-all duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'h-[700px] sm:h-[750px] lg:h-[650px]' : 'h-[120px] sm:h-[150px] lg:h-[110px]'}`}
    >
      <div
        ref={containerRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full max-w-[900px] lg:max-w-[850px] px-0 sm:px-4 drop-shadow-2xl cursor-default"
      >

        {/* Top Metallic Tube */}
        <div className="flex items-center w-full relative z-30 drop-shadow-[0_8px_15px_rgba(100,110,90,0.25)] group">
          <ScrollHandleLeft />
          <div className="flex-grow h-10 sm:h-12 relative" style={{ backgroundImage: 'linear-gradient(to bottom, #cdd6c1 0%, #e1e9d8 15%, #bcc6ae 35%, #ffffff 55%, #a6b396 70%, #bcc6ae 85%, #8a967a 100%)', boxShadow: '0 8px 20px -5px rgba(100,110,90,0.5)' }}>
            {/* Sleek light accent */}
            <div className={`absolute top-1/2 -translate-y-1/2 w-full h-[1px] transition-all duration-500 ${isOpen ? 'bg-white opacity-80 shadow-[0_0_8px_#ffffff]' : 'bg-white opacity-40 group-hover:bg-white group-hover:shadow-[0_0_8px_#ffffff] group-hover:opacity-80'}`}></div>
          </div>
          <ScrollHandleRight />
        </div>

        <div
          className={`w-[calc(100%-5.5rem)] sm:w-[calc(100%-12rem)] relative z-10 mx-auto -mt-2 sm:-mt-4 transition-all duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden origin-top border-x border-b border-[#e1e9d8]/80 rounded-b-xl ${isOpen ? 'h-[500px] lg:h-[480px] opacity-100 -mb-2 sm:-mb-4' : 'h-0 opacity-0 -mb-5 sm:-mb-10'}`}
          style={{
            backgroundColor: 'rgba(225, 233, 216, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 20px 40px -10px rgba(20,35,70,0.15), inset 0 0 40px rgba(255,255,255,0.4)',
          }}
        >
          {/* Colorful blurred blobs matching the pastel icons in the UI (blue, pink, green) */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-300/40 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl pointer-events-none"></div>

          {/* Content Area */}
          <div ref={contentRef} className="relative w-full h-full p-6 sm:p-12 overflow-y-auto overflow-x-hidden">

            <div className={`transition-all duration-[600ms] delay-150 transform ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="text-slate-600 font-sans text-sm sm:text-lg lg:text-xl leading-relaxed whitespace-pre-wrap max-w-3xl mx-auto font-light tracking-wide text-left sm:text-justify">
                <span className="text-[#1c2b4d] font-bold tracking-normal sm:tracking-[0.1em] text-base sm:text-xl lg:text-2xl text-center sm:text-left block mb-3 sm:mb-5">{pages && pages.length > 0 ? pages[currentPage].title : ''}</span>
                {pages && pages.length > 0 ? pages[currentPage].description : ''}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Metallic Tube */}
        <div className="flex items-center w-full relative z-20 drop-shadow-[0_8px_15px_rgba(100,110,90,0.25)] group">
          <ScrollHandleLeft />
          <div className="flex-grow h-10 sm:h-12 relative" style={{ backgroundImage: 'linear-gradient(to bottom, #cdd6c1 0%, #e1e9d8 15%, #bcc6ae 35%, #ffffff 55%, #a6b396 70%, #bcc6ae 85%, #8a967a 100%)', boxShadow: '0 -4px 10px -2px rgba(100,110,90,0.2), 0 10px 15px -3px rgba(100,110,90,0.4)' }}>
            {/* Sleek light accent */}
            <div className={`absolute top-1/2 -translate-y-1/2 w-full h-[1px] transition-all duration-500 ${isOpen ? 'bg-white opacity-80 shadow-[0_0_8px_#ffffff]' : 'bg-white opacity-40 group-hover:bg-white group-hover:shadow-[0_0_8px_#ffffff] group-hover:opacity-80'}`}></div>
          </div>
          <ScrollHandleRight />
        </div>

        {/* Next and Previous Buttons */}
        <div
          className={`relative z-40 w-full flex flex-nowrap justify-between items-center mt-4 sm:mt-8 gap-2 sm:gap-4 px-2 sm:px-0 transition-all duration-500 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => changePage(e, 'prev')}
            disabled={currentPage === 0 || isAnimating}
            className={`whitespace-nowrap flex-shrink-0 px-3 sm:px-6 py-2 bg-white/70 backdrop-blur-md text-[#1c2b4d] text-xs sm:text-base font-bold font-sans rounded-full shadow-[0_4px_12px_rgba(20,35,70,0.1)] border border-white transition-all ${currentPage === 0 || isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:scale-105 active:scale-95'}`}
          >
            &larr; Previous
          </button>

          <div className="relative group flex-1 flex justify-center min-w-0 mx-1 sm:mx-4">
            <div className="relative w-full max-w-[400px]">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAnimating) setIsDropdownOpen(!isDropdownOpen);
                }}
                className={`text-[#1c2b4d] font-bold text-xs sm:text-sm tracking-widest bg-white/60 pl-3 sm:pl-6 pr-6 sm:pr-10 py-2 rounded-full backdrop-blur-sm border border-white outline-none transition-all ${isAnimating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/80'} text-center flex items-center justify-center w-full select-none min-w-0`}
              >
                <span className="truncate">
                  {pages?.[currentPage]?.title || `PAGE ${currentPage + 1} / ${pages?.length || 0}`}
                </span>
                <div className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1c2b4d] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}>
                  &#9662;
                </div>
              </div>
              
              <div 
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max min-w-[200px] max-w-[85vw] sm:max-w-[400px] bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-[0_10px_40px_rgba(20,35,70,0.2)] overflow-hidden transition-all duration-300 origin-bottom z-50 ${isDropdownOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
              >
                <div className="max-h-64 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#8a967a]/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#8a967a]/60">
                  {pages && pages.map((page, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(false);
                        jumpToPage(e, idx);
                      }}
                      className={`px-4 py-2.5 text-left text-sm font-bold cursor-pointer transition-colors truncate ${currentPage === idx ? 'bg-[#bcc6ae] text-[#1c2b4d]' : 'text-[#1c2b4d] hover:bg-white/80'}`}
                      title={page.title || `PAGE ${idx + 1}`}
                    >
                      {page.title || `PAGE ${idx + 1} / ${pages.length}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => changePage(e, 'next')}
            disabled={currentPage === (pages ? pages.length - 1 : 0) || isAnimating}
            className={`whitespace-nowrap flex-shrink-0 px-3 sm:px-6 py-2 bg-white/70 backdrop-blur-md text-[#1c2b4d] text-xs sm:text-base font-bold font-sans rounded-full shadow-[0_4px_12px_rgba(20,35,70,0.1)] border border-white transition-all ${currentPage === (pages ? pages.length - 1 : 0) || isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:scale-105 active:scale-95'}`}
          >
            Next &rarr;
          </button>
        </div>

      </div>
    </div>
  );
}

const SlideInText = ({ text }) => (
  <span className="inline-block transition-transform duration-1000 ease-out">{text}</span>
);

export default function ScrollDesign({ heading, pages }) {
  return (
    <div
      className="w-full min-h-screen flex flex-col items-center justify-start px-1 sm:px-8 pb-4 sm:pb-8 pt-2 sm:pt-2 overflow-y-auto overflow-x-hidden bg-transparent"
    >
      {/* Main header row: Title and Tagline */}
      <div className="flex items-center justify-center w-full relative z-20 mb-2 sm:mb-6">
        <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0 pt-1 sm:pt-2 md:pt-3 px-2">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1e2a52] tracking-tight leading-tight break-words pb-1">
            <SlideInText text={heading} />
          </h1>
        </div>
      </div>

      <div className="flex justify-center w-full max-w-full px-1 sm:px-4 lg:px-12 mt-1 sm:mt-4 transition-all duration-[600ms]">
        <Latter pages={pages} />
      </div>
    </div>
  );
}
