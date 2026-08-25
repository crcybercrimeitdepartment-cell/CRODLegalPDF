/**
 * Enterprise Search Engine for Annotations
 * Supports:
 * - Exact Phrases: "fix this"
 * - Boolean Operators: AND, OR, NOT
 * - Wildcards: net*ork
 * - Field specific: type:rectangle
 */

function tokenize(query) {
    const tokens = [];
    let currentToken = '';
    let inQuotes = false;

    for (let i = 0; i < query.length; i++) {
        const char = query[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
            currentToken += char; // Keep quotes for parsing later
        } else if (char === ' ' && !inQuotes) {
            if (currentToken.trim() !== '') {
                tokens.push(currentToken.trim());
                currentToken = '';
            }
        } else {
            currentToken += char;
        }
    }
    
    if (currentToken.trim() !== '') {
        tokens.push(currentToken.trim());
    }
    
    return tokens;
}

function matchToken(annotation, token) {
    let isNegated = false;
    if (token.startsWith('NOT ')) {
        isNegated = true;
        token = token.substring(4).trim();
    } else if (token.startsWith('-')) {
        isNegated = true;
        token = token.substring(1).trim();
    }

    let field = null;
    let value = token;

    // Field targeting (e.g. type:rectangle)
    if (token.includes(':') && !token.startsWith('"')) {
        const parts = token.split(':');
        field = parts[0].toLowerCase();
        value = parts.slice(1).join(':').trim();
    }

    // Exact phrase handling
    let isExact = false;
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
        isExact = true;
        value = value.substring(1, value.length - 1).toLowerCase();
    } else {
        value = value.toLowerCase();
    }

    // Convert wildcards to regex if needed (only if not exact phrase)
    let regex = null;
    if (!isExact && value.includes('*')) {
        const escaped = value.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars except *
        const regexStr = escaped.replace(/\*/g, '.*');
        try {
            regex = new RegExp(regexStr, 'i');
        } catch (e) {
            // fallback if invalid regex
        }
    }

    const checkMatch = (targetValue) => {
        if (!targetValue) return false;
        targetValue = targetValue.toString().toLowerCase();
        
        if (isExact) {
            return targetValue.includes(value);
        } else if (regex) {
            return regex.test(targetValue);
        } else {
            return targetValue.includes(value);
        }
    };

    let result = false;

    if (field) {
        if (field === 'type') result = checkMatch(annotation.type);
        else if (field === 'author') result = checkMatch(annotation.authorName);
        else if (field === 'status') {
            const statusStr = annotation.resolved ? 'resolved' : 'unresolved';
            result = checkMatch(statusStr);
        }
        else result = false; // unknown field
    } else {
        // Global search across text, author, and replies
        const matchesContent = checkMatch(annotation.text) || checkMatch(annotation.content);
        const matchesAuthor = checkMatch(annotation.authorName);
        const matchesReplies = annotation.replies && annotation.replies.some(r => checkMatch(r.content) || checkMatch(r.authorName));
        
        result = matchesContent || matchesAuthor || matchesReplies;
    }

    return isNegated ? !result : result;
}

export function evaluateSearchQuery(annotation, rawQuery) {
    if (!rawQuery || rawQuery.trim() === '') return true;

    // Pre-process standard boolean operators (convert " OR " into specific tokens or just handle simple evaluation)
    // For this lightweight version, we will default to AND for all tokens unless OR is explicitly used.
    
    // Quick normalization of operators
    const normalizedQuery = rawQuery
        .replace(/\s+AND\s+/g, ' ') // AND is implicit
        .replace(/\s+NOT\s+/g, ' -'); // Convert NOT to negation prefix
        
    const tokens = tokenize(normalizedQuery);
    
    // We will do a basic grouped evaluation.
    // If we see "OR", it splits the logic into groups.
    // e.g. [A, OR, B, C] -> Group 1 [A], Group 2 [B, C]. Result is Group 1 OR Group 2.
    
    const groups = [[]];
    for (const token of tokens) {
        if (token === 'OR' || token === 'or') {
            groups.push([]);
        } else {
            groups[groups.length - 1].push(token);
        }
    }

    // Evaluate each group (AND logic within group)
    const evaluateGroup = (group) => {
        if (group.length === 0) return false;
        for (const token of group) {
            if (!matchToken(annotation, token)) {
                return false;
            }
        }
        return true;
    };

    // If any group is true (OR logic), the annotation matches
    for (const group of groups) {
        if (evaluateGroup(group)) {
            return true;
        }
    }

    return false;
}
