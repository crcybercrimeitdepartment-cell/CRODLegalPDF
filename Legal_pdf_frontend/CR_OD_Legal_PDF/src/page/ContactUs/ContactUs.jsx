/**
 * @file ContactUs.jsx
 * @description Contact Us Page designed to EXACTLY match the user provided mockup.
 * Features:
 * - Seamless Hero section with exact customer support illustration on the right (no container border).
 * - 4 horizontal Contact Cards with soft rounded icon circles.
 * - Two column main section: Support Options list on Left, Send Message Form on Right.
 * - Form with icons inside inputs, char counter, drag-and-drop file upload, privacy box, and blue action button.
 * - Quick Help row with 3 feature cards.
 * - FAQ section paired with "Still Need Help?" illustration card on the right.
 */

import React, { useState, useRef, useCallback } from "react";
import {
  Mail, Headphones, Clock3, MapPin,
  CircleHelp, Wrench, MessageSquareText, Bug,
  Send, CircleCheckBig, ShieldCheck,
  UploadCloud, FileText, BookOpen,
  ChevronDown, ArrowRight, X, Loader2,
  User, PenLine, MessageCircle
} from "lucide-react";

const supportHeroImg = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1787579181/support_hero_transparent_irrupc.png';
const stillNeedHelpImg = 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1787579181/still_need_help_fmfkzs.jpg';
import { inquiryTypes, faqItems } from "./contactData.js";



