import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackgroundWatermark } from '../../components/crodlegalpdf';
import { ArrowLeft, Search, RotateCcw, X, CheckCheck, Keyboard, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

var API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/accessibility';

var DEFAULT_SHORTCUTS = [
  { action_id: 'nav_next_page', action_name: 'Next Page', description: 'Navigate to next page in document', category: 'Navigation', default_key: 'ArrowRight' },
  { action_id: 'nav_prev_page', action_name: 'Previous Page', description: 'Navigate to previous page in document', category: 'Navigation', default_key: 'ArrowLeft' },
  { action_id: 'nav_first_page', action_name: 'First Page', description: 'Jump to first page of document', category: 'Navigation', default_key: 'Home' },
  { action_id: 'nav_last_page', action_name: 'Last Page', description: 'Jump to last page of document', category: 'Navigation', default_key: 'End' },
  { action_id: 'view_zoom_in', action_name: 'Zoom In', description: 'Increase document zoom level', category: 'View', default_key: 'Ctrl+=' },
  { action_id: 'view_zoom_out', action_name: 'Zoom Out', description: 'Decrease document zoom level', category: 'View', default_key: 'Ctrl+-' },
  { action_id: 'view_fit_width', action_name: 'Fit to Width', description: 'Fit document to viewport width', category: 'View', default_key: 'Ctrl+Shift+1' },
  { action_id: 'view_fit_page', action_name: 'Fit to Page', description: 'Fit entire page in viewport', category: 'View', default_key: 'Ctrl+Shift+2' },
  { action_id: 'file_save', action_name: 'Save Document', description: 'Save current document changes', category: 'File', default_key: 'Ctrl+S' },
  { action_id: 'file_export', action_name: 'Export PDF', description: 'Export document as PDF file', category: 'File', default_key: 'Ctrl+E' },
  { action_id: 'file_print', action_name: 'Print Document', description: 'Print current document', category: 'File', default_key: 'Ctrl+P' },
  { action_id: 'search_find', action_name: 'Find in Document', description: 'Open search/find dialog', category: 'Search', default_key: 'Ctrl+F' },
  { action_id: 'search_next', action_name: 'Next Match', description: 'Jump to next search match', category: 'Search', default_key: 'F3' },
  { action_id: 'search_prev', action_name: 'Previous Match', description: 'Jump to previous search match', category: 'Search', default_key: 'Shift+F3' },
  { action_id: 'edit_undo', action_name: 'Undo', description: 'Undo last editing action', category: 'Editing', default_key: 'Ctrl+Z' },
  { action_id: 'edit_redo', action_name: 'Redo', description: 'Redo last undone action', category: 'Editing', default_key: 'Ctrl+Y' },
  { action_id: 'edit_select_all', action_name: 'Select All', description: 'Select all content in document', category: 'Editing', default_key: 'Ctrl+A' },
  { action_id: 'pdf_extract', action_name: 'Extract Text', description: 'Extract text from current page', category: 'PDF Tools', default_key: 'Ctrl+Shift+E' },
  { action_id: 'pdf_highlight', action_name: 'Highlight Text', description: 'Highlight selected text area', category: 'PDF Tools', default_key: 'Ctrl+Shift+H' },
  { action_id: 'pdf_annotate', action_name: 'Add Annotation', description: 'Add annotation note to page', category: 'PDF Tools', default_key: 'Ctrl+Shift+A' },
];

var categories = ['ALL', 'Navigation', 'View', 'File', 'Search', 'Editing', 'PDF Tools'];

function loadShortcuts() {
  try {
    var saved = localStorage.getItem('ks_shortcuts');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return DEFAULT_SHORTCUTS.map(function (d) {
    return { action_id: d.action_id, action_name: d.action_name, description: d.description, category: d.category, default_key: d.default_key, current_key: d.default_key, is_customized: false };
  });
}

function saveShortcutsToStorage(list) {
  try { localStorage.setItem('ks_shortcuts', JSON.stringify(list)); } catch (e) { }
}

function normalizeCombo(e) {
  var parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  var key = e.key;
  if (['Control', 'Alt', 'Shift', 'Meta'].indexOf(key) >= 0) return '';
  if (key === ' ') key = 'Space';
  else if (key === 'Escape') key = 'Esc';
  else if (key === 'ArrowUp') key = 'ArrowUp';
  else if (key === 'ArrowDown') key = 'ArrowDown';
  else if (key === 'ArrowLeft') key = 'ArrowLeft';
  else if (key === 'ArrowRight') key = 'ArrowRight';
  parts.push(key);
  return parts.join('+');
}

var RESERVED = ['Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+A', 'F5', 'F11', 'Tab'];

export default function KeyboardShortcutCustomizationPage({ onBack }) {
  var [shortcuts, setShortcuts] = useState(loadShortcuts);
  var [activeCategory, setActiveCategory] = useState('ALL');
  var [searchQuery, setSearchQuery] = useState('');

  var [showChangeModal, setShowChangeModal] = useState(false);
  var [changeTargetId, setChangeTargetId] = useState(null);
  var [capturedCombo, setCapturedCombo] = useState('');
  var [capturedFeedback, setCapturedFeedback] = useState('');
  var [capturedFeedbackColor, setCapturedFeedbackColor] = useState('#64748b');
  var [pendingConflict, setPendingConflict] = useState(null);

  var [showRestoreModal, setShowRestoreModal] = useState(false);
  var [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  var recordingRef = useRef(false);

  var showToast = function (message, type) {
    setToast({ message: message, type: type || 'success', visible: true });
    setTimeout(function () { setToast(function (t) { return { ...t, visible: false }; }); }, 3200);
  };

  var filtered = shortcuts.filter(function (item) {
    var matchCat = activeCategory === 'ALL' || item.category === activeCategory;
    var q = searchQuery.toLowerCase().trim();
    var matchQ = !q || (item.action_name.toLowerCase().indexOf(q) >= 0 || item.description.toLowerCase().indexOf(q) >= 0 || item.category.toLowerCase().indexOf(q) >= 0 || item.current_key.toLowerCase().indexOf(q) >= 0);
    return matchCat && matchQ;
  });

  var getCategoryCount = function (cat) {
    if (cat === 'ALL') return shortcuts.length;
    return shortcuts.filter(function (s) { return s.category === cat; }).length;
  };

  var openChangeModal = function (actionId) {
    var item = shortcuts.find(function (s) { return s.action_id === actionId; });
    if (!item) return;
    setChangeTargetId(actionId);
    setCapturedCombo('');
    setCapturedFeedback('Press a key combination...');
    setCapturedFeedbackColor('#64748b');
    setPendingConflict(null);
    setShowChangeModal(true);
    recordingRef.current = true;
  };

  var closeChangeModal = function () {
    setShowChangeModal(false);
    recordingRef.current = false;
  };

  useEffect(function () {
    if (!showChangeModal) return;
    var handler = function (e) {
      if (!recordingRef.current) return;
      if (e.key === 'Escape') { e.preventDefault(); closeChangeModal(); return; }
      var combo = normalizeCombo(e);
      if (!combo) return;
      e.preventDefault();
      setCapturedCombo(combo);

      if (RESERVED.indexOf(combo) >= 0) {
        setCapturedFeedback('This shortcut is reserved by the browser and cannot be customized.');
        setCapturedFeedbackColor('#dc2626');
        setPendingConflict(null);
        return;
      }

      var conflict = shortcuts.find(function (s) { return s.action_id !== changeTargetId && s.current_key === combo; });
      if (conflict) {
        setCapturedFeedback('Conflict: "' + combo + '" is assigned to "' + conflict.action_name + '". Confirm to replace.');
        setCapturedFeedbackColor('#d97706');
        setPendingConflict(conflict);
      } else {
        setCapturedFeedback('Shortcut available: ' + combo);
        setCapturedFeedbackColor('#059669');
        setPendingConflict(null);
      }
    };
    window.addEventListener('keydown', handler, true);
    return function () { window.removeEventListener('keydown', handler, true); };
  }, [showChangeModal, changeTargetId, shortcuts]);

  var confirmChange = function () {
    if (!changeTargetId || !capturedCombo) return;
    setShortcuts(function (prev) {
      var updated = prev.map(function (item) {
        if (pendingConflict && item.action_id === pendingConflict.action_id) {
          return { ...item, current_key: 'Unassigned', is_customized: true };
        }
        if (item.action_id === changeTargetId) {
          var def = DEFAULT_SHORTCUTS.find(function (d) { return d.action_id === changeTargetId; });
          return { ...item, current_key: capturedCombo, is_customized: capturedCombo !== (def ? def.default_key : '') };
        }
        return item;
      });
      saveShortcutsToStorage(updated);
      return updated;
    });
    closeChangeModal();
    showToast('Mapped "' + capturedCombo + '" to action. Click Save to apply globally.', 'success');
  };

  var resetSingle = function (actionId) {
    var def = DEFAULT_SHORTCUTS.find(function (d) { return d.action_id === actionId; });
    if (!def) return;
    setShortcuts(function (prev) {
      var updated = prev.map(function (item) {
        if (item.action_id === actionId) return { ...item, current_key: def.default_key, is_customized: false };
        return item;
      });
      saveShortcutsToStorage(updated);
      return updated;
    });
    showToast('Reset "' + def.action_name + '" to default key (' + def.default_key + ').', 'success');
  };

  var saveAll = async function () {
    saveShortcutsToStorage(shortcuts);
    try {
      var res = await fetch(API_BASE + '/keyboard-shortcuts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: shortcuts, profile_name: 'Custom Shortcut Profile' }),
      });
      if (res.ok) showToast('Saved and applied ' + shortcuts.length + ' keyboard shortcuts globally!', 'success');
      else showToast('Shortcuts saved locally in browser storage.', 'warning');
    } catch (err) {
      showToast('Shortcuts saved locally in browser storage.', 'warning');
    }
  };

  var cancelEdits = function () {
    setShortcuts(loadShortcuts());
    showToast('Unsaved edits discarded.', 'warning');
  };

  var restoreDefaults = function () {
    var updated = DEFAULT_SHORTCUTS.map(function (d) {
      return { action_id: d.action_id, action_name: d.action_name, description: d.description, category: d.category, default_key: d.default_key, current_key: d.default_key, is_customized: false };
    });
    setShortcuts(updated);
    saveShortcutsToStorage(updated);
    setShowRestoreModal(false);
    fetch(API_BASE + '/keyboard-shortcuts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings: updated, profile_name: 'Default Profile' }),
    }).catch(function () { });
    showToast('All keyboard shortcuts restored to defaults.', 'success');
  };

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] relative pt-11 sm:pt-4 bg-[#F5F3EC] overflow-hidden px-4 sm:px-8 lg:px-12 pb-4 sm:pb-8 font-sans">
      <BackgroundWatermark />
      <div className="w-full max-w-[960px] mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 cursor-pointer mb-4">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span> to Dashboard
        </button>
      </div>

      <div className="w-full max-w-[960px] bg-white border border-slate-200 rounded-2xl shadow-lg p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-blue-600" /> Keyboard Shortcuts Customization
            </h1>
            <p className="text-sm text-slate-500 mt-1">Map personalized keyboard shortcuts for fast, mouse-free document navigation, viewing, and PDF tool execution.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={function () { setShowRestoreModal(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-red-300 bg-white text-red-600 hover:bg-red-50 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> Restore Defaults
            </button>
            <button onClick={cancelEdits}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={saveAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
              <CheckCheck className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[960px] flex flex-col sm:flex-row items-stretch gap-4 mb-6">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchQuery} onChange={function (e) { setSearchQuery(e.target.value); }}
            placeholder="Search shortcuts (e.g. zoom, page, save)..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(function (cat) {
            return (
              <button key={cat} onClick={function () { setActiveCategory(cat); }}
                className={'px-4 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer transition-all ' +
                  (activeCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600')
                }
              >{cat === 'ALL' ? 'All Actions (' + getCategoryCount(cat) + ')' : cat + ' (' + getCategoryCount(cat) + ')'}</button>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-[960px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-3" />
            <p className="text-sm">No shortcuts found matching "{searchQuery}"</p>
          </div>
        ) : filtered.map(function (item) {
          var isCustom = item.is_customized || item.current_key !== item.default_key;
          return (
            <div key={item.action_id} className="flex items-center px-6 py-3.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{item.action_name}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600">{item.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border bg-slate-50 text-slate-800 whitespace-nowrap ' + (isCustom ? 'border-amber-300 bg-amber-50' : 'border-slate-200')}>
                  {item.current_key}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={function () { openChangeModal(item.action_id); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Keyboard className="w-3 h-3" /> Change
                  </button>
                  <button onClick={function () { resetSingle(item.action_id); }} disabled={!isCustom}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showChangeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000]" onClick={closeChangeModal}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 max-w-[480px] w-[90%]" onClick={function (e) { e.stopPropagation(); }}>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Change Keyboard Shortcut</h3>
            <p className="text-sm text-slate-500 mb-4">
              Action: "{shortcuts.find(function (s) { return s.action_id === changeTargetId; })?.action_name}" (Current: {shortcuts.find(function (s) { return s.action_id === changeTargetId; })?.current_key})
            </p>
            <div className={'flex items-center justify-center gap-3 p-5 rounded-xl border text-sm font-medium mb-4 transition-all ' +
              (capturedCombo ? 'border-red-300 bg-red-50 text-red-600 animate-pulse' : 'border-slate-200 bg-slate-50 text-slate-500')
            }>
              {capturedCombo || 'Press a key combination...'}
            </div>
            <p className="text-sm mb-6 min-h-[18px]" style={{ color: capturedFeedbackColor }}>{capturedFeedback}</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeChangeModal}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={confirmChange} disabled={!capturedCombo}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Confirm Shortcut</button>
            </div>
          </div>
        </div>
      )}

      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000]" onClick={function () { setShowRestoreModal(false); }}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 max-w-[480px] w-[90%] text-center" onClick={function (e) { e.stopPropagation(); }}>
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Restore Default Shortcuts?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">All custom mappings will be removed and shortcuts restored to their default settings.</p>
            <div className="flex justify-center gap-3">
              <button onClick={function () { setShowRestoreModal(false); }}
                className="px-5 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={restoreDefaults}
                className="px-5 py-2 rounded-lg text-sm font-medium border border-red-300 bg-white text-red-600 hover:bg-red-50 cursor-pointer">Restore Defaults</button>
            </div>
          </div>
        </div>
      )}

      <div className={'fixed bottom-6 right-6 px-5 py-3 rounded-lg text-sm font-medium shadow-lg z-[2000] transition-all pointer-events-none flex items-center gap-2 ' +
        (toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
      } style={{ backgroundColor: '#111827', color: '#ffffff' }}>
        {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {toast.message}
      </div>
    </div>
  );
}
