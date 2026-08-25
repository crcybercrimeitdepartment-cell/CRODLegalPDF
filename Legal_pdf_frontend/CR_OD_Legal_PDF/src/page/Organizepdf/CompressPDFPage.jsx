import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function CompressPDFPage({ onBack }) {
  return (
    <GenericPDFToolPage
      toolName="Compress PDF"
      toolDesc="Reduce your PDF file size while maintaining quality."
      apiEndpoint="/api/pdf/compress"
      getQueryParams={(formState) => ({
        compression_level: formState.compression_level || 'recommended',
      })}
      extraFields={({ formState, setFormState }) => (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Compression Level</label>
          <div className="grid grid-cols-3 gap-3">
            {['less', 'recommended', 'extreme'].map(level => (
              <button
                key={level}
                onClick={() => setFormState(prev => ({ ...prev, compression_level: level }))}
                className={`py-3 px-4 rounded-xl font-semibold text-sm capitalize border-2 transition-all ${
                  (formState.compression_level || 'recommended') === level
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}
      outputExt=".pdf"
      onBack={onBack}
    />
  );
}
