/**
 * @file agent.jsx
 * @description Consolidated React AI Feature Agent. Fully self-contained.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Icons from 'lucide-react';
import {
  Plus, ArrowLeft, X, FolderOpen, Sparkles, ChevronRight, Search, FolderTree,
  Menu, RotateCcw, Send, Mic, MicOff, GitCompare, CheckCircle2, ExternalLink,
  ArrowRight, AlertCircle, Layers, Target, Zap, BookOpen, Copy, ThumbsUp, ThumbsDown, Check,
  FileText, Lock
} from 'lucide-react';

import {
  CATEGORY_DEFINITIONS,
  HINDI_CATEGORY_MAP,
  GLOBAL_HINDI_ALIASES,
  CATEGORIES_KNOWLEDGE,
  FEATURES_KNOWLEDGE,
  DEFAULT_KNOWLEDGE,
  ALL_FEATURES,
  CATEGORY_MAP
} from './agentData';

// --- INLINED CSS ---
const agentCSS = "/* ==========================================================================\n   AI AGENT — CHAT WINDOW\n   ========================================================================== */\n\n.chat-window {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  background: #f2f6ee;\n  background-image: \n    radial-gradient(at 0% 0%, rgba(255, 235, 238, 0.15) 0px, transparent 50%),\n    radial-gradient(at 100% 0%, rgba(238, 242, 255, 0.25) 0px, transparent 50%),\n    radial-gradient(at 50% 100%, rgba(240, 253, 244, 0.15) 0px, transparent 50%);\n  background-attachment: fixed;\n  overflow: hidden;\n}\n\n.chat-window-topbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 20px;\n  background: rgba(242, 246, 238, 0.7);\n  backdrop-filter: blur(12px);\n  -webkit-backdrop-filter: blur(12px);\n  border-bottom: 1px solid rgba(210, 220, 200, 0.5);\n  flex-shrink: 0;\n  z-index: 10;\n}\n@media (max-width: 1023px) {\n  .chat-window-topbar {\n    display: none; /* hidden on mobile — mobile topbar handles branding */\n  }\n}\n\n.chat-clear-btn {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 6px 12px;\n  border-radius: 8px;\n  background: rgba(255, 255, 255, 0.6);\n  backdrop-filter: blur(4px);\n  color: #64748b;\n  font-size: 11px;\n  font-weight: 700;\n  border: 1px solid rgba(226, 232, 240, 0.6);\n  cursor: pointer;\n  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);\n  min-height: 32px;\n}\n.chat-clear-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; transform: scale(1.05); }\n\n.chat-messages-area {\n  flex: 1;\n  overflow-y: auto;\n  padding: 20px 20px 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  scrollbar-width: thin;\n  scrollbar-color: #cbd5e1 transparent;\n  min-height: 0;\n}\n@media (max-width: 640px) {\n  .chat-messages-area { padding: 12px 10px 8px; gap: 12px; }\n}\n\n.chat-input-section {\n  flex-shrink: 0;\n  padding: 8px 16px 14px;\n  background: rgba(255, 255, 255, 0.85);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  border-top: 1px solid rgba(226, 232, 240, 0.6);\n  z-index: 10;\n}\n@media (max-width: 640px) {\n  .chat-input-section { padding: 6px 10px calc(10px + env(safe-area-inset-bottom, 0px)); }\n}\n\n/* ==========================================================================\n   AI AGENT — CHAT INPUT\n   ========================================================================== */\n\n.chat-input-wrap {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.chat-input-bar {\n  display: flex;\n  align-items: flex-end;\n  gap: 10px;\n  background: white;\n  border: 2px solid #d2dcc8;\n  border-radius: 18px;\n  padding: 10px 14px;\n  transition: border-color 0.2s, box-shadow 0.2s;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);\n}\n@media (max-width: 640px) {\n  .chat-input-bar { padding: 8px 10px; border-radius: 14px; gap: 8px; min-height: 44px; }\n}\n.chat-input-bar:focus-within {\n  border-color: #1e2a52;\n  box-shadow: 0 4px 24px rgba(30, 42, 82, 0.1);\n}\n.chat-input-bar--disabled {\n  opacity: 0.65;\n  pointer-events: none;\n}\n\n.chat-input-icon {\n  width: 18px;\n  height: 18px;\n  color: #3b82f6;\n  flex-shrink: 0;\n  margin-bottom: 2px;\n}\n@media (max-width: 640px) {\n  .chat-input-icon { width: 16px; height: 16px; }\n}\n\n.chat-input-textarea {\n  flex: 1;\n  background: transparent;\n  border: none;\n  resize: none;\n  font-size: 15.5px;\n  font-weight: 500;\n  color: #1e2a52;\n  line-height: 1.5;\n  outline: none;\n  max-height: 160px;\n  overflow-y: auto;\n  font-family: inherit;\n}\n@media (max-width: 640px) {\n  .chat-input-textarea { font-size: 14px; }\n}\n.chat-input-textarea::placeholder {\n  color: #94a3b8;\n}\n\n.chat-send-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border-radius: 10px;\n  background: #1e2a52;\n  color: white;\n  border: none;\n  cursor: pointer;\n  flex-shrink: 0;\n  transition: background 0.15s, transform 0.1s, opacity 0.15s;\n}\n@media (max-width: 640px) {\n  .chat-send-btn { width: 38px; height: 38px; border-radius: 10px; }\n}\n.chat-send-btn:hover:not(:disabled) { background: #16203e; transform: translateY(-1px); }\n.chat-send-btn:active:not(:disabled) { transform: scale(0.95); }\n.chat-send-btn:disabled { opacity: 0.35; cursor: default; }\n\n.chat-voice-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border-radius: 10px;\n  background: #f1f5f9;\n  color: #64748b;\n  border: none;\n  cursor: pointer;\n  flex-shrink: 0;\n  transition: all 0.2s;\n}\n@media (max-width: 640px) {\n  .chat-voice-btn { width: 38px; height: 38px; border-radius: 10px; }\n}\n.chat-voice-btn:hover:not(:disabled) { background: #e2e8f0; color: #334155; }\n.chat-voice-btn--active { background: #ef4444 !important; color: white !important; animation: pulseVoice 1.5s infinite; }\n@keyframes pulseVoice { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }\n\n.chat-input-hint {\n  font-size: 10px;\n  color: #94a3b8;\n  text-align: right;\n  padding-right: 4px;\n}\n\n/* ==========================================================================\n   AI AGENT — PROMPT SUGGESTION CHIPS\n   ========================================================================== */\n\n.prompt-chips-row {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding-bottom: 8px;\n}\n@media (max-width: 640px) {\n  .prompt-chips-row {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    padding-bottom: 6px;\n    gap: 5px;\n  }\n  .prompt-chips-row::-webkit-scrollbar { display: none; }\n}\n\n.prompt-chip {\n  padding: 6px 14px;\n  border-radius: 20px;\n  background: #e2ead8;\n  color: #1e2a52;\n  font-size: 12px;\n  font-weight: 700;\n  border: 1px solid #c8d4bd;\n  cursor: pointer;\n  white-space: nowrap;\n  transition: all 0.2s ease;\n  min-height: 30px;\n}\n@media (max-width: 640px) {\n  .prompt-chip { padding: 4px 10px; font-size: 10px; min-height: 26px; }\n}\n.prompt-chip:hover {\n  background: #1e2a52;\n  color: white;\n  border-color: #1e2a52;\n  transform: translateY(-1.5px);\n}\n\n/* ==========================================================================\n   AI AGENT — EMPTY STATE\n   ========================================================================== */\n\n.empty-state-wrap {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  padding: 40px 20px;\n  flex: 1;\n  min-height: 0;\n}\n@media (max-width: 640px) {\n  .empty-state-wrap { padding: 20px 12px; overflow-y: auto; }\n}\n\n.empty-state-icon {\n  width: 72px;\n  height: 72px;\n  border-radius: 20px;\n  background: #e2ead8;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  margin-bottom: 20px;\n}\n@media (max-width: 640px) {\n  .empty-state-icon { width: 56px; height: 56px; border-radius: 16px; margin-bottom: 14px; }\n}\n\n.empty-state-title {\n  font-size: 22px;\n  font-weight: 900;\n  color: #1e2a52;\n  margin-bottom: 10px;\n  line-height: 1.25;\n}\n@media (max-width: 640px) {\n  .empty-state-title { font-size: 17px; margin-bottom: 8px; }\n}\n\n.empty-state-subtitle {\n  font-size: 13px;\n  font-weight: 500;\n  color: #64748b;\n  max-width: 420px;\n  line-height: 1.65;\n  margin-bottom: 24px;\n}\n@media (max-width: 640px) {\n  .empty-state-subtitle { font-size: 12px; margin-bottom: 16px; max-width: 300px; }\n}\n\n.empty-state-samples {\n  width: 100%;\n  max-width: 480px;\n  background: white;\n  border: 1px solid #e2e8f0;\n  border-radius: 16px;\n  padding: 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n@media (max-width: 640px) {\n  .empty-state-samples { padding: 12px; border-radius: 12px; max-width: 100%; max-height: 280px; overflow-y: auto; }\n}\n\n.empty-state-samples-label {\n  font-size: 10px;\n  font-weight: 800;\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n  color: #94a3b8;\n  margin-bottom: 6px;\n  text-align: left;\n}\n\n.empty-state-sample-btn {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  width: 100%;\n  padding: 10px 12px;\n  border-radius: 10px;\n  background: transparent;\n  border: 1px solid transparent;\n  cursor: pointer;\n  text-align: left;\n  transition: background 0.15s, border-color 0.15s;\n  min-height: 40px;\n}\n@media (max-width: 640px) {\n  .empty-state-sample-btn { padding: 8px 10px; gap: 8px; min-height: 38px; }\n}\n.empty-state-sample-btn:hover {\n  background: #f8faf7;\n  border-color: #e2e8f0;\n}\n\n.empty-state-sample-emoji {\n  font-size: 16px;\n  flex-shrink: 0;\n}\n\n.empty-state-sample-text {\n  flex: 1;\n  font-size: 13px;\n  font-weight: 600;\n  color: #1e2a52;\n}\n@media (max-width: 640px) {\n  .empty-state-sample-text { font-size: 12px; }\n}\n\n.empty-state-sample-arrow {\n  width: 14px;\n  height: 14px;\n  color: #94a3b8;\n  flex-shrink: 0;\n  transition: transform 0.15s;\n}\n.empty-state-sample-btn:hover .empty-state-sample-arrow {\n  transform: translateX(4px);\n  color: #1e2a52;\n}\n\n/* ==========================================================================\n   AI AGENT — ASSISTANT MESSAGE\n   ========================================================================== */\n\n@keyframes msgSlideIn {\n  from { opacity: 0; transform: translateY(8px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.msg-assistant-wrap {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  animation: msgSlideIn 0.2s ease;\n}\n\n.msg-assistant-bubble {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n  max-width: 85%;\n}\n@media (max-width: 640px) {\n  .msg-assistant-bubble { max-width: 92%; gap: 8px; }\n}\n\n.msg-assistant-avatar {\n  width: 28px;\n  height: 28px;\n  border-radius: 8px;\n  background: #1e2a52;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n@media (max-width: 640px) {\n  .msg-assistant-avatar { width: 24px; height: 24px; border-radius: 6px; }\n}\n\n.msg-assistant-text {\n  flex: 1;\n  background: white;\n  border: 1px solid #d2dcc8;\n  border-radius: 18px;\n  border-top-left-radius: 4px;\n  padding: 12px 16px;\n  font-size: 15px;\n  font-weight: 500;\n  color: #1e2a52;\n  line-height: 1.65;\n  box-shadow: 0 4px 16px rgba(0,0,0,0.02);\n}\n@media (max-width: 640px) {\n  .msg-assistant-text { padding: 10px 14px; font-size: 13.5px; border-radius: 14px; border-top-left-radius: 4px; }\n}\n.msg-assistant-text strong { font-weight: 800; }\n\n.msg-timestamp {\n  font-size: 9px;\n  color: #94a3b8;\n  align-self: flex-end;\n  padding-bottom: 2px;\n  white-space: nowrap;\n}\n\n/* Feature card container */\n.msg-feature-card {\n  background: white;\n  border: 1px solid #d2dcc8;\n  border-radius: 22px;\n  padding: 18px;\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  box-shadow: 0 8px 32px rgba(30,42,82,0.04);\n  max-width: 100%;\n  animation: msgSlideIn 0.2s ease 0.05s both;\n}\n@media (max-width: 640px) {\n  .msg-feature-card { padding: 14px; border-radius: 18px; gap: 12px; }\n}\n\n.msg-feature-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n}\n@media (max-width: 640px) {\n  .msg-feature-header { flex-direction: column; gap: 8px; }\n}\n\n.msg-feature-name {\n  font-size: 17.5px;\n  font-weight: 900;\n  color: #1e2a52;\n  line-height: 1.2;\n}\n@media (max-width: 640px) {\n  .msg-feature-name { font-size: 15px; }\n}\n\n.msg-feature-section {\n  font-size: 10.5px;\n  font-weight: 700;\n  color: #64748b;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  display: block;\n  margin-top: 3px;\n}\n\n.msg-feature-overview {\n  font-size: 14.5px;\n  color: #475569;\n  line-height: 1.7;\n}\n\n.msg-feature-purpose {\n  font-size: 13.5px;\n  color: #475569;\n  line-height: 1.65;\n  background: #f8faf7;\n  border-radius: 10px;\n  padding: 12px 14px;\n  border-left: 4px solid #10b981;\n}\n\n.msg-section-header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 4px;\n}\n\n.msg-section-title {\n  font-size: 12px;\n  font-weight: 800;\n  color: #1e2a52;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n\n/* Steps */\n.msg-steps-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  list-style: none;\n}\n\n.msg-step-item {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n  font-size: 14.5px;\n  color: #475569;\n  line-height: 1.6;\n}\n\n.msg-step-num {\n  width: 24px;\n  height: 24px;\n  border-radius: 50%;\n  background: #1e2a52;\n  color: white;\n  font-size: 11px;\n  font-weight: 800;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  margin-top: 1px;\n}\n\n/* Benefits */\n.msg-benefits-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  list-style: none;\n}\n\n.msg-benefit-item {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  font-size: 14.5px;\n  color: #475569;\n  line-height: 1.6;\n}\n\n/* Use Cases */\n.msg-usecases-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  list-style: none;\n}\n\n.msg-usecase-item {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  font-size: 14.5px;\n  color: #475569;\n  line-height: 1.6;\n}\n\n/* Feature Menu */\n.msg-menu-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 8px;\n}\n@media (max-width: 480px) {\n  .msg-menu-grid { grid-template-columns: 1fr; gap: 6px; }\n}\n\n.msg-menu-item {\n  background: #f8faf7;\n  border: 1px solid #e2e8f0;\n  border-radius: 10px;\n  padding: 10px 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n  min-height: 36px;\n}\n@media (max-width: 640px) {\n  .msg-menu-item { padding: 8px 10px; border-radius: 8px; min-height: 34px; }\n}\n\n.msg-menu-name {\n  font-size: 12px;\n  font-weight: 800;\n  color: #1e2a52;\n}\n@media (max-width: 640px) {\n  .msg-menu-name { font-size: 11px; }\n}\n\n.msg-menu-desc {\n  font-size: 11px;\n  color: #64748b;\n  line-height: 1.5;\n}\n\n/* Related */\n.msg-related-grid {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n}\n@media (max-width: 640px) {\n  .msg-related-grid {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    gap: 5px;\n  }\n  .msg-related-grid::-webkit-scrollbar { display: none; }\n}\n\n.msg-related-item {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 6px 12px;\n  border-radius: 20px;\n  background: #f1f5f9;\n  border: 1px solid #e2e8f0;\n  color: #1e2a52;\n  font-size: 11px;\n  font-weight: 700;\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background 0.15s, transform 0.1s;\n  min-height: 28px;\n}\n.msg-related-item:hover {\n  background: #e2e8f0;\n  transform: translateY(-1px);\n}\n@media (max-width: 640px) {\n  .msg-related-item { padding: 5px 10px; font-size: 10px; min-height: 26px; }\n}\n\n/* Comparison */\n.msg-comparison-wrap {\n  background: white;\n  border: 1px solid #e2e8f0;\n  border-radius: 16px;\n  padding: 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  animation: msgSlideIn 0.2s ease 0.05s both;\n}\n@media (max-width: 640px) {\n  .msg-comparison-wrap { padding: 12px; border-radius: 12px; gap: 10px; }\n}\n\n.msg-comparison-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 12px;\n}\n@media (max-width: 540px) {\n  .msg-comparison-grid { grid-template-columns: 1fr; }\n}\n\n.msg-comparison-col {\n  border-radius: 12px;\n  padding: 14px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n@media (max-width: 640px) {\n  .msg-comparison-col { padding: 10px; gap: 8px; }\n}\n.msg-comparison-col--a { background: #eff6ff; border: 1px solid #bfdbfe; }\n.msg-comparison-col--b { background: #faf5ff; border: 1px solid #e9d5ff; }\n\n.msg-comp-name {\n  font-size: 14px;\n  font-weight: 900;\n  color: #1d4ed8;\n}\n@media (max-width: 640px) {\n  .msg-comp-name { font-size: 13px; }\n}\n.msg-comp-name--b { color: #7c3aed; }\n\n.msg-comp-overview {\n  font-size: 13.5px;\n  color: #475569;\n  line-height: 1.6;\n}\n\n.msg-comp-bullet {\n  display: flex;\n  align-items: flex-start;\n  gap: 6px;\n  font-size: 11px;\n  color: #475569;\n}\n\n/* Category exploration */\n.msg-category-features {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n}\n@media (max-width: 640px) {\n  .msg-category-features {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    gap: 5px;\n  }\n  .msg-category-features::-webkit-scrollbar { display: none; }\n}\n\n.msg-category-feature-chip {\n  padding: 5px 12px;\n  border-radius: 20px;\n  background: #f1f5f9;\n  border: 1px solid #e2e8f0;\n  color: #1e2a52;\n  font-size: 11px;\n  font-weight: 700;\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background 0.15s, transform 0.1s;\n  min-height: 28px;\n}\n.msg-category-feature-chip:hover {\n  background: #dbeafe;\n  border-color: #93c5fd;\n  transform: translateY(-1px);\n}\n@media (max-width: 640px) {\n  .msg-category-feature-chip { padding: 4px 10px; font-size: 10px; min-height: 26px; }\n}\n\n.msg-category-more {\n  font-size: 11px;\n  color: #64748b;\n  padding: 5px 8px;\n}\n\n/* All categories */\n.msg-all-categories {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 6px;\n}\n@media (max-width: 480px) {\n  .msg-all-categories { grid-template-columns: 1fr; gap: 5px; }\n}\n\n.msg-all-cat-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 8px 12px;\n  border-radius: 10px;\n  background: #f8faf7;\n  border: 1px solid #e2e8f0;\n  cursor: pointer;\n  transition: background 0.15s;\n  text-align: left;\n  gap: 6px;\n  min-height: 36px;\n}\n.msg-all-cat-item:hover { background: #e2ead8; }\n@media (max-width: 640px) {\n  .msg-all-cat-item { padding: 7px 10px; border-radius: 8px; min-height: 34px; }\n}\n\n.msg-all-cat-name {\n  font-size: 11px;\n  font-weight: 700;\n  color: #1e2a52;\n}\n\n.msg-all-cat-count {\n  font-size: 10px;\n  color: #64748b;\n  white-space: nowrap;\n}\n\n/* No result */\n.msg-no-result {\n  background: #fffbeb;\n  border: 1px solid #fde68a;\n  border-radius: 14px;\n  padding: 14px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n@media (max-width: 640px) {\n  .msg-no-result { padding: 10px; border-radius: 10px; }\n}\n\n.msg-no-result-hint {\n  font-size: 12px;\n  color: #78350f;\n  line-height: 1.6;\n}\n\n.msg-alternatives {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n}\n@media (max-width: 640px) {\n  .msg-alternatives {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    gap: 5px;\n  }\n  .msg-alternatives::-webkit-scrollbar { display: none; }\n}\n\n.msg-alternative-btn {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 6px 12px;\n  border-radius: 20px;\n  background: white;\n  border: 1px solid #fde68a;\n  color: #92400e;\n  font-size: 11px;\n  font-weight: 700;\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background 0.15s;\n  min-height: 28px;\n}\n.msg-alternative-btn:hover { background: #fef3c7; }\n@media (max-width: 640px) {\n  .msg-alternative-btn { padding: 5px 10px; font-size: 10px; min-height: 26px; }\n}\n\n/* Open Tool buttons */\n.msg-open-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n  width: 100%;\n  padding: 10px 16px;\n  border-radius: 10px;\n  background: #1e2a52;\n  color: white;\n  font-size: 13px;\n  font-weight: 700;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s, transform 0.1s;\n  min-height: 40px;\n}\n.msg-open-btn:hover { background: #16203e; transform: translateY(-1px); }\n@media (max-width: 640px) {\n  .msg-open-btn { padding: 9px 14px; font-size: 12px; border-radius: 8px; min-height: 38px; }\n}\n\n.msg-open-btn-compact {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 5px 10px;\n  border-radius: 8px;\n  background: #f0fdf4;\n  color: #15803d;\n  font-size: 11px;\n  font-weight: 700;\n  border: 1px solid #86efac;\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background 0.15s;\n  min-height: 28px;\n}\n.msg-open-btn-compact:hover { background: #dcfce7; }\n@media (max-width: 640px) {\n  .msg-open-btn-compact { padding: 4px 8px; font-size: 10px; min-height: 26px; }\n}\n\n/* Follow-up chips */\n.msg-followup-chips {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding-left: 38px;\n}\n@media (max-width: 640px) {\n  .msg-followup-chips {\n    padding-left: 0;\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    gap: 5px;\n    padding-top: 2px;\n  }\n  .msg-followup-chips::-webkit-scrollbar { display: none; }\n}\n\n.msg-followup-chip {\n  padding: 5px 13px;\n  border-radius: 16px;\n  background: transparent;\n  border: 1px solid #cbd5e1;\n  color: #475569;\n  font-size: 12px;\n  font-weight: 600;\n  cursor: pointer;\n  white-space: nowrap;\n  transition: all 0.2s ease;\n  min-height: 30px;\n}\n.msg-followup-chip:hover {\n  background: #1e2a52;\n  color: white;\n  border-color: #1e2a52;\n}\n@media (max-width: 640px) {\n  .msg-followup-chip { padding: 4px 10px; font-size: 11px; min-height: 28px; }\n}\n\n/* User message */\n.msg-user-wrap {\n  display: flex;\n  justify-content: flex-end;\n  animation: msgSlideIn 0.15s ease;\n}\n@media (max-width: 640px) {\n  .msg-user-wrap { max-width: 90%; }\n}\n\n/* ==========================================================================\n   AI AGENT — RESPONSIVE IMPROVEMENTS (Mobile / Tablet / Desktop)\n   ========================================================================== */\n\n/* ── Extra small screens (≤ 380px) ──────────────────────────────────────── */\n@media (max-width: 380px) {\n  .chat-messages-area {\n    padding: 10px 8px 6px;\n    gap: 10px;\n  }\n\n  .chat-input-section {\n    padding: 6px 8px calc(8px + env(safe-area-inset-bottom, 0px));\n  }\n\n  .chat-input-bar {\n    padding: 7px 8px;\n    border-radius: 12px;\n    gap: 6px;\n    min-height: 42px;\n  }\n\n  .chat-input-textarea {\n    font-size: 13px;\n  }\n\n  .chat-send-btn {\n    width: 34px;\n    height: 34px;\n    border-radius: 8px;\n  }\n\n  .msg-assistant-bubble {\n    max-width: 96%;\n    gap: 6px;\n  }\n\n  .msg-assistant-avatar {\n    width: 22px;\n    height: 22px;\n    border-radius: 5px;\n  }\n\n  .msg-assistant-avatar .w-3\\.5 {\n    width: 12px;\n    height: 12px;\n  }\n\n  .msg-assistant-text {\n    padding: 7px 10px;\n    font-size: 11.5px;\n    border-radius: 10px;\n    border-top-left-radius: 3px;\n  }\n\n  .msg-user-wrap {\n    max-width: 94%;\n  }\n\n  .msg-user-wrap .max-w-\\[80\\%\\] {\n    max-width: 92%;\n  }\n\n  .msg-user-wrap p {\n    font-size: 12px;\n  }\n\n  .msg-feature-card {\n    padding: 10px;\n    border-radius: 10px;\n    gap: 8px;\n  }\n\n  .msg-feature-name {\n    font-size: 14px;\n  }\n\n  .msg-feature-overview {\n    font-size: 11.5px;\n  }\n\n  .msg-menu-grid {\n    grid-template-columns: 1fr;\n    gap: 6px;\n  }\n\n  .msg-menu-item {\n    padding: 8px 10px;\n  }\n\n  .msg-comparison-grid {\n    grid-template-columns: 1fr;\n    gap: 8px;\n  }\n\n  .msg-all-categories {\n    grid-template-columns: 1fr;\n  }\n\n  .empty-state-title {\n    font-size: 16px;\n  }\n\n  .empty-state-subtitle {\n    font-size: 11px;\n    max-width: 260px;\n  }\n\n  .empty-state-samples {\n    padding: 10px;\n  }\n\n  .empty-state-sample-text {\n    font-size: 11px;\n  }\n\n  .prompt-chips-row {\n    gap: 4px;\n    padding-bottom: 4px;\n  }\n\n  .prompt-chip {\n    padding: 4px 9px;\n    font-size: 10px;\n    min-height: 26px;\n    border-radius: 16px;\n  }\n}\n\n/* ── Small screens (≤ 640px) — Mobile ────────────────────────────────────── */\n@media (max-width: 640px) {\n  .ai-layout-root {\n    height: 100vh;\n    height: 100dvh;\n  }\n\n  .ai-sidebar {\n    width: 280px;\n    max-width: 85vw;\n  }\n\n  .ai-main {\n    height: 100vh;\n    height: 100dvh;\n  }\n\n  /* Chat input safe area for iPhone notch */\n  .chat-input-section {\n    padding: 6px 10px calc(10px + env(safe-area-inset-bottom, 0px));\n  }\n\n  /* Prompt chips: horizontal scroll on mobile */\n  .prompt-chips-row {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    gap: 5px;\n    padding-bottom: 6px;\n  }\n  .prompt-chips-row::-webkit-scrollbar {\n    display: none;\n  }\n\n  /* Feature card header: stack on mobile */\n  .msg-feature-header {\n    flex-direction: column;\n    gap: 8px;\n  }\n\n  /* Category feature chips: scroll on mobile */\n  .msg-category-features {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    gap: 5px;\n  }\n  .msg-category-features::-webkit-scrollbar {\n    display: none;\n  }\n\n  /* Alternative chips: scroll on mobile */\n  .msg-alternatives {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n    gap: 5px;\n  }\n  .msg-alternatives::-webkit-scrollbar {\n    display: none;\n  }\n}\n\n/* ── Medium screens (641px – 1023px) — Tablet ────────────────────────────── */\n@media (min-width: 641px) and (max-width: 1023px) {\n  .ai-sidebar {\n    width: 280px;\n    max-width: 80vw;\n  }\n\n  .chat-messages-area {\n    padding: 16px 14px 8px;\n  }\n\n  .chat-input-section {\n    padding: 8px 14px 12px;\n  }\n}\n\n/* ── Large screens (≥ 1024px) — Desktop ──────────────────────────────────── */\n@media (min-width: 1024px) {\n  .ai-layout-root {\n    height: 100vh;\n  }\n\n  .ai-sidebar {\n    width: 300px;\n    min-width: 280px;\n    max-width: 320px;\n  }\n\n  /* Ensure chat area fills remaining space */\n  .ai-main {\n    min-width: 0;\n  }\n}\n\n/* ── Extra large screens (≥ 1440px) — Wide Desktop ──────────────────────── */\n@media (min-width: 1440px) {\n  .chat-messages-area {\n    padding: 24px 28px 10px;\n    width: 100%;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n  }\n\n  .chat-input-section {\n    width: 100%;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n  }\n\n  .prompt-chips-row {\n    width: 100%;\n    max-width: 900px;\n    display: flex;\n    justify-content: flex-start;\n  }\n\n  .chat-input-wrap {\n    width: 100%;\n    max-width: 900px;\n  }\n\n  .msg-user-wrap {\n    width: 100%;\n    max-width: 900px;\n    display: flex;\n    justify-content: flex-end;\n  }\n\n  .msg-assistant-wrap {\n    width: 100%;\n    max-width: 900px;\n  }\n\n  .msg-assistant-bubble {\n    max-width: 75%;\n  }\n\n  .empty-state-wrap {\n    width: 100%;\n    max-width: 900px;\n  }\n}\n\n/* ── iPhone / Safari safe areas ──────────────────────────────────────────── */\n@supports (padding: env(safe-area-inset-bottom)) {\n  .chat-input-section {\n    padding-bottom: calc(10px + env(safe-area-inset-bottom));\n  }\n\n  .ai-mobile-topbar {\n    padding-top: env(safe-area-inset-top);\n  }\n}\n\n/* ==========================================================================\n   REDUCED MOTION\n   ========================================================================== */\n\n@media (prefers-reduced-motion: reduce) {\n  .ai-sidebar,\n  .msg-assistant-wrap,\n  .msg-feature-card,\n  .msg-comparison-wrap {\n    animation: none;\n    transition: none;\n  }\n}\n@keyframes slideInChar {\n  0% {\n    opacity: 0;\n    transform: translateX(-32px);\n  }\n  100% {\n    opacity: 1;\n    transform: translateX(0);\n  }\n}\n.slide-in-char {\n  display: inline-block;\n  opacity: 0;\n  animation: slideInChar 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n}\n";

function useAgentStyles() {
  useEffect(() => {
    const styleId = 'ai-agent-styles';
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = agentCSS;
    document.head.appendChild(styleEl);
  }, []);
}

// ============================================================================
// SEARCH UTILITIES & FEATURE MATCHER
// ============================================================================

export function getDynamicStats() {
  return {
    categoryCount: CATEGORY_DEFINITIONS.length,
    featureCount: ALL_FEATURES.length,
    categories: CATEGORY_DEFINITIONS.map(c => ({
      id: c.id,
      name: c.name,
      iconName: c.iconName,
      count: CATEGORY_MAP[c.id]?.count || 0
    }))
  };
}

export function searchFeatures(query = '', categoryFilter = null) {
  let list = ALL_FEATURES;
  if (categoryFilter) {
    list = list.filter(f => f.sectionId === categoryFilter);
  }

  const q = (query || '').toLowerCase().trim();
  if (!q) return list;

  const STOP_WORDS = new Set([
    'se', 'ko', 'ka', 'ki', 'ke', 'kar', 'karo', 'karna', 'hai', 'hast', 'mein', 'me', 'pe', 'par',
    'in', 'to', 'for', 'and', 'the', 'with', 'from', 'a', 'an', 'of', 'on', 'at', 'by', 'is', 'this',
    'he', 'ho', 'hu', 'tha', 'thi', 'the', 'gaya', 'gaye', 'gayi', 'raha', 'rahe', 'rahi', 'chahiye', 'chaiye', 'kare', 'karen'
  ]);

  const matchesWord = (text, token) => {
    const regex = new RegExp('\\b' + token, 'i');
    return regex.test(text);
  };

  const tokens = q.split(/\s+/).filter(t => t.length > 1 && !STOP_WORDS.has(t));
  const scored = [];

  for (const f of list) {
    const nameLower = f.name.toLowerCase();
    const idLower = f.id.toLowerCase();
    let score = 0;

    if (nameLower === q) {
      score = 100;
    }
    else if (f.aliases && f.aliases.some(a => a === q)) {
      score = 90;
    }
    else if (nameLower.includes(q) || q.includes(nameLower)) {
      score = 80;
    }
    else {
      let matchCount = 0;
      let matchedTokens = new Set();
      const categoryHindiAliases = HINDI_CATEGORY_MAP[f.sectionId] || [];

      tokens.forEach(t => {
        if (matchesWord(nameLower, t) || matchesWord(idLower, t)) {
          matchCount += 12;
          matchedTokens.add(t);
        } else if (f.aliases && f.aliases.some(a => matchesWord(a, t))) {
          matchCount += 8;
          matchedTokens.add(t);
        } else if (categoryHindiAliases.some(a => matchesWord(a, t))) {
          matchCount += 3;
          matchedTokens.add(t);
        } else if (f.overview && matchesWord(f.overview, t)) {
          matchCount += 1;
          matchedTokens.add(t);
        }
      });

      if (matchCount > 0) {
        const coverage = matchedTokens.size / tokens.length;
        score = Math.round(matchCount * coverage);
      }
    }

    if (score > 0) {
      scored.push({ feature: f, score });
    }
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.feature.name.length - b.feature.name.length;
    })
    .map(r => r.feature);
}

