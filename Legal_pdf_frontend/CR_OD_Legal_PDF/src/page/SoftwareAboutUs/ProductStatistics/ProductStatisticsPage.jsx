import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './ProductStatisticsPageData.js';

export default function ProductStatisticsPage() {
  return <ScrollDesign heading="Product Statistics" pages={sections} />;
}
