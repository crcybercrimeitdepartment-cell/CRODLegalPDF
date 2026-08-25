import React, { useContext } from 'react';
import { ReviewContext } from './context/ReviewContext';
import { 
    X, ClipboardCheck, Users, Briefcase, Activity, 
    CheckCircle, XCircle, Clock, FileText, ChevronRight
} from 'lucide-react';

export default function ReviewPanelPage() {
    const {
        reviewId, reviewName, reviewType, reviewStage, reviewStatus,
        priorityLevel, department, reviewers, metrics,
        isReviewPanelOpen, setIsReviewPanelOpen, setReviewStatus
    } = useContext(ReviewContext);

    if (!isReviewPanelOpen) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'In Review': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed top-0 right-0 h-full w-96 bg-gray-50 border-l border-gray-200 shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex flex-col border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <ClipboardCheck size={20} className="text-blue-600" />
                        <h2 className="text-lg font-semibold">Review Panel</h2>
                    </div>
                    <button 
                        onClick={() => setIsReviewPanelOpen(false)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="px-4 pb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{reviewName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{reviewId}</span>
                        <span>•</span>
                        <span>{reviewType}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(reviewStatus)}`}>
                            {reviewStatus}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-100 text-purple-700 border-purple-200">
                            {priorityLevel} Priority
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Metrics Dashboard */}
                <div className="p-4 border-b border-gray-200 bg-white/50">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Activity size={14} /> Live Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-gray-500 text-xs font-medium mb-1 flex items-center gap-1.5">
                                <FileText size={14} /> Total Comments
                            </div>
                            <div className="text-2xl font-bold text-gray-800">{metrics.totalAnnotations}</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-gray-500 text-xs font-medium mb-1 flex items-center gap-1.5">
                                <CheckCircle size={14} className="text-emerald-500" /> Resolved
                            </div>
                            <div className="text-2xl font-bold text-emerald-600">{metrics.resolvedComments}</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-gray-500 text-xs font-medium mb-1 flex items-center gap-1.5">
                                <Clock size={14} className="text-amber-500" /> Open Issues
                            </div>
                            <div className="text-2xl font-bold text-amber-600">{metrics.openComments}</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-gray-500 text-xs font-medium mb-1">Completion</div>
                            <div className="flex items-end gap-1">
                                <div className="text-2xl font-bold text-blue-600">{metrics.completionPercentage}%</div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${metrics.completionPercentage}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workflow Actions */}
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Workflow Stage: {reviewStage}</h4>
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setReviewStatus('Approved')} className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium transition-colors">
                                <CheckCircle size={16} /> Approve
                            </button>
                            <button onClick={() => setReviewStatus('Rejected')} className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-medium transition-colors">
                                <XCircle size={16} /> Reject
                            </button>
                        </div>
                        <button onClick={() => setReviewStatus('Completed')} className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors w-full">
                            Complete Review
                        </button>
                    </div>
                </div>

                {/* Reviewers */}
                <div className="p-4 bg-white/50 min-h-[300px]">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Users size={14} /> Assigned Team
                        </h4>
                        <span className="text-xs font-medium text-blue-600 cursor-pointer hover:underline">Manage</span>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {reviewers.map(reviewer => (
                            <div key={reviewer.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3">
                                    <img src={reviewer.avatar} alt={reviewer.name} className="w-10 h-10 rounded-full border border-gray-200" />
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{reviewer.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Briefcase size={12} /> {reviewer.role}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-xs font-semibold ${
                                    reviewer.status === 'Approved' ? 'text-emerald-600' :
                                    reviewer.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                                }`}>
                                    {reviewer.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
