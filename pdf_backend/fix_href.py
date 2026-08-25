import glob
import os
import re

BASE = 'c:/Users/achar/Desktop/Legal_pdf_fullstack/Legal_pdf_frontend/CR_OD_Legal_PDF/src/page/PDFCopyrightProtection'
files = glob.glob(os.path.join(BASE, '*.jsx'))

fixed = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # We want to replace href={var.downloadUrl} with href={`${API_BASE_URL}${var.downloadUrl}`}
    # And href={var.download_url} or href={var.download_url || '#'}
    
    # Regex 1: href={something.downloadUrl} or href={something.download_url}
    # Be careful not to replace if it's already using template literal `${API_BASE_URL}`
    
    def replacer(match):
        inner = match.group(1)
        if 'API_BASE_URL' in inner:
            return match.group(0) # Already fixed
        # Check if it has a fallback like || '#'
        if '||' in inner:
            parts = inner.split('||')
            var_part = parts[0].strip()
            fallback = parts[1].strip()
            return f"href={{ {var_part} ? `${{API_BASE_URL}}${{{var_part}}}` : {fallback} }}"
        else:
            return f"href={{`${{API_BASE_URL}}${{{inner.strip()}}}`}}"

    # Match href={var} where var ends with downloadUrl or download_url, possibly with || '#'
    content = re.sub(r'href=\{([^}]*(?:downloadUrl|download_url)[^}]*)\}', replacer, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixed += 1
        print(f"Fixed {os.path.basename(filepath)}")

print(f"Total fixed: {fixed}")
