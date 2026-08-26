// Centralized API Client for Legal PDF Fullstack
// All requests use relative URLs — Vite proxy forwards to backend automatically.
// Backend can run on ANY port — just set VITE_BACKEND_URL in .env

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';

/**
 * Helper to handle file uploads properly.
 * @param {string} endpoint - The API endpoint (e.g., '/api/pdf/merge' or '/document-management/batch-export')
 * @param {FormData} formData - The payload containing files and other form fields
 * @param {boolean} expectFileResponse - If true, resolves to Blob. If false, resolves to JSON.
 */
export const uploadFiles = async (endpoint, formData, expectFileResponse = false) => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorMsg = `Server Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
                }
            } catch (e) { }
            throw new Error(errorMsg);
        }

        if (expectFileResponse) {
            return await response.blob();
        }
        return await response.json();
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
};

/**
 * Helper to download a processed file.
 * @param {string} url - The URL to download from (relative path)
 * @param {string} filename - The suggested filename for the downloaded file
 */
export const downloadFile = async (url, filename) => {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, { method: 'GET' });

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename || 'downloaded_file.pdf';
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
    } catch (error) {
        console.error(`Download Error on ${url}:`, error);
        throw error;
    }
};

/**
 * Helper to get URL for download links.
 * Returns relative paths as-is (Vite proxy handles forwarding in dev).
 * @param {string} path - Relative path starting with /
 * @returns {string} URL safe for <a href>
 */
export const getFullUrl = (path) => {
    if (!path || path.startsWith('http') || path === '#' || path === '#mock-download' || path === '#mock-zip-download') return path;
    return `${API_BASE_URL}${path}`;
};

export default {
    uploadFiles,
    downloadFile,
    getFullUrl,
    API_BASE_URL,
};