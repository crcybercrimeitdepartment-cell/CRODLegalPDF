import React, { useContext } from 'react';
import { AnnotationContext } from './context/AnnotationContext';
import { X, Sliders, Palette, Type, Clock, User, Fingerprint, Activity, Tag } from 'lucide-react';

export default function AnnotationPropertiesPage() {
    const { 
        annotations, 
        selectedAnnotationId, 
        updateAnnotation,
        isPropertiesPanelOpen,
        setIsPropertiesPanelOpen
    } = useContext(AnnotationContext);

    if (!isPropertiesPanelOpen) return null;

    const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);

    const handlePropertyChange = (property, value) => {
        if (!selectedAnnotationId) return;
        updateAnnotation(selectedAnnotationId, { [property]: value });
    };

    return (
        <div className="fixed top-0 left-0 h-full w-80 bg-gray-50 border-r border-gray-200 shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-gray-800">
                    <Sliders size={20} className="text-purple-600" />
                    <h2 className="text-lg font-semibold">Properties</h2>
                </div>
                <button 
                    onClick={() => setIsPropertiesPanelOpen(false)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                {!selectedAnnotation ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center opacity-70">
                        <Sliders size={48} className="opacity-50 text-purple-600 mb-2" />
                        <h3 className="text-gray-700 font-bold">No Annotation Selected</h3>
                        <p className="text-sm">Click on any drawing or markup on the document to edit its properties.</p>
                    </div>
                ) : (
                    <>
                        {/* Basic Info */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3">
                            <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold uppercase tracking-wider text-xs shadow-sm mt-1 flex-shrink-0"
                                style={{ backgroundColor: selectedAnnotation.strokeColor || selectedAnnotation.color || '#3b82f6' }}
                            >
                                {selectedAnnotation.type.substring(0,2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 capitalize truncate">{selectedAnnotation.type}</h3>
                                <p className="text-xs text-gray-500 mt-1 truncate">Page {selectedAnnotation.pageNumber || 1}</p>
                            </div>
                        </div>

                        {/* Appearance Properties */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                <Palette size={14} className="text-gray-500" />
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Appearance</h4>
                            </div>
                            <div className="p-4 flex flex-col gap-4">
                                {/* Stroke Color */}
                                <div>
                                    <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                        Stroke Color
                                        <span className="text-xs text-gray-400 font-mono">{selectedAnnotation.strokeColor || selectedAnnotation.color || '#000000'}</span>
                                    </label>
                                    <input 
                                        type="color" 
                                        value={selectedAnnotation.strokeColor || selectedAnnotation.color || '#000000'}
                                        onChange={(e) => {
                                            handlePropertyChange('strokeColor', e.target.value);
                                            handlePropertyChange('color', e.target.value); // fallback
                                        }}
                                        className="w-full h-8 rounded cursor-pointer border-0 p-0"
                                    />
                                </div>

                                {/* Fill Color (if applicable) */}
                                {['rectangle', 'circle', 'polygon'].includes(selectedAnnotation.type.toLowerCase()) && (
                                    <div>
                                        <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                            Fill Color
                                            <span className="text-xs text-gray-400 font-mono">{selectedAnnotation.fillColor || 'Transparent'}</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color" 
                                                value={selectedAnnotation.fillColor || '#ffffff'}
                                                onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                                                className="flex-1 h-8 rounded cursor-pointer border-0 p-0"
                                            />
                                            <button 
                                                onClick={() => handlePropertyChange('fillColor', null)}
                                                className="px-2 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 font-medium"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Border Width */}
                                {selectedAnnotation.type !== 'stickynote' && (
                                    <div>
                                        <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                            Stroke Width
                                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{selectedAnnotation.strokeWidth || 2}px</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="1" max="20" 
                                            value={selectedAnnotation.strokeWidth || 2}
                                            onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
                                            className="w-full accent-purple-600"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Text Properties (if applicable) */}
                        {['freetext', 'textbox', 'callout'].includes(selectedAnnotation.type.toLowerCase()) && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                    <Type size={14} className="text-gray-500" />
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Text Properties</h4>
                                </div>
                                <div className="p-4 flex flex-col gap-4">
                                    <div>
                                        <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                            Font Size
                                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{selectedAnnotation.fontSize || 12}pt</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="8" max="72" 
                                            value={selectedAnnotation.fontSize || 12}
                                            onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                                            className="w-full accent-purple-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Metadata / Audit Info (Read-only) */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                <Activity size={14} className="text-gray-500" />
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Metadata</h4>
                            </div>
                            <div className="p-4 flex flex-col gap-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500"><User size={14}/> Author</div>
                                    <div className="font-medium text-gray-900">{selectedAnnotation.authorName || 'Current User'}</div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500"><Tag size={14}/> Status</div>
                                    <div className={`font-bold ${selectedAnnotation.resolved ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {selectedAnnotation.resolved ? 'Resolved' : 'Open'}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500"><Clock size={14}/> Created</div>
                                    <div className="font-medium text-gray-900 text-xs text-right">
                                        {selectedAnnotation.createdDate ? new Date(selectedAnnotation.createdDate).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                                    <div className="flex items-center gap-2 text-gray-400"><Fingerprint size={14}/> ID</div>
                                    <div className="font-mono text-gray-400 text-[10px] truncate max-w-[120px]" title={selectedAnnotation.id}>
                                        {selectedAnnotation.id}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </>
                )}
            </div>
        </div>
    );
}
