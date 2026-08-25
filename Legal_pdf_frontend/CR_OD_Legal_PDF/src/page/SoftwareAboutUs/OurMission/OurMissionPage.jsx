import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './OurMissionPageData.js';

export default function OurMissionPage() {
  return <ScrollDesign heading="Our Mission" pages={sections} />;
}
