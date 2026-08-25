import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function ExtractPDFPagesPage({ onBack }) {
  return (
    <GenericPDFToolPage
      toolName="Extract PDF Pages"
      toolDesc="Extract specific pages from a PDF into a new document."
      apiEndpoint="/api/pdf/extract"
      getQueryParams={(formState) => ({
        pages: formState.pages || '',
      })}
      extraFields={({ formState, setFormState }) => (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Pages to Extract</label>
          <input
            type="text"
            placeholder="e.g. 1,3,5-8"
            value={formState.pages || ''}
            onChange={e => setFormState(prev => ({ ...prev, pages: e.target.value }))}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
          />
          <p className="text-xs text-slate-400">Leave blank to extract all pages. Use commas for specific pages, hyphen for ranges (e.g. 1,3,5-8)</p>
        </div>
      )}
      outputExt=".pdf"
      onBack={onBack}
    />
  );
}
