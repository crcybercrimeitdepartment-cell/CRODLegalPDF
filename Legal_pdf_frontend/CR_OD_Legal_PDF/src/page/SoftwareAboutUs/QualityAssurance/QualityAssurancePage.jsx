import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { qualityAssuranceData as data, heading } from './QualityAssurancePageData';

export default function QualityAssurancePage() {
  return <ScrollDesign heading={heading} pages={data} />;
}
