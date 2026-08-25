import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { technologyStackData as data, heading } from './TechnologyStackPageData';

export default function TechnologyStackPage() {
  return <ScrollDesign heading={heading} pages={data} />;
}
