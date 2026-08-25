import os
import glob

base_dir = "c:/Users/achar/Desktop/Legal_pdf_fullstack/Legal_pdf_frontend/CR_OD_Legal_PDF/src/page/PDFtoConvert"
files = glob.glob(os.path.join(base_dir, "*.jsx"))

for f in files:
    if os.path.basename(f) == "PDFtoConvert.jsx":
        continue
    
    basename = os.path.basename(f).replace("Page.jsx", "")
    # e.g. BMPtoPDF
    prefix = basename.replace("toPDF", "").lower()
    
    content = f"""import React from 'react';
import GenericPDFToolPage from '../../components/GenericPDFToolPage';

export default function {basename}Page({{ onBack }}) {{
  return (
    <GenericPDFToolPage
      toolName="{basename.replace('to', ' to ')}"
      toolDesc="Convert {prefix.upper()} to PDF"
      apiEndpoint="/api/convert-to-pdf/{prefix}-to-pdf/process"
      outputExt=".pdf"
      multipleFiles={{True}}
      onBack={{onBack}}
    />
  );
}}
"""
    with open(f, "w", encoding="utf-8") as out:
        out.write(content)
        
print(f"Rewrote {len(files)} files in PDFtoConvert")
