import React, { useState, useContext } from 'react';
import { AnnotationContext } from './context/AnnotationContext';
import { HistoryContext } from './context/HistoryContext';
import { exportAnnotationsToJson, exportAnnotationsToCsv, exportAnnotationsToTxt } from './utils/importExport';
import { X, DownloadCloud, FileText, FileJson, Table2 } from 'lucide-react';

export default function ExportCommentsPage({ isOpen, onClose }) {
    const { annotations } = useContext(AnnotationContext);
    const { addHistoryLog } = useContext(HistoryContext);

    const [exportFormat, setExportFormat] = useState('JSON');
    const [exportScope, setExportScope] = useState('ALL'); // ALL, RESOLVED, UNRESOLVED
    const [includeReplies, setIncludeReplies] = useState(true);
    const [includeMetadata, setIncludeMetadata] = useState(true);

    if (!isOpen) return null;

    // Filter annotations based on scope
    const filteredAnnotations = annotations.filter(ann => {
        if (exportScope === 'ALL') return true;
        if (exportScope === 'RESOLVED') return ann.resolved === true;
        if (exportScope === 'UNRESOLVED') return ann.resolved !== true;
        return true;
    });

    const handleExport = () => {
        const options = { includeReplies, includeMetadata };
        
        switch (exportFormat) {
            case 'JSON':
                exportAnnotationsToJson(filteredAnnotations);
                break;
            case 'CSV':
                exportAnnotationsToCsv(filteredAnnotations, 'comments.csv', options);
                break;
            case 'TXT':
                exportAnnotationsToTxt(filteredAnnotations, 'comments.txt', options);
                break;
        }

        // Log the export action
        addHistoryLog('EXPORTED', 'multiple', { 
            format: exportFormat, 
            scope: exportScope,
            count: filteredAnnotations.length 
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <DownloadCloud size={24} className="text-emerald-600" />
                        Export Comments
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    {/* Format Selection */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Export Format</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button 
                                onClick={() => setExportFormat('JSON')}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${exportFormat === 'JSON' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <FileJson size={24} />
                                <span className="text-xs font-bold">JSON</span>
                            </button>
                            <button 
                                onClick={() => setExportFormat('CSV')}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${exportFormat === 'CSV' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Table2 size={24} />
                                <span className="text-xs font-bold">CSV</span>
                            </button>
                            <button 
                                onClick={() => setExportFormat('TXT')}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${exportFormat === 'TXT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <FileText size={24} />
                                <span className="text-xs font-bold">TXT</span>
                            </button>
                        </div>
                    </div>

                    {/* Scope Selection */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Export Scope</h3>
                        <select 
                            value={exportScope}
                            onChange={(e) => setExportScope(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 text-sm"
                        >
                            <option value="ALL">All Comments ({annotations.length})</option>
                            <option value="RESOLVED">Resolved Comments Only</option>
                            <option value="UNRESOLVED">Unresolved Comments Only</option>
                        </select>
                    </div>

                    {/* Options (only for CSV and TXT for now, as JSON exports everything structurally) */}
                    {(exportFormat === 'CSV' || exportFormat === 'TXT') && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Include Options</h3>
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={includeReplies}
                                        onChange={(e) => setIncludeReplies(e.target.checked)}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-700">Include reply threads</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={includeMetadata}
                                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-700">Include metadata (Author, Dates, Status)</span>
                                </label>
                            </div>
                        </div>
                    )}
                    
                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Export Summary</h4>
                        <p className="text-sm text-gray-800">
                            You are about to export <strong>{filteredAnnotations.length}</strong> annotations in <strong>{exportFormat}</strong> format.
                        </p>
                    </div>

                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleExport}
                        disabled={filteredAnnotations.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        <DownloadCloud size={18} />
                        Generate & Download
                    </button>
                </div>
            </div>
        </div>
    );
}
