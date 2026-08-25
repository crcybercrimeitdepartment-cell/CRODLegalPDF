import os
import glob

files = glob.glob('Legal_pdf_frontend/CR_OD_Legal_PDF/src/page/Organizepdf/*.jsx')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content.replace("'http://127.0.0.1:8002'", "(import.meta.env.VITE_BACKEND_URL || 'https://cr-od-legal-pdf-backend.onrender.com')")
    new_content = new_content.replace('"http://127.0.0.1:8002"', "(import.meta.env.VITE_BACKEND_URL || 'https://cr-od-legal-pdf-backend.onrender.com')")
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {f}")
