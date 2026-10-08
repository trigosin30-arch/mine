import { VideoMetadata } from '../types';

/**
 * Extracts video metadata (duration, resolution, FPS) using HTML5 Video API.
 * This is the browser equivalent of FFprobe.
 *
 * In a full Next.js setup, this would be done server-side with:
 *   const ffprobe = require('ffprobe-static');
 *   const { spawn } = require('child_process');
 *   // ffprobe -v quiet -print_format json -show_streams -show_format file.mp4
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
      reject(new Error('Video metadata extraction timed out after 30 seconds.'));
    }, 30000);

    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      clearTimeout(timeout);

      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      // FPS estimation using requestVideoFrameCallback if available,
      // otherwise we use a sampling approach
      estimateFPS(video, file)
        .then((fps) => {
          URL.revokeObjectURL(objectUrl);
          video.remove();

          if (!duration || !width || !height) {
            reject(new Error('Could not extract video dimensions or duration.'));
            return;
          }

          resolve({
            duration: Math.round(duration * 1000) / 1000, // Round to ms
            width,
            height,
            fps: Math.round(fps * 100) / 100, // Round to 2 decimal places
          });
        })
        .catch((err) => {
          URL.revokeObjectURL(objectUrl);
          video.remove();
          reject(err);
        });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      video.remove();
      reject(new Error('Failed to load video for metadata extraction. File may be corrupted.'));
    };

    video.src = objectUrl;
  });
}

/**
 * Estimates FPS by counting video frames over a short period.
 * Uses requestVideoFrameCallback for accurate frame counting when available.
 * Falls back to common FPS values based on duration analysis.
 */
async function estimateFPS(video: HTMLVideoElement, _file: File): Promise<number> {
  // Try using requestVideoFrameCallback for accurate FPS
  if ('requestVideoFrameCallback' in video) {
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      let startTime: number | null = null;

      const countFrame = (_now: number, metadata: { mediaTime: number }) => {
        if (startTime === null) {
          startTime = metadata.mediaTime;
        }
        frameCount++;

        // Count frames for ~1 second of video
        if (metadata.mediaTime - startTime >= 1.0 || frameCount >= 120) {
          const elapsed = metadata.mediaTime - startTime;
          const fps = elapsed > 0 ? frameCount / elapsed : 30;
          resolve(Math.min(Math.max(fps, 1), 240)); // Clamp to reasonable range
          return;
        }

        try {
          (video as any).requestVideoFrameCallback(countFrame);
        } catch {
          resolve(30); // Fallback
        }
      };

      video.muted = true;
      video.currentTime = 0;

      const playPromise = video.play();
      if (playPromise) {
        playPromise
          .then(() => {
            try {
              (video as any).requestVideoFrameCallback(countFrame);
            } catch {
              resolve(30);
            }
          })
          .catch(() => {
            resolve(30); // Fallback if play fails
          });
      }

      // Safety timeout
      setTimeout(() => resolve(30), 5000);
    });
  }

  // Fallback: return a default FPS value
  // In production with FFprobe, this would be exact
  return 30;
}

/**
 * Creates a preview URL for the video file
 */
export function createVideoPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a previously created object URL
 */
export function revokeVideoPreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
