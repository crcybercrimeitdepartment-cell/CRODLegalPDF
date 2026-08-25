import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections as data, heading } from './DataProtectionPageData';

export default function DataProtectionPage() {
  return <ScrollDesign heading={heading} pages={data} />;
}
