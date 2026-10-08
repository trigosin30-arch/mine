import { useEffect, useState } from 'react';
import { Project } from '../types';
import { getAllProjects, deleteProject } from '../lib/storage';
import { formatFileSize, formatDuration } from '../lib/validation';
import { FolderOpen, Trash2, Film, Clock, Monitor } from 'lucide-react';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  selectedProjectId?: string;
  refreshTrigger?: number;
}

export default function ProjectList({ onSelectProject, selectedProjectId, refreshTrigger = 0 }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [refreshTrigger]);

  async function loadProjects() {
    setIsLoading(true);
    try {
      const allProjects = await getAllProjects();
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Delete this project and its video file?')) {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No projects yet</p>
        <p className="text-sm mt-1">Upload a video to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">
        Projects ({projects.length})
      </h3>
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onSelectProject(project)}
          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
            selectedProjectId === project.id
              ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selectedProjectId === project.id ? 'bg-blue-500/20' : 'bg-gray-700'
              }`}>
                <Film className="w-5 h-5 text-gray-300" />
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-medium text-sm truncate">{project.name}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(project.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    {project.width}×{project.height}
                  </span>
                  <span>{formatFileSize(project.fileSize)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(project.id, e)}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 font-mono truncate">
            {project.fps} FPS • {project.mimeType}
          </div>
        </div>
      ))}
    </div>
  );
}
