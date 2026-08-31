import sys
from playwright.sync_api import sync_playwright

def export_pdf(html_path, pdf_path):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Read html content
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        page.set_content(html_content)
        page.pdf(path=pdf_path, format="A4", margin={"top": "2cm", "right": "2cm", "bottom": "2cm", "left": "2cm"})
        browser.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(1)
    export_pdf(sys.argv[1], sys.argv[2])
