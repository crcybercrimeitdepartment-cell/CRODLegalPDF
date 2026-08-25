import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './OurVisionPageData.js';

export default function OurVisionPage() {
  return <ScrollDesign heading="Our Vision" pages={sections} />;
}
