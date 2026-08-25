import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './OurServicesPageData.js';

export default function OurServicesPage() {
  return <ScrollDesign heading="Our Services" pages={sections} />;
}

