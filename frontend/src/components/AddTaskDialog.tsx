import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type SyllabusEvent } from '@/lib/types';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (event: SyllabusEvent) => void;
  subjects: string[];
}

const TASK_TYPES: SyllabusEvent['type'][] = ['assignment', 'exam', 'project', 'quiz', 'lab', 'participation'];

const EMPTY_FORM: SyllabusEvent = {
  id: '',
  title: '',
  type: 'assignment',
  dueDate: '',
  weight: null,
  subject: '',
  completed: false,
};

const AddTaskDialog = ({ open, onOpenChange, onAdd, subjects }: AddTaskDialogProps) => {
  const [form, setForm] = useState<SyllabusEvent>({ ...EMPTY_FORM });

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        id: `task-${Date.now()}`,
        subject: subjects[0] || '',
      });
    }
  }, [open, subjects]);

  const update = (partial: Partial<SyllabusEvent>) => {
    setForm(prev => ({ ...prev, ...partial }));
  };

  const handleAdd = () => {
    if (!form.title.trim() || !form.dueDate || !form.subject) return;
    onAdd(form);
    onOpenChange(false);
  };

  const canSave = form.title.trim() && form.dueDate && form.subject;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-body text-muted-foreground">Title</Label>
            <Input
              value={form.title}
              onChange={e => update({ title: e.target.value })}
              placeholder="e.g. Midterm Exam"
              className="font-body bg-background border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-body text-muted-foreground">Subject</Label>
              <Select value={form.subject} onValueChange={v => update({ subject: v })}>
                <SelectTrigger className="font-body bg-background border-border">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s} className="font-body">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-body text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={v => update({ type: v as SyllabusEvent['type'] })}>
                <SelectTrigger className="font-body bg-background border-border capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="font-body capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-body text-muted-foreground">Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => update({ dueDate: e.target.value })}
                className="font-body bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-body text-muted-foreground">Weight (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.weight ?? ''}
                onChange={e => update({ weight: e.target.value ? Number(e.target.value) : null })}
                placeholder="Optional"
                className="font-body bg-background border-border"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-body text-sm">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!canSave} className="font-body text-sm">
              Add Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