export default function ContactUs({ onBack }) {
  const formRef = useRef(null);
  const fileInputRef = useRef(null);

  // Form states
  const [selectedSupport, setSelectedSupport] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    inquiryType: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [charCount, setCharCount] = useState(0);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState(null); // All FAQs closed by default

  // Input change handler
  const handleInput = useCallback((e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "message") setCharCount(value.length);
    setErrors((p) => ({ ...p, [name]: "" }));
  }, []);

  // Support option select
  const handleSupportSelect = useCallback((val) => {
    setSelectedSupport(val);
    setForm((p) => ({ ...p, inquiryType: val }));
    setErrors((p) => ({ ...p, inquiryType: "" }));
  }, []);

  // File validation
  const checkFile = (f) => {
    if (!f) return "";
    const ok = ["image/png", "image/jpg", "image/jpeg", "application/pdf"];
    if (!ok.includes(f.type)) return "Only PNG, JPG, JPEG or PDF allowed.";
    if (f.size > 10 * 1024 * 1024) return "File must be under 10 MB.";
    return "";
  };

  const handleFile = (f) => {
    const err = checkFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
    } else {
      setFileError("");
      setFile(f);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  // Validation logic
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.inquiryType) e.inquiryType = "Select an inquiry type.";
    if (!form.message.trim()) e.message = "Message is required.";
    else if (form.message.length > 1000) e.message = "Max 1000 characters.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      document.getElementById(Object.keys(errs)[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setSuccess(true);
  };

  const handleReset = useCallback(() => {
    setForm({ name: "", email: "", subject: "", inquiryType: "", message: "" });
    setErrors({});
    setCharCount(0);
    setFile(null);
    setFileError("");
    setSelectedSupport("");
    setSuccess(false);
  }, []);

  const fmtSize = (b) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div
      className="relative flex-1 flex flex-col w-full text-[#0F172A] antialiased pt-11 sm:pt-4"
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {onBack && (
        <button onClick={onBack}
          className="absolute top-1.5 left-3 sm:top-5 sm:left-6 md:left-10 z-50 text-[#1e2a52] hover:text-blue-950 font-bold flex items-center gap-1.5 sm:gap-2 bg-white/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm backdrop-blur-md border border-slate-200/90 transition-all hover:shadow-md hover:scale-105 cursor-pointer text-xs sm:text-sm"
        >
          <svg className="w-4 h-4 text-[#1e2a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>Back</span>
        </button>
      )}

      <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 md:py-12 lg:px-8 relative z-10">

        {/* =========================================================================
            SECTION 1 — HERO INTRO WITH RIGHT ILLUSTRATION (LARGE PROMINENT ARTWORK)
           ========================================================================= */}
        <section className="mb-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Text Column */}
          <div className="lg:col-span-5 xl:col-span-5">
            {/* Small Pill Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-4 py-1.5 backdrop-blur-sm shadow-sm">
              <Headphones className="h-4 w-4 text-[#2563EB]" />
              <span className="text-xs font-bold tracking-wider text-[#2563EB] uppercase">CONTACT US</span>
            </div>

            {/* Main Heading */}
            <h1
              className="mb-4 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "'Montserrat', sans-serif", lineHeight: 1.12 }}
            >
              We’re Here to <br />
              <span className="text-[#2563EB]">Help You!</span>
            </h1>

            {/* Description */}
            <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
              Have us question, need technical support, or want to share feedback? Send us a message and we'll help you find the right solution.
            </p>

            {/* Accent Line */}
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-10 rounded-full bg-[#2563EB]" />
              <div className="h-1.5 w-3 rounded-full bg-blue-300" />
            </div>
          </div>

          {/* Right Hero Illustration (Prominent Large Size) */}
          <div className="flex justify-center lg:col-span-7 lg:justify-end">
            <img
              src={supportHeroImg}
              alt="Customer Support Illustration"
              className="h-auto w-full max-w-[720px] lg:max-w-[760px] object-contain border-0 outline-none select-none pointer-events-none transition-transform duration-300 hover:scale-[1.01]"
              style={{ background: "transparent", border: "none", boxShadow: "none" }}
            />
          </div>
        </section>

        {/* =========================================================================
            SECTION 2 — 4 CONTACT INFORMATION CARDS IN A ROW
           ========================================================================= */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Email Support */}
            <div className="group flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] transition-transform duration-300 group-hover:scale-110">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-base font-bold text-[#0F172A]">Email Support</h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">Send us your questions and general inquiries.</p>
              <a href="mailto:support@crodpdf.com" className="mt-auto text-sm font-bold text-[#2563EB] hover:underline">
                support@crodpdf.com
              </a>
            </div>

            {/* Card 2: Technical Support */}
            <div className="group flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] transition-transform duration-300 group-hover:scale-110">
                <Headphones className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-base font-bold text-[#0F172A]">Technical Support</h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">Need help with a PDF tool or feature?</p>
              <a href="#contact-form" className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-[#2563EB] hover:underline">
                Get Technical Help <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Card 3: Support Hours */}
            <div className="group flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] transition-transform duration-300 group-hover:scale-110">
                <Clock3 className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-base font-bold text-[#0F172A]">Support Hours</h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">Monday – Saturday</p>
              <p className="mt-auto text-sm font-bold text-[#2563EB]">9:00 AM – 6:00 PM</p>
            </div>

            {/* Card 4: Location */}
            <div className="group flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] transition-transform duration-300 group-hover:scale-110">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-base font-bold text-[#0F172A]">Location</h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">Support operations</p>
              <p className="mt-auto text-sm font-bold text-[#2563EB]">Odisha, India</p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3 — TWO COLUMN LAYOUT: LEFT OPTIONS + RIGHT CONTACT FORM
           ========================================================================= */}
        <section ref={formRef} id="contact-section" className="mb-12" style={{ scrollMarginTop: "24px" }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">

            {/* LEFT COLUMN: SUPPORT OPTIONS */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                <h2 className="mb-2 text-2xl font-extrabold text-[#0F172A]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  How Can We Help?
                </h2>
                <div className="mb-6 h-1 w-8 rounded-full bg-[#2563EB]" />

                <p className="mb-6 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  Choose the type of assistance you need and we'll guide your request to the right place.
                </p>

                {/* 4 Vertical Option Cards */}
                <div className="flex flex-col gap-3">
                  {/* General Inquiry */}
                  <button
                    type="button"
                    onClick={() => handleSupportSelect("General Inquiry")}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      selectedSupport === "General Inquiry"
                        ? "border-blue-500 bg-blue-50/50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-blue-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20">
                      <CircleHelp className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#0F172A]">General Inquiry</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">Questions about CR OD Legal PDF, tools and platform usage.</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${selectedSupport === "General Inquiry" ? "text-blue-600 translate-x-0.5" : "text-slate-300 group-hover:text-slate-400"}`} />
                  </button>

                  {/* Technical Support */}
                  <button
                    type="button"
                    onClick={() => handleSupportSelect("Technical Support")}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      selectedSupport === "Technical Support"
                        ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#0F172A]">Technical Support</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">Get help with PDF processing errors or technical problems.</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${selectedSupport === "Technical Support" ? "text-emerald-600 translate-x-0.5" : "text-slate-300 group-hover:text-slate-400"}`} />
                  </button>

                  {/* Feedback & Suggestions */}
                  <button
                    type="button"
                    onClick={() => handleSupportSelect("Feedback & Suggestion")}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      selectedSupport === "Feedback & Suggestion"
                        ? "border-amber-500 bg-amber-50/50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-amber-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-md shadow-amber-500/20">
                      <MessageSquareText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#0F172A]">Feedback & Suggestions</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">Share your ideas and suggestions to improve the platform.</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${selectedSupport === "Feedback & Suggestion" ? "text-amber-600 translate-x-0.5" : "text-slate-300 group-hover:text-slate-400"}`} />
                  </button>

                  {/* Report a Problem */}
                  <button
                    type="button"
                    onClick={() => handleSupportSelect("Report a Bug")}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      selectedSupport === "Report a Bug"
                        ? "border-rose-500 bg-rose-50/50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-rose-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/20">
                      <Bug className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#0F172A]">Report a Problem</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">Report bugs, broken functionality or unexpected behavior.</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${selectedSupport === "Report a Bug" ? "text-rose-600 translate-x-0.5" : "text-slate-300 group-hover:text-slate-400"}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MAIN FORM CARD */}
            <div className="lg:col-span-7" id="contact-form">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md sm:p-8">
                {success ? (
                  /* Success State Overlay */
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CircleCheckBig className="h-10 w-10" />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold text-[#0F172A]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      Message Sent Successfully
                    </h3>
                    <p className="mb-8 max-w-md text-sm text-slate-600">
                      Thank you for contacting CR OD Legal PDF. We’ll get back to you as soon as possible.
                    </p>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" /> Send Another Message
                    </button>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} noValidate>
                    <h2 className="mb-1 text-2xl font-extrabold text-[#0F172A]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      Send Us a Message
                    </h2>
                    <p className="mb-6 text-xs text-slate-500 sm:text-sm">
                      Fill in the form below and we’ll get back to you as soon as possible.
                    </p>

                    <div className="space-y-5">
                      {/* Grid 2 cols for Name & Email */}
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Full Name */}
                        <div>
                          <label htmlFor="name" className="mb-1.5 block text-xs font-bold text-slate-700">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="name"
                              name="name"
                              type="text"
                              placeholder="Enter your full name"
                              value={form.name}
                              onChange={handleInput}
                              className={`w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 ${
                                errors.name ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                              }`}
                            />
                          </div>
                          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                        </div>

                        {/* Email Address */}
                        <div>
                          <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-slate-700">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="you@example.com"
                              value={form.email}
                              onChange={handleInput}
                              className={`w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 ${
                                errors.email ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                              }`}
                            />
                          </div>
                          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                        </div>
                      </div>

                      {/* Grid 2 cols for Subject & Inquiry Type */}
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Subject */}
                        <div>
                          <label htmlFor="subject" className="mb-1.5 block text-xs font-bold text-slate-700">
                            Subject <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <PenLine className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="subject"
                              name="subject"
                              type="text"
                              placeholder="What can we help you with?"
                              value={form.subject}
                              onChange={handleInput}
                              className={`w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 ${
                                errors.subject ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                              }`}
                            />
                          </div>
                          {errors.subject && <p className="mt-1 text-xs text-red-500">{errors.subject}</p>}
                        </div>

                        {/* Inquiry Type */}
                        <div>
                          <label htmlFor="inquiryType" className="mb-1.5 block text-xs font-bold text-slate-700">
                            Inquiry Type <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              id="inquiryType"
                              name="inquiryType"
                              value={form.inquiryType}
                              onChange={handleInput}
                              className={`w-full appearance-none rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 ${
                                errors.inquiryType ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                              }`}
                            >
                              <option value="">Select inquiry type</option>
                              {inquiryTypes.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.inquiryType && <p className="mt-1 text-xs text-red-500">{errors.inquiryType}</p>}
                        </div>
                      </div>

                      {/* Message Textarea */}
                      <div>
                        <label htmlFor="message" className="mb-1.5 block text-xs font-bold text-slate-700">
                          Message <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <textarea
                            id="message"
                            name="message"
                            rows={4}
                            placeholder="Describe your question or issue in detail..."
                            maxLength={1000}
                            value={form.message}
                            onChange={handleInput}
                            className={`w-full rounded-xl border bg-slate-50/50 p-3.5 text-sm text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 ${
                              errors.message ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                            }`}
                            style={{ minHeight: "120px" }}
                          />
                          <span className={`absolute bottom-3 right-3 text-xs font-medium ${charCount > 950 ? "text-red-500" : "text-slate-400"}`}>
                            {charCount} / 1000
                          </span>
                        </div>
                        {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
                      </div>

                      {/* File Attachment Drag & Drop */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">Attach File</label>
                          <span className="text-xs text-slate-400">Optional</span>
                        </div>

                        {file ? (
                          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-xs font-bold text-slate-800">{file.name}</p>
                                <p className="text-[10px] text-slate-500">{fmtSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setFile(null); setFileError(""); }}
                              className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            onDrop={onDrop}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                              isDragOver ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-slate-50/30 hover:border-blue-400 hover:bg-white"
                            }`}
                          >
                            <UploadCloud className="mb-2 h-8 w-8 text-blue-500" />
                            <p className="text-xs font-medium text-slate-600">
                              Drag & drop a screenshot or document here
                            </p>
                            <p className="text-xs text-slate-500">
                              or <span className="font-bold text-[#2563EB]">click to browse</span>
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">PNG, JPG, JPEG, PDF (Max. 10 MB)</p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf"
                          className="sr-only"
                          onChange={(e) => handleFile(e.target.files[0])}
                        />
                        {fileError && <p className="mt-1 text-xs text-red-500">{fileError}</p>}
                      </div>

                      {/* Security Box */}
                      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                        <div>
                          <p className="font-bold text-blue-950">Your Privacy Matters</p>
                          <p className="mt-0.5 text-blue-800/80">
                            Please avoid submitting passwords, financial credentials, or highly sensitive personal information through this form.
                          </p>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-70"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" /> Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" /> Send Message
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4 — QUICK HELP ROW (3 CARDS)
           ========================================================================= */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10 px-4">
            <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase">QUICK HELP</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Find the Right Support Faster
            </h2>
            <div className="mt-3 flex items-center justify-center gap-1">
              <div className="h-1 w-10 rounded-full bg-[#2563EB]" />
              <div className="h-1 w-3 rounded-full bg-blue-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
              {/* Card 1: Help Center */}
              <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <CircleHelp className="h-5 w-5" />
                </div>
                <h4 className="mb-1 text-sm font-bold text-[#0F172A]">Help Center</h4>
                <p className="mb-4 text-xs text-slate-500">Find answers to common questions.</p>
                <a href="#faq" className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
                  View Help <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Card 2: User Guide */}
              <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h4 className="mb-1 text-sm font-bold text-[#0F172A]">User Guide</h4>
                <p className="mb-4 text-xs text-slate-500">Learn how to use CR OD Legal PDF tools.</p>
                <a href="#faq" className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
                  Read Guide <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Card 3: Report an Issue */}
              <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Bug className="h-5 w-5" />
                </div>
                <h4 className="mb-1 text-sm font-bold text-[#0F172A]">Report an Issue</h4>
                <p className="mb-4 text-xs text-slate-500">Tell us about a technical problem.</p>
                <a href="#contact-form" className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
                  Report Issue <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5 — FAQ (LEFT) + STILL NEED HELP CARD (RIGHT)
           ========================================================================= */}
        <section id="faq" className="mb-16" style={{ scrollMarginTop: "24px" }}>
          <div className="text-center max-w-2xl mx-auto mb-10 px-4">
            <h2 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Frequently Asked Questions
            </h2>
            <div className="mt-3 flex items-center justify-center gap-1">
              <div className="h-1 w-10 rounded-full bg-[#2563EB]" />
              <div className="h-1 w-3 rounded-full bg-blue-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start max-w-6xl mx-auto">
            {/* Left FAQ Accordion Column */}
            <div className="lg:col-span-7">

              <div className="space-y-3">
                {faqItems.map((item) => {
                  const isOpen = openFaq === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border transition-all ${
                        isOpen ? "border-blue-200 bg-blue-50/30 shadow-sm" : "border-slate-200/80 bg-white hover:border-blue-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : item.id)}
                        className="flex w-full items-center justify-between p-4 text-left font-bold text-sm text-[#0F172A]"
                      >
                        <span className={isOpen ? "text-[#2563EB]" : "text-slate-800"}>{item.question}</span>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-xs leading-relaxed text-slate-600 border-t border-blue-100/50 pt-2">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right "Still Need Help?" Illustration Card */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-blue-100/50 p-6 shadow-sm text-center flex flex-col items-center">
                <img
                  src={stillNeedHelpImg}
                  alt="Envelope with Security Lock Illustration"
                  className="mb-4 h-36 w-auto object-contain"
                />
                <h3 className="mb-2 text-xl font-extrabold text-[#0F172A]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Still Need Help?
                </h3>
                <p className="mb-6 text-xs text-slate-600 max-w-xs">
                  Send us your question and we'll help you find the right solution.
                </p>
                <button
                  type="button"
                  onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700"
                >
                  <MessageCircle className="h-4 w-4" /> Contact Support
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
