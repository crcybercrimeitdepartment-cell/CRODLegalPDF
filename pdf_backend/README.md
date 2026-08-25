# CR OD Legal PDF - Full Stack Application

## Project Structure

```
pdf_backend/
├── app/                              # FastAPI backend application
│   ├── main.py                       # FastAPI entry point
│   ├── api/                          # API route modules
│   │   ├── routes.py                 # Main API router
│   │   ├── page_routes.py            # Page/template routes
│   │   ├── pdf_routes.py             # PDF processing endpoints
│   │   ├── compare_and_redaction_routes.py
│   │   ├── image_processing_routes.py
│   │   ├── convert_from_pdf_routes.py
│   │   ├── document_management_routes.py
│   │   ├── pdf_copyright_protection_routes.py
│   │   ├── review_annotation_routes.py
│   │   └── organize_pdf_services_compat.py  # React frontend compat routes
│   ├── core/                         # Config, constants, paths
│   ├── middleware/                    # CORS, timing, request ID
│   ├── organize_pdf_services/        # PDF organize business logic
│   ├── Convert_to_pdf_services/      # Convert-to-PDF services
│   ├── convert_from_pdf_services/    # Convert-from-PDF services
│   ├── image_processing_services/    # Image processing services
│   ├── document_management_services/ # Document management services
│   ├── pdf_copyright_protection_services/
│   ├── Review_Annotation_services/
│   ├── templates/                    # Jinja2 templates (original frontend)
│   ├── static/                       # Static assets (CSS, JS)
│   ├── schemas/                      # Pydantic schemas
│   ├── storage/                      # Upload/output storage
│   └── utils/                        # File handlers, validators
├── frontend/                         # React frontend application
│   ├── src/                          # React source code
│   │   ├── App.jsx                   # Root component with routing
│   │   ├── components/               # Shared components
│   │   ├── data/                     # Tool definitions
│   │   ├── page/                     # Page components (16 categories)
│   │   └── utils/                    # SEO, utilities
│   ├── public/                       # Public assets
│   ├── package.json                  # Frontend dependencies
│   ├── vite.config.js                # Vite config (proxy to :8000)
│   └── dist/                         # Built frontend (production)
├── requirements.txt                  # Python dependencies
├── run.py                            # Development server (uvicorn)
├── start.bat                         # Windows startup script
├── start.sh                          # Linux/Mac startup script
├── .env.example                      # Environment template
└── README.md                         # This file
```

## Quick Start

### Development Mode (2 terminals)

**Terminal 1 - Backend (FastAPI):**
```bash
cd pdf_backend
pip install -r requirements.txt
python run.py
```
Backend runs at http://localhost:8000

**Terminal 2 - Frontend (React):**
```bash
cd pdf_backend/frontend
npm install
npm run dev
```
Frontend runs at http://localhost:5173 with API proxy to FastAPI backend

### Production Mode (single command)

```bash
cd pdf_backend
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
python run.py
```
App runs at http://localhost:8000 (serves both API + React frontend)

### Quick Start (Windows)
```bash
# Double-click start.bat
```

## API Endpoints

### Organize PDF Services (`/api/organize_pdf_services/...`)
- `POST /api/organize_pdf_services/merge` - Merge multiple PDFs
- `POST /api/organize_pdf_services/split` - Split PDF
- `POST /api/organize_pdf_services/remove` - Remove pages
- `POST /api/organize_pdf_services/extract` - Extract pages
- `POST /api/organize_pdf_services/compress` - Compress PDF
- `POST /api/organize_pdf_services/rotate` - Rotate pages
- `POST /api/organize_pdf_services/watermark` - Add watermark
- `POST /api/organize_pdf_services/crop_pdf` - Crop PDF
- `POST /api/organize_pdf_services/download/<filename>` - Download file

### PDF Processing (`/api/pdf/...`)
- `POST /api/pdf/page_number` - Add page numbers
- `POST /api/pdf/flatten_pdf` - Flatten PDF
- `POST /api/pdf/repair_pdf` - Repair PDF
- `POST /api/pdf/edit_pdf` - Edit PDF
- `POST /api/pdf/merge_continuous` - Merge continuous

### Compare & Redact (`/api/pdf/...`)
- `POST /api/pdf/compare/process` - Compare two PDFs
- `POST /api/pdf/redact/initialize` - Initialize redaction
- `POST /api/pdf/redact/search` - Search text for redaction
- `POST /api/pdf/redact/apply` - Apply redactions

### Image Processing (`/api/v1/images/...`)
- `POST /api/v1/images/editor` - Image editor
- `POST /api/v1/images/flip` - Flip image
- `POST /api/v1/images/crop` - Crop image
- `POST /api/v1/images/resize` - Resize image
- `POST /api/v1/images/rotate` - Rotate image
- And more...

## Technology Stack

- **Backend:** Python FastAPI, PyMuPDF, Pillow, Pydantic
- **Frontend:** React 19, Vite 8, Tailwind CSS 4, PDF.js, pdf-lib
- **Production:** Uvicorn, Nginx (recommended)
