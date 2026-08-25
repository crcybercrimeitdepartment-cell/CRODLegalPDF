import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function RepairPDFPage({ onBack }) {
  return (
    <GenericPDFToolPage
      toolName="Repair PDF"
      toolDesc="Attempt to repair and recover a corrupted or damaged PDF file."
      apiEndpoint="/api/pdf/repair_pdf"
      outputExt=".pdf"
      onBack={onBack}
    />
  );
}
