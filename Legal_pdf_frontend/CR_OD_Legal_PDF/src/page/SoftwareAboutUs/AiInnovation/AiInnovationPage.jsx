import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections as data } from './AiInnovationPageData';

export default function AiInnovationPage() {
  return <ScrollDesign heading="AI Innovation" pages={data} />;
}
