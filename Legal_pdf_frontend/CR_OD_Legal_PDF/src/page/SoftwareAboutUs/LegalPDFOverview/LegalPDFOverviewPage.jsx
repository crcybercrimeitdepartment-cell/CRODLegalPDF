import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './LegalPDFOverviewPageData.js';

export default function LegalPDFOverviewPage() {
  return <ScrollDesign heading="Legal PDF Overview" pages={sections} />;
}

