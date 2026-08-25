import React, { useContext, useState, useMemo } from 'react';
import { AnnotationContext } from './context/AnnotationContext';
import { evaluateSearchQuery } from './utils/searchEngine';
import { 
    X, Trash2, MessageSquare, ChevronDown, ChevronRight, 
    Pencil, Square, Circle, Minus, Type, Hash, Maximize, Milestone, Highlighter, Ruler, CornerDownRight, Send, CheckCircle, Filter, Search, Info, Sliders
} from 'lucide-react';

const typeIcons = {
    pencil: <Pencil size={14} />,
    ink: <Pencil size={14} />,
    highlight: <Highlighter size={14} />,
    underline: <Type size={14} />,
    strikeout: <Type size={14} />,
    squiggly: <Type size={14} />,
    rectangle: <Square size={14} />,
    polygon: <Square size={14} />,
    cloud: <Square size={14} />,
    ellipse: <Circle size={14} />,
    line: <Minus size={14} />,
    arrow: <Minus size={14} />,
    polyline: <Minus size={14} />,
    measurement: <Ruler size={14} />,
    area: <Maximize size={14} />,
    distance: <Milestone size={14} />,
    freetext: <Type size={14} />,
    textbox: <Type size={14} />,
    stickynote: <MessageSquare size={14} />,
    stamp: <Hash size={14} />,
    callout: <MessageSquare size={14} />
};

