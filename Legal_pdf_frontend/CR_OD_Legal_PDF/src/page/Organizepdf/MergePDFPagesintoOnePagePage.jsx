import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function MergePDFPagesintoOnePagePage({ onBack }) {
  return (
    <GenericPDFToolPage
      toolName="Merge PDF Pages into One Page"
      toolDesc="Upload a single PDF and merge multiple of its pages into one continuous, giant page (N-up)."
      apiEndpoint="/api/pdf/merge_continuous"
      multipleFiles={false}
      extraFields={({ formState, setFormState }) => (
        <div className="flex flex-col gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Direction</label>
            <select
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formState.direction || 'vertical'}
              onChange={(e) => setFormState({ ...formState, direction: e.target.value })}
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Pages to Merge</label>
            <input
              type="text"
              placeholder="e.g. all, 1-5, odd, even"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formState.pages_selection || ''}
              onChange={(e) => setFormState({ ...formState, pages_selection: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">Specify which pages to combine into a single page.</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="remove_gaps"
              checked={formState.remove_gaps || false}
              onChange={(e) => setFormState({ ...formState, remove_gaps: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="remove_gaps" className="text-sm text-slate-700 font-medium cursor-pointer">
              Remove Margins/Gaps (Trim to content)
            </label>
          </div>
        </div>
      )}
      getFormData={(files, formState) => {
        const fd = new FormData();
        fd.append('file', files[0]);
        fd.append('direction', formState.direction || 'vertical');
        fd.append('pages_selection', formState.pages_selection || 'all');
        fd.append('remove_gaps', formState.remove_gaps ? 'true' : 'false');
        return fd;
      }}
      outputExt=".pdf"
      onBack={onBack}
    />
  );
}
