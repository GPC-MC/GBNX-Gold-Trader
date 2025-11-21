import React, { useState } from 'react';
import { Upload, FileText, Send, X, CheckCircle, AlertCircle } from 'lucide-react';

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
    } else {
      alert('Please upload a PDF file only.');
    }
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
        // For PDF, we'll use the filename as a placeholder
        // In a real implementation, you'd extract text from the PDF
        expertPrompt = `PDF Document: ${uploadedFile.name} - Content would be extracted and processed here.`;
      }

      const response = await fetch('https://bf1bd891617c.ngrok-free.app/initialize_agent', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expert_prompt: expertPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('AI Agent initialized successfully:', result);
      
      setSubmitStatus('success');
      
      // Clear inputs after successful submission
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-yellow-400 mb-2">📚 Teach AI Agent</h2>
        <p className="text-sm text-gray-400">Share your trading knowledge to improve AI recommendations</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {/* Input Method Selection */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-300 mb-3">Choose input method:</div>
          <div className="flex space-x-4">
            <button
              onClick={() => setInputMethod('text')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                inputMethod === 'text'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FileText size={16} />
              <span>Text</span>
            </button>
            <button
              onClick={() => setInputMethod('pdf')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                inputMethod === 'pdf'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Upload size={16} />
              <span>Upload PDF</span>
            </button>
          </div>
        </div>

        {/* Text Input */}
        {inputMethod === 'text' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Share your trading knowledge:
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Example: When gold breaks above $2,350 with high volume, it often continues to $2,380. I've noticed this pattern works 70% of the time during bullish market conditions..."
              className="w-full h-48 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 resize-none"
            />
            <div className="text-xs text-gray-400 mt-2">
              {textInput.length}/2000 characters
            </div>
          </div>
        )}

        {/* PDF Upload */}
        {inputMethod === 'pdf' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload PDF document:
            </label>
            
            {!uploadedFile ? (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-yellow-500 transition-colors duration-200">
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                <div className="text-gray-300 mb-2">Drop your PDF here or click to browse</div>
                <div className="text-sm text-gray-400 mb-4">Maximum file size: 10MB</div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200"
                >
                  Choose PDF File
                </label>
              </div>
            ) : (
              <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="text-red-400" size={24} />
                  <div>
                    <div className="text-white font-medium">{uploadedFile.name}</div>
                    <div className="text-sm text-gray-400">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-gray-400 hover:text-red-400 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Status */}
        {submitStatus !== 'idle' && (
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            submitStatus === 'success' 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {submitStatus === 'success' ? (
              <>
                <CheckCircle className="text-green-400" size={16} />
                <span className="text-green-400 text-sm">Knowledge successfully added to AI training!</span>
              </>
            ) : (
              <>
                <AlertCircle className="text-red-400" size={16} />
                <span className="text-red-400 text-sm">Failed to submit knowledge. Please try again.</span>
              </>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (inputMethod === 'text' && !textInput.trim()) || (inputMethod === 'pdf' && !uploadedFile)}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Teaching AI...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Teach AI Agent</span>
            </>
          )}
        </button>

        {/* Information Section */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">💡 Tips for effective teaching:</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Share specific trading patterns you've observed</li>
            <li>• Include success rates and market conditions</li>
            <li>• Mention risk management strategies</li>
            <li>• Provide context about timing and market sentiment</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeInputPanel;