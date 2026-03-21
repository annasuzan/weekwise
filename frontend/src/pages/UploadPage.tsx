import { useState, useCallback } from 'react';
import { FileUp, Type, ArrowRight, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
  const [mode, setMode] = useState<'text' | 'pdf'>('text');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleParse = () => {
    // In a real app, this would send to an AI backend for parsing
    navigate('/dashboard');
  };

  return (
    <div className="container max-w-3xl py-12 animate-fade-in">
      <h1 className="text-4xl font-display font-bold text-foreground mb-3">Upload Syllabus</h1>
      <p className="text-muted-foreground font-body text-lg mb-8">
        Upload PDFs or paste text. We'll extract all important dates, exams, and assignments across all your courses.
      </p>

      {/* Mode Toggle */}
      <div className="flex bg-secondary rounded-lg p-1 w-fit mb-8">
        <button
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-body font-medium transition-all ${
            mode === 'text' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Type className="w-4 h-4" />
          Paste Text
        </button>
        <button
          onClick={() => setMode('pdf')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-body font-medium transition-all ${
            mode === 'pdf' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileUp className="w-4 h-4" />
          Upload PDFs
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-card border border-border rounded-xl p-8">
        <AnimatePresence mode="wait">
          {mode === 'text' ? (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste your syllabus here. Example:\n\nMidterm Exam - April 15, 2026 - 30%\nFinal Exam - June 10, 2026 - 40%\nResearch Paper due 2026-05-01 worth 15%\nProblem Set 1 - 04/01/2026 - 5%\nProblem Set 2 - 2026-04-20 - 5%\nGroup Project due May 20, 2026 - 5%`}
                className="min-h-[280px] resize-none bg-background font-body text-sm leading-relaxed"
              />
            </motion.div>
          ) : (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragging
                    ? 'border-accent bg-accent/5 scale-[1.01]'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <FileUp className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-foreground font-body font-medium mb-1">
                  Drag & drop PDF files here
                </p>
                <p className="text-muted-foreground text-sm font-body mb-4">
                  or click to browse
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  id="pdf-upload"
                  onChange={(e) => {
                    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('pdf-upload')?.click()}>
                  Browse Files
                </Button>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-4 py-2.5">
                      <File className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm font-body flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground font-body">
            Supports YYYY-MM-DD, MM/DD/YYYY, and Month Day, Year formats
          </p>
          <Button
            onClick={handleParse}
            className="gap-2 font-body"
            disabled={mode === 'text' ? !text.trim() : files.length === 0}
          >
            Parse Syllabus
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
