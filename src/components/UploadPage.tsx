import React, { useState, useRef, useCallback } from 'react';
import { validateMP4Upload, formatFileSize } from '../lib/validation';
import { extractVideoMetadata, createVideoPreviewUrl } from '../lib/metadata';
import { saveProject, saveVideoBlob, generateId } from '../lib/storage';
import { Project, UploadState } from '../types';
import { Upload, Film, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface UploadPageProps {
  onUploadComplete: (project: Project) => void;
}

export default function UploadPage({ onUploadComplete }: UploadPageProps) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    currentProject: null,
    error: null,
  });
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setValidationErrors([]);
    setState({ isUploading: true, progress: 0, currentProject: null, error: null });

    try {
      // Step 1: Validate MP4 upload (size, signature, safe path)
      setState((prev) => ({ ...prev, progress: 10 }));
      const validation = await validateMP4Upload(file);

      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setState({ isUploading: false, progress: 0, currentProject: null, error: 'Validation failed' });
        return;
      }

      // Step 2: Extract video metadata (equivalent to FFprobe)
      setState((prev) => ({ ...prev, progress: 30 }));
      const metadata = await extractVideoMetadata(file);

      // Step 3: Create project record
      setState((prev) => ({ ...prev, progress: 60 }));
      const now = new Date().toISOString();
      const safePath = `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const project: Project = {
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        filePath: safePath,
        fileSize: file.size,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        mimeType: file.type || 'video/mp4',
        fileSignature: validation.fileSignature || '',
        uploadedAt: now,
        updatedAt: now,
        status: 'uploaded',
        errorMessage: null,
      };

      // Step 4: Save to IndexedDB (simulating SQLite)
      setState((prev) => ({ ...prev, progress: 80 }));
      await saveProject(project);
      await saveVideoBlob(project.id, file);

      // Step 5: Complete
      setState((prev) => ({ ...prev, progress: 100, currentProject: project }));

      // Preview URL is created for the video element
      // (In production, the blob URL from IndexedDB would be used instead)
      void createVideoPreviewUrl(file);

      // Notify parent
      setTimeout(() => {
        onUploadComplete(project);
        setState({ isUploading: false, progress: 100, currentProject: project, error: null });
      }, 500);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error during upload';
      setState({ isUploading: false, progress: 0, currentProject: null, error: errorMessage });
    }
  }, [onUploadComplete]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const resetUpload = () => {
    setState({ isUploading: false, progress: 0, currentProject: null, error: null });
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
            : state.isUploading
            ? 'border-yellow-500 bg-yellow-500/5'
            : state.currentProject
            ? 'border-green-500 bg-green-500/5'
            : 'border-gray-600 hover:border-gray-400 bg-gray-800/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.m4v,.mov"
          onChange={handleInputChange}
          className="hidden"
          id="video-upload"
          disabled={state.isUploading}
        />

        {!state.isUploading && !state.currentProject && (
          <label htmlFor="video-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Drop your MP4 video here
                </h3>
                <p className="text-gray-400 text-sm">
                  or click to browse • Max 2GB • MP4/M4V/MOV formats
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <Film className="w-4 h-4" />
                <span>Validates file signature, size, and extracts metadata</span>
              </div>
            </div>
          </label>
        )}

        {/* Uploading State */}
        {state.isUploading && (
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-12 h-12 text-blue-400 animate-spin" />
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>Processing video...</span>
                <span>{state.progress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                {state.progress >= 10 && <p className="text-green-400">✓ File validation (size, signature, path)</p>}
                {state.progress >= 30 && <p className={state.progress >= 50 ? 'text-green-400' : 'text-yellow-400'}>
                  {state.progress >= 50 ? '✓' : '◌'} Metadata extraction (duration, resolution, FPS)
                </p>}
                {state.progress >= 60 && <p className={state.progress >= 80 ? 'text-green-400' : 'text-yellow-400'}>
                  {state.progress >= 80 ? '✓' : '◌'} Saving to database
                </p>}
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {state.currentProject && !state.isUploading && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-400" />
            <div>
              <h3 className="text-xl font-semibold text-green-400">Upload Complete!</h3>
              <p className="text-gray-400 text-sm mt-1">
                {state.currentProject.fileName} • {formatFileSize(state.currentProject.fileSize)}
              </p>
            </div>
            <button
              onClick={resetUpload}
              className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Upload Another
            </button>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-6 bg-red-900/30 border border-red-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-3">
            <AlertCircle className="w-5 h-5" />
            <span>Validation Failed</span>
          </div>
          <ul className="space-y-2">
            {validationErrors.map((error, i) => (
              <li key={i} className="text-red-300 text-sm flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Error */}
      {state.error && validationErrors.length === 0 && (
        <div className="mt-6 bg-red-900/30 border border-red-700 rounded-xl p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Error:</span>
            <span className="text-sm">{state.error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
