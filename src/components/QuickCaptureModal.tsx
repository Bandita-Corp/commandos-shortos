import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Tag as TagIcon, 
  FolderOpen, 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Hash,
  Loader2
} from 'lucide-react';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured: () => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptured,
}) => {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [targetFile, setTargetFile] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load current vault file setting
      window.electronAPI.getSettings().then((res) => {
        if (res.success && res.data?.obsidianVaultFile) {
          setTargetFile(res.data.obsidianVaultFile);
        }
      });
      setFeedback(null);
    }
  }, [isOpen]);

  // Extract hashtags live from content
  const detectedTags = Array.from(
    content.matchAll(/#([a-zA-Z0-9_\-]+)/g),
    (m) => m[1]
  );

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const handleSelectVaultFile = async () => {
    const res = await window.electronAPI.selectVaultFile();
    if (res.success && res.data) {
      setTargetFile(res.data);
      // Persist chosen vault path
      await window.electronAPI.saveSettings({ obsidianVaultFile: res.data });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    // Merge manual tags & auto-detected hashtags
    const manualTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const mergedTags = Array.from(new Set([...detectedTags, ...manualTags]));

    try {
      const res = await window.electronAPI.captureObsidianNote({
        filePath: targetFile,
        content: content.trim(),
        tags: mergedTags,
      });

      if (res.success) {
        setFeedback({
          success: true,
          message: `Captured ${wordCount} words to Obsidian Vault!`,
        });
        setContent('');
        setTagsInput('');
        onCaptured();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({
          success: false,
          message: res.error || 'Failed to append note to Obsidian.',
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Quick capture error.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-[#000] bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel border-cyan-500/30 rounded-3xl w-full max-w-2xl bg-gradient-to-b from-[#151824] to-[#0f111a] shadow-2xl overflow-hidden border">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-purple/20 border border-accent-purple/40 text-accent-purple">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Obsidian Quick Capture
              </h3>
              <p className="text-xs text-slate-400">
                Hotkey shortcut: <span className="font-mono text-accent-cyan bg-slate-800 px-1.5 py-0.5 rounded">Ctrl+Shift+O</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target File Config Bar */}
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-300 truncate mr-3">
              <FileText className="w-4 h-4 text-accent-cyan flex-shrink-0" />
              <span className="font-semibold text-slate-400">Target File:</span>
              <span className="font-mono text-slate-200 truncate">{targetFile || 'Default (userData/QuickCapture.md)'}</span>
            </div>
            <button
              type="button"
              onClick={handleSelectVaultFile}
              className="flex items-center gap-1.5 text-xs text-accent-cyan hover:text-white bg-accent-cyan/10 hover:bg-accent-cyan/20 px-3 py-1.5 rounded-lg border border-accent-cyan/30 transition-all flex-shrink-0"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Browse Vault
            </button>
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="font-medium text-slate-300">Note Content (Markdown supported)</label>
              <span className="font-mono text-accent-cyan bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                {wordCount} words
              </span>
            </div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Capture your thought, task, or meeting note... Use #tags directly in text!"
              className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/60 transition-all font-sans leading-relaxed resize-none"
              autoFocus
            />
          </div>

          {/* Tags Input & Detected tags */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-accent-cyan" />
              Additional Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. work, idea, priority"
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-cyan/60 transition-all"
            />

            {detectedTags.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Detected in text:</span>
                <div className="flex flex-wrap gap-1.5">
                  {detectedTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent-purple/20 text-purple-300 border border-purple-500/30"
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
                feedback.success
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg glow-purple transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Save to Obsidian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
