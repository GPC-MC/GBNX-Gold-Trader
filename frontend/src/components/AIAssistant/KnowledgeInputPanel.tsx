import React, { useState } from 'react';
import clsx from 'clsx';
import { AlertCircle, CheckCircle, FileText, Send, Upload, X } from 'lucide-react';

const KnowledgeInputPanel: React.FC = () => {
  const [inputMethod, setInputMethod] = useState<'text' | 'pdf'>('text');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setSubmitStatus('idle');
      return;
    }
    alert('Please upload a PDF file only.');
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setSubmitStatus('idle');
  };

  const handleSubmit = async () => {
    if (inputMethod === 'text' && !textInput.trim()) {
      alert('Please enter some text to teach the AI.');
      return;
    }

    if (inputMethod === 'pdf' && !uploadedFile) {
      alert('Please upload a PDF file.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      let expertPrompt = '';

      if (inputMethod === 'text') {
        expertPrompt = textInput.trim();
      } else if (inputMethod === 'pdf' && uploadedFile) {
        expertPrompt = `PDF Document: ${uploadedFile.name} - Content would be extracted and processed here.`;
      }

      const response = await fetch('https://bf1bd891617c.ngrok-free.app/initialize_agent', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expert_prompt: expertPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      setSubmitStatus('success');

      if (inputMethod === 'text') {
        setTextInput('');
      } else {
        setUploadedFile(null);
      }

      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Error initializing AI agent:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled =
    isSubmitting ||
    (inputMethod === 'text' && !textInput.trim()) ||
    (inputMethod === 'pdf' && !uploadedFile);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gold-500/10">
        <h2 className="text-xl font-semibold text-white">Teach the Agent</h2>
        <p className="mt-1 text-sm text-gray-400">Share your trading knowledge to improve recommendations.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Input Method Selection */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-300 mb-3">Choose input method</div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setInputMethod('text')}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200',
                inputMethod === 'text'
                  ? 'bg-gold-500/10 text-gold-300 border-gold-500/25'
                  : 'bg-ink-800/55 text-gray-300 border-gold-500/10 hover:bg-ink-800/75 hover:border-gold-500/20'
              )}
            >
              <FileText size={16} />
              <span className="text-sm font-semibold">Text</span>
            </button>
            <button
              onClick={() => setInputMethod('pdf')}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200',
                inputMethod === 'pdf'
                  ? 'bg-gold-500/10 text-gold-300 border-gold-500/25'
                  : 'bg-ink-800/55 text-gray-300 border-gold-500/10 hover:bg-ink-800/75 hover:border-gold-500/20'
              )}
            >
              <Upload size={16} />
              <span className="text-sm font-semibold">Upload PDF</span>
            </button>
          </div>
        </div>

        {/* Text Input */}
        {inputMethod === 'text' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">Share your trading knowledge</label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Example: When gold breaks above $2,350 with high volume, it often continues to $2,380. I’ve noticed this pattern works ~70% of the time during bullish market conditions…"
              className="w-full h-48 rounded-xl bg-ink-800/55 border border-gold-500/15 px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold-500/35 focus:ring-2 focus:ring-gold-500/15 resize-none"
            />
            <div className="text-xs text-gray-500 mt-2">{textInput.length}/2000 characters</div>
          </div>
        )}

        {/* PDF Upload */}
        {inputMethod === 'pdf' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">Upload PDF document</label>

            {!uploadedFile ? (
              <div className="rounded-2xl border-2 border-dashed border-gold-500/20 bg-ink-900/25 p-8 text-center transition-colors duration-200 hover:border-gold-500/35">
                <Upload className="mx-auto text-gray-400 mb-4" size={44} />
                <div className="text-gray-200 font-semibold mb-1">Drop your PDF here or click to browse</div>
                <div className="text-sm text-gray-500 mb-5">Maximum file size: 10MB</div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-gold-300 px-4 py-2 font-semibold text-ink-900 cursor-pointer transition hover:brightness-105"
                >
                  Choose PDF
                </label>
              </div>
            ) : (
              <div className="rounded-2xl border border-gold-500/12 bg-ink-800/55 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-rose-300" size={22} />
                  <div>
                    <div className="text-gray-100 font-semibold">{uploadedFile.name}</div>
                    <div className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 rounded-xl text-gray-500 hover:text-rose-300 hover:bg-white/5 transition-colors duration-200"
                  title="Remove"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Status */}
        {submitStatus !== 'idle' && (
          <div
            className={clsx(
              'mb-4 p-3 rounded-xl flex items-center gap-2 border',
              submitStatus === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/20'
            )}
          >
            {submitStatus === 'success' ? (
              <>
                <CheckCircle className="text-emerald-300" size={16} />
                <span className="text-emerald-300 text-sm font-semibold">Knowledge successfully added.</span>
              </>
            ) : (
              <>
                <AlertCircle className="text-rose-300" size={16} />
                <span className="text-rose-300 text-sm font-semibold">Failed to submit knowledge. Please try again.</span>
              </>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={clsx(
            'w-full py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold',
            isDisabled
              ? 'bg-ink-800/40 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-gold-500 to-gold-300 text-ink-900 hover:brightness-105 shadow-glow'
          )}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-ink-900/70 border-t-transparent rounded-full animate-spin" />
              <span>Teaching…</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Teach Agent</span>
            </>
          )}
        </button>

        {/* Information */}
        <div className="mt-8 rounded-2xl border border-gold-500/10 bg-ink-800/45 p-4">
          <h4 className="text-gold-300 font-semibold mb-2">Tips</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Share specific patterns you’ve observed</li>
            <li>• Include success rates and market conditions</li>
            <li>• Mention risk management constraints</li>
            <li>• Provide timing and sentiment context</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeInputPanel;

