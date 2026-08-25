import React, { useState, useContext, useRef } from 'react';
import { AnnotationContext } from './context/AnnotationContext';
import { parseImportFile } from './utils/importExport';
import { X, Upload, AlertCircle, CheckCircle, FileJson } from 'lucide-react';

export default function ImportCommentsPage({ isOpen, onClose }) {
    const { annotations, importAnnotations } = useContext(AnnotationContext);
    
    const [file, setFile] = useState(null);
    const [importedData, setImportedData] = useState(null);
    const [error, setError] = useState(null);
    const [importMode, setImportMode] = useState('MERGE'); // MERGE or REPLACE
    
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        
        setFile(selectedFile);
        setError(null);
        
        try {
            const data = await parseImportFile(selectedFile);
            setImportedData(data);
        } catch (err) {
            setError(err.message);
            setImportedData(null);
        }
    };

    const handleImport = () => {
        if (!importedData) return;
        importAnnotations(importedData, importMode);
        resetAndClose();
    };

    const resetAndClose = () => {
        setFile(null);
        setImportedData(null);
        setError(null);
        setImportMode('MERGE');
        onClose();
    };

    const newCommentsCount = importedData ? importedData.length : 0;
    const existingIds = new Set(annotations.map(a => a.id));
    const duplicateCount = importedData ? importedData.filter(a => existingIds.has(a.id)).length : 0;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileJson size={24} className="text-blue-600" />
                        Import Comments
                    </h2>
                    <button onClick={resetAndClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col gap-6">
                    {/* File Upload Zone */}
                    {!importedData && !error && (
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                accept=".json,application/json" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <Upload size={24} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 mb-1">Click to upload JSON file</h3>
                            <p className="text-xs text-gray-500">Supports exported annotations JSON</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm">Import Failed</h4>
                                <p className="text-xs mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {importedData && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={24} className="text-emerald-600" />
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">File Parsed Successfully</h4>
                                        <p className="text-xs text-emerald-700 font-medium">Found {newCommentsCount} annotations in {file.name}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Conflict Resolution</h4>
                                
                                {duplicateCount > 0 && (
                                    <div className="mb-4 text-sm text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-2">
                                        <AlertCircle size={16} /> 
                                        {duplicateCount} duplicate comment(s) detected.
                                    </div>
                                )}
                                
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="MERGE" 
                                            checked={importMode === 'MERGE'} 
                                            onChange={() => setImportMode('MERGE')}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">Merge with existing</div>
                                            <div className="text-xs text-gray-500">Skips duplicates and preserves your current work.</div>
                                        </div>
                                    </label>
                                    
                                    <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="REPLACE" 
                                            checked={importMode === 'REPLACE'} 
                                            onChange={() => setImportMode('REPLACE')}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">Replace existing</div>
                                            <div className="text-xs text-gray-500">Deletes all current annotations and applies the imported file.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button onClick={resetAndClose} className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleImport}
                        disabled={!importedData}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Execute Import
                    </button>
                </div>
            </div>
        </div>
    );
}
