import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './WhoWeArePageData.js';

export default function WhoWeArePage() {
  return <ScrollDesign heading="Who We Are" pages={sections} />;
}

