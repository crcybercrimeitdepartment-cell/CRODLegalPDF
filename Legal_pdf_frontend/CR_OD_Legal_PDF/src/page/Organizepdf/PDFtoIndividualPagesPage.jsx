import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function PDFtoIndividualPagesPage({ onBack }) {
  return (
    <GenericPDFToolPage
      toolName="PDF to Individual Pages"
      toolDesc="Split a PDF into individual single-page PDF files (ZIP archive)."
      apiEndpoint="/api/pdf/pdf_to_individual_pages"
      outputExt=".zip"
      onBack={onBack}
    />
  );
}