export function executeLocalSearch(query = '', categoryFilter = null) {
  return searchFeatures(query, categoryFilter);
}

export function detectCategoryNameFromQuery(query = '') {
  const q = query.toLowerCase().trim();
  for (const [catId, cat] of Object.entries(CATEGORY_MAP)) {
    if (q.includes(cat.name.toLowerCase()) || q.includes(catId)) {
      return catId;
    }
  }
  return null;
}

export function detectCategoryAliasFromQuery(query = '') {
  const q = query.toLowerCase().trim();
  for (const [catId, hindiAliases] of Object.entries(HINDI_CATEGORY_MAP)) {
    if (hindiAliases.some(alias => q.includes(alias))) {
      return catId;
    }
  }
  return null;
}

export function getCategoryWithFeatures(categoryId) {
  const catMap = CATEGORY_MAP[categoryId];
  const catKnowledge = CATEGORIES_KNOWLEDGE[categoryId];
  if (!catMap) return null;
  return {
    ...catMap,
    ...catKnowledge,
    features: catMap.features
  };
}

export function findBestMatchingFeature(queryText) {
  const matches = executeLocalSearch(queryText);
  return matches.length > 0 ? matches[0] : null;
}

export function findBestMatchingCategory(queryText) {
  const catId = detectCategoryNameFromQuery(queryText) || detectCategoryAliasFromQuery(queryText);
  if (!catId) return null;
  return getCategoryWithFeatures(catId);
}



