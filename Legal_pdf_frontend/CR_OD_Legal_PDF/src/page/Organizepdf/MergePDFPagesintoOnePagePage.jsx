import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function MergePDFPagesintoOnePagePage({ onBack }) {
  return (
    <GenericPDFToolPage
      toolName="Merge Pages into One Page"
      toolDesc="Merge multiple PDF pages into a single combined page."
      apiEndpoint="/api/pdf/merge"
      multipleFiles={true}
      getFormData={(files, formState) => {
        const fd = new FormData();
        files.forEach(f => fd.append('files', f));
        return fd;
      }}
      outputExt=".pdf"
      onBack={onBack}
    />
  );
}
