export interface SyllabusEvent {
  id: string;
  title: string;
  subject: string;
  type: 'assignment' | 'exam' | 'project' | 'quiz' | 'lab' | 'participation';
  dueDate: string;
  weight: number | null;
  completed: boolean;
}

/** Backend event shape (snake_case) returned by /parse-syllabus and /upload-pdf */
interface BackendEvent {
  title: string;
  type: string;
  due_date: string;
  weight: number | null;
  subject?: string;
}

/** Convert a backend event to the frontend SyllabusEvent type. */
export function mapBackendEvent(e: BackendEvent, index: number): SyllabusEvent {
  const validTypes = ['assignment', 'exam', 'project', 'quiz', 'lab', 'participation'] as const;
  const eventType = validTypes.includes(e.type as any)
    ? (e.type as SyllabusEvent['type'])
    : 'assignment';

  return {
    id: `parsed-${index}-${Date.now()}`,
    title: e.title || 'Untitled Event',
    subject: e.subject || 'General',
    type: eventType,
    dueDate: e.due_date || '2026-01-01',
    weight: e.weight ?? null,
    completed: false,
  };
}

export interface SubjectColor {
  bg: string;
  text: string;
  border: string;
  accent: string;
  ring: string;
}

const PALETTE: SubjectColor[] = [
  { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', accent: 'bg-rose-500', ring: 'ring-rose-200' },
  { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', accent: 'bg-amber-500', ring: 'ring-amber-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', accent: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', accent: 'bg-blue-500', ring: 'ring-blue-200' },
  { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', accent: 'bg-violet-500', ring: 'ring-violet-200' },
  { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', accent: 'bg-teal-500', ring: 'ring-teal-200' },
];

// Track assigned colors by subject name — sequential, no repeats
const _subjectColorMap = new Map<string, SubjectColor>();
let _nextColorIndex = 0;

export function getSubjectColor(subject: string): SubjectColor {
  if (_subjectColorMap.has(subject)) return _subjectColorMap.get(subject)!;
  const color = PALETTE[_nextColorIndex % PALETTE.length];
  _subjectColorMap.set(subject, color);
  _nextColorIndex++;
  return color;
}

export const MOCK_EVENTS: SyllabusEvent[] = [
  { id: '1', title: 'Class Participation', subject: 'Big Data', type: 'participation', dueDate: '2026-12-31', weight: 5, completed: false },
  { id: '2', title: 'Assignment 1', subject: 'Big Data', type: 'assignment', dueDate: '2026-02-01', weight: null, completed: true },
  { id: '3', title: 'Assignment 2', subject: 'Big Data', type: 'assignment', dueDate: '2026-03-04', weight: null, completed: true },
  { id: '4', title: 'Midterm', subject: 'Big Data', type: 'exam', dueDate: '2026-03-25', weight: 30, completed: false },
  { id: '5', title: 'Assignment 3', subject: 'Big Data', type: 'assignment', dueDate: '2026-04-06', weight: null, completed: false },
  { id: '6', title: 'Assignment 4', subject: 'Big Data', type: 'assignment', dueDate: '2026-04-22', weight: null, completed: false },
  { id: '7', title: 'Final Project', subject: 'Big Data', type: 'project', dueDate: '2026-05-13', weight: 35, completed: false },
  { id: '8', title: 'Problem Sets', subject: 'CS6903', type: 'assignment', dueDate: '2026-12-31', weight: 25, completed: false },
  { id: '9', title: 'Programming Assignments', subject: 'CS6903', type: 'assignment', dueDate: '2026-12-31', weight: null, completed: false },
  { id: '10', title: 'Project Part I', subject: 'CS6903', type: 'project', dueDate: '2026-04-15', weight: null, completed: false },
  { id: '11', title: 'Project Part II', subject: 'CS6903', type: 'project', dueDate: '2026-05-01', weight: null, completed: false },
  { id: '12', title: 'Midterm Exam', subject: 'CS6903', type: 'exam', dueDate: '2026-03-25', weight: 20, completed: false },
  { id: '13', title: 'Final Exam', subject: 'CS6903', type: 'exam', dueDate: '2026-05-12', weight: 30, completed: false },
  { id: '14', title: 'Weekly Programming Labs', subject: 'CS-NY 6903', type: 'lab', dueDate: '2026-12-31', weight: 20, completed: false },
  { id: '15', title: 'Written Problem Sets', subject: 'CS-NY 6903', type: 'assignment', dueDate: '2026-12-31', weight: 20, completed: false },
  { id: '16', title: 'In-class Midterm', subject: 'CS-NY 6903', type: 'exam', dueDate: '2026-03-15', weight: null, completed: false },
  { id: '17', title: 'Final Exam', subject: 'CS-NY 6903', type: 'exam', dueDate: '2026-05-15', weight: 25, completed: false },
];

export function getWeeklyStress(events: SyllabusEvent[]): { week: number; startDate: string; level: number; events: SyllabusEvent[] }[] {
  const semesterStart = new Date('2026-01-19');
  const weeks: { week: number; startDate: string; level: number; events: SyllabusEvent[] }[] = [];
  
  for (let w = 0; w < 18; w++) {
    const weekStart = new Date(semesterStart);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekEvents = events.filter(e => {
      const d = new Date(e.dueDate);
      return d >= weekStart && d < weekEnd;
    });
    
    let stress = 0;
    weekEvents.forEach(e => {
      if (e.type === 'exam') stress += 4;
      else if (e.type === 'project') stress += 3;
      else if (e.type === 'assignment') stress += 2;
      else stress += 1;
      if (e.weight && e.weight >= 25) stress += 2;
    });
    
    weeks.push({
      week: w + 1,
      startDate: weekStart.toISOString().split('T')[0],
      level: Math.min(stress, 10),
      events: weekEvents,
    });
  }
  
  return weeks;
}

export function getDailyTimeline(events: SyllabusEvent[]): { date: string; label: string; events: SyllabusEvent[]; isToday: boolean; isPast: boolean }[] {
  const today = new Date('2026-03-21');
  const days: { date: string; label: string; events: SyllabusEvent[]; isToday: boolean; isPast: boolean }[] = [];
  
  for (let d = -1; d < 14; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    const dayEvents = events.filter(e => e.dueDate === dateStr);
    
    let label: string;
    if (d === -1) label = 'Yesterday';
    else if (d === 0) label = 'Today';
    else if (d === 1) label = 'Tomorrow';
    else label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    
    days.push({
      date: dateStr,
      label,
      events: dayEvents,
      isToday: d === 0,
      isPast: d < 0,
    });
  }
  
  return days;
}
