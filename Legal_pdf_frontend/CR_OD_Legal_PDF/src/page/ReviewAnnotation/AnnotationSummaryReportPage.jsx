import React, { useContext, useMemo } from 'react';
import { AnnotationContext } from './context/AnnotationContext';
import { exportAnnotationsToCsv } from './utils/importExport';
import { X, Printer, Download, FileText, CheckCircle, AlertCircle, MessageSquare, LayoutTemplate, Activity } from 'lucide-react';

export default function AnnotationSummaryReportPage({ isOpen, onClose }) {
    const { annotations } = useContext(AnnotationContext);

    // Compute Statistics
    const stats = useMemo(() => {
        const total = annotations.length;
        const resolved = annotations.filter(a => a.resolved).length;
        const open = total - resolved;
        const totalReplies = annotations.reduce((acc, ann) => acc + (ann.replies?.length || 0), 0);
        
        // Type Breakdown
        const types = {};
        annotations.forEach(a => {
            types[a.type] = (types[a.type] || 0) + 1;
        });

        // Sort types by count
        const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);

        // Page Breakdown
        const pages = {};
        annotations.forEach(a => {
            const p = a.pageNumber || 1;
            if (!pages[p]) {
                pages[p] = { total: 0, open: 0, resolved: 0 };
            }
            pages[p].total++;
            if (a.resolved) pages[p].resolved++;
            else pages[p].open++;
        });

        return { total, resolved, open, totalReplies, sortedTypes, pages };
    }, [annotations]);

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    const resolutionPercent = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-8 print:absolute print:inset-0 print:block print:p-0 print:bg-white print:z-[9999]">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] print:h-auto print:w-full print:max-w-none flex flex-col shadow-2xl overflow-hidden print:overflow-visible print:shadow-none print:block">
                
                {/* Header - Hidden on Print */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Annotation Summary Report</h2>
                            <p className="text-sm text-gray-500">Executive dashboard and review statistics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => exportAnnotationsToCsv(annotations)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            Export Data
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <Printer size={16} />
                            Print Report
                        </button>
                        <div className="w-px h-8 bg-gray-200 mx-1"></div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 print:p-0 print:overflow-visible print:block">
                    
                    {/* Print Header (Only visible on print) */}
                    <div className="hidden print:block mb-8 border-b-2 border-indigo-600 pb-4">
                        <h1 className="text-3xl font-bold text-gray-900">Annotation Summary Report</h1>
                        <div className="flex justify-between text-sm text-gray-500 mt-2">
                            <span>Generated: {new Date().toLocaleString()}</span>
                            <span>Total Pages Analyzed: {Object.keys(stats.pages).length}</span>
                        </div>
                    </div>

                    {stats.total === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4 text-center">
                            <Activity size={48} className="opacity-20 text-indigo-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-700">No Data Available</h3>
                                <p className="text-sm">Draw annotations on the document to generate an analysis report.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-10">
                            
                            {/* Executive Summary Cards */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <LayoutTemplate className="text-indigo-600" size={18} /> Executive Summary
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-indigo-600 text-sm font-bold mb-1">Total Markups</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.total}</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-emerald-600 text-sm font-bold mb-1">Resolved</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.resolved}</div>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-amber-600 text-sm font-bold mb-1">Pending</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.open}</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-blue-600 text-sm font-bold mb-1">Discussion Replies</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.totalReplies}</div>
                                    </div>
                                </div>
                            </section>

                            {/* Resolution Progress */}
                            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm print:shadow-none">
                                <div className="flex justify-between items-end mb-3">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <CheckCircle className="text-emerald-500" size={18} /> Resolution Progress
                                    </h3>
                                    <span className="text-2xl font-black text-emerald-600">{resolutionPercent}%</span>
                                </div>
                                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex border border-gray-200">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${resolutionPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 font-medium mt-2">
                                    <span>{stats.resolved} Resolved</span>
                                    <span>{stats.open} Open</span>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Annotation Type Breakdown */}
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Activity className="text-indigo-600" size={18} /> Type Breakdown
                                    </h3>
                                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm print:shadow-none space-y-4">
                                        {stats.sortedTypes.map(([type, count]) => {
                                            const percent = Math.round((count / stats.total) * 100);
                                            return (
                                                <div key={type} className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span className="capitalize text-gray-700">{type}</span>
                                                        <span className="text-gray-900">{count} <span className="text-gray-400 ml-1 text-xs font-normal">({percent}%)</span></span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-500"
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>

                                {/* Page-wise Summary Table */}
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <MessageSquare className="text-indigo-600" size={18} /> Page Analysis
                                    </h3>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm print:shadow-none bg-white">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold">Page</th>
                                                    <th className="px-4 py-3 font-semibold text-center">Total</th>
                                                    <th className="px-4 py-3 font-semibold text-center">Open</th>
                                                    <th className="px-4 py-3 font-semibold text-center">Resolved</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {Object.entries(stats.pages).sort((a,b) => Number(a[0]) - Number(b[0])).map(([page, data]) => (
                                                    <tr key={page} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium text-gray-900">Page {page}</td>
                                                        <td className="px-4 py-3 text-center text-gray-700">{data.total}</td>
                                                        <td className="px-4 py-3 text-center text-amber-600 font-medium">{data.open}</td>
                                                        <td className="px-4 py-3 text-center text-emerald-600 font-medium">{data.resolved}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>

                        </div>
                    )}
                </div>
            </div>
            
            {/* Global Print Styles embedded in component */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 1cm; size: A4 portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; overflow: visible !important; height: auto !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:bg-white { background-color: white !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:border-gray-300 { border-color: #d1d5db !important; border-width: 1px !important; border-style: solid !important; }
                    .print\\:h-auto { height: auto !important; }
                    .print\\:max-w-none { max-width: none !important; }
                    
                    /* Force background colors on print */
                    .bg-indigo-50 { background-color: #eef2ff !important; }
                    .bg-emerald-50 { background-color: #ecfdf5 !important; }
                    .bg-amber-50 { background-color: #fffbeb !important; }
                    .bg-blue-50 { background-color: #eff6ff !important; }
                    .bg-emerald-500 { background-color: #10b981 !important; }
                    .bg-indigo-500 { background-color: #6366f1 !important; }
                    .bg-gray-50 { background-color: #f9fafb !important; }
                    .bg-gray-100 { background-color: #f3f4f6 !important; }
                }
            `}} />
        </div>
    );
}
