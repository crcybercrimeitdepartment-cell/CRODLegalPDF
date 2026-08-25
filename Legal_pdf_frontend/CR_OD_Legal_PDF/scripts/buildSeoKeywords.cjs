const fs = require('fs');
const path = require('path');

const core20 = [
  'PDF', 'PDF Viewer', 'PDF Reader', 'PDF Editor', 'PDF Converter', 'PDF Compressor',
  'PDF Merger', 'PDF Splitter', 'PDF Creator', 'PDF Generator', 'Online PDF', 'Free PDF',
  'Secure PDF', 'PDF Download', 'PDF Upload', 'PDF Processing', 'PDF Management',
  'PDF OCR', 'PDF Scanner', 'PDF Signer'
];

const modifiers = ['Online', 'Free', 'Best', 'Fast', 'Secure'];
const actions = [
  'View', 'Read', 'Edit', 'Convert', 'Compress', 'Merge', 'Split', 'Protect',
  'Unlock', 'Rotate', 'Organize', 'Extract', 'Annotate', 'Sign', 'Print',
  'Share', 'Search', 'Optimize', 'Repair', 'Redact'
];
const targets = ['Pdf', 'Pdf File', 'Pdf Document', 'Document Pdf', 'Digital Pdf'];

const generated500 = [...core20];
modifiers.forEach(mod => {
  actions.forEach(act => {
    targets.forEach(tgt => {
      generated500.push(`${mod} ${act} ${tgt}`);
    });
  });
});

console.log('Total Generated Keywords:', generated500.length);

const seoFile = path.join(__dirname, '../src/utils/seoKeywords.js');
let content = fs.readFileSync(seoFile, 'utf8');

const arrayStr = 'export const MASTER_SEO_KEYWORDS = ' + JSON.stringify(generated500, null, 2) + ';';

content = content.replace(/export const MASTER_SEO_KEYWORDS = \[[\s\S]*?\];/, arrayStr);

fs.writeFileSync(seoFile, content, 'utf8');
console.log('Successfully updated MASTER_SEO_KEYWORDS with all 520 terms in src/utils/seoKeywords.js');
