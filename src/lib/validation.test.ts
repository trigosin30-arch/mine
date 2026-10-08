/**
 * Validation Test Suite for AI Editing Compiler
 * Tests the MP4 upload validation pipeline:
 * - File size validation
 * - File signature (magic bytes) validation
 * - Safe path validation
 * - MIME type validation
 *
 * These tests run in the browser console when the app loads.
 */

import {
  validateFileSize,
  validateSafePath,
  validateMimeType,
  validateFileSignature,
  validateMP4Upload,
  formatFileSize,
  formatDuration,
} from './validation';

// Mock File creation for testing
function createMockFile(name: string, size: number, type: string, content?: Uint8Array): File {
  const data = content || new Uint8Array(size);
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type });
  return new File([blob], name, { type });
}

// Create a valid MP4 file header (ftyp box)
function createValidMP4Buffer(): Uint8Array {
  // Minimal MP4 header: size(4) + 'ftyp'(4) + brand(4)
  const buffer = new Uint8Array(32);
  // Box size (20 bytes for ftyp box)
  buffer[0] = 0x00;
  buffer[1] = 0x00;
  buffer[2] = 0x00;
  buffer[3] = 0x14; // 20 in decimal
  // 'ftyp' magic bytes
  buffer[4] = 0x66; // f
  buffer[5] = 0x74; // t
  buffer[6] = 0x79; // y
  buffer[7] = 0x70; // p
  // Brand: 'isom'
  buffer[8] = 0x69; // i
  buffer[9] = 0x73; // s
  buffer[10] = 0x6f; // o
  buffer[11] = 0x6d; // m
  return buffer;
}

// Create an invalid file (not MP4)
function createInvalidBuffer(): Uint8Array {
  const buffer = new Uint8Array(32);
  buffer[0] = 0x89; // PNG signature
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  return buffer;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export async function runValidationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Valid file size
  {
    const file = createMockFile('test.mp4', 1024 * 1024, 'video/mp4'); // 1MB
    const result = validateFileSize(file);
    results.push({
      name: 'File size: valid 1MB file',
      passed: result.valid === true,
      message: result.valid ? 'PASS' : `FAIL: ${result.error}`,
    });
  }

  // Test 2: Empty file
  {
    const file = createMockFile('empty.mp4', 0, 'video/mp4');
    const result = validateFileSize(file);
    results.push({
      name: 'File size: empty file rejected',
      passed: result.valid === false,
      message: result.valid ? 'FAIL: should reject empty file' : `PASS: ${result.error}`,
    });
  }

  // Test 3: Oversized file
  {
    const file = createMockFile('huge.mp4', 3 * 1024 * 1024 * 1024, 'video/mp4'); // 3GB
    const result = validateFileSize(file);
    results.push({
      name: 'File size: oversized file rejected',
      passed: result.valid === false,
      message: result.valid ? 'FAIL: should reject >2GB file' : `PASS: ${result.error}`,
    });
  }

  // Test 4: Valid MP4 signature
  {
    const mp4Data = createValidMP4Buffer();
    const file = createMockFile('valid.mp4', mp4Data.length, 'video/mp4', mp4Data);
    const result = await validateFileSignature(file);
    results.push({
      name: 'Signature: valid MP4 ftyp box',
      passed: result.valid === true,
      message: result.valid
        ? `PASS: signature=${result.fileSignature?.slice(0, 16)}...`
        : `FAIL: ${result.errors.join(', ')}`,
    });
  }

  // Test 5: Invalid signature (PNG)
  {
    const invalidData = createInvalidBuffer();
    const file = createMockFile('fake.mp4', invalidData.length, 'video/mp4', invalidData);
    const result = await validateFileSignature(file);
    results.push({
      name: 'Signature: non-MP4 rejected',
      passed: result.valid === false,
      message: result.valid ? 'FAIL: should reject non-MP4' : `PASS: ${result.errors[0]?.slice(0, 60)}...`,
    });
  }

  // Test 6: Safe path - valid filename
  {
    const result = validateSafePath('my-video_2024.mp4');
    results.push({
      name: 'Path: valid filename accepted',
      passed: result.valid === true,
      message: result.valid ? 'PASS' : `FAIL: ${result.error}`,
    });
  }

  // Test 7: Safe path - traversal attack
  {
    const result = validateSafePath('../../../etc/passwd');
    results.push({
      name: 'Path: traversal attack rejected',
      passed: result.valid === false,
      message: result.valid ? 'FAIL: should reject path traversal' : `PASS: ${result.error}`,
    });
  }

  // Test 8: Safe path - unsafe characters
  {
    const result = validateSafePath('file<name>.mp4');
    results.push({
      name: 'Path: unsafe characters rejected',
      passed: result.valid === false,
      message: result.valid ? 'FAIL: should reject unsafe chars' : `PASS: ${result.error}`,
    });
  }

  // Test 9: Safe path - reserved Windows name
  {
    const result = validateSafePath('CON.mp4');
    results.push({
      name: 'Path: reserved Windows name rejected',
      passed: result.valid === false,
      message: result.valid ? 'FAIL: should reject CON' : `PASS: ${result.error}`,
    });
  }

  // Test 10: MIME type validation
  {
    const file = createMockFile('video.mp4', 100, 'video/mp4');
    const result = validateMimeType(file);
    results.push({
      name: 'MIME: video/mp4 accepted',
      passed: result.valid === true,
      message: result.valid ? 'PASS' : `FAIL: ${result.error}`,
    });
  }

  // Test 11: formatFileSize utility
  {
    const formatted = formatFileSize(1048576);
    results.push({
      name: 'Utility: formatFileSize(1MB)',
      passed: formatted === '1.00 MB',
      message: formatted === '1.00 MB' ? `PASS: ${formatted}` : `FAIL: got '${formatted}'`,
    });
  }

  // Test 12: formatDuration utility
  {
    const formatted = formatDuration(125.5);
    results.push({
      name: 'Utility: formatDuration(125.5s)',
      passed: formatted === '2:05.50',
      message: formatted === '2:05.50' ? `PASS: ${formatted}` : `FAIL: got '${formatted}'`,
    });
  }

  // Test 13: Full validation pipeline with valid MP4
  {
    const mp4Data = createValidMP4Buffer();
    const file = createMockFile('project.mp4', mp4Data.length, 'video/mp4', mp4Data);
    const result = await validateMP4Upload(file);
    results.push({
      name: 'Pipeline: full validation with valid MP4',
      passed: result.valid === true,
      message: result.valid
        ? `PASS: signature=${result.fileSignature?.slice(0, 16)}...`
        : `FAIL: ${result.errors.join(', ')}`,
    });
  }

  // Test 14: Full validation pipeline with invalid file
  {
    const invalidData = createInvalidBuffer();
    const file = createMockFile('fake.mp4', invalidData.length, 'image/png', invalidData);
    const result = await validateMP4Upload(file);
    results.push({
      name: 'Pipeline: full validation with invalid file',
      passed: result.valid === false,
      message: result.valid ? 'FAIL: should reject invalid file' : `PASS: ${result.errors.length} error(s)`,
    });
  }

  return results;
}
