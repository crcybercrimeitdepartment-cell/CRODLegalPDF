import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { researchAndDevelopmentData as data, heading } from './ResearchAndDevelopmentPageData';

export default function ResearchAndDevelopmentPage() {
  return <ScrollDesign heading={heading} pages={data} />;
}
