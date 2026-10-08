import { useEffect, useRef, useState } from 'react';
import { Project } from '../types';
import { getVideoBlob } from '../lib/storage';
import { formatFileSize, formatDuration } from '../lib/validation';
import { Play, Clock, Monitor, Gauge, HardDrive, FileVideo, Calendar, Hash } from 'lucide-react';

interface VideoPreviewProps {
  project: Project;
}

export default function VideoPreview({ project }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let url: string | null = null;

    async function loadVideo() {
      try {
        const blob = await getVideoBlob(project.id);
        if (blob) {
          url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }
      } catch (err) {
        console.error('Failed to load video:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadVideo();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [project.id]);

  const metadataItems = [
    { icon: Clock, label: 'Duration', value: formatDuration(project.duration) },
    { icon: Monitor, label: 'Resolution', value: `${project.width} × ${project.height}` },
    { icon: Gauge, label: 'Frame Rate', value: `${project.fps} FPS` },
    { icon: HardDrive, label: 'File Size', value: formatFileSize(project.fileSize) },
    { icon: FileVideo, label: 'Format', value: project.mimeType || 'video/mp4' },
    { icon: Hash, label: 'Signature', value: project.fileSignature ? `${project.fileSignature.slice(0, 16)}...` : 'N/A' },
    { icon: Calendar, label: 'Uploaded', value: new Date(project.uploadedAt).toLocaleString() },
  ];

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Video Player */}
      <div className="relative bg-black aspect-video flex items-center justify-center">
        {isLoading ? (
          <div className="text-gray-500 flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            Loading video...
          </div>
        ) : videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          />
        ) : (
          <div className="text-gray-500 flex flex-col items-center gap-2">
            <Play className="w-12 h-12" />
            <span>Video unavailable</span>
          </div>
        )}
      </div>

      {/* Project Info Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{project.name}</h2>
            <p className="text-gray-400 text-sm mt-1">{project.fileName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            project.status === 'uploaded' ? 'bg-blue-500/20 text-blue-400' :
            project.status === 'ready' ? 'bg-green-500/20 text-green-400' :
            project.status === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {project.status.toUpperCase()}
          </span>
        </div>
        <div className="mt-3 text-xs text-gray-500 font-mono">
          ID: {project.id} • Path: {project.filePath}
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Video Metadata
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metadataItems.map((item) => (
            <div key={item.label} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <item.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <p className="text-white font-semibold text-sm truncate" title={item.value}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-gray-900/70 rounded-xl p-4 border border-gray-700/50">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Technical Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">File Signature (hex):</span>
              <span className="text-green-400">{project.fileSignature || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pixel Count:</span>
              <span className="text-blue-400">{(project.width * project.height).toLocaleString()} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Frames (est):</span>
              <span className="text-purple-400">{Math.round(project.duration * project.fps).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data Rate:</span>
              <span className="text-yellow-400">
                {((project.fileSize / project.duration) / 1024 / 1024).toFixed(2)} MB/s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
