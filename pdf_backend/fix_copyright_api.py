import glob
import os

BASE = 'c:/Users/achar/Desktop/Legal_pdf_fullstack/Legal_pdf_frontend/CR_OD_Legal_PDF/src/page/PDFCopyrightProtection'
files = glob.glob(os.path.join(BASE, '*.jsx'))

DECL = "const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';"

fixed = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'API_BASE_URL' in content and 'const API_BASE_URL' not in content:
        if 'export default function' in content:
            new_content = content.replace('export default function', f'{DECL}\n\nexport default function', 1)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            fixed += 1
            print(f'Fixed {os.path.basename(filepath)}')

print(f'Total fixed: {fixed}')
