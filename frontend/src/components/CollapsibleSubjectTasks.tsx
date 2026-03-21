import { useState } from 'react';
import { ChevronDown, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type SyllabusEvent, getSubjectColor } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface CollapsibleSubjectTasksProps {
  events: SyllabusEvent[];
  onToggleComplete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  assignment: 'Assignment',
  exam: 'Exam',
  project: 'Project',
  quiz: 'Quiz',
  lab: 'Lab',
  participation: 'Participation',
};

const CollapsibleSubjectTasks = ({ events, onToggleComplete }: CollapsibleSubjectTasksProps) => {
  const subjects = [...new Set(events.map(e => e.subject))];
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(subjects.map(s => [s, true]))
  );

  const toggle = (subject: string) => {
    setExpanded(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  return (
    <div className="space-y-3">
      {subjects.map(subject => {
        const subjectEvents = events.filter(e => e.subject === subject);
        const completedCount = subjectEvents.filter(e => e.completed).length;
        const color = getSubjectColor(subject);
        const isOpen = expanded[subject];

        return (
          <div key={subject} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(subject)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 transition-colors"
            >
              <span className={`px-3 py-1 rounded-md text-xs font-body font-semibold ${color.bg} ${color.text}`}>
                {subject}
              </span>
              <span className="text-sm text-muted-foreground font-body">
                {completedCount}/{subjectEvents.length} done
              </span>
              {/* Progress bar */}
              <div className="flex-1 mx-3">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedCount / subjectEvents.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className="border-t border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-muted-foreground font-body border-b border-border">
                          <th className="text-left px-5 py-2.5 font-medium">Title</th>
                          <th className="text-left px-3 py-2.5 font-medium">Type</th>
                          <th className="text-left px-3 py-2.5 font-medium">Due Date</th>
                          <th className="text-left px-3 py-2.5 font-medium">Weight</th>
                          <th className="text-right px-5 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectEvents.map((event, idx) => (
                          <motion.tr
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
                          >
                            <td className="px-5 py-3">
                              <span className={`text-sm font-body ${event.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {event.title}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant="secondary" className="text-xs font-body font-normal">
                                {TYPE_LABELS[event.type] || event.type}
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-sm text-muted-foreground font-body flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(event.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-sm text-muted-foreground font-body">
                                {event.weight ? `${event.weight}%` : '—'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => onToggleComplete(event.id)}
                                className="inline-flex items-center gap-1.5 text-sm font-body transition-colors"
                              >
                                {event.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-accent" />
                                ) : (
                                  <Circle className="w-5 h-5 text-muted-foreground hover:text-accent" />
                                )}
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default CollapsibleSubjectTasks;
