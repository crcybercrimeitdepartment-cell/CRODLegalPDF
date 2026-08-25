import React, { useState, useRef, useEffect } from 'react';
import { Code, Eye, Copy, Check } from 'lucide-react';

export default function CodeEditor({ language = 'html', value, onChange, placeholder, height = '400px' }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(value || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (language) {
      case 'html': return '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n  <p>Edit this HTML and see the live preview!</p>\n</body>\n</html>';
      case 'json': return '{\n  "name": "John Doe",\n  "age": 30,\n  "city": "New York"\n}';
      case 'xml': return '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <person>\n    <name>John Doe</name>\n    <age>30</age>\n  </person>\n</root>';
      default: return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Code size={14} className="text-purple-600" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {language} Code
          </span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
            background: copied ? '#ecfdf5' : '#f1f5f9',
            color: copied ? '#059669' : '#64748b',
            border: `1px solid ${copied ? '#a7f3d0' : '#e2e8f0'}`,
            borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={getPlaceholder()}
        spellCheck={false}
        style={{
          flex: 1, padding: '14px', margin: 0,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: '0.85rem', lineHeight: '1.6',
          border: 'none', outline: 'none', resize: 'none',
          background: '#1e293b', color: '#e2e8f0',
          tabSize: 2,
        }}
      />
    </div>
  );
}

export function LivePreview({ html, height = '400px' }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Eye size={14} className="text-green-600" />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Live Preview
        </span>
      </div>
      <iframe
        ref={iframeRef}
        title="Live Preview"
        style={{ flex: 1, border: 'none', background: '#fff' }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

export function FormattedPreview({ code, language, height = '400px' }) {
  const getHighlightedCode = () => {
    if (!code) return '<span style="color:#64748b;font-style:italic;">Nothing to preview yet...</span>';
    try {
      if (language === 'json') {
        const parsed = JSON.parse(code);
        const formatted = JSON.stringify(parsed, null, 2);
        return formatted
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"([^"]+)":/g, '<span style="color:#7c3aed;">"$1"</span>:')
          .replace(/: "([^"]*)"/g, ': <span style="color:#059669;">"$1"</span>')
          .replace(/: (\d+)/g, ': <span style="color:#2563eb;">$1</span>')
          .replace(/: (true|false|null)/g, ': <span style="color:#dc2626;">$1</span>');
      }
      if (language === 'xml') {
        return code
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/&lt;(\/?[\w-]+)/g, '&lt;<span style="color:#7c3aed;">$1</span>')
          .replace(/(\w+)="([^"]*)"/g, '<span style="color:#059669;">$1</span>=<span style="color:#2563eb;">"$2"</span>');
      }
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    } catch {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Eye size={14} className="text-green-600" />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Preview
        </span>
      </div>
      <div style={{
        flex: 1, padding: '14px', overflow: 'auto',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        fontSize: '0.85rem', lineHeight: '1.6',
        background: '#1e293b', color: '#e2e8f0',
      }}>
        <pre
          style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
        />
      </div>
    </div>
  );
}
