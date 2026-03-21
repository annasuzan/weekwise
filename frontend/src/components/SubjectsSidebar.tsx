import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { type SyllabusEvent, getSubjectColor } from '@/lib/types';

interface SubjectsSidebarProps {
  events: SyllabusEvent[];
  selectedSubject: string | null;
  onSelectSubject: (subject: string | null) => void;
  onToggleComplete: (id: string) => void;
}

const SubjectsSidebar = ({ events, selectedSubject, onSelectSubject, onToggleComplete }: SubjectsSidebarProps) => {
  const subjects = [...new Set(events.map(e => e.subject))];

  return (
    <div className="space-y-2">
      {/* All subjects button */}
      <button
        onClick={() => onSelectSubject(null)}
        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-body font-medium transition-all ${
          selectedSubject === null
            ? 'bg-accent text-accent-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-secondary'
        }`}
      >
        All Subjects
      </button>

      {subjects.map((subject, i) => {
        const subjectEvents = events.filter(e => e.subject === subject);
        const completedCount = subjectEvents.filter(e => e.completed).length;
        const color = getSubjectColor(subject);
        const isSelected = selectedSubject === subject;
        const upcomingCount = subjectEvents.filter(e => !e.completed).length;
        const progress = subjectEvents.length > 0 ? (completedCount / subjectEvents.length) * 100 : 0;

        return (
          <motion.div
            key={subject}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <button
              onClick={() => onSelectSubject(isSelected ? null : subject)}
              className={`w-full text-left rounded-xl transition-all group ${
                isSelected
                  ? `${color.bg} ${color.border} border-2 shadow-sm`
                  : 'hover:bg-secondary border-2 border-transparent'
              }`}
            >
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-display font-semibold ${isSelected ? color.text : 'text-foreground'}`}>
                    {subject}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                  <motion.div
                    className={`h-full rounded-full ${color.accent}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-body">
                    {completedCount}/{subjectEvents.length} done
                  </span>
                  {upcomingCount > 0 && (
                    <span className={`text-xs font-medium ${color.text}`}>
                      {upcomingCount} upcoming
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Expanded task list */}
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-2 pb-2 space-y-1 mt-1"
              >
                {subjectEvents.map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-card transition-colors"
                  >
                    <button onClick={() => onToggleComplete(event.id)} className="shrink-0">
                      {event.completed ? (
                        <CheckCircle2 className={`w-4 h-4 ${color.text}`} />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground hover:text-accent transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-body truncate ${event.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {event.title}
                      </p>
                    </div>
                    {event.weight && (
                      <span className="text-[10px] text-muted-foreground font-body shrink-0">{event.weight}%</span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default SubjectsSidebar;
