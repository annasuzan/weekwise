import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Target, Plus, X } from 'lucide-react';
import { type SyllabusEvent, getSubjectColor } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface DailyTodoProps {
  events: SyllabusEvent[];
  onToggleComplete: (id: string) => void;
}

interface TodoItem {
  id: string;
  label: string;
  done: boolean;
  eventId?: string;
}

function generateSuggestedTodos(events: SyllabusEvent[]): TodoItem[] {
  const today = new Date('2026-03-21');
  const upcoming = events
    .filter(e => !e.completed && new Date(e.dueDate) >= today)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const todos: TodoItem[] = [];

  // Tasks due today
  const dueToday = upcoming.filter(e => e.dueDate === '2026-03-21');
  dueToday.forEach(e => {
    todos.push({ id: `todo-${e.id}`, label: `Finish "${e.title}" (due today!)`, done: false, eventId: e.id });
  });

  // Exams in the next 7 days — suggest study
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const soonExams = upcoming.filter(e => e.type === 'exam' && new Date(e.dueDate) <= nextWeek);
  soonExams.forEach(e => {
    todos.push({ id: `study-${e.id}`, label: `Study for ${e.subject} ${e.title}`, done: false, eventId: e.id });
  });

  // Next 2 closest assignments/projects
  const nextTasks = upcoming
    .filter(e => e.type !== 'exam' && e.type !== 'participation' && !dueToday.includes(e))
    .slice(0, 2);
  nextTasks.forEach(e => {
    const daysLeft = Math.ceil((new Date(e.dueDate).getTime() - today.getTime()) / 86400000);
    todos.push({
      id: `prep-${e.id}`,
      label: `Work on "${e.title}" (${daysLeft}d left)`,
      done: false,
      eventId: e.id,
    });
  });

  return todos.slice(0, 5);
}

const DailyTodo = ({ events, onToggleComplete }: DailyTodoProps) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => generateSuggestedTodos(events));
  const [newTodo, setNewTodo] = useState('');
  const [adding, setAdding] = useState(false);

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        // Also toggle the linked event if exists
        if (t.eventId && !t.done) onToggleComplete(t.eventId);
        return { ...t, done: !t.done };
      }
      return t;
    }));
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, { id: `custom-${Date.now()}`, label: newTodo.trim(), done: false }]);
    setNewTodo('');
    setAdding(false);
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const doneCount = todos.filter(t => t.done).length;
  const progress = todos.length > 0 ? (doneCount / todos.length) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <span className="text-sm font-display font-semibold text-foreground">Today's Plan</span>
        </div>
        <span className="text-xs font-body text-muted-foreground">{doneCount}/{todos.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-border rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Todo items */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {todos.map(todo => {
            const linkedEvent = todo.eventId ? events.find(e => e.id === todo.eventId) : null;
            const color = linkedEvent ? getSubjectColor(linkedEvent.subject) : null;

            return (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                  todo.done ? 'opacity-50' : 'hover:bg-secondary/50'
                }`}
              >
                <button onClick={() => toggleTodo(todo.id)} className="shrink-0">
                  {todo.done ? (
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground hover:text-accent transition-colors" />
                  )}
                </button>
                <span className={`flex-1 text-xs font-body ${todo.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {todo.label}
                </span>
                {/* {color && (
                  <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 font-body ${color.text}`}>
                    {linkedEvent!.subject}
                  </Badge>
                )} */}
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add custom todo */}
      {adding ? (
        <div className="flex items-center gap-2 mt-3">
          <input
            autoFocus
            value={newTodo}
            onChange={e => setNewTodo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder="What else today?"
            className="flex-1 text-xs font-body bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={addTodo} className="text-xs font-body text-accent hover:text-accent/80">Add</button>
          <button onClick={() => { setAdding(false); setNewTodo(''); }} className="text-xs font-body text-muted-foreground">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 mt-3 text-xs font-body text-muted-foreground hover:text-accent transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add task
        </button>
      )}
    </div>
  );
};

export default DailyTodo;
