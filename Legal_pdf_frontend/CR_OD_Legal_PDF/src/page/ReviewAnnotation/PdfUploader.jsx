import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

export default function PdfUploader({ onFileSelect }) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                onFileSelect(file);
            } else {
                alert('Please upload a valid PDF file.');
            }
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFileSelect(files[0]);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-80px)] bg-transparent flex items-center justify-center p-6">
            <div 
                className={`w-full max-w-2xl bg-white rounded-3xl p-10 sm:p-20 shadow-sm transition-all duration-300 border-2 border-dashed ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner text-gray-700">
                        <Upload size={32} strokeWidth={2.5} />
                    </div>
                    
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                        Drop files here or click to browse
                    </h2>
                    
                    <p className="text-gray-500 mb-8">
                        Accepted: PDF files (.pdf)
                    </p>
                    
                    <input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileInput}
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Browse Files
                    </button>
                </div>
            </div>
        </div>
    );
}
