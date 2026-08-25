// Helper to trigger download
function triggerDownload(dataStr, fileName) {
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Exports the current annotations to a JSON file
export function exportAnnotationsToJson(annotations, fileName = 'comments.json') {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(annotations, null, 2));
    triggerDownload(dataStr, fileName);
}

// Exports the current annotations to a CSV file (Metadata Focus)
export function exportAnnotationsToCsv(annotations, fileName = 'comments.csv', options = {}) {
    const headers = [
        "Annotation ID", "Type", "Page Number", "Author", "Status", 
        "Creation Date", "Content/Value", "Replies Count"
    ];
    
    let csvContent = headers.join(",") + "\n";
    
    annotations.forEach(ann => {
        const id = ann.id;
        const type = ann.type || 'Unknown';
        const page = ann.pageNumber || 1;
        const author = ann.authorName || 'Unknown';
        const status = ann.resolved ? 'Resolved' : 'Unresolved';
        const date = ann.creationDate ? new Date(ann.creationDate).toLocaleString() : '';
        const content = `"${(ann.content || '').replace(/"/g, '""')}"`;
        const replies = ann.replies ? ann.replies.length : 0;
        
        csvContent += `${id},${type},${page},${author},${status},"${date}",${content},${replies}\n`;
    });
    
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    triggerDownload(dataStr, fileName);
}

// Exports the current annotations to a TXT file (Readable Format)
export function exportAnnotationsToTxt(annotations, fileName = 'comments.txt', options = {}) {
    let txtContent = "=== DOCUMENT ANNOTATION REPORT ===\n";
    txtContent += `Generated: ${new Date().toLocaleString()}\n`;
    txtContent += `Total Comments: ${annotations.length}\n\n`;
    
    annotations.forEach((ann, index) => {
        txtContent += `[${index + 1}] Type: ${ann.type.toUpperCase()} (Page ${ann.pageNumber || 1})\n`;
        if (options.includeMetadata) {
            txtContent += `    ID: ${ann.id}\n`;
            txtContent += `    Author: ${ann.authorName || 'Unknown'}\n`;
            txtContent += `    Date: ${ann.creationDate ? new Date(ann.creationDate).toLocaleString() : 'N/A'}\n`;
            txtContent += `    Status: ${ann.resolved ? 'Resolved' : 'Unresolved'}\n`;
        }
        if (ann.content) {
            txtContent += `    Content: ${ann.content}\n`;
        }
        
        if (options.includeReplies && ann.replies && ann.replies.length > 0) {
            txtContent += `    Replies (${ann.replies.length}):\n`;
            ann.replies.forEach((reply, rIdx) => {
                txtContent += `      > [${reply.authorName}] ${reply.content}\n`;
            });
        }
        txtContent += `\n`;
        txtContent += `--------------------------------------------------\n\n`;
    });
    
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(txtContent);
    triggerDownload(dataStr, fileName);
}

// Parses an uploaded JSON file and returns a Promise with the annotations array
export function parseImportFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (!Array.isArray(json)) {
                    reject(new Error("Invalid file format. Expected a JSON array of annotations."));
                    return;
                }
                resolve(json);
            } catch (err) {
                reject(new Error("Failed to parse JSON file."));
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}
