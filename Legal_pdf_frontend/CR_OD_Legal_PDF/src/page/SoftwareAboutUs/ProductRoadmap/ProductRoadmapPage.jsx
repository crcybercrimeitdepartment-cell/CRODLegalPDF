import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './ProductRoadmapPageData.js';

export default function ProductRoadmapPage() {
  return <ScrollDesign heading="Product Roadmap" pages={sections} />;
}
