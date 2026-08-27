import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  UploadCloud, Crop, RotateCw, SlidersHorizontal, Wand2, Type,
  ZoomIn, ZoomOut, Maximize, RotateCcw, Undo2, Redo2, Zap, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Download
} from 'lucide-react';

const ImageEditorResultModal = ({
  isOpen,
  onClose,
  resultImgSrc,
  message,
  onDownload
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[750px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        

        {/* Body */}
        <div className="p-6 overflow-y-auto text-center flex-1 bg-slate-100 custom-scrollbar">
          <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block max-w-full shadow-sm">
            {resultImgSrc ? (
              <img
                src={resultImgSrc}
                className="max-w-full max-h-[50vh] rounded-md shadow-md border border-slate-200"
                alt="Processed result"
              />
            ) : (
              <div className="w-full h-32 flex flex-col items-center justify-center text-blue-600 gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold tracking-widest uppercase">Processing...</span>
              </div>
            )}
          </div>
          {message && (
            <div className="mt-6 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg inline-block">
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider"
          >
            Continue Editing
          </button>
          <button
            onClick={onDownload}
            disabled={!resultImgSrc}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all text-xs flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md"
          >
            <Download className="w-4 h-4" /> Download Image
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};


const TABS = [
  { id: 'upload', label: 'Upload', icon: UploadCloud },
  { id: 'crop', label: 'Crop/Resize', icon: Crop },
  { id: 'transform', label: 'Transform', icon: RotateCw },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'filters', label: 'Filters', icon: Wand2 },
  { id: 'text', label: 'Text', icon: Type }
];

const PRESET_FILTERS = [
  { id: 'original', label: 'Original' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'black_white', label: 'Black & White' }
];

const ImageEditorSidebar = ({
  activeTab,
  setActiveTab,
  file,
  onFileSelect,
  onFileRemove,
  editState,
  updateEditState,
  originalDimensions,
  saveHistorySnapshot
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleSliderChange = (key, value) => {
    updateEditState({ [key]: parseFloat(value) });
  };

  const handleSliderChangeEnd = () => {
    saveHistorySnapshot();
  };

  return (
    <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-hidden z-20">

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 bg-slate-100 border-b border-slate-200 p-2 gap-1 shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold transition-all ${isActive
                ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 border border-transparent'
                }`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="truncate w-full text-center text-[10px] uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">

        {/* 1. UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Image Source</h3>

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
              >
                <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 group-hover:text-blue-600 text-slate-500 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-700 font-bold mb-1">Click to browse or drag file</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Supports JPG, PNG, WEBP</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filename</span>
                  <span className="text-xs font-bold text-slate-800 text-right truncate ml-2 w-32" title={file.name}>{file.name}</span>
                </div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Dimensions</span>
                  <span className="text-xs font-bold text-blue-600 text-right">{originalDimensions?.width || '-'} x {originalDimensions?.height || '-'} px</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Size</span>
                  <span className="text-xs font-bold text-slate-800 text-right">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors uppercase tracking-wider"
                  >
                    Replace
                  </button>
                  <button
                    onClick={onFileRemove}
                    className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors uppercase tracking-wider"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        )}

        {/* 2. CROP / RESIZE TAB */}
        {activeTab === 'crop' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Crop Region</h3>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    saveHistorySnapshot();
                    const w = originalDimensions.width || 400;
                    const h = originalDimensions.height || 300;
                    updateEditState({
                      crop: {
                        left: Math.round(w * 0.1),
                        top: Math.round(h * 0.1),
                        right: Math.round(w * 0.9),
                        bottom: Math.round(h * 0.9)
                      }
                    });
                  }}
                  className="flex-1 py-2 bg-blue-50 border border-blue-200 text-blue-600 text-[11px] font-bold rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-wider"
                >
                  Enable Crop Area
                </button>
                <button
                  onClick={() => {
                    saveHistorySnapshot();
                    updateEditState({ crop: null });
                  }}
                  disabled={!editState.crop}
                  className="flex-1 py-2 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg hover:text-slate-800 hover:border-slate-300 transition-colors disabled:opacity-50 uppercase tracking-wider"
                >
                  Clear Crop
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['left', 'top', 'right', 'bottom'].map((pos) => (
                  <div key={pos}>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{pos} (px)</label>
                    <input
                      type="number"
                      value={editState.crop ? editState.crop[pos] : 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (editState.crop) {
                          updateEditState({ crop: { ...editState.crop, [pos]: val } });
                        }
                      }}
                      disabled={!editState.crop}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 disabled:opacity-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Resize Image</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Width (px)</label>
                  <input
                    type="number"
                    value={editState.resize?.width || originalDimensions.width || ''}
                    onChange={(e) => {
                      const w = parseInt(e.target.value) || 0;
                      let h = editState.resize?.height || originalDimensions.height || 0;
                      if (editState.resize?.keep_aspect_ratio && originalDimensions.width) {
                        const aspect = originalDimensions.width / originalDimensions.height;
                        h = Math.round(w / aspect);
                      }
                      updateEditState({ resize: { ...editState.resize, width: w, height: h, keep_aspect_ratio: editState.resize?.keep_aspect_ratio ?? true } });
                    }}
                    onBlur={saveHistorySnapshot}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Height (px)</label>
                  <input
                    type="number"
                    value={editState.resize?.height || originalDimensions.height || ''}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 0;
                      let w = editState.resize?.width || originalDimensions.width || 0;
                      if (editState.resize?.keep_aspect_ratio && originalDimensions.height) {
                        const aspect = originalDimensions.width / originalDimensions.height;
                        w = Math.round(h * aspect);
                      }
                      updateEditState({ resize: { ...editState.resize, width: w, height: h, keep_aspect_ratio: editState.resize?.keep_aspect_ratio ?? true } });
                    }}
                    onBlur={saveHistorySnapshot}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={editState.resize?.keep_aspect_ratio ?? true}
                  onChange={(e) => {
                    updateEditState({
                      resize: {
                        ...(editState.resize || { width: originalDimensions.width, height: originalDimensions.height }),
                        keep_aspect_ratio: e.target.checked
                      }
                    });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 bg-white border-slate-200 accent-blue-600"
                />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">Maintain Aspect Ratio</span>
              </label>
            </div>
          </div>
        )}

        {/* 3. TRANSFORM TAB */}
        {activeTab === 'transform' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rotation</h3>
                <span className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{editState.rotation}°</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { saveHistorySnapshot(); updateEditState({ rotation: (editState.rotation - 90 + 360) % 360 }); }}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                >
                  <RotateCw className="w-4 h-4 -scale-x-100 text-slate-400" /> Left
                </button>
                <button
                  onClick={() => { saveHistorySnapshot(); updateEditState({ rotation: (editState.rotation + 90) % 360 }); }}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                >
                  <RotateCw className="w-4 h-4 text-slate-400" /> Right
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Flip Options</h3>
              <div className="space-y-2">
                <button
                  onClick={() => { saveHistorySnapshot(); updateEditState({ flip_horizontal: !editState.flip_horizontal }); }}
                  className={`w-full py-3 border text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 ${editState.flip_horizontal ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  ↔ Flip Horizontal
                </button>
                <button
                  onClick={() => { saveHistorySnapshot(); updateEditState({ flip_vertical: !editState.flip_vertical }); }}
                  className={`w-full py-3 border text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 ${editState.flip_vertical ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  ↕ Flip Vertical
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. ADJUSTMENTS TAB */}
        {activeTab === 'adjust' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Color Adjustments</h3>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-5 shadow-sm">
              {[
                { id: 'brightness', label: 'Brightness', min: 0, max: 2, step: 0.01, formatter: v => `${Math.round((v - 1) * 100)}%` },
                { id: 'contrast', label: 'Contrast', min: 0, max: 2, step: 0.01, formatter: v => `${Math.round((v - 1) * 100)}%` },
                { id: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01, formatter: v => `${Math.round((v - 1) * 100)}%` },
                { id: 'sharpness', label: 'Sharpness', min: 0, max: 3, step: 0.1, formatter: v => `${v.toFixed(1)}x` }
              ].map(setting => (
                <div key={setting.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{setting.label}</label>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {setting.formatter(editState[setting.id])}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={setting.min}
                    max={setting.max}
                    step={setting.step}
                    value={editState[setting.id]}
                    onChange={(e) => handleSliderChange(setting.id, e.target.value)}
                    onMouseUp={handleSliderChangeEnd}
                    onTouchEnd={handleSliderChangeEnd}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                saveHistorySnapshot();
                updateEditState({ brightness: 1, contrast: 1, saturation: 1, sharpness: 1 });
              }}
              className="w-full py-2.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-200 transition-colors"
            >
              Reset Adjustments
            </button>
          </div>
        )}

        {/* 5. FILTERS TAB */}
        {activeTab === 'filters' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Preset Filters</h3>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_FILTERS.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    saveHistorySnapshot();
                    updateEditState({ filter: filter.id });
                  }}
                  className={`py-6 px-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center shadow-sm ${editState.filter === filter.id
                    ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Text Overlay</h3>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Content</label>
                <input
                  type="text"
                  value={editState.text?.text || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      updateEditState({ text: null });
                    } else {
                      updateEditState({ text: { ...(editState.text || { font_size: 48, color: '#ffffff', is_bold: true, is_italic: false, x: 50, y: 50 }), text: val } });
                    }
                  }}
                  onBlur={saveHistorySnapshot}
                  placeholder="Enter text..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Size (px)</label>
                  <input
                    type="number"
                    value={editState.text?.font_size || 48}
                    onChange={(e) => updateEditState({ text: { ...editState.text, font_size: parseInt(e.target.value) || 12 } })}
                    disabled={!editState.text}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 disabled:opacity-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Color</label>
                  <div className="relative">
                    <input
                      type="color"
                      value={editState.text?.color || '#ffffff'}
                      onChange={(e) => updateEditState({ text: { ...editState.text, color: e.target.value } })}
                      disabled={!editState.text}
                      className="w-full h-[42px] p-1 bg-white border border-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateEditState({ text: { ...editState.text, is_bold: !editState.text.is_bold } })}
                  disabled={!editState.text}
                  className={`flex-1 py-2.5 border rounded-lg text-sm transition-colors ${editState.text?.is_bold ? 'bg-blue-50 border-blue-200 text-blue-600 font-bold' : 'bg-slate-100 border-slate-200 text-slate-600 font-bold hover:bg-slate-200'}`}
                >
                  B
                </button>
                <button
                  onClick={() => updateEditState({ text: { ...editState.text, is_italic: !editState.text.is_italic } })}
                  disabled={!editState.text}
                  className={`flex-1 py-2.5 border rounded-lg text-sm italic transition-colors font-serif ${editState.text?.is_italic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                >
                  I
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-3 shadow-inner">
              <div className="mt-0.5 text-blue-600"><Type className="w-4 h-4" /></div>
              <div className="leading-relaxed font-medium">You can also drag the text directly on the canvas to reposition it.</div>
            </div>

            {editState.text && (
              <button
                onClick={() => { saveHistorySnapshot(); updateEditState({ text: null }); }}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
              >
                Remove Text
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};


const ImageEditorStage = ({
  file,
  fileUrl,
  editState,
  updateEditState,
  zoomLevel,
  setZoomLevel,
  onApplyChanges,
  canApply,
  historyStackLength,
  redoStackLength,
  onUndo,
  onRedo,
  onResetChanges,
  saveHistorySnapshot
}) => {
  const canvasWrapperRef = useRef(null);
  const textOverlayRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialTextPosRef = useRef({ x: 0, y: 0 });

  // Handle Dragging for Text Overlay
  const handleTextMouseDown = (e) => {
    if (!editState.text) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialTextPosRef.current = { x: editState.text.x || 0, y: editState.text.y || 0 };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingRef.current && editState.text) {
        const dx = Math.round((e.clientX - dragStartRef.current.x) / zoomLevel);
        const dy = Math.round((e.clientY - dragStartRef.current.y) / zoomLevel);
        updateEditState({
          text: {
            ...editState.text,
            x: Math.max(0, initialTextPosRef.current.x + dx),
            y: Math.max(0, initialTextPosRef.current.y + dy)
          }
        });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        saveHistorySnapshot();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editState.text, zoomLevel, updateEditState, saveHistorySnapshot]);

  // CSS Filter Generator
  const getFilterStyle = () => {
    let filterStr = `brightness(${editState.brightness}) contrast(${editState.contrast}) saturate(${editState.saturation})`;
    if (editState.filter === 'grayscale') filterStr += ' grayscale(100%)';
    else if (editState.filter === 'sepia') filterStr += ' sepia(100%)';
    else if (editState.filter === 'black_white') filterStr += ' grayscale(100%) contrast(200%)';
    return filterStr;
  };

  // CSS Transform Generator
  const getTransformStyle = () => {
    const scaleX = editState.flip_horizontal ? -1 : 1;
    const scaleY = editState.flip_vertical ? -1 : 1;
    return `scale(${zoomLevel}) rotate(${editState.rotation}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
  };

  return (
    <main className="flex-1 flex flex-col bg-slate-100 relative min-w-0 border-l border-slate-200">

      {/* Topbar */}
      <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.15))} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 w-12 text-center bg-white py-1 rounded border border-slate-200">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.15))} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <button onClick={() => setZoomLevel(1.0)} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5">
            <Maximize className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Fit</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={historyStackLength === 0}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={redoStackLength === 0}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stage Viewport */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 relative bg-slate-100">
        {!file ? (
          <div className="text-center text-slate-400 select-none flex flex-col items-center">
            <ImageIcon className="w-20 h-20 text-slate-300 mb-5" />
            <h3 className="text-xl font-bold text-slate-500">No Image Loaded</h3>
            <p className="text-sm mt-2 max-w-sm text-slate-400">Select or drop an image from the sidebar to begin editing in the studio.</p>
          </div>
        ) : (
          <div
            ref={canvasWrapperRef}
            className="relative inline-block shadow-2xl origin-center transition-transform duration-100 ease-out will-change-transform bg-white border border-slate-200 p-2 rounded-sm"
            style={{ transform: getTransformStyle() }}
          >
            <img
              src={fileUrl}
              alt="Editor preview"
              className="block max-w-full max-h-[70vh] rounded-sm pointer-events-none"
              style={{ filter: getFilterStyle() }}
            />

            {/* Crop Overlay */}
            {editState.crop && (
              <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 shadow-[0_0_0_9999px_rgba(245,243,236,0.6)] z-10 pointer-events-none"
                style={{
                  left: editState.crop.left + 8,
                  top: editState.crop.top + 8,
                  width: editState.crop.right - editState.crop.left,
                  height: editState.crop.bottom - editState.crop.top
                }}
              >
                {/* Crop Handles */}
                <div className="absolute w-3 h-3 bg-blue-500 border-2 border-white -top-1.5 -left-1.5 rounded-full shadow-md"></div>
                <div className="absolute w-3 h-3 bg-blue-500 border-2 border-white -top-1.5 -right-1.5 rounded-full shadow-md"></div>
                <div className="absolute w-3 h-3 bg-blue-500 border-2 border-white -bottom-1.5 -left-1.5 rounded-full shadow-md"></div>
                <div className="absolute w-3 h-3 bg-blue-500 border-2 border-white -bottom-1.5 -right-1.5 rounded-full shadow-md"></div>
              </div>
            )}

            {/* Text Overlay */}
            {editState.text && editState.text.text && (
              <div
                ref={textOverlayRef}
                onMouseDown={handleTextMouseDown}
                className="absolute cursor-move whitespace-nowrap z-20 px-2 py-1 border-2 border-dashed border-white/60 hover:border-blue-500 rounded hover:bg-blue-500/10 user-select-none transition-colors"
                style={{
                  left: editState.text.x + 8,
                  top: editState.text.y + 8,
                  fontSize: editState.text.font_size,
                  color: editState.text.color,
                  fontWeight: editState.text.is_bold ? 'bold' : 'normal',
                  fontStyle: editState.text.is_italic ? 'italic' : 'normal',
                  textShadow: '0px 1px 4px rgba(0,0,0,0.5)'
                }}
              >
                {editState.text.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 z-10 shadow-[0_-4px_25px_rgba(0,0,0,0.02)]">
        <button
          onClick={onResetChanges}
          disabled={!file}
          className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Reset Changes</span>
        </button>

        <button
          onClick={onApplyChanges}
          disabled={!canApply}
          className="px-8 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
        >
          <Zap className="w-4 h-4" /> <span>Apply & Process</span>
        </button>
      </div>
    </main>
  );
};


const createDefaultState = () => ({
  crop: null,
  resize: null,
  rotation: 0,
  flip_horizontal: false,
  flip_vertical: false,
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  sharpness: 1.0,
  filter: "original",
  text: null
});

const ImageEditor = ({ tool, onBack }) => {
  const [activeTab, setActiveTab] = useState('upload');

  // File State
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });

  // Editor State
  const [editState, setEditState] = useState(createDefaultState());
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // History State
  const [historyStack, setHistoryStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resultImgUrl, setResultImgUrl] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // File Handlers
  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setFileUrl(url);

    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      // Reset everything on new file
      setEditState(createDefaultState());
      setHistoryStack([]);
      setRedoStack([]);
      setZoomLevel(1.0);
    };
    img.src = url;
  };

  const handleFileRemove = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl('');
    setOriginalDimensions({ width: 0, height: 0 });
    setEditState(createDefaultState());
    setHistoryStack([]);
    setRedoStack([]);
  };

  // State Updates
  const updateEditState = useCallback((updates) => {
    setEditState(prev => ({ ...prev, ...updates }));
  }, []);

  const saveHistorySnapshot = useCallback(() => {
    setHistoryStack(prev => [...prev, JSON.parse(JSON.stringify(editState))]);
    setRedoStack([]);
  }, [editState]);

  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const newHistory = [...historyStack];
    const previousState = newHistory.pop();
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(editState))]);
    setHistoryStack(newHistory);
    setEditState(previousState);
  }, [historyStack, editState]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const newRedo = [...redoStack];
    const nextState = newRedo.pop();
    setHistoryStack(prev => [...prev, JSON.parse(JSON.stringify(editState))]);
    setRedoStack(newRedo);
    setEditState(nextState);
  }, [redoStack, editState]);

  const handleResetChanges = useCallback(() => {
    if (window.confirm("Reset all editing changes?")) {
      saveHistorySnapshot();
      setEditState(createDefaultState());
    }
  }, [saveHistorySnapshot]);

  // Apply Changes to Backend API
  const handleApplyChanges = async () => {
    if (!file) return;

    setIsProcessing(true);
    setIsModalOpen(true);
    setResultImgUrl('');
    setResultMessage('');

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("state", JSON.stringify(editState));

      const API_BASE_URL = window.API_BASE_URL || "/api/v1/images";
      const response = await fetch(`${API_BASE_URL}/editor`, {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json, image/*'
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process image");
      }

      // We expect a blob (image file) back
      const blob = await response.blob();
      const processedUrl = URL.createObjectURL(blob);
      setResultImgUrl(processedUrl);
      setResultMessage("Image processed successfully!");

    } catch (error) {
      console.error("Error applying changes:", error);
      setResultMessage(`Failed to process image: ${error.message}. (Backend may not be running)`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImgUrl) return;
    const a = document.createElement("a");
    a.href = resultImgUrl;
    a.download = `edited_${file?.name || 'image.png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (resultImgUrl) URL.revokeObjectURL(resultImgUrl);
    };
  }, [fileUrl, resultImgUrl]);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">

      

      {/* Editor Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">

        <ImageEditorSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          file={file}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          editState={editState}
          updateEditState={updateEditState}
          originalDimensions={originalDimensions}
          saveHistorySnapshot={saveHistorySnapshot}
        />

        <ImageEditorStage
          file={file}
          fileUrl={fileUrl}
          editState={editState}
          updateEditState={updateEditState}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          historyStackLength={historyStack.length}
          redoStackLength={redoStack.length}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onResetChanges={handleResetChanges}
          onApplyChanges={handleApplyChanges}
          canApply={!!file && !isProcessing}
          saveHistorySnapshot={saveHistorySnapshot}
        />

      </div>

      <ImageEditorResultModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resultImgSrc={resultImgUrl}
        message={resultMessage}
        onDownload={handleDownload}
      />

    </div>
  );
};

export default ImageEditor;
