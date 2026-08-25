import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './LegalPDFIntroductionPageData.js';

export default function LegalPDFIntroductionPage() {
  return <ScrollDesign heading="Legal PDF Introduction" pages={sections} />;
}

