import React, { useContext, useState } from 'react';
import { HistoryContext } from './context/HistoryContext';
import { 
    X, History, Activity, Edit3, Trash2, CheckCircle, 
    MessageSquare, AlertCircle, RefreshCcw, Filter
} from 'lucide-react';

export default function CommentHistoryPage() {
    const { historyLogs, isHistoryPanelOpen, setIsHistoryPanelOpen, clearHistory } = useContext(HistoryContext);
    const [filter, setFilter] = useState('ALL'); // ALL, CREATED, EDITED, DELETED, RESOLVED

    if (!isHistoryPanelOpen) return null;

    const filteredLogs = historyLogs.filter(log => filter === 'ALL' || log.actionType === filter);

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATED': return <Edit3 size={14} className="text-blue-500" />;
            case 'EDITED': return <RefreshCcw size={14} className="text-amber-500" />;
            case 'DELETED': return <Trash2 size={14} className="text-red-500" />;
            case 'RESOLVED': return <CheckCircle size={14} className="text-emerald-500" />;
            case 'REOPENED': return <AlertCircle size={14} className="text-amber-500" />;
            case 'REPLIED': return <MessageSquare size={14} className="text-purple-500" />;
            default: return <Activity size={14} className="text-gray-500" />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATED': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'EDITED': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'DELETED': return 'bg-red-50 text-red-700 border-red-200';
            case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'REOPENED': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'REPLIED': return 'bg-purple-50 text-purple-700 border-purple-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed top-0 right-0 h-full w-96 bg-gray-50 border-l border-gray-200 shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex flex-col border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <History size={20} className="text-blue-600" />
                        <h2 className="text-lg font-semibold">Audit Trail</h2>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {historyLogs.length}
                        </span>
                    </div>
                    <button 
                        onClick={() => setIsHistoryPanelOpen(false)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Filters */}
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <Filter size={14} className="text-gray-400 shrink-0 mr-1" />
                        {['ALL', 'CREATED', 'EDITED', 'DELETED', 'RESOLVED'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    filter === f 
                                        ? 'bg-gray-800 text-white' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline List */}
            <div className="flex-1 overflow-y-auto p-4 bg-white/50">
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center">
                        <History size={48} className="opacity-20" />
                        <p className="text-sm">No history records found.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-200 ml-4 pl-6 flex flex-col gap-6">
                        {filteredLogs.map(log => {
                            const date = new Date(log.timestamp);
                            return (
                                <div key={log.id} className="relative">
                                    {/* Timeline Marker */}
                                    <div className="absolute -left-[35px] top-1 bg-white border-2 border-gray-200 rounded-full p-1 shadow-sm">
                                        {getActionIcon(log.actionType)}
                                    </div>
                                    
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900">{log.authorName}</span>
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getActionColor(log.actionType)}`}>
                                                    {log.actionType}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        
                                        <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded border border-gray-100">
                                            <span className="text-gray-400">ID:</span> {log.annotationId.slice(0, 8)}...
                                            {log.details?.type && (
                                                <span className="ml-3"><span className="text-gray-400">Type:</span> {log.details.type}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white">
                <button 
                    onClick={clearHistory}
                    className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                >
                    Clear Audit Log
                </button>
            </div>
        </div>
    );
}