// ============================================================================
// AI AGENT ENGINE (NLP & PIPELINE)
// ============================================================================

export function normalizeQuery(query = '') {
  if (typeof query !== 'string') return '';
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/gi, ' ')
    .replace(/\s+/g, ' ');
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'and', 'or', 'is', 'can', 'i', 'do', 'with', 'what', 'how', 'does', 'work', 'show', 'tell', 'me', 'about']);

export function tokenizeQuery(query = '') {
  const normalized = normalizeQuery(query);
  return normalized
    .split(' ')
    .filter(token => token.length > 0 && !STOP_WORDS.has(token));
}

export function processQueryInput(rawText = '') {
  return {
    raw: rawText,
    normalized: normalizeQuery(rawText),
    tokens: tokenizeQuery(rawText)
  };
}

const CONTEXT_PRONOUNS = [
  'it', 'its', 'this', 'that', 'these', 'the feature',
  'iska', 'iske', 'isme', 'iss', 'ye', 'woh', 'isko', 'yeh',
  'isne', 'iski', 'uski', 'uske', 'uss'
];

const YES_WORDS = [
  'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'haan', 'ha', 'han',
  'theek hai', 'theek', 'bilkul', 'zaroor', 'go ahead', 'please',
  'show me', 'show', 'of course', 'definitely', 'absolutely'
];

const NO_WORDS = [
  'no', 'nah', 'nope', 'nahi', 'mat', 'cancel', 'skip', 'ignore', 'band karo'
];

function hasContextPronoun(q) {
  return CONTEXT_PRONOUNS.some(p => {
    const idx = q.indexOf(p);
    if (idx === -1) return false;
    const before = idx === 0 || /\W/.test(q[idx - 1]);
    const after = idx + p.length >= q.length || /\W/.test(q[idx + p.length]);
    return before && after;
  });
}

export function detectQueryIntent(processedQuery, currentFeature = null, lastAgentIntent = null, activeCategoryId = null) {
  const q = processedQuery.normalized;

  if (YES_WORDS.some(w => q === w || q.startsWith(w + ' ')) && !q.includes('batao') && !q.includes('bata do')) {
    return { type: 'YES_CONFIRM', lastIntent: lastAgentIntent };
  }

  if (
    q === 'hi' || q === 'hello' || q === 'hey' || q === 'hii' || q === 'hiii' ||
    q.includes('who are you') || q.includes('what are you') || q.includes('tum kaun ho') ||
    q.includes('introduce yourself') || q.includes('apne baare me batao') ||
    q.includes('what can you do') || q.includes('tum kya karte ho')
  ) {
    return { type: 'greeting' };
  }

  if (
    q.includes(' vs ') || q.includes(' versus ') || q.includes(' vs. ') ||
    q.includes('compare') || q.includes('difference') || q.includes('antar') || q.includes('farak')
  ) {
    return { type: 'comparison' };
  }

  if (
    q.includes('show') || q.includes('list') || q.includes('all features') ||
    q.includes('what features') || q.includes('what tools') ||
    q.includes('sabhi features') || q.includes('sab features') ||
    q.includes('available features') || q.includes('features in')
  ) {
    return { type: 'category-exploration' };
  }

  const isOpenAction = q.startsWith('open ') || q.startsWith('launch ') || q.startsWith('use ') ||
    q.includes('open tool') || q.includes('use this tool') || q.includes('go to') ||
    q.includes('navigate to') || q === 'open' || q === 'use it' || q === 'launch it' ||
    q.includes('kholo') || q.includes('start karo') || q.includes('use karna hai');

  const isQuestion = q.includes('how') || q.includes('why') || q.includes('what') || q.includes('kaise') || q.includes('kyu');

  if (isOpenAction && !isQuestion) {
    return { type: 'open-tool' };
  }

  const hasContext = currentFeature !== null || activeCategoryId !== null || hasContextPronoun(q);

  if (hasContext) {
    if (
      q.includes('purpose') || q.includes('why use') || q.includes('why should') ||
      q.includes('kyu use') || q.includes('kyu hai') || q.includes('kyon') ||
      q.includes('why is it') || q.includes('kyu chahiye') || q.includes('kya use') ||
      q.includes('kya kaam hai') || q.includes('use kya') || q.includes('iska kya use')
    ) {
      return { type: 'purpose' };
    }

    if (
      q.includes('how') || q.includes('steps') || q.includes('process') ||
      q.includes('workflow') || q.includes('kaise') || q.includes('kaise kaam') ||
      q.includes('kaise karta') || q.includes('step by step') || q.includes('kaise use') ||
      q.includes('how does') || q.includes('how to') || q.includes('how it works') ||
      q.includes('what are the steps') || q.includes('kaam kaise')
    ) {
      return { type: 'how-it-works' };
    }

    if (
      q.includes('benefit') || q.includes('advantage') || q.includes('fayde') ||
      q.includes('faayde') || q.includes('labh') || q.includes('why good') ||
      q.includes('good for') || q.includes('kya fayda') || q.includes('pros') ||
      q.includes('what are the benefits') || q.includes('iske fayde') ||
      q.includes('iska fayda') || q.includes('benefits kya')
    ) {
      return { type: 'benefits' };
    }

    if (
      q.includes('use case') || q.includes('where can') || q.includes('when to use') ||
      q.includes('where to use') || q.includes('kahan use') || q.includes('kab use') ||
      q.includes('kahan kaam') || q.includes('examples') || q.includes('scenario') ||
      q.includes('kab lagta') || q.includes('kahan lagta')
    ) {
      return { type: 'use-cases' };
    }

    if (
      q.includes('option') || q.includes('menu') || q.includes('features available') ||
      q.includes('what can i do') || q.includes('available') ||
      q.includes('kya options') || q.includes('kya kar sakta') || q.includes('isme kya') ||
      q.includes('isme options') || q.includes('tools available')
    ) {
      return { type: 'feature-menu' };
    }

    if (
      q === 'what is this' || q === 'what is it' || q === 'explain' ||
      q.includes('what is this') || q.includes('explain this') ||
      q.includes('tell me about') || q.includes('overview') ||
      q.includes('describe') || q.includes('bata do') || q.includes('batao') ||
      q.includes('kya hai ye') || q.includes('kya hai yeh') || q.includes('ye kya hai') ||
      q.includes('iske baare mein') || q.includes('about this') || q.includes('what is') ||
      q.includes('tell me')
    ) {
      return { type: 'overview' };
    }
  }

  return { type: 'general-feature-question' };
}