export default function CommentPanelPage() {
    const { 
        annotations, 
        selectedAnnotationId, 
        setSelectedAnnotationId, 
        deleteAnnotation,
        isCommentPanelOpen,
        setIsCommentPanelOpen,
        addReply,
        deleteReply,
        updateAnnotation,
        setIsPropertiesPanelOpen
    } = useContext(AnnotationContext);

    const [expandedPages, setExpandedPages] = useState({});
    const [replyInputs, setReplyInputs] = useState({}); // { annotationId: text }
    
    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, RESOLVED, UNRESOLVED
    const [filterType, setFilterType] = useState('ALL'); // ALL, rectangle, stickynote, etc.
    const [filterReplies, setFilterReplies] = useState('ALL'); // ALL, YES, NO
    const [searchQuery, setSearchQuery] = useState('');

    const togglePage = (pageNumber) => {
        setExpandedPages(prev => ({
            ...prev,
            [pageNumber]: !prev[pageNumber]
        }));
    };

    const handleReplySubmit = (annotationId) => {
        const text = replyInputs[annotationId]?.trim();
        if (text) {
            addReply(annotationId, text);
            setReplyInputs(prev => ({ ...prev, [annotationId]: '' }));
        }
    };

    const clearFilters = () => {
        setFilterStatus('ALL');
        setFilterType('ALL');
        setFilterReplies('ALL');
        setSearchQuery('');
    };

    // Filter & Group annotations
    const groupedAnnotations = useMemo(() => {
        const groups = {};
        
        // 1. Filter the annotations
        const filteredAnnotations = annotations.filter(ann => {
            // Status Check
            if (filterStatus === 'RESOLVED' && !ann.resolved) return false;
            if (filterStatus === 'UNRESOLVED' && ann.resolved) return false;
            
            // Type Check
            if (filterType !== 'ALL' && ann.type !== filterType) return false;
            
            // Replies Check
            const hasReplies = ann.replies && ann.replies.length > 0;
            if (filterReplies === 'YES' && !hasReplies) return false;
            if (filterReplies === 'NO' && hasReplies) return false;
            
            // Search Query Check (Enterprise Engine)
            if (searchQuery.trim() !== '') {
                if (!evaluateSearchQuery(ann, searchQuery)) {
                    return false;
                }
            }
            
            return true;
        });

        // 2. Group by page
        filteredAnnotations.forEach(ann => {
            if (!groups[ann.pageNumber]) {
                groups[ann.pageNumber] = [];
            }
            groups[ann.pageNumber].push(ann);
        });
        
        // 3. Sort pages and within pages
        const sortedGroups = {};
        Object.keys(groups).sort((a, b) => Number(a) - Number(b)).forEach(page => {
            sortedGroups[page] = groups[page].sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
        });
        
        return sortedGroups;
    }, [annotations, filterStatus, filterType, filterReplies, searchQuery]);

    const activeFilterCount = (filterStatus !== 'ALL' ? 1 : 0) + (filterType !== 'ALL' ? 1 : 0) + (filterReplies !== 'ALL' ? 1 : 0) + (searchQuery !== '' ? 1 : 0);
    const uniqueTypes = [...new Set(annotations.map(a => a.type))];

    if (!isCommentPanelOpen) return null;

    return (
        <div className="fixed top-0 right-0 h-full w-96 bg-gray-50 border-l border-gray-200 shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex flex-col border-b border-gray-200 bg-white shadow-sm z-10">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <MessageSquare size={20} className="text-blue-600" />
                        <h2 className="text-lg font-semibold">Comments</h2>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {annotations.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`relative p-1.5 rounded-lg transition-colors flex items-center justify-center ${isFilterOpen || activeFilterCount > 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                            title="Filter Comments"
                        >
                            <Filter size={18} />
                            {activeFilterCount > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>
                        <button 
                            onClick={() => setIsCommentPanelOpen(false)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar Expandable */}
                {isFilterOpen && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={14} className="text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search comments..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <div className="absolute inset-y-0 right-0 pr-2 flex items-center group cursor-help">
                                <Info size={14} className="text-gray-400 hover:text-blue-500" />
                                <div className="absolute top-8 right-0 w-64 p-3 bg-gray-800 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <p className="font-bold mb-1 border-b border-gray-600 pb-1">Advanced Search Options</p>
                                    <ul className="list-disc pl-4 space-y-1 mt-2 text-gray-200">
                                        <li><strong>Exact Phrase:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">"fix this"</span></li>
                                        <li><strong>Boolean Logic:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">bug AND UI</span> or <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">OR NOT</span></li>
                                        <li><strong>Wildcards:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">net*ork</span></li>
                                        <li><strong>Metadata Fields:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">type:rectangle</span> or <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">author:"John"</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="block text-gray-500 font-medium mb-1">Status</label>
                                <select 
                                    value={filterStatus} 
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="w-full p-1.5 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="RESOLVED">Resolved Only</option>
                                    <option value="UNRESOLVED">Unresolved Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-500 font-medium mb-1">Type</label>
                                <select 
                                    value={filterType} 
                                    onChange={e => setFilterType(e.target.value)}
                                    className="w-full p-1.5 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none capitalize"
                                >
                                    <option value="ALL">All Types</option>
                                    {uniqueTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-500 font-medium mb-1">Replies</label>
                                <select 
                                    value={filterReplies} 
                                    onChange={e => setFilterReplies(e.target.value)}
                                    className="w-full p-1.5 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ALL">Any</option>
                                    <option value="YES">Has Replies</option>
                                    <option value="NO">No Replies</option>
                                </select>
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <button 
                                onClick={clearFilters}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium self-end flex items-center gap-1 mt-1"
                            >
                                <X size={12} /> Clear Filters ({activeFilterCount})
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3">
                {annotations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center p-6">
                        <MessageSquare size={48} className="opacity-20" />
                        <p className="text-sm">No annotations yet. Select a tool and draw on the PDF to get started.</p>
                    </div>
                ) : Object.keys(groupedAnnotations).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center p-6">
                        <Filter size={48} className="opacity-20 text-blue-600" />
                        <p className="text-sm font-medium text-gray-600">No comments match your filters.</p>
                        <button 
                            onClick={clearFilters}
                            className="mt-2 text-sm text-blue-600 font-medium hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    Object.entries(groupedAnnotations).map(([pageNumber, anns]) => (
                        <div key={`page-${pageNumber}`} className="mb-4">
                            <button 
                                onClick={() => togglePage(pageNumber)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-gray-200/80 hover:bg-gray-300 rounded-lg transition-colors text-sm font-semibold text-gray-700 mb-2"
                            >
                                <div className="flex items-center gap-2">
                                    {expandedPages[pageNumber] === false ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                    Page {pageNumber}
                                </div>
                                <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full">{anns.length}</span>
                            </button>
                            
                            {expandedPages[pageNumber] !== false && (
                                <div className="flex flex-col gap-2">
                                    {anns.map(ann => {
                                        const isSelected = selectedAnnotationId === ann.id;
                                        
                                        return (
                                            <div 
                                                key={ann.id}
                                                onClick={() => !isSelected && setSelectedAnnotationId(ann.id)}
                                                className={`flex flex-col rounded-xl border transition-all ${
                                                    isSelected 
                                                        ? 'bg-white border-blue-300 shadow-md ring-1 ring-blue-100' 
                                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer shadow-sm'
                                                }`}
                                            >
                                                {/* Parent Annotation Header */}
                                                <div className="flex items-start gap-3 p-3">
                                                    <div 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5"
                                                        style={{ backgroundColor: ann.strokeColor || ann.color || '#3b82f6' }}
                                                    >
                                                        {typeIcons[ann.type] || <MessageSquare size={14} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className={`text-sm font-bold capitalize truncate flex items-center gap-2 ${ann.resolved ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                                {ann.authorName || 'Author'}
                                                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider no-underline">
                                                                    {ann.type}
                                                                </span>
                                                                {ann.resolved && (
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider no-underline">
                                                                        Resolved
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <span className="text-[10px] text-gray-400 font-medium">
                                                                {ann.createdDate ? new Date(ann.createdDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                            </span>
                                                        </div>
                                                        
                                                        {ann.text && (
                                                            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                                                                {ann.text}
                                                            </p>
                                                        )}

                                                        {ann.unit && (
                                                            <p className="text-xs font-mono bg-gray-50 p-1.5 rounded text-gray-600 mt-2 border border-gray-100 inline-block">
                                                                Measured in {ann.unit}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Preview of replies if not selected */}
                                                        {!isSelected && ann.replies && ann.replies.length > 0 && (
                                                            <div className="mt-2 text-xs font-semibold text-blue-600 flex items-center gap-1">
                                                                <MessageSquare size={12} /> {ann.replies.length} replies
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex flex-col gap-1 items-center mt-0.5">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsPropertiesPanelOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors flex-shrink-0"
                                                                title="Edit Properties"
                                                            >
                                                                <Sliders size={16} />
                                                            </button>

                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateAnnotation(ann.id, { resolved: !ann.resolved });
                                                                }}
                                                                className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${ann.resolved ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                                title={ann.resolved ? "Reopen Thread" : "Resolve Thread"}
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteAnnotation(ann.id);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                                                                title="Delete Annotation"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expanded Thread View */}
                                                {isSelected && (
                                                    <div className="bg-slate-50 border-t border-gray-100 rounded-b-xl flex flex-col">
                                                        {/* Replies List */}
                                                        {ann.replies && ann.replies.length > 0 && (
                                                            <div className="flex flex-col gap-3 p-3">
                                                                {ann.replies.map(reply => (
                                                                    <div key={reply.id} className="flex gap-2 relative">
                                                                        <div className="absolute left-[11px] top-0 bottom-[-12px] w-px bg-gray-200 last:hidden"></div>
                                                                        <div className="mt-1 relative z-10 flex-shrink-0 text-gray-400 bg-slate-50 rounded-full">
                                                                            <CornerDownRight size={14} />
                                                                        </div>
                                                                        <div className="flex-1 bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-xs font-bold text-gray-800">{reply.authorName}</span>
                                                                                <span className="text-[10px] text-gray-400">
                                                                                    {new Date(reply.createdDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                                                                            <div className="flex justify-end mt-1">
                                                                                <button 
                                                                                    onClick={() => deleteReply(ann.id, reply.id)}
                                                                                    className="text-[10px] font-medium text-red-500 hover:text-red-700"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Reply Input */}
                                                        <div className="p-3 border-t border-gray-200/60 bg-white rounded-b-xl">
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="text"
                                                                    placeholder="Reply to this thread..."
                                                                    value={replyInputs[ann.id] || ''}
                                                                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [ann.id]: e.target.value }))}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            handleReplySubmit(ann.id);
                                                                        }
                                                                    }}
                                                                    className="flex-1 text-sm bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 outline-none transition-all"
                                                                />
                                                                <button 
                                                                    onClick={() => handleReplySubmit(ann.id)}
                                                                    disabled={!replyInputs[ann.id]?.trim()}
                                                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 transition-colors flex items-center justify-center"
                                                                >
                                                                    <Send size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
