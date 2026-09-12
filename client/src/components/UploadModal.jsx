import React, { useState } from 'react';
import api from '../services/api';
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess, onRequestMapping }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleUploadFile = async (targetFile) => {
    const fileToUpload = targetFile || file;
    if (!fileToUpload) {
      setError('Please select a CSV bank statement file');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('statement', fileToUpload);

    try {
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadId = res.data.uploadId;
      
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await api.get(`/uploads/${uploadId}/status`);
          // Server returns { upload: {...}, headersForMapping }
          const status = statusRes.data.upload?.status;
          const headersForMapping = statusRes.data.headersForMapping;

          if (status === 'completed') {
            clearInterval(interval);
            setUploading(false);
            setFile(null);
            onUploadSuccess();
            onClose();
          } else if (status === 'needs_mapping') {
            clearInterval(interval);
            setUploading(false);
            setFile(null);
            onClose();
            if (onRequestMapping) {
              onRequestMapping({ uploadId, headers: headersForMapping, fileToUpload });
            }
          } else if (status === 'failed') {
            clearInterval(interval);
            setUploading(false);
            setError(statusRes.data.upload?.error_log || 'Upload processing failed');
          } else if (attempts > 120) {
            clearInterval(interval);
            setUploading(false);
            setError('Upload processing timed out. Please refresh the page to check parsed transactions.');
          }
        } catch (e) {
          clearInterval(interval);
          setUploading(false);
          setError('Failed to query upload status');
        }
      }, 500);
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.error || 'Failed to upload bank statement');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl p-7 relative border border-slate-200 shadow-2xl space-y-5">
        
        <button
          onClick={onClose}
          disabled={uploading}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Upload Bank Statement</h2>
            <p className="text-xs text-slate-500 font-medium">Select or drag & drop raw CSV statement file</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isDragOver ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="csv-file-input"
            className="hidden"
          />

          {file ? (
            <div className="space-y-3">
              <FileText className="w-10 h-10 text-indigo-600 mx-auto opacity-90" />
              <div>
                <p className="text-sm font-bold text-slate-900 truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-xs text-emerald-600 font-mono font-bold">{(file.size / 1024).toFixed(1)} KB — Ready to process</p>
              </div>

              {/* Remove / Clear File Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setError('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all border border-rose-200 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Selected File</span>
              </button>
            </div>
          ) : (
            <div>
              <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-3 opacity-90" />
              <p className="text-sm font-extrabold text-slate-800 mb-1">Drag & drop your bank statement CSV here</p>
              <p className="text-xs text-slate-500 mb-4">Supports HDFC, SBI, ICICI, Axis & Generic bank CSV files</p>
              <label
                htmlFor="csv-file-input"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 cursor-pointer transition-all shadow-sm"
              >
                Select CSV File
              </label>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setFile(null);
              onClose();
            }}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => handleUploadFile()}
            disabled={uploading || !file}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing & Categorizing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Process CSV Statement</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
