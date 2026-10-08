// Project model matching the Prisma schema
export interface Project {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  mimeType: string;
  fileSignature: string;
  uploadedAt: string;
  updatedAt: string;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  errorMessage?: string | null;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fileSignature?: string;
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
  currentProject: Project | null;
  error: string | null;
}
