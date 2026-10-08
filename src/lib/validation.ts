import { ValidationResult } from '../types';

// Maximum file size: 2GB (reasonable for video files)
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

// MP4 magic bytes (ftyp box signatures)
// Common MP4 ftyp brand identifiers
const MP4_SIGNATURES: string[] = [
  '66747970', // 'ftyp' - generic MP4
  '6674797069736f6d', // 'ftypisom' - ISO Base Media
  '6674797069736f32', // 'ftypiso2'
  '667479706d703432', // 'ftypmp42'
  '667479704d534e56', // 'ftypMSNV' - MPEG-4
  '6674797061766331', // 'ftypavc1' - AVC/H.264
  '667479706d703431', // 'ftypmp41'
  '6674797033677035', // 'ftyp3gp5'
  '667479704d345620', // 'ftypM4V '
  '6674797071742020', // 'ftypqt  ' - QuickTime
];

// Characters that are NOT allowed in safe file paths
const UNSAFE_PATH_CHARS = /[<>:"|?*\x00-\x1f]/;
const PATH_TRAVERSAL_PATTERNS = [/\.\.\//g, /\.\.\\/g, /^\//, /^\\/];

/**
 * Validates file size is within acceptable limits
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)}).`,
    };
  }
  return { valid: true };
}

/**
 * Validates the file has a valid MP4 file signature (magic bytes)
 * Reads the first 12 bytes and checks for 'ftyp' box
 */
export async function validateFileSignature(file: File): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    // Read first 32 bytes for signature analysis
    const buffer = await file.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 8) {
      return { valid: false, errors: ['File too small to contain valid MP4 header.'] };
    }

    // Convert to hex string for comparison
    const hexSignature = Array.from(bytes.slice(0, 12))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Check if bytes 4-7 contain 'ftyp' (0x66747970)
    const ftypCheck = Array.from(bytes.slice(4, 8))
      .map((b) => String.fromCharCode(b))
      .join('');

    if (ftypCheck !== 'ftyp') {
      errors.push(
        `Invalid file signature. Expected MP4 'ftyp' box at offset 4, found '${ftypCheck}' (hex: ${hexSignature.slice(8, 16)}).`
      );
      return { valid: false, errors, fileSignature: hexSignature };
    }

    // Additional check: verify against known MP4 brand signatures
    const hasValidBrand = MP4_SIGNATURES.some((sig) => hexSignature.startsWith(sig));
    if (!hasValidBrand) {
      // Still valid MP4 if ftyp is present, just unknown brand
      console.warn(`Unknown MP4 brand but valid ftyp box found. Hex: ${hexSignature}`);
    }

    return { valid: true, errors: [], fileSignature: hexSignature };
  } catch (err) {
    errors.push(`Failed to read file signature: ${(err as Error).message}`);
    return { valid: false, errors };
  }
}

/**
 * Validates that a file path is safe (no path traversal, no dangerous characters)
 */
export function validateSafePath(fileName: string): { valid: boolean; error?: string } {
  // Check for empty filename
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: 'File name is empty.' };
  }

  // Check maximum filename length
  if (fileName.length > 255) {
    return { valid: false, error: 'File name exceeds maximum length (255 characters).' };
  }

  // Check for unsafe characters
  if (UNSAFE_PATH_CHARS.test(fileName)) {
    return { valid: false, error: 'File name contains unsafe characters.' };
  }

  // Check for path traversal attempts
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(fileName)) {
      return { valid: false, error: 'File name contains path traversal sequences.' };
    }
  }

  // Check for reserved Windows filenames
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
  ];
  const baseName = fileName.split('.')[0].toUpperCase();
  if (reservedNames.includes(baseName)) {
    return { valid: false, error: `File name '${baseName}' is a reserved system name.` };
  }

  // Generate safe path
  const safePath = `uploads/${Date.now()}_${sanitizeFileName(fileName)}`;
  console.log(`Safe path generated: ${safePath}`);

  return { valid: true };
}

/**
 * Sanitizes a filename for safe storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Validates MIME type
 */
export function validateMimeType(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
  if (!allowedTypes.includes(file.type) && file.type !== '') {
    // Some browsers may not set the type correctly, so we also check extension
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'mp4' && ext !== 'm4v' && ext !== 'mov') {
      return { valid: false, error: `Invalid file type: '${file.type || 'unknown'}'. Expected MP4 video.` };
    }
  }
  return { valid: true };
}

/**
 * Full validation pipeline for MP4 upload
 */
export async function validateMP4Upload(file: File): Promise<ValidationResult> {
  const allErrors: string[] = [];

  // 1. Validate file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) {
    allErrors.push(sizeResult.error!);
  }

  // 2. Validate safe path
  const pathResult = validateSafePath(file.name);
  if (!pathResult.valid) {
    allErrors.push(pathResult.error!);
  }

  // 3. Validate MIME type
  const mimeResult = validateMimeType(file);
  if (!mimeResult.valid) {
    allErrors.push(mimeResult.error!);
  }

  // 4. Validate file signature (magic bytes)
  const sigResult = await validateFileSignature(file);
  if (!sigResult.valid) {
    allErrors.push(...sigResult.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    fileSignature: sigResult.fileSignature,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
