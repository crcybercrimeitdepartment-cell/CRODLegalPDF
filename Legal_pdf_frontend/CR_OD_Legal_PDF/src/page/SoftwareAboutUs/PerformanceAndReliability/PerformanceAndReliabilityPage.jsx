import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './PerformanceAndReliabilityPageData.js';

export default function PerformanceAndReliabilityPage() {
  return <ScrollDesign heading="Performance & Reliability" pages={sections} />;
}