export function compareTwoFeatures(queryText) {
  const q = queryText.toLowerCase();

  const parts = q
    .replace(/compare|difference between|difference of/gi, '|')
    .split(/\s+vs\.?\s+|\s+versus\s+|\|/)
    .map(s => s.trim())
    .filter(s => s.length > 1);

  const candidates = [];

  for (const part of parts) {
    const results = searchFeatures(part);
    if (results.length > 0) {
      const match = results[0];
      if (!candidates.find(c => c.id === match.id)) {
        candidates.push(match);
      }
    }
    if (candidates.length >= 2) break;
  }

  if (candidates.length < 2) {
    const allMatches = searchFeatures(q);
    for (const m of allMatches) {
      if (!candidates.find(c => c.id === m.id)) {
        candidates.push(m);
      }
      if (candidates.length >= 2) break;
    }
  }

  const featureA = candidates[0] || ALL_FEATURES[0];
  const featureB = candidates[1] || ALL_FEATURES[1];

  return {
    type: 'comparison',
    featureA,
    featureB,
    text: `Here is a comparison between **${featureA.name}** and **${featureB.name}**:`
  };
}

function getFollowUpChips(intent, feature) {
  if (!feature) return [];

  const base = [
    { label: 'How does it work?', query: 'How does it work?' },
    { label: 'What are the benefits?', query: 'What are the benefits?' },
    { label: 'Use cases?', query: 'What are the use cases?' }
  ];

  const intentToChipQuery = {
    'how-it-works': 'How does it work?',
    'benefits': 'What are the benefits?',
    'use-cases': 'What are the use cases?',
    'overview': 'How does it work?',
    'purpose': 'What are the benefits?'
  };

  const excludeQuery = intentToChipQuery[intent];
  return base.filter(c => c.query !== excludeQuery).slice(0, 4);
}

function getHelpfulAlternatives(query) {
  const topFeatures = searchFeatures(query).slice(0, 4);
  if (topFeatures.length > 0) return topFeatures;

  return [
    ALL_FEATURES.find(f => f.id.includes('compress')) || ALL_FEATURES[0],
    ALL_FEATURES.find(f => f.id.includes('security')) || ALL_FEATURES[1],
    ALL_FEATURES.find(f => f.id.includes('signature')) || ALL_FEATURES[2],
    ALL_FEATURES.find(f => f.id.includes('merge')) || ALL_FEATURES[3]
  ].filter(Boolean);
}

function resolveYesIntent(lastIntent, currentFeature) {
  if (!lastIntent || !currentFeature) {
    return {
      type: 'feature_card',
      feature: currentFeature,
      text: currentFeature
        ? `Here is what I know about **${currentFeature.name}**:`
        : "I'm ready to help! Please tell me what you'd like to know.",
      followUpChips: currentFeature ? getFollowUpChips('feature_card', currentFeature) : []
    };
  }

  const yesIntentMap = {
    'how-it-works': 'benefits',
    'benefits': 'use-cases',
    'use-cases': 'feature-menu',
    'feature-menu': 'overview',
    'overview': 'how-it-works',
    'suggest_workflow': 'how-it-works',
    'suggest_benefits': 'benefits',
    'suggest_usecases': 'use-cases',
    'suggest_menu': 'feature-menu',
    'suggest_related': 'overview'
  };

  const resolvedIntent = yesIntentMap[lastIntent] || 'how-it-works';
  return generateAgentResponse({ type: resolvedIntent }, currentFeature, 'yes');
}

function enrichFeatureDetails(feature) {
  if (!feature) return null;

  const hasDetailedPurpose = feature.purpose && !feature.purpose.includes('Detailed purpose information');
  const hasDetailedWork = feature.howItWorks && feature.howItWorks.length > 0 && !feature.howItWorks[0].includes('Detailed workflow');

  if (hasDetailedPurpose && hasDetailedWork) {
    return feature;
  }

  const name = feature.name;
  const desc = feature.description || '';

  const overview = `**${name}** is a built-in tool that allows you to easily process your documents. Specifically, it helps you **${desc.charAt(0).toLowerCase() + desc.slice(1)}** directly in your browser. This tool runs locally, ensuring that your files are processed securely and privately without being uploaded to any server.`;
  const purpose = `The main purpose of **${name}** is to simplify your document workflow. If you have files where you need to "${desc}", this tool provides a fast, one-click solution so you don't have to manual-copy or use heavy external desktop software.`;

  let steps = [
    `Open the **${name}** tool from the dashboard grid or search menu.`,
    `Drag and drop or upload the document/file you want to process.`,
    `Adjust the options or settings to match your requirements.`,
    `Click the execution button to process the file instantly.`,
    `Save or download your updated document directly back to your device.`
  ];

  if (name.toLowerCase().includes('compress') || name.toLowerCase().includes('size')) {
    steps = [
      `Open the **${name}** tool.`,
      `Upload your PDF or files that you want to shrink.`,
      `The tool will automatically optimize file resources, images, and metadata to reduce size.`,
      `Download the compressed file, which will now be much easier to share over email or upload.`
    ];
  } else if (name.toLowerCase().includes('password') || name.toLowerCase().includes('protect') || name.toLowerCase().includes('security') || name.toLowerCase().includes('lock')) {
    steps = [
      `Navigate to the **${name}** tool.`,
      `Upload the files you want to secure or decrypt.`,
      `Set your desired security password or configure restrictions (like disable copying/printing).`,
      `Apply changes to save the secure encrypted file to your device.`
    ];
  } else if (name.toLowerCase().includes('convert') || name.toLowerCase().includes('to')) {
    steps = [
      `Select the **${name}** conversion tool.`,
      `Upload the source document (like Word, Excel, PPT, or JPG) that you want to transform.`,
      `The converter will translate the file structure into a standard PDF (or vice-versa).`,
      `Download your converted document with original layouts preserved.`
    ];
  } else if (name.toLowerCase().includes('sign') || name.toLowerCase().includes('signature')) {
    steps = [
      `Open the **${name}** signing tool.`,
      `Upload the agreement or form that needs a signature.`,
      `Create your digital signature (draw it, type your name, or upload an image) or verify biometrics.`,
      `Place the signature precisely on the page and download the legally signed document.`
    ];
  }

  const benefits = [
    `No installation required: Works entirely online directly in your web browser.`,
    `Privacy first: File processing is done locally on your device, ensuring maximum confidentiality.`,
    `Accurate results: Tries to preserve the original quality, font styles, and layouts.`,
    `Easy to use: A clean, step-by-step layout designed for quick tasks.`
  ];

  const useCases = [
    `Managing daily paperwork, cases, or student assignments efficiently.`,
    `Preparing and securing contracts, invoices, or proposals for corporate sharing.`,
    `Converting non-standard file extensions into universally readable PDFs.`
  ];

  return {
    ...feature,
    overview,
    purpose,
    howItWorks: steps,
    benefits,
    useCases
  };
}

function enrichCategoryDetails(category) {
  if (!category) return null;

  const hasDetailedOverview = category.overview && !category.overview.includes('General overview');
  if (hasDetailedOverview && category.purpose && category.benefits && category.benefits.length > 0) {
    return category;
  }

  const name = category.name;

  const overview = `**${name}** is a major section of our PDF platform. It groups together a suite of specialized tools designed specifically for **${name.toLowerCase()}** tasks. By grouping these tools, you can easily find utilities to modify, protect, or convert your documents without searching through unrelated features.`;
  const purpose = `The primary purpose of the **${name}** category is to provide a single, unified workspace for all tasks related to ${name.toLowerCase()}. It allows users to execute complete document workflows (like merging, splitting, and organizing pages) under one cohesive interface.`;
  const work = [
    `Select the **${name}** section from the home dashboard or the sidebar.`,
    `Choose the specific sub-tool that matches your current goal (e.g. if you clicked Organize, choose Merge or Split).`,
    `Follow the individual tool's instructions to upload and configure your files.`,
    `Execute the process locally in your browser and download the output.`
  ];
  const benefits = [
    `Organized structure: All related document features are grouped together logically.`,
    `Efficiency: Speeds up your tasks by keeping similar tools close at hand.`,
    `Consistent interface: All tools in this section share matching styles and options.`
  ];
  const useCases = [
    `Managing complex files that require multiple sequential operations (like converting to PDF, then organizing pages).`,
    `Accessing advanced security, signature, or accessibility settings for legal documents.`
  ];

  return {
    ...category,
    overview,
    purpose,
    work,
    benefits,
    useCases
  };
}

export function generateAgentResponse(intent, feature, queryText, currentFeature = null, activeCategory = null) {
  const activeFeature = feature ? enrichFeatureDetails(feature) : (currentFeature ? enrichFeatureDetails(currentFeature) : null);
  const intentType = intent.type;

  if (intentType === 'YES_CONFIRM') {
    return resolveYesIntent(intent.lastIntent, activeFeature);
  }

  if (intentType === 'greeting') {
    return {
      type: 'greeting',
      text: "Hello! I am your AI Assistant for this platform. I can help you understand our tools, tell you how to use them, or even launch them for you directly. \n\nHow can I help you today?",
      followUpChips: [
        { label: 'Show all features', query: 'Show all features' },
        { label: 'How does Compress PDF work?', query: 'How does Compress PDF work?' },
        { label: 'PDF Security tools', query: 'PDF Security tools' }
      ]
    };
  }

  if (intentType === 'comparison') {
    return {
      type: 'comparison',
      featureA: ALL_FEATURES[0],
      featureB: ALL_FEATURES[1],
      text: 'Here is a comparison:',
      followUpChips: []
    };
  }

  if (intentType === 'category-exploration') {
    const targetCatId = activeFeature?.sectionId || activeCategory?.id || null;
    if (targetCatId && CATEGORY_MAP[targetCatId]) {
      const cat = enrichCategoryDetails(CATEGORY_MAP[targetCatId]);
      return {
        type: 'category_exploration',
        category: cat,
        text: `Here is an overview of **${cat.name}** category, containing **${cat.features.length} features**:`,
        followUpChips: [
          { label: 'How does it work?', query: 'How does it work?' },
          { label: 'What are the benefits?', query: 'What are the benefits?' }
        ]
      };
    }

    const allCats = Object.values(CATEGORY_MAP).map(c => enrichCategoryDetails(c));
    return {
      type: 'all_categories',
      categories: allCats,
      text: `Here are all **${allCats.length} feature categories** — containing **${ALL_FEATURES.length} tools** in total:`,
      followUpChips: [
        { label: 'Compress PDF', query: 'Tell me about Compress PDF' },
        { label: 'PDF Security', query: 'Tell me about PDF Security' }
      ]
    };
  }

  if (intentType === 'open-tool') {
    if (activeFeature) {
      return {
        type: 'open_tool',
        feature: activeFeature,
        text: `Opening **${activeFeature.name}** for you right now.`,
        followUpChips: []
      };
    }
    return {
      type: 'no_result',
      query: queryText,
      text: "Please select a feature first, then I can open it for you.",
      alternatives: getHelpfulAlternatives(queryText),
      followUpChips: []
    };
  }

  function getUnavailableResponse(query) {
    return {
      type: 'no_result',
      query,
      text: "I don't have verified information about that detail in the current feature catalog.",
      alternatives: [],
      followUpChips: []
    };
  }

  if (activeFeature) {
    switch (intentType) {
      case 'overview':
        return {
          type: 'feature_overview',
          feature: activeFeature,
          text: `Here is the overview of **${activeFeature.name}**:`,
          followUpChips: getFollowUpChips('overview', activeFeature),
          nextSuggestion: 'suggest_workflow'
        };

      case 'purpose':
        return {
          type: 'feature_purpose',
          feature: activeFeature,
          text: `Here is the purpose of **${activeFeature.name}**:`,
          followUpChips: getFollowUpChips('purpose', activeFeature),
          nextSuggestion: 'suggest_workflow'
        };

      case 'how-it-works':
        return {
          type: 'feature_workflow',
          feature: activeFeature,
          text: `Here is how **${activeFeature.name}** works step-by-step:`,
          followUpChips: getFollowUpChips('how-it-works', activeFeature),
          nextSuggestion: 'suggest_benefits'
        };

      case 'benefits':
        return {
          type: 'feature_benefits',
          feature: activeFeature,
          text: `Here are the key benefits of **${activeFeature.name}**:`,
          followUpChips: getFollowUpChips('benefits', activeFeature),
          nextSuggestion: 'suggest_usecases'
        };

      case 'use-cases':
        return {
          type: 'feature_usecases',
          feature: activeFeature,
          text: `Here are common use cases for **${activeFeature.name}**:`,
          followUpChips: getFollowUpChips('use-cases', activeFeature),
          nextSuggestion: 'suggest_menu'
        };

      case 'feature-menu':
        if (!activeFeature.featureMenu || activeFeature.featureMenu.length === 0) {
          return getUnavailableResponse(queryText);
        }
        return {
          type: 'feature_menu',
          feature: activeFeature,
          text: `Here are the available options in **${activeFeature.name}**:`,
          followUpChips: getFollowUpChips('feature-menu', activeFeature),
          nextSuggestion: null
        };
    }
  } else if (activeCategory) {
    const enrichedCat = enrichCategoryDetails(activeCategory);
    switch (intentType) {
      case 'overview':
        return {
          type: 'category_exploration',
          category: enrichedCat,
          text: `Here is an overview of the **${enrichedCat.name}** section:`,
          followUpChips: [
            { label: 'How does it work?', query: 'How does it work?' },
            { label: 'What are the benefits?', query: 'What are the benefits?' }
          ],
          nextSuggestion: 'suggest_workflow'
        };
      case 'purpose':
        return {
          type: 'category_exploration',
          category: enrichedCat,
          text: `Here is the purpose of the **${enrichedCat.name}** section:`,
          followUpChips: [
            { label: 'How does it work?', query: 'How does it work?' },
            { label: 'Use cases?', query: 'What are the use cases?' }
          ],
          nextSuggestion: 'suggest_workflow'
        };
      case 'how-it-works':
        return {
          type: 'category_exploration',
          category: enrichedCat,
          text: `Here is how the **${enrichedCat.name}** section works:`,
          followUpChips: [
            { label: 'What are the benefits?', query: 'What are the benefits?' },
            { label: 'Use cases?', query: 'What are the use cases?' }
          ],
          nextSuggestion: 'suggest_benefits'
        };
      case 'benefits':
        return {
          type: 'category_exploration',
          category: enrichedCat,
          text: `Here are the key benefits of using the **${enrichedCat.name}** section:`,
          followUpChips: [
            { label: 'How does it work?', query: 'How does it work?' },
            { label: 'Use cases?', query: 'What are the use cases?' }
          ],
          nextSuggestion: 'suggest_usecases'
        };
      case 'use-cases':
        return {
          type: 'category_exploration',
          category: enrichedCat,
          text: `Here are common use cases for the **${enrichedCat.name}** section:`,
          followUpChips: [
            { label: 'How does it work?', query: 'How does it work?' },
            { label: 'What are the benefits?', query: 'What are the benefits?' }
          ],
          nextSuggestion: 'suggest_menu'
        };
    }
  }

  if (intentType === 'general-feature-question' || !activeFeature) {
    if (activeFeature) {
      return {
        type: 'feature_card',
        feature: activeFeature,
        text: `Here is what I found for **${activeFeature.name}**:`,
        followUpChips: getFollowUpChips('feature_card', activeFeature),
        nextSuggestion: 'suggest_workflow'
      };
    }

    const alternatives = getHelpfulAlternatives(queryText);
    return {
      type: 'no_result',
      query: queryText,
      text: `I couldn't find an exact match for **"${queryText}"**.`,
      alternatives,
      followUpChips: []
    };
  }

  const alternatives = getHelpfulAlternatives(queryText);
  return {
    type: 'no_result',
    query: queryText,
    text: `I don't have verified information about that in the current feature catalog.`,
    alternatives,
    followUpChips: []
  };
}

