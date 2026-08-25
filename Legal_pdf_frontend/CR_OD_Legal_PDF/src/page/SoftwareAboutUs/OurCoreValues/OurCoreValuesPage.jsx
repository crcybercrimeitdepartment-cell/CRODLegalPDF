import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './OurCoreValuesPageData.js';

export default function OurCoreValuesPage() {
  return <ScrollDesign heading="Our Core Values" pages={sections} />;
}

