import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, FileText, Settings, BookOpen, Search, Eye, Zap, Layers, Lock, PenTool, Printer, CheckCircle2 } from 'lucide-react';

export default function FavoritesPage({ onBack }) {
  const toolName = "Favorites";
  const toolDesc = "Quickly access and manage your most frequently used PDF tools.";

  // List of available tools (based on the system)
  const allTools = [
    { id: 'add-attachments', name: 'Add Attachments', desc: 'Attach external files to your PDF', icon: <Layers /> },
    { id: 'advanced-search', name: 'Advanced Search', desc: 'Search text and metadata', icon: <Search /> },
    { id: 'auto-recovery', name: 'Auto Recovery', desc: 'Recover unsaved documents', icon: <Settings /> },
    { id: 'backup-recovery', name: 'Backup Recovery', desc: 'Manage document backups', icon: <Settings /> },
    { id: 'batch-compression', name: 'Batch Compression', desc: 'Compress multiple PDFs', icon: <FileText /> },
    { id: 'batch-conversion', name: 'Batch Conversion', desc: 'Convert multiple files', icon: <FileText /> },
    { id: 'batch-decryption', name: 'Batch Decryption', desc: 'Decrypt multiple PDFs', icon: <Lock /> },
    { id: 'batch-encryption', name: 'Batch Encryption', desc: 'Encrypt multiple PDFs', icon: <Lock /> },
    { id: 'batch-export', name: 'Batch Export', desc: 'Export multiple PDFs', icon: <FileText /> },
    { id: 'batch-import', name: 'Batch Import', desc: 'Import multiple files', icon: <FileText /> },
    { id: 'batch-printing', name: 'Batch Printing', desc: 'Print multiple PDFs at once', icon: <Printer /> },
    { id: 'batch-rename', name: 'Batch Rename', desc: 'Rename multiple PDFs', icon: <PenTool /> },
    { id: 'batch-watermark', name: 'Batch Watermark', desc: 'Watermark multiple PDFs', icon: <FileText /> },
    { id: 'bookmark-management', name: 'Bookmark Management', desc: 'Manage PDF bookmarks', icon: <BookOpen /> },
    { id: 'custom-properties', name: 'Custom Properties', desc: 'Manage custom PDF properties', icon: <Settings /> },
    { id: 'digital-signature-validation', name: 'Digital Signature', desc: 'Validate signatures', icon: <CheckCircle2 /> },
    { id: 'document-archiving', name: 'Document Archiving', desc: 'Archive PDF documents', icon: <BookOpen /> },
    { id: 'document-properties', name: 'Document Properties', desc: 'View document properties', icon: <Eye /> },
    { id: 'document-templates', name: 'Document Templates', desc: 'Manage PDF templates', icon: <FileText /> },
    { id: 'edit-metadata', name: 'Edit Metadata', desc: 'Edit PDF metadata', icon: <PenTool /> },
    { id: 'external-links', name: 'External Links', desc: 'Manage external links', icon: <Layers /> },
    { id: 'extract-attachments', name: 'Extract Attachments', desc: 'Extract embedded files', icon: <Layers /> },
    { id: 'file-attachments', name: 'File Attachments', desc: 'Manage file attachments', icon: <Layers /> },
    { id: 'file-manager', name: 'File Manager', desc: 'Manage PDF files', icon: <FileText /> },
    { id: 'find-replace', name: 'Find Replace', desc: 'Find and replace text', icon: <Search /> },
    { id: 'hyperlink-support', name: 'Hyperlink Support', desc: 'Manage PDF hyperlinks', icon: <Layers /> },
    { id: 'internal-links', name: 'Internal Links', desc: 'Manage internal links', icon: <Layers /> },
    { id: 'named-destinations', name: 'Named Destinations', desc: 'Manage named destinations', icon: <Layers /> },
    { id: 'pdf-validation', name: 'PDF Validation', desc: 'Validate PDF/A compliance', icon: <CheckCircle2 /> },
    { id: 'print-booklet', name: 'Print Booklet', desc: 'Print PDF as booklet', icon: <Printer /> },
    { id: 'print-multiple-pages', name: 'Print Multiple Pages', desc: 'Print multiple pages', icon: <Printer /> },
    { id: 'quick-navigation', name: 'Quick Navigation', desc: 'Navigate PDF easily', icon: <Search /> },
    { id: 'remove-attachments', name: 'Remove Attachments', desc: 'Remove embedded files from PDF', icon: <Layers /> },
    { id: 'save-as', name: 'Save As', desc: 'Save PDF as different formats', icon: <FileText /> },
    { id: 'silent-printing', name: 'Silent Printing', desc: 'Print directly to local printer', icon: <Printer /> },
    { id: 'table-of-contents', name: 'Table of Contents', desc: 'Generate TOC for PDF', icon: <BookOpen /> },
    { id: 'template-library', name: 'Template Library', desc: 'Use and manage PDF templates', icon: <BookOpen /> },
    { id: 'view-metadata', name: 'View Metadata', desc: 'View PDF properties', icon: <Eye /> },
    { id: 'xmp-metadata', name: 'XMP Metadata', desc: 'View raw XMP XML data', icon: <Eye /> },
  ];

  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load favorites from local storage on mount
  useEffect(() => {
    const storedFavs = localStorage.getItem('pdf_favorites');
    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    } else {
      // Default favorites if empty
      setFavorites(['add-attachments', 'view-metadata']);
    }
  }, []);

  // Save favorites to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('pdf_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const favoriteTools = allTools.filter(t => favorites.includes(t.id));
  const filteredTools = allTools.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));



  return (
    <div className="flex-1 flex flex-col w-full bg-transparent relative z-20 min-h-screen">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-1 sm:pt-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-white text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md hover:scale-105 transition-all cursor-pointer text-xs sm:text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3 flex items-center justify-center gap-3">
          <Star className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 fill-amber-400" />
          {toolName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          {toolDesc}
        </p>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-14 space-y-10">
        
        {/* Your Favorites Section */}
        <div>
          <h2 className="text-xl font-bold text-[#1e2a52] mb-6 flex items-center gap-2">
            Your Favorite Tools
          </h2>
          
          {favoriteTools.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-12 text-center">
              <div className="w-20 h-20 bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Star className="w-10 h-10 text-amber-300" />
              </div>
              <h3 className="text-lg font-bold text-[#1e2a52] mb-2">No favorites yet</h3>
              <p className="text-sm text-slate-500">
                Star your most used tools from the list below to access them quickly here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {favoriteTools.map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#1e2a52]/40 transition-all p-5 flex flex-col group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-[#1e2a52]/10 rounded-xl flex items-center justify-center text-[#1e2a52]">
                      {React.cloneElement(t.icon, { className: 'w-6 h-6' })}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(t.id); }}
                      className="p-2 -mr-2 -mt-2 rounded-full hover:bg-slate-100 transition-colors"
                      title="Remove from favorites"
                    >
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    </button>
                  </div>
                  <h3 className="font-bold text-[#1e2a52] text-base mb-1">{t.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{t.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Tools Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h2 className="text-xl font-bold text-[#1e2a52]">
              Manage Tools
            </h2>
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#1e2a52] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredTools.map(t => {
              const isFav = favorites.includes(t.id);
              return (
                <div 
                  key={t.id} 
                  onClick={() => toggleFavorite(t.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isFav 
                      ? 'bg-amber-50/50 border-amber-200 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-[#1e2a52]/40 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isFav ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                      {React.cloneElement(t.icon, { className: 'w-4 h-4' })}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#1e2a52] text-sm truncate">{t.name}</p>
                    </div>
                  </div>
                  <Star className={`w-4 h-4 shrink-0 transition-colors ${isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-300 group-hover:text-amber-200'}`} />
                </div>
              );
            })}
            
            {filteredTools.length === 0 && (
              <div className="col-span-full text-center py-10 text-sm font-semibold text-slate-500">
                No tools match your search.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
