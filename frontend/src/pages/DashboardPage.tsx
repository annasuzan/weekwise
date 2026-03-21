import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CalendarDays, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { MOCK_EVENTS, type SyllabusEvent } from '@/lib/types';
import SubjectsSidebar from '@/components/SubjectsSidebar';
import AdaptiveTimeline from '@/components/AdaptiveTimeline';
import StressHeatmap from '@/components/StressHeatmap';
import DailyTodo from '@/components/DailyTodo';

const DashboardPage = () => {
  const [events, setEvents] = useState<SyllabusEvent[]>(MOCK_EVENTS);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const toggleComplete = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
  };

  const editEvent = (updated: SyllabusEvent) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.completed).length;
  const upcomingExams = events.filter(e => e.type === 'exam' && !e.completed).length;
  const subjects = [...new Set(events.map(e => e.subject))].length;

  const stats = [
    { label: 'Tasks', value: totalEvents, icon: CalendarDays, color: 'text-accent' },
    { label: 'Done', value: completedEvents, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Exams', value: upcomingExams, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Subjects', value: subjects, icon: BookOpen, color: 'text-blue-500' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Stats bar */}
      <div className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-lg font-display font-bold text-foreground">{stat.value}</span>
                  <span className="text-xs text-muted-foreground font-body">{stat.label}</span>
                </motion.div>
              ))}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-body font-medium hover:bg-accent/20 transition-colors">
              <Zap className="w-3.5 h-3.5" />
              Fix my week
            </button>
          </div>
        </div>
      </div>

      {/* 3-zone layout */}
      <div className="container py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT: Subjects sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-3"
          >
            <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Subjects
            </h3>
            <SubjectsSidebar
              events={events}
              selectedSubject={selectedSubject}
              onSelectSubject={setSelectedSubject}
              onToggleComplete={toggleComplete}
            />
          </motion.aside>

          {/* CENTER: Adaptive timeline */}
          <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-6"
          >
            <AdaptiveTimeline
              events={events}
              selectedSubject={selectedSubject}
              onToggleComplete={toggleComplete}
              onEditEvent={editEvent}
            />
          </motion.main>

          {/* RIGHT: Daily todo + Stress heatmap */}
          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-3 space-y-6"
          >
            <DailyTodo events={events} onToggleComplete={toggleComplete} />
            <StressHeatmap events={events} />
          </motion.aside>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
