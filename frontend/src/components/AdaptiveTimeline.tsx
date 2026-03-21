import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Sparkles, Pencil } from 'lucide-react';
import { type SyllabusEvent, getDailyTimeline, getSubjectColor } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import EditTaskDialog from '@/components/EditTaskDialog';

interface AdaptiveTimelineProps {
  events: SyllabusEvent[];
  selectedSubject: string | null;
  onToggleComplete: (id: string) => void;
  onEditEvent: (updated: SyllabusEvent) => void;
}

const TYPE_LABELS: Record<string, string> = {
  assignment: 'Assignment',
  exam: 'Exam',
  project: 'Project',
  quiz: 'Quiz',
  lab: 'Lab',
  participation: 'Participation',
};

const AdaptiveTimeline = ({ events, selectedSubject, onToggleComplete, onEditEvent }: AdaptiveTimelineProps) => {
  const [editingEvent, setEditingEvent] = useState<SyllabusEvent | null>(null);

  const filteredEvents = selectedSubject
    ? events.filter(e => e.subject === selectedSubject)
    : events;
  
  const timeline = getDailyTimeline(filteredEvents);
  const daysWithEvents = timeline.filter(d => d.events.length > 0 || d.isToday);

  const upcoming = filteredEvents
    .filter(e => !e.completed && new Date(e.dueDate) >= new Date('2026-03-21'))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 12);

  const subjects = [...new Set(events.map(e => e.subject))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">
          {selectedSubject || 'All Tasks'}
        </h2>
        <p className="text-sm text-muted-foreground font-body mt-0.5">
          {upcoming.length} upcoming · {filteredEvents.filter(e => e.completed).length} completed
        </p>
      </div>

      {/* Today section */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
          <span className="text-sm font-display font-semibold text-foreground">Today</span>
          <span className="text-xs text-muted-foreground font-body">Mar 21</span>
        </div>
        
        {daysWithEvents.find(d => d.isToday)?.events.length ? (
          <div className="space-y-2">
            {daysWithEvents.find(d => d.isToday)?.events.map(event => (
              <TaskCard key={event.id} event={event} onToggle={onToggleComplete} onEdit={setEditingEvent} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-body">Nothing due today — you're ahead!</span>
          </div>
        )}
      </div>

      {/* Upcoming tasks */}
      <div>
        <h3 className="text-sm font-display font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Coming Up
        </h3>
        <div className="space-y-2">
          {upcoming.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <TaskCard event={event} onToggle={onToggleComplete} onEdit={setEditingEvent} showDate />
            </motion.div>
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground font-body py-4 text-center">
              All caught up!
            </p>
          )}
        </div>
      </div>

      <EditTaskDialog
        event={editingEvent}
        open={!!editingEvent}
        onOpenChange={open => { if (!open) setEditingEvent(null); }}
        onSave={onEditEvent}
        subjects={subjects}
      />
    </div>
  );
};

function TaskCard({ event, onToggle, onEdit, showDate }: { 
  event: SyllabusEvent; 
  onToggle: (id: string) => void; 
  onEdit: (event: SyllabusEvent) => void;
  showDate?: boolean;
}) {
  const color = getSubjectColor(event.subject);
  const isUrgent = event.type === 'exam' || (event.weight && event.weight >= 25);

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm ${
      event.completed
        ? 'bg-secondary/50 border-border opacity-60'
        : isUrgent
          ? `${color.bg} ${color.border} border`
          : 'bg-card border-border hover:border-muted-foreground/30'
    }`}>
      <button onClick={() => onToggle(event.id)} className="shrink-0">
        {event.completed ? (
          <CheckCircle2 className="w-5 h-5 text-accent" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body font-medium ${event.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-body ${color.text}`}>{event.subject}</span>
          {showDate && (
            <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {event.weight && (
          <span className="text-xs text-muted-foreground font-body">{event.weight}%</span>
        )}
        <Badge variant="secondary" className="text-[10px] font-body font-normal px-2 py-0.5">
          {TYPE_LABELS[event.type] || event.type}
        </Badge>
        <button
          onClick={() => onEdit(event)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-secondary"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export default AdaptiveTimeline;
