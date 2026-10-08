import { useState, useCallback } from 'react';
import UploadPage from './components/UploadPage';
import VideoPreview from './components/VideoPreview';
import ProjectList from './components/ProjectList';
import TestResults from './components/TestResults';
import { Project } from './types';
import { Cpu, Upload, Database, Shield, Film } from 'lucide-react';

export default function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'upload' | 'projects'>('upload');

  const handleUploadComplete = useCallback((project: Project) => {
    setSelectedProject(project);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  AI Editing Compiler
                </h1>
                <p className="text-xs text-gray-500">Task 1: Upload & Validation Pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                <Shield className="w-4 h-4 text-green-500" />
                <span>MP4 Validated</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                <Database className="w-4 h-4 text-blue-500" />
                <span>IndexedDB</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'projects'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Projects
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Upload Video</h2>
              <p className="text-gray-400">
                Upload an MP4 video file. The system validates file signature, size, and path safety,
                then extracts duration, resolution, and FPS using browser video APIs.
              </p>
            </div>
            <UploadPage onUploadComplete={handleUploadComplete} />

            {/* Pipeline Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/50">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Validation</h3>
                <p className="text-xs text-gray-400">
                  File size check (≤2GB), MP4 magic bytes verification (ftyp box), safe path validation
                </p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/50">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                  <Cpu className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Metadata Extraction</h3>
                <p className="text-xs text-gray-400">
                  Duration, resolution, FPS via HTML5 Video API (browser equivalent of FFprobe)
                </p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/50">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                  <Database className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Persistence</h3>
                <p className="text-xs text-gray-400">
                  Project metadata + video stored in IndexedDB (browser SQLite equivalent)
                </p>
              </div>
            </div>

            {/* Test Results */}
            <div className="mt-8">
              <TestResults />
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Project List */}
            <div className="lg:col-span-1">
              <ProjectList
                onSelectProject={handleSelectProject}
                selectedProjectId={selectedProject?.id}
                refreshTrigger={refreshTrigger}
              />
            </div>

            {/* Video Preview */}
            <div className="lg:col-span-2">
              {selectedProject ? (
                <VideoPreview project={selectedProject} />
              ) : (
                <div className="bg-gray-800/30 rounded-2xl border border-gray-700 p-12 text-center">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400">Select a project</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Choose a project from the list to view its video and metadata
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>AI Editing Compiler v0.1.0</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Task 1: Upload Pipeline</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                System Ready
              </span>
              <span>Vite + React + TypeScript</span>
              <span>IndexedDB Storage</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
