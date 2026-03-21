import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type SyllabusEvent } from '@/lib/types';

interface EditTaskDialogProps {
  event: SyllabusEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: SyllabusEvent) => void;
  subjects: string[];
}

const TASK_TYPES: SyllabusEvent['type'][] = ['assignment', 'exam', 'project', 'quiz', 'lab', 'participation'];

const EditTaskDialog = ({ event, open, onOpenChange, onSave, subjects }: EditTaskDialogProps) => {
  const [form, setForm] = useState<SyllabusEvent | null>(null);

  const currentEvent = form ?? event;
  if (!currentEvent) return null;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && event) setForm({ ...event });
    if (!isOpen) setForm(null);
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (currentEvent) {
      onSave(currentEvent);
      onOpenChange(false);
      setForm(null);
    }
  };

  const update = (partial: Partial<SyllabusEvent>) => {
    setForm(prev => prev ? { ...prev, ...partial } : null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-body text-muted-foreground">Title</Label>
            <Input
              value={currentEvent.title}
              onChange={e => update({ title: e.target.value })}
              className="font-body bg-background border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-body text-muted-foreground">Subject</Label>
              <Select value={currentEvent.subject} onValueChange={v => update({ subject: v })}>
                <SelectTrigger className="font-body bg-background border-border">
                  <SelectValue />
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
              <Select value={currentEvent.type} onValueChange={v => update({ type: v as SyllabusEvent['type'] })}>
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
                value={currentEvent.dueDate}
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
                value={currentEvent.weight ?? ''}
                onChange={e => update({ weight: e.target.value ? Number(e.target.value) : null })}
                placeholder="—"
                className="font-body bg-background border-border"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => handleOpen(false)} className="font-body text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} className="font-body text-sm">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
