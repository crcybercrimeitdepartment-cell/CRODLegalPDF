import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function PDFtoImageCollectionPage({ onBack }) {
  return (
    <GenericPDFToolPage
      toolName="PDF to Image Collection"
      toolDesc="Convert each PDF page into individual image files (ZIP archive)."
      apiEndpoint="/api/pdf/pdf_to_image"
      getQueryParams={(formState) => ({
        image_format: formState.image_format || 'png',
        dpi: formState.dpi || '150',
      })}
      extraFields={({ formState, setFormState }) => (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Image Format</label>
            <select
              value={formState.image_format || 'png'}
              onChange={e => setFormState(prev => ({ ...prev, image_format: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">DPI Quality</label>
            <select
              value={formState.dpi || '150'}
              onChange={e => setFormState(prev => ({ ...prev, dpi: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
            >
              <option value="72">72 (Screen)</option>
              <option value="150">150 (Standard)</option>
              <option value="300">300 (High Quality)</option>
            </select>
          </div>
        </div>
      )}
      outputExt=".zip"
      onBack={onBack}
    />
  );
}