function findStrictFeatureMatch(queryText) {
  if (!queryText) return null;
  const q = queryText.toLowerCase().trim();
  for (const f of ALL_FEATURES) {
    const nameLower = f.name.toLowerCase();
    const idLower = f.id.toLowerCase();
    if (q.includes(nameLower) || q.includes(idLower)) {
      return f;
    }
  }
  return null;
}

export async function runAgentPipeline(rawQuery = '', sessionContext = {}) {
  const delay = 200 + Math.random() * 200;
  await new Promise(res => setTimeout(res, delay));

  const { currentFeature = null, lastAgentIntent = null } = sessionContext;

  const processed = processQueryInput(rawQuery);
  const intent = detectQueryIntent(processed, currentFeature, lastAgentIntent, sessionContext.activeCategoryId);

  if (intent.type === 'comparison') {
    return compareTwoFeatures(rawQuery);
  }

  if (intent.type === 'category-exploration') {
    // 1. Strict Category Name Match
    const exactCatId = detectCategoryNameFromQuery(rawQuery);
    if (exactCatId) {
      return generateAgentResponse(
        { type: 'category-exploration' },
        null, rawQuery, null, getCategoryWithFeatures(exactCatId)
      );
    }
    
    // 2. Strict Feature Name Match
    const strictFeature = findStrictFeatureMatch(rawQuery);
    if (strictFeature) {
      return generateAgentResponse(
        { type: 'general-feature-question' },
        strictFeature, rawQuery, currentFeature
      );
    }

    // 3. Category Alias Match
    const aliasCatId = detectCategoryAliasFromQuery(rawQuery);
    if (aliasCatId) {
      return generateAgentResponse(
        { type: 'category-exploration' },
        null, rawQuery, null, getCategoryWithFeatures(aliasCatId)
      );
    }

    return generateAgentResponse(intent, null, rawQuery, currentFeature);
  }

  if (intent.type === 'YES_CONFIRM') {
    return generateAgentResponse(
      { type: 'YES_CONFIRM', lastIntent: lastAgentIntent },
      null, rawQuery, currentFeature
    );
  }

  if (intent.type === 'greeting') {
    return generateAgentResponse(intent, null, rawQuery, currentFeature);
  }

  if (intent.type === 'open-tool') {
    return generateAgentResponse(intent, null, rawQuery, currentFeature);
  }

  const followUpIntents = [
    'overview', 'purpose', 'how-it-works',
    'benefits', 'use-cases', 'feature-menu'
  ];

  if (followUpIntents.includes(intent.type)) {
    // 1. Strict Category Name Match
    const exactCatId = detectCategoryNameFromQuery(rawQuery);
    if (exactCatId) {
      return generateAgentResponse(intent, null, rawQuery, null, getCategoryWithFeatures(exactCatId));
    }

    // 2. Strict Feature Match
    const strictFeature = findStrictFeatureMatch(rawQuery);
    if (strictFeature) {
      return generateAgentResponse(intent, strictFeature, rawQuery, currentFeature);
    }

    // 3. Category Alias Match
    const aliasCatId = detectCategoryAliasFromQuery(rawQuery);
    if (aliasCatId) {
      return generateAgentResponse(intent, null, rawQuery, null, getCategoryWithFeatures(aliasCatId));
    }

    // 4. Context Fallback
    if (!currentFeature && sessionContext.activeCategoryId) {
      const cat = CATEGORY_MAP[sessionContext.activeCategoryId];
      if (cat) {
        return generateAgentResponse(intent, null, rawQuery, null, cat);
      }
    }
    const targetFeature = currentFeature || findBestMatchingFeature(rawQuery);
    return generateAgentResponse(intent, targetFeature, rawQuery, currentFeature);
  }

  const matchedFeature = findBestMatchingFeature(rawQuery);
  return generateAgentResponse(
    { type: 'general-feature-question' },
    matchedFeature,
    rawQuery,
    currentFeature
  );
}


// ============================================================================
// REACT COMPONENTS
// ============================================================================

export function SlideInText({ text, className = '' }) {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    setTriggered(false);
    const t = requestAnimationFrame(() => setTriggered(true));
    return () => cancelAnimationFrame(t);
  }, [text]);

  const chars = typeof text === 'string' ? text.split('') : [];

  return (
    <span
      className={`inline-flex flex-wrap justify-center leading-tight ${className}`}
      aria-label={text}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={triggered ? 'slide-in-char' : 'opacity-0 inline-block'}
          style={{
            animationDelay: triggered ? `${i * 28}ms` : '0ms',
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

export function FeatureSearch({ value, onChange, placeholder = "Search features..." }) {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#f8faf7] border border-slate-200 rounded-full py-1.5 pl-8 pr-3 text-xs font-semibold text-[#1e2a52] placeholder-slate-400 focus:outline-none focus:border-[#1e2a52]"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function CategoryItem({ category, onClick }) {
  const IconComp = Icons[category.iconName] || Icons.FolderTree;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#f8faf7] hover:bg-[#e2ead8]/70 border border-slate-200/60 hover:border-[#1e2a52]/40 text-left transition-all cursor-pointer group"
    >
      <div className="w-7 h-7 rounded-lg bg-[#1e2a52]/10 group-hover:bg-[#1e2a52] text-[#1e2a52] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
        <IconComp className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#1e2a52] truncate">{category.name}</h3>
      </div>
      <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
        {category.count}
      </span>
    </button>
  );
}

export function CategoryList({ categories, onSelectCategory }) {
  return (
    <div className="space-y-1.5">
      {categories.map(cat => (
        <CategoryItem
          key={cat.id}
          category={cat}
          onClick={() => onSelectCategory(cat.id)}
        />
      ))}
    </div>
  );
}

export function FeatureList({ features, currentFeatureId, onSelectFeature }) {
  if (!features || features.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-400 font-semibold">
        No matching features found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {features.map(feat => {
        const isSelected = currentFeatureId === feat.id;
        return (
          <button
            key={feat.id}
            onClick={() => onSelectFeature(feat)}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#1e2a52] text-white shadow-xs'
                : 'bg-[#f8faf7] hover:bg-[#e2ead8]/60 text-slate-800 border border-slate-100'
            }`}
          >
            <span className="truncate pr-2">{feat.name}</span>
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
          </button>
        );
      })}
    </div>
  );
}

export function FeatureExplorer({ stats, currentFeatureId, onSelectFeature }) {
  const [searchVal, setSearchVal] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredCategories = useMemo(() => {
    if (!searchVal.trim()) return stats.categories;
    const q = searchVal.toLowerCase();
    return stats.categories.filter(cat => cat.name.toLowerCase().includes(q));
  }, [searchVal, stats.categories]);

  const filteredFeatures = useMemo(() => {
    if (selectedCategory || searchVal.trim()) {
      return executeLocalSearch(searchVal, selectedCategory);
    }
    return [];
  }, [searchVal, selectedCategory]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col max-h-[750px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xs font-black text-[#1e2a52] uppercase tracking-wider">FEATURE EXPLORER</h2>
          <p className="text-[10px] text-slate-500 font-bold">{stats.categoryCount} categories · {stats.featureCount} features</p>
        </div>
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
          >
            All Categories
          </button>
        )}
      </div>

      <FeatureSearch
        value={searchVal}
        onChange={setSearchVal}
        placeholder={selectedCategory ? "Search in category..." : `Search ${stats.featureCount} features...`}
      />

      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-[350px]">
        {selectedCategory || searchVal.trim() ? (
          <FeatureList
            features={filteredFeatures}
            currentFeatureId={currentFeatureId}
            onSelectFeature={onSelectFeature}
          />
        ) : (
          <CategoryList
            categories={filteredCategories}
            onSelectCategory={setSelectedCategory}
          />
        )}
      </div>
    </div>
  );
}

export function ChatSidebar({
  onNewChat,
  onBack,
  stats,
  onCloseMobile,
  onSelectFeature,
  onSelectCategory
}) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  return (
    <div className="ai-sidebar-inner">
      <div className="ai-sidebar-header">
        <div className="flex items-center gap-2.5">
          <div className="ai-sidebar-logo">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-[13px] font-black text-[#1e2a52] leading-tight">Feature AI</div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {stats?.featureCount || 0} tools indexed
            </div>
          </div>
        </div>

        <button
          className="ai-sidebar-close-btn lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="ai-sidebar-actions">
        <button
          id="new-chat-btn"
          className="ai-new-chat-btn"
          onClick={onNewChat}
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {onBack && (
          <button
            className="ai-back-btn"
            onClick={onBack}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        )}
      </div>

      <div className="ai-sidebar-footer">
        <button
          className="ai-browse-features-btn"
          onClick={() => setBrowseOpen(!browseOpen)}
          aria-expanded={browseOpen}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Browse Features</span>
          <span className="ml-auto text-slate-400 text-xs">{browseOpen ? '▲' : '▼'}</span>
        </button>

        {browseOpen && stats?.categories && (
          <div className="ai-browse-categories">
            {stats.categories.map(cat => {
              const isExpanded = activeCategoryId === cat.id;
              const categoryDetails = CATEGORY_MAP[cat.id];
              const subFeatures = categoryDetails?.features || [];

              return (
                <div key={cat.id} className="ai-category-container">
                  <button
                    className={`ai-category-chip ${isExpanded ? 'ai-category-chip--active' : ''}`}
                    onClick={() => {
                      setActiveCategoryId(isExpanded ? null : cat.id);
                      if (onSelectCategory) {
                        onSelectCategory(cat);
                      }
                    }}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 ml-auto shrink-0">{cat.count}</span>
                  </button>

                  <div
                    className={`ai-sub-features-wrapper ${isExpanded ? 'expanded' : ''}`}
                    style={{
                      maxHeight: isExpanded ? `${subFeatures.length * 34}px` : '0px',
                    }}
                  >
                    {subFeatures.map(sub => (
                      <button
                        key={sub.id}
                        className="ai-sub-feature-chip"
                        onClick={() => {
                          if (onSelectFeature) {
                            onSelectFeature(sub);
                          }
                        }}
                      >
                        <span className="truncate">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function PromptSuggestions({ currentFeature, onSelectPrompt }) {
  const NEW_CHAT_CHIPS = [
    { label: 'Compress PDF', query: 'How does Compress PDF work?' },
    { label: 'PDF Security', query: 'Tell me about PDF Security' },
    { label: 'Merge vs Split', query: 'Compare Merge PDF and Split PDF' },
    { label: 'OCR PDF', query: 'What is OCR PDF?' },
    { label: 'E-Sign PDF', query: 'How do I sign a PDF?' },
    { label: 'Remove background', query: 'How to remove image background?' }
  ];

  const FEATURE_CHIPS = () => [
    { label: 'How does it work?', query: 'How does it work?' },
    { label: 'What are the benefits?', query: 'What are the benefits?' },
    { label: 'Use cases?', query: 'What are the use cases?' }
  ];

  const chips = currentFeature ? FEATURE_CHIPS(currentFeature.name) : NEW_CHAT_CHIPS;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
  const visibleChips = isMobile ? chips.slice(0, 4) : chips.slice(0, 5);

  return (
    <div className="prompt-chips-row">
      {visibleChips.map((chip, idx) => (
        <button
          key={idx}
          className="prompt-chip"
          onClick={() => onSelectPrompt && onSelectPrompt(chip.query)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function ChatInput({ onSend, disabled = false, autoFocusTrigger = 0 }) {
  const PLACEHOLDERS = [
    'Tell me what you want to do...',
    'pdf ka size kam karna hai',
    'How does Compress PDF work?',
    'Compare Merge PDF and Split PDF',
    'password lagao pdf mein',
    'Show PDF Security features',
    'What is OCR PDF?',
    'signature kaise kare?',
    'background hatao image se'
  ];

  const [text, setText] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setText(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (!disabled && !isListening) {
      textareaRef.current?.focus();
    }
  }, [disabled, autoFocusTrigger, isListening]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isListening) {
        setPlaceholderIdx(prev => (prev + 1) % PLACEHOLDERS.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isListening]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [text]);

  const handleSubmit = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    }
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setText('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Recognition already started', err);
      }
    }
  };

  return (
    <div className="chat-input-wrap">
      <div className={`chat-input-bar ${disabled ? 'chat-input-bar--disabled' : ''} ${isListening ? 'chat-input-bar--listening' : ''}`}>
        <Sparkles className={`chat-input-icon ${isListening ? 'animate-pulse text-indigo-500' : ''}`} />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : PLACEHOLDERS[placeholderIdx]}
          disabled={disabled || isListening}
          className="chat-input-textarea"
          rows={1}
          aria-label="Message input"
          aria-describedby="chat-input-hint"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {recognitionRef.current && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              className={`chat-voice-btn ${isListening ? 'chat-voice-btn--active' : ''}`}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
              title="Voice Assistant"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || disabled}
            className="chat-send-btn"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p id="chat-input-hint" className="chat-input-hint hidden sm:block">
        {isListening ? 'Speak now... Click mic or Enter to send' : 'Enter to send · Shift+Enter for new line'}
      </p>
    </div>
  );
}

export function UserMessage({ message }) {
  return (
    <div className="msg-user-wrap">
      <div className="max-w-[80%] sm:max-w-[75%] bg-[#1e2a52] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
        <p className="text-sm sm:text-[15px] font-semibold leading-relaxed whitespace-pre-wrap">{message.text}</p>
        <span className="text-[10px] block text-right mt-1 text-slate-300/80">{message.timestamp}</span>
      </div>
    </div>
  );
}

function FollowUpChips({ chips, onSend }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div className="msg-followup-chips">
      {chips.map((chip, i) => (
        <button
          key={i}
          className="msg-followup-chip"
          onClick={() => onSend && onSend(chip.query)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function OpenToolButton({ feature, onLaunchTool, compact = false }) {
  if (!onLaunchTool) return null;
  return (
    <button
      onClick={() => onLaunchTool(feature)}
      className={`flex items-center gap-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs hover:shadow-md cursor-pointer ${
        compact
          ? 'px-3 py-1.5 rounded-lg text-xs'
          : 'px-4 py-2 rounded-xl text-sm mt-3 w-fit'
      }`}
    >
      <span>Open Tool</span>
      <ExternalLink className="w-3.5 h-3.5" />
    </button>
  );
}

const MarkdownText = ({ text }) => {
  if (!text) return null;
  let cleaned = text
    .replace(/\*{3,}/g, '**')
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/^\s*\*\s+/g, '- ');

  return (
    <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-p:mb-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {cleaned}
      </ReactMarkdown>
    </div>
  );
};

const TypewriterMarkdown = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i += 3;
      if (i > text.length) {
        setDisplayedText(text);
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <MarkdownText text={displayedText} />;
};

const CategoryFeaturesList = ({ features, onSelectFeature }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!features || features.length === 0) return null;
  
  const displayed = expanded ? features : features.slice(0, 8);
  const hiddenCount = features.length - 8;
  
  return (
    <div className="msg-category-features">
      {displayed.map((f, i) => (
        <button
          key={i}
          className="msg-category-feature-chip"
          onClick={() => onSelectFeature && onSelectFeature(f)}
        >
          {f.name}
        </button>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button 
          className="msg-category-more" 
          onClick={() => setExpanded(true)}
          style={{ cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
};

function renderResponseContent(resp, onSelectFeature, onLaunchTool, onSend) {
  const feature = resp.feature;
  switch (resp.type) {
    case 'feature_card':
      return feature ? (
        <div className="msg-feature-card">
          <div className="msg-feature-header">
            <div>
              <h3 className="msg-feature-name">{feature.name}</h3>
              <span className="msg-feature-section">{feature.sectionName}</span>
            </div>
            <OpenToolButton feature={feature} onLaunchTool={onLaunchTool} compact />
          </div>
          <div className="msg-feature-overview"><MarkdownText text={feature.overview} /></div>
        </div>
      ) : null;
    case 'feature_overview':
      return feature ? (
        <div className="msg-feature-card">
          <div className="msg-feature-header">
            <div>
              <h3 className="msg-feature-name">{feature.name}</h3>
              <span className="msg-feature-section">{feature.sectionName}</span>
            </div>
            <OpenToolButton feature={feature} onLaunchTool={onLaunchTool} compact />
          </div>
          <div className="msg-feature-overview"><MarkdownText text={feature.overview} /></div>
          <div className="msg-feature-purpose"><MarkdownText text={feature.purpose} /></div>
        </div>
      ) : null;
    case 'feature_purpose':
      return feature ? (
        <div className="msg-feature-card">
          <div className="msg-section-header">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="msg-section-title">Purpose</span>
          </div>
          <div className="msg-feature-overview"><MarkdownText text={feature.purpose} /></div>
          <OpenToolButton feature={feature} onLaunchTool={onLaunchTool} />
        </div>
      ) : null;
    case 'feature_workflow':
      return feature ? (
        <div className="bg-white border border-[#d2dcc8] rounded-[22px] p-4 flex flex-col gap-3.5 shadow-sm max-w-full">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[12px] font-extrabold text-[#1e2a52] uppercase tracking-wider">How It Works</span>
          </div>
          <ol className="flex flex-col gap-2.5 list-none p-0 m-0">
            {(feature.howItWorks || []).map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[14px] text-slate-600 leading-relaxed">
                <span className="w-6 h-6 rounded-full bg-[#1e2a52] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="prose-p:m-0 flex-1 min-w-0"><MarkdownText text={step} /></div>
              </li>
            ))}
          </ol>
        </div>
      ) : null;
    case 'feature_benefits':
      return feature ? (
        <div className="bg-white border border-[#d2dcc8] rounded-[22px] p-4 flex flex-col gap-3.5 shadow-sm max-w-full">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[12px] font-extrabold text-[#1e2a52] uppercase tracking-wider">Key Benefits</span>
          </div>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {(feature.benefits || []).map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-slate-600 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                <div className="prose-p:m-0 flex-1 min-w-0"><MarkdownText text={b} /></div>
              </li>
            ))}
          </ul>
        </div>
      ) : null;
    case 'feature_usecases':
      return feature ? (
        <div className="bg-white border border-[#d2dcc8] rounded-[22px] p-4 flex flex-col gap-3.5 shadow-sm max-w-full">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="text-[12px] font-extrabold text-[#1e2a52] uppercase tracking-wider">Use Cases</span>
          </div>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {(feature.useCases || []).map((uc, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-slate-600 leading-relaxed">
                <ChevronRight className="w-4 h-4 text-purple-500 shrink-0 mt-1" />
                <div className="prose-p:m-0 flex-1 min-w-0"><MarkdownText text={uc} /></div>
              </li>
            ))}
          </ul>
        </div>
      ) : null;
    case 'feature_menu':
      return feature ? (
        <div className="msg-feature-card">
          <div className="msg-section-header">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="msg-section-title">Available Options</span>
          </div>
          <div className="msg-menu-grid">
            {(feature.featureMenu || []).map((item, i) => (
              <div key={i} className="msg-menu-item">
                <span className="msg-menu-name">{item.name}</span>
                <span className="msg-menu-desc">{item.desc}</span>
              </div>
            ))}
          </div>
          <OpenToolButton feature={feature} onLaunchTool={onLaunchTool} />
        </div>
      ) : null;
    case 'comparison':
      return resp.featureA && resp.featureB ? (
        <div className="msg-comparison-wrap">
          <div className="msg-section-header">
            <GitCompare className="w-4 h-4 text-blue-600" />
            <span className="msg-section-title">{resp.featureA.name} vs {resp.featureB.name}</span>
          </div>
          <div className="msg-comparison-grid">
            <div className="msg-comparison-col msg-comparison-col--a">
              <h4 className="msg-comp-name">{resp.featureA.name}</h4>
              <div className="msg-comp-overview"><MarkdownText text={resp.featureA.overview} /></div>
              {resp.featureA.benefits?.slice(0, 2).map((b, i) => (
                <div key={i} className="msg-comp-bullet">
                  <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                  <span><MarkdownText text={b} /></span>
                </div>
              ))}
              <OpenToolButton feature={resp.featureA} onLaunchTool={onLaunchTool} />
            </div>
            <div className="msg-comparison-col msg-comparison-col--b">
              <h4 className="msg-comp-name msg-comp-name--b">{resp.featureB.name}</h4>
              <div className="msg-comp-overview"><MarkdownText text={resp.featureB.overview} /></div>
              {resp.featureB.benefits?.slice(0, 2).map((b, i) => (
                <div key={i} className="msg-comp-bullet">
                  <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                  <span><MarkdownText text={b} /></span>
                </div>
              ))}
              <OpenToolButton feature={resp.featureB} onLaunchTool={onLaunchTool} />
            </div>
          </div>
        </div>
      ) : null;
    case 'category_exploration':
      return resp.category ? (
        <div className="msg-feature-card">
          <div className="msg-section-header">
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            <span className="msg-section-title">{resp.category.name} — {resp.category.count} tools</span>
          </div>
          {resp.category.overview && (
            <div className="msg-feature-overview"><MarkdownText text={resp.category.overview} /></div>
          )}
          {resp.category.purpose && (
            <div className="msg-feature-purpose"><MarkdownText text={resp.category.purpose} /></div>
          )}
          <CategoryFeaturesList 
            features={resp.category.features} 
            onSelectFeature={onSelectFeature} 
          />
          <OpenToolButton
            feature={{ name: resp.category.name, sectionId: resp.category.id }}
            onLaunchTool={onLaunchTool}
          />
        </div>
      ) : null;
    case 'all_categories':
      return resp.categories ? (
        <div className="msg-feature-card">
          <div className="msg-all-categories">
            {resp.categories.map((cat, i) => (
              <button
                key={i}
                className="msg-all-cat-item"
                onClick={() => onSend && onSend(`Tell me about ${cat.name}`)}
              >
                <span className="msg-all-cat-name">{cat.name}</span>
                <span className="msg-all-cat-count">{cat.count} tools</span>
              </button>
            ))}
          </div>
        </div>
      ) : null;
    case 'no_result':
      return (
        <div className="msg-no-result">
          <div className="msg-section-header">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="msg-section-title">Try one of these instead:</span>
          </div>
          <p className="msg-no-result-hint">
            Describe what you want to do, and I'll find the right tool.
          </p>
          {resp.alternatives && resp.alternatives.length > 0 && (
            <div className="msg-alternatives">
              {resp.alternatives.map((alt, i) => (
                <button
                  key={i}
                  className="msg-alternative-btn"
                  onClick={() => onSelectFeature && onSelectFeature(alt)}
                >
                  {alt.name}
                  <ArrowRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

export function AssistantMessage({ message, onSelectFeature, onLaunchTool, onSend }) {
  const resp = message.responseObj;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="msg-assistant-wrap animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="msg-assistant-bubble relative group">
        <div className="msg-assistant-avatar">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="msg-assistant-text">
          <TypewriterMarkdown text={message.text} />
        </div>
        <span className="msg-timestamp">{message.timestamp}</span>

        <div className="absolute -bottom-8 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Copy text">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Helpful">
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Not helpful">
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-8">
        {resp && renderResponseContent(resp, onSelectFeature, onLaunchTool, onSend)}
      </div>

      {resp?.followUpChips && resp.followUpChips.length > 0 && (
        <FollowUpChips chips={resp.followUpChips} onSend={onSend} />
      )}
    </div>
  );
}

export function TypingIndicator() {
  return <LoadingState />;
}

export function ChatWindow({
  chatLog,
  isFinding,
  featureCount,
  onSend,
  onClear,
  onSelectSample,
  onSelectFeature,
  onLaunchTool,
  currentFeature,
  autoFocusTrigger = 0
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isFinding]);

  const hasMessages = chatLog && chatLog.length > 0;

  return (
    <div className="chat-window">
      <div className="chat-window-topbar">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#1e2a52] flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
          <div>
            <span className="text-xs font-black text-[#1e2a52] uppercase tracking-wider">
              {currentFeature ? currentFeature.name : 'AI Feature Assistant'}
            </span>
            {!currentFeature && (
              <span className="text-[10px] text-slate-500 font-semibold block">
                {featureCount} features indexed · No API · 100% local
              </span>
            )}
          </div>
        </div>

        {hasMessages && (
          <button
            className="chat-clear-btn"
            onClick={onClear}
            title="Clear conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Clear</span>
          </button>
        )}
      </div>

      <div className="chat-messages-area">
        {!hasMessages && !isFinding ? (
          <EmptyState onSelectSample={onSelectSample} />
        ) : (
          <>
            {chatLog.map(msg => (
              <React.Fragment key={msg.id}>
                {msg.sender === 'user' ? (
                  <UserMessage message={msg} />
                ) : (
                  <AssistantMessage
                     message={msg}
                     onSelectFeature={onSelectFeature}
                     onLaunchTool={onLaunchTool}
                     onSend={onSend}
                  />
                )}
              </React.Fragment>
            ))}
            {isFinding && (
              <div className="msg-assistant-wrap">
                <div className="msg-assistant-bubble">
                  <div className="msg-assistant-avatar">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="chat-input-section">
        <PromptSuggestions
          currentFeature={currentFeature}
          onSelectPrompt={onSend}
        />
        <ChatInput
          onSend={onSend}
          disabled={isFinding}
          autoFocusTrigger={autoFocusTrigger}
        />
      </div>
    </div>
  );
}

const SAMPLE_QUESTIONS = [
  { text: 'How does Compress PDF work?', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100/50' },
  { text: 'Compare Merge PDF and Split PDF', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-100/50' },
  { text: 'Show PDF Security features', icon: Lock, color: 'text-emerald-500', bg: 'bg-emerald-100/50' },
  { text: 'What is OCR PDF?', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-100/50' }
];

export function EmptyState({ onSelectSample }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in duration-500">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-xl shadow-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-100">
        <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 animate-pulse" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-3 text-center tracking-tight">
        How can I help you today?
      </h2>

      <p className="text-sm sm:text-base text-slate-500 text-center max-w-md mb-10 leading-relaxed">
        I'm your AI Assistant. You can ask me to explain tools, compare features, or even launch them directly for you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {SAMPLE_QUESTIONS.map((q, idx) => {
          const Icon = q.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectSample && onSelectSample(q.text)}
              className="flex items-start gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm hover:shadow-md hover:bg-white hover:-translate-y-1 transition-all duration-300 text-left group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${q.bg}`}>
                <Icon className={`w-5 h-5 ${q.color} group-hover:scale-110 transition-transform duration-300`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">
                  {q.text}
                </h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-1">
                  Click to ask AI Assistant
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }) {
  return (
    <div className="text-center py-12 px-4 bg-red-50/60 border border-red-200 rounded-3xl">
      <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
      <h4 className="text-sm font-bold text-red-800 mb-1">Something went wrong while preparing the response.</h4>
      <button
        onClick={onRetry}
        className="mt-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-600 bg-blue-50 px-4 sm:px-5 py-3 rounded-2xl w-max animate-pulse border border-blue-200">
      <Sparkles className="w-4 h-4 text-blue-600" />
      <span>✨ Finding the best answer...</span>
    </div>
  );
}

export function NoResultState({ onReset }) {
  const stats = getDynamicStats();
  return (
    <div className="text-center py-16 px-4 bg-[#f8faf7] rounded-3xl border border-slate-200/80">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7" />
      </div>
      <h4 className="text-lg font-bold text-[#1e2a52] mb-1.5">I couldn't find that feature in this catalog.</h4>
      <p className="text-xs sm:text-sm text-slate-500 mb-5 max-w-md mx-auto">Try searching for a tool name or category (e.g. "Compress PDF", "PDF Security", "Image Processing").</p>
      <button
        onClick={onReset}
        className="bg-[#1e2a52] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-full cursor-pointer hover:bg-[#16203e]"
      >
        Browse All {stats.featureCount} Features
      </button>
    </div>
  );
}

export function AIAgentHeader({ stats, onBack }) {
  useAgentStyles();
  return (
    <>
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pt-4 pb-2 flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-[#1e2a52] font-bold px-4 py-2 rounded-full shadow-xs border border-slate-200 hover:shadow-md transition-all cursor-pointer text-xs sm:text-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#1e2a52]" />
            <span>Back to Dashboard</span>
          </button>
        )}

        <div className="inline-flex items-center gap-2 bg-[#e2ead8] border border-[#c8d4bd] px-4 py-1.5 rounded-full text-xs font-bold text-[#1e2a52] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span>{stats.categoryCount} Categories · {stats.featureCount} Features</span>
        </div>
      </div>

      <section className="text-center px-4 pt-4 pb-6 select-none max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-blue-600 mb-3 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>AI FEATURE ASSISTANT</span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#1e2a52] tracking-tight leading-tight">
          <SlideInText text="Understand Every Tool. Instantly." />
        </h1>

        <p className="mt-2 text-xs sm:text-sm md:text-base font-semibold text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Ask about any PDF, document, image, security, signature, AI, or productivity feature and get a clear explanation in seconds.
        </p>

        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mt-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>● Ready</span>
        </div>
      </section>
    </>
  );
}

export function AIAgentLayout({
  chatLog,
  currentFeature,
  isFinding,
  onSend,
  onClear,
  onSelectSample,
  onSelectFeature,
  onLaunchTool,
  stats,
  autoFocusTrigger,
  onNewChat,
  onBack
}) {
  useAgentStyles();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleNewChat = useCallback(() => {
    onNewChat();
    if (window.innerWidth < 1024) closeSidebar();
  }, [onNewChat, closeSidebar]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && sidebarOpen) closeSidebar();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="ai-layout-root">
      <div
        className={`ai-sidebar-overlay ${sidebarOpen ? 'ai-sidebar-overlay--open' : ''}`}
        onClick={closeSidebar}
        aria-label="Close sidebar"
      />

      <aside className={`ai-sidebar ${sidebarOpen ? 'ai-sidebar--open' : ''}`}>
        <ChatSidebar
          onNewChat={handleNewChat}
          onBack={onBack}
          stats={stats}
          onCloseMobile={closeSidebar}
          onSelectFeature={onSelectFeature}
        />
      </aside>

      <main className="ai-main">
        <div className="ai-mobile-topbar">
          <button
            className="ai-hamburger-btn"
            onClick={openSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ai-mobile-title">
            <span className="text-sm font-bold text-[#1e2a52]">✨ AI Feature Assistant</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="ai-chat-area">
          <ChatWindow
            chatLog={chatLog}
            isFinding={isFinding}
            featureCount={stats?.featureCount || 0}
            onSend={onSend}
            onClear={onClear}
            onSelectSample={onSelectSample}
            onSelectFeature={onSelectFeature}
            onLaunchTool={onLaunchTool}
            currentFeature={currentFeature}
            autoFocusTrigger={autoFocusTrigger}
          />
        </div>
      </main>
    </div>
  );
}


// ============================================================================
// STATE MANAGEMENT & CUSTOM HOOKS
// ============================================================================

export function useFeatureSearch(categoryFilter = null) {
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = useMemo(() => {
    return executeLocalSearch(searchTerm, categoryFilter);
  }, [searchTerm, categoryFilter]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults
  };
}

export function useFeatureContext(initialFeature = null) {
  const [activeFeature, setActiveFeature] = useState(initialFeature);

  return {
    activeFeature,
    setActiveFeature,
    clearFeatureContext: () => setActiveFeature(null)
  };
}

export function useConversation() {
  const [messages, setMessages] = useState([]);

  const addMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return { messages, setMessages, addMessage, clearMessages };
}

export function useChat() {
  const [chatLog, setChatLog] = useState([]);
  const [currentFeature, setCurrentFeature] = useState(null);
  const [isFinding, setIsFinding] = useState(false);

  const sessionContextRef = useRef({
    activeCategoryId: null,
    activeFeatureId: null,
    currentFeature: null,
    lastAgentIntent: null
  });

  const chatLogRef = useRef([]);

  const updateCurrentFeature = useCallback((feature) => {
    setCurrentFeature(feature);
    if (feature) {
      sessionContextRef.current.activeFeatureId = feature.id;
      sessionContextRef.current.currentFeature = feature;
      sessionContextRef.current.activeCategoryId = null;
    } else {
      sessionContextRef.current.activeFeatureId = null;
      sessionContextRef.current.currentFeature = null;
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text || !text.trim()) return;

    setIsFinding(true);

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedLog = [...chatLogRef.current, userMsg];
    chatLogRef.current = updatedLog;
    setChatLog([...updatedLog]);

    const recentMessages = chatLogRef.current.slice(-10).map(m => ({
      role: m.sender,
      content: m.text
    }));

    const response = await runAgentPipeline(text.trim(), {
      ...sessionContextRef.current,
      recentMessages
    });

    setIsFinding(false);

    if (response.feature) {
      updateCurrentFeature(response.feature);
    } else if (response.featureA) {
      updateCurrentFeature(response.featureA);
    } else if (response.category) {
      sessionContextRef.current.activeCategoryId = response.category.id;
      updateCurrentFeature(null);
    }

    const newLastIntent = response.nextSuggestion || response.type || null;
    sessionContextRef.current.lastAgentIntent = newLastIntent;

    const agentMsg = {
      id: `a_${Date.now()}`,
      sender: 'agent',
      text: response.text,
      responseObj: response,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const finalLog = [...chatLogRef.current, agentMsg];
    chatLogRef.current = finalLog;
    setChatLog([...finalLog]);
  }, [updateCurrentFeature]);

  const clearChat = useCallback(() => {
    chatLogRef.current = [];
    setChatLog([]);
    updateCurrentFeature(null);
    sessionContextRef.current = {
      activeCategoryId: null,
      activeFeatureId: null,
      currentFeature: null,
      lastAgentIntent: null
    };
  }, [updateCurrentFeature]);

  return {
    chatLog,
    currentFeature,
    setCurrentFeature: updateCurrentFeature,
    isFinding,
    sendMessage,
    clearChat
  };
}

export function useAIAgent() {
  const stats = useMemo(() => getDynamicStats(), []);
  const [autoFocusTrigger, setAutoFocusTrigger] = useState(0);

  const chat = useChat();

  const handleNewChat = useCallback(() => {
    chat.clearChat();
    setAutoFocusTrigger(t => t + 1);
  }, [chat]);

  const handleSelectFeature = useCallback((feature) => {
    chat.setCurrentFeature(feature);
    chat.sendMessage(`Tell me about ${feature.name}`);
  }, [chat]);

  return {
    stats,
    chatLog: chat.chatLog,
    currentFeature: chat.currentFeature,
    isFinding: chat.isFinding,
    sendMessage: chat.sendMessage,
    clearChat: chat.clearChat,
    setCurrentFeature: chat.setCurrentFeature,
    autoFocusTrigger,

    conversations: [],
    grouped: { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] },
    activeConversationId: null,
    searchQuery: '',
    isHistoryLoading: false,
    handleNewChat,
    handleOpenChat: () => {},
    handleRename: () => {},
    handleDeleteChat: () => {},
    handleSearch: () => {},
    handleSelectFeature
  };
}


// ============================================================================
// FLOATING AGENT WIDGET
// ============================================================================


const WIDGET_CSS = `
  .aw-trigger {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    background: #1e2a52; color: #fff; border: none; border-radius: 50px;
    padding: 13px 20px 13px 16px; cursor: pointer;
    box-shadow: 0 8px 32px rgba(30,42,82,0.32), 0 2px 8px rgba(0,0,0,0.12);
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    font-family: inherit; user-select: none;
  }
  .aw-trigger:hover {
    background: #16203e; box-shadow: 0 12px 40px rgba(30,42,82,0.44);
    transform: translateY(-2px) scale(1.03);
  }
  .aw-trigger-icon {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(16,185,129,0.4); flex-shrink: 0;
  }
  .aw-trigger-label { font-size: 14px; font-weight: 700; letter-spacing: 0.01em; white-space: nowrap; }
  .aw-trigger-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #10B981;
    animation: aw-pulse 2s ease-in-out infinite; flex-shrink: 0;
  }
  @keyframes aw-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }
  .aw-panel {
    position: fixed; bottom: 100px; right: 28px; z-index: 9998;
    width: 520px; max-width: calc(100vw - 32px);
    height: 680px; max-height: calc(100vh - 130px);
    background: #fff; border-radius: 20px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(30,42,82,0.14);
    display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid rgba(30,42,82,0.1);
    transform-origin: bottom right;
    transition: opacity 0.22s cubic-bezier(0.16,1,0.3,1), transform 0.22s cubic-bezier(0.16,1,0.3,1);
    overscroll-behavior: contain;
  }
  .aw-panel--closed { opacity: 0; transform: scale(0.88) translateY(16px); pointer-events: none; }
  .aw-panel--open { opacity: 1; transform: scale(1) translateY(0); pointer-events: all; }
  .aw-header {
    background: linear-gradient(135deg, #1e2a52 0%, #16203e 100%);
    padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .aw-header-avatar {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #10B981, #059669);
    border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .aw-header-info { flex: 1; min-width: 0; }
  .aw-header-title { font-size: 13px; font-weight: 800; color: #fff; line-height: 1.2; }
  .aw-header-sub { font-size: 10px; color: rgba(255,255,255,0.6); font-weight: 600; margin-top: 1px; }
  .aw-header-actions { display: flex; align-items: center; gap: 4px; }
  .aw-header-btn {
    width: 30px; height: 30px; background: rgba(255,255,255,0.08);
    border: none; border-radius: 8px; color: rgba(255,255,255,0.75); cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .aw-header-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }
  .aw-quick-row {
    display: flex; align-items: center; gap: 6px; padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9; overflow-x: auto; flex-shrink: 0; scrollbar-width: none;
  }
  .aw-quick-row::-webkit-scrollbar { display: none; }
  .aw-quick-label {
    font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;
    letter-spacing: 0.06em; white-space: nowrap; flex-shrink: 0;
  }
  .aw-quick-chip {
    padding: 4px 10px; background: #f1f5f9; border: 1px solid #e2e8f0;
    border-radius: 50px; font-size: 11px; font-weight: 700; color: #1e2a52;
    cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s;
  }
  .aw-quick-chip:hover { background: #1e2a52; color: #fff; border-color: #1e2a52; }
  .aw-messages {
    flex: 1; overflow-y: auto; padding: 14px 12px;
    display: flex; flex-direction: column; gap: 12px;
    scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent;
    overscroll-behavior: contain;
  }
  .aw-messages::-webkit-scrollbar { width: 4px; }
  .aw-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
  .aw-msg-user { display: flex; justify-content: flex-end; }
  .aw-msg-user-bubble {
    max-width: 80%; background: #1e2a52; color: #fff;
    border-radius: 16px 16px 4px 16px; padding: 10px 14px;
    font-size: 13px; font-weight: 600; line-height: 1.5;
  }
  .aw-msg-agent { display: flex; align-items: flex-start; gap: 8px; }
  .aw-msg-agent-avatar {
    width: 28px; height: 28px;
    background: linear-gradient(135deg, #10B981, #059669);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 2px;
  }
  .aw-msg-agent-bubble {
    flex: 1; background: #f8fafc; border: 1px solid #e2e8f0;
    border-radius: 4px 16px 16px 16px; padding: 10px 14px;
    font-size: 13px; color: #334155; line-height: 1.6; font-weight: 500;
  }
  .aw-typing { display: flex; align-items: center; gap: 4px; padding: 4px 0; }
  .aw-typing span {
    width: 6px; height: 6px; border-radius: 50%; background: #10B981;
    animation: aw-bounce 1.2s ease-in-out infinite;
  }
  .aw-typing span:nth-child(2) { animation-delay: 0.2s; }
  .aw-typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes aw-bounce {
    0%, 100% { transform: translateY(0); opacity: 0.5; }
    50% { transform: translateY(-5px); opacity: 1; }
  }
  .aw-feature-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
    padding: 10px 12px; margin-top: 8px;
  }
  .aw-feature-name { font-size: 13px; font-weight: 800; color: #1e2a52; margin-bottom: 4px; }
  .aw-feature-desc { font-size: 11px; color: #64748b; font-weight: 500; line-height: 1.5; }
  .aw-open-btn {
    display: inline-flex; align-items: center; gap: 5px; margin-top: 8px;
    padding: 5px 12px; background: #1e2a52; color: #fff;
    border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;
    border: none; transition: background 0.15s;
  }
  .aw-open-btn:hover { background: #16203e; }
  .aw-followup-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .aw-followup-chip {
    padding: 4px 10px; background: #eff6ff; border: 1px solid #bfdbfe;
    border-radius: 50px; font-size: 11px; font-weight: 700; color: #1d4ed8;
    cursor: pointer; transition: all 0.15s;
  }
  .aw-followup-chip:hover { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
  .aw-featured-title {
    font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;
    letter-spacing: 0.06em; margin-bottom: 8px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .aw-featured-view-all {
    font-size: 10px; font-weight: 700; color: #1e2a52; cursor: pointer;
    background: none; border: none; display: flex; align-items: center; gap: 2px; padding: 0;
  }
  .aw-featured-view-all:hover { text-decoration: underline; }
  .aw-featured-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .aw-featured-card {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
    padding: 8px 10px; cursor: pointer;
    display: flex; align-items: center; justify-content: space-between; gap: 6px;
    transition: all 0.15s;
  }
  .aw-featured-card:hover { background: #1e2a52; border-color: #1e2a52; }
  .aw-featured-card:hover .aw-fc-name { color: #fff; }
  .aw-featured-card:hover .aw-fc-sub { color: rgba(255,255,255,0.6); }
  .aw-featured-card:hover .aw-fc-arrow { color: #fff; }
  .aw-fc-name { font-size: 11px; font-weight: 700; color: #1e2a52; line-height: 1.3; }
  .aw-fc-sub { font-size: 9px; font-weight: 600; color: #94a3b8; margin-top: 1px; }
  .aw-fc-arrow { color: #94a3b8; flex-shrink: 0; }
  .aw-input-wrap {
    padding: 10px 12px; border-top: 1px solid #f1f5f9; background: #fff; flex-shrink: 0;
  }
  .aw-input-bar {
    display: flex; align-items: flex-end; gap: 8px; background: #f8fafc;
    border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 8px 10px; transition: border-color 0.15s;
  }
  .aw-input-bar:focus-within { border-color: #1e2a52; background: #fff; }
  .aw-input-bar--listening { border-color: #6366f1; background: #eef2ff; }
  .aw-textarea {
    flex: 1; border: none; background: transparent; font-size: 13px; font-weight: 500;
    color: #1e293b; resize: none; outline: none; font-family: inherit;
    line-height: 1.5; max-height: 100px; min-height: 20px;
  }
  .aw-textarea::placeholder { color: #94a3b8; }
  .aw-send-btn {
    width: 32px; height: 32px; background: #1e2a52; border: none; border-radius: 9px;
    color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s;
  }
  .aw-send-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
  .aw-send-btn:not(:disabled):hover { background: #16203e; }
  .aw-voice-btn {
    width: 32px; height: 32px; background: transparent; border: none;
    color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; flex-shrink: 0; transition: all 0.15s;
  }
  .aw-voice-btn:hover { background: #f1f5f9; color: #1e2a52; }
  .aw-voice-btn--active { color: #6366f1; background: #eef2ff; }
  .aw-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100%; padding: 20px; text-align: center;
  }
  .aw-empty-icon {
    width: 48px; height: 48px;
    background: linear-gradient(135deg, #e0f2fe, #bae6fd);
    border-radius: 16px; display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
  }
  .aw-empty-title { font-size: 15px; font-weight: 800; color: #1e2a52; margin-bottom: 6px; }
  .aw-empty-sub {
    font-size: 12px; color: #64748b; font-weight: 500; line-height: 1.5; max-width: 260px;
  }
  @media (max-width: 480px) {
    .aw-panel { right: 12px; bottom: 90px; width: calc(100vw - 24px); height: calc(100vh - 120px); }
    .aw-trigger { right: 16px; bottom: 20px; padding: 11px 16px 11px 13px; }
  }
`;

function injectWidgetStyles() {
  if (document.getElementById("aw-styles")) return;
  const el = document.createElement("style");
  el.id = "aw-styles";
  el.innerHTML = WIDGET_CSS;
  document.head.appendChild(el);
}

const QUICK_FEATURE_IDS = ["compress-pdf", "pdf-password-protect", "merge-pdf", "split-pdf"];

function FeatureCard({ feature, onLaunch }) {
  if (!feature) return null;
  return (
    <div className="aw-feature-card">
      <div className="aw-feature-name">{feature.name}</div>
      <div className="aw-feature-desc">{feature.description || (feature.overview || "").slice(0, 100)}</div>
      {onLaunch && (
        <button className="aw-open-btn" onClick={() => onLaunch(feature)}>
          Open Tool <ExternalLink style={{ width: 11, height: 11 }} />
        </button>
      )}
    </div>
  );
}

function MessageBubble({ msg, onSend, onLaunch, onSelectFeature }) {
  if (msg.sender === 'user') {
    return (
      <div className="aw-msg-user">
        <div className="aw-msg-user-bubble">{msg.text}</div>
      </div>
    );
  }
  const resp = msg.responseObj;
  return (
    <div className="aw-msg-agent">
      <div className="aw-msg-agent-avatar">
        <Sparkles style={{ width: 13, height: 13, color: '#fff' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="aw-msg-agent-bubble">
          <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-p:mb-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.text || ''}
            </ReactMarkdown>
          </div>
        </div>
        {resp && (
          <div style={{ marginTop: 8 }}>
            {renderResponseContent(resp, onSelectFeature, onLaunch, onSend)}
          </div>
        )}
        {resp?.followUpChips?.length > 0 && (
          <div className="aw-followup-chips">
            {resp.followUpChips.map((chip, i) => (
              <button key={i} className="aw-followup-chip" onClick={() => onSend(chip.query)}>
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentWidget({ onNavigateToCategory, onNavigateToTool }) {
  useAgentStyles();
  useEffect(() => { injectWidgetStyles(); }, []);

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const stats = getDynamicStats();
  const agent = useAIAgent();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const quickFeatures = QUICK_FEATURE_IDS
    .map(id => searchFeatures(id)[0])
    .filter(Boolean)
    .slice(0, 4);

  const quickChips = stats.categories.slice(0, 6);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-IN";
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setText(t); };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
  }, []);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agent.chatLog, agent.isFinding, open]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && panelRef.current && !panelRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || agent.isFinding) return;
    agent.sendMessage(trimmed);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, agent]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); }
    else { setText(""); try { recognitionRef.current?.start(); } catch {} }
  };

  const handleLaunchTool = (feature) => {
    if (!feature) return;
    if (feature.sectionId && onNavigateToCategory) onNavigateToCategory(feature.sectionId);
    if (feature.id && onNavigateToTool) onNavigateToTool(feature.id);
    setOpen(false);
  };

  const handleSelectFeature = (feature) => { agent.sendMessage(`Tell me about ${feature.name}`); };
  const hasMessages = agent.chatLog.length > 0;

  return (
    <>
      <div ref={panelRef} className={`aw-panel ${open ? "aw-panel--open" : "aw-panel--closed"}`}>
        <div className="aw-header">
          <div className="aw-header-avatar">
            <Sparkles style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <div className="aw-header-info">
            <div className="aw-header-title">AI Feature Assistant</div>
            <div className="aw-header-sub">{stats.featureCount} tools indexed · 100% local</div>
          </div>
          <div className="aw-header-actions">
            <button className="aw-header-btn" onClick={() => agent.clearChat()} title="New chat">
              <RotateCcw style={{ width: 14, height: 14 }} />
            </button>
            <button className="aw-header-btn" onClick={() => setOpen(false)} title="Close">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        <div className="aw-quick-row">
          <span className="aw-quick-label">Quick:</span>
          {quickChips.map((cat) => (
            <button key={cat.id} className="aw-quick-chip"
              onClick={() => agent.sendMessage(`Tell me about ${cat.name}`)}>
              {cat.name.replace("PDF ", "").replace(" PDF", "")}
            </button>
          ))}
        </div>

        <div className="aw-messages">
          {!hasMessages ? (
            <div className="aw-empty">
              <div className="aw-empty-icon">
                <Sparkles style={{ width: 22, height: 22, color: "#0ea5e9" }} />
              </div>
              <div className="aw-empty-title">How can I help you?</div>
              <div className="aw-empty-sub">
                Ask me about any PDF tool, compare features, or let me launch one for you.
              </div>
              {quickFeatures.length > 0 && (
                <div style={{ width: "100%", marginTop: 16 }}>
                  <div className="aw-featured-title">
                    <span>FEATURED QUICK CARDS</span>
                    <button className="aw-featured-view-all" onClick={() => agent.sendMessage("Show all features")}>
                      View All {stats.featureCount} <ChevronRight style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                  <div className="aw-featured-grid">
                    {quickFeatures.map((feat) => (
                      <button key={feat.id} className="aw-featured-card" onClick={() => handleSelectFeature(feat)}>
                        <div>
                          <div className="aw-fc-name">{feat.name}</div>
                          <div className="aw-fc-sub">{feat.sectionName || ""}</div>
                        </div>
                        <ChevronRight className="aw-fc-arrow" style={{ width: 13, height: 13 }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {agent.chatLog.map((msg) => (
                <MessageBubble key={msg.id} msg={msg}
                  onSend={agent.sendMessage} onLaunch={handleLaunchTool} onSelectFeature={handleSelectFeature} />
              ))}
              {agent.isFinding && (
                <div className="aw-msg-agent">
                  <div className="aw-msg-agent-avatar">
                    <Sparkles style={{ width: 13, height: 13, color: "#fff" }} />
                  </div>
                  <div className="aw-msg-agent-bubble">
                    <div className="aw-typing"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="aw-input-wrap">
          <div className={`aw-input-bar${isListening ? " aw-input-bar--listening" : ""}`}>
            <textarea ref={textareaRef} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask about any PDF tool..."}
              disabled={agent.isFinding || isListening} className="aw-textarea" rows={1} />
            {recognitionRef.current && (
              <button className={`aw-voice-btn${isListening ? " aw-voice-btn--active" : ""}`}
                onClick={toggleVoice} title={isListening ? "Stop" : "Voice input"}>
                {isListening ? <MicOff style={{ width: 15, height: 15 }} /> : <Mic style={{ width: 15, height: 15 }} />}
              </button>
            )}
            <button className="aw-send-btn" onClick={handleSend}
              disabled={!text.trim() || agent.isFinding}>
              <Send style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      <button ref={triggerRef} className="aw-trigger" onClick={() => setOpen(o => !o)}
        aria-label="Open AI Assistant" id="ai-agent-widget-btn">
        <div className="aw-trigger-icon">
          <Sparkles style={{ width: 16, height: 16, color: "#fff" }} />
        </div>
        <span className="aw-trigger-label">AI Assistant</span>
        <span className="aw-trigger-dot" />
      </button>
    </>
  );
}
