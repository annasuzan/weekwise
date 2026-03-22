import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, X, Loader2, ChevronDown, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type SyllabusEvent } from '@/lib/types';
import { generateWeeklyPlan } from '@/lib/api';

interface WeeklyPlannerProps {
  events: SyllabusEvent[];
}

const PERSONAS = [
  { id: 'genz', label: 'Gen-Z Bestie', desc: 'Casual, slang, relatable vibes' },
  { id: 'gentle', label: 'Gentle Motivator', desc: 'Warm, kind, encouraging tone' },
  { id: 'drill', label: 'Drill Sergeant', desc: 'GET MOVING! Tough love energy' },
] as const;

const WeeklyPlanner = ({ events }: WeeklyPlannerProps) => {
  const [extras, setExtras] = useState<string[]>([]);
  const [newExtra, setNewExtra] = useState('');
  const [persona, setPersona] = useState<string>('genz');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Get this week's events (next 7 days from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEvents = events.filter(e => {
    const d = new Date(e.dueDate);
    return d >= today && d <= weekEnd && !e.completed;
  });

  const addExtra = () => {
    if (!newExtra.trim()) return;
    setExtras(prev => [...prev, newExtra.trim()]);
    setNewExtra('');
  };

  const removeExtra = (idx: number) => {
    setExtras(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setPlan('');
    setModalOpen(true);
    try {
      const backendEvents = weekEvents.map(e => ({
        title: e.title,
        type: e.type,
        due_date: e.dueDate,
        weight: e.weight,
        subject: e.subject,
      }));
      const data = await generateWeeklyPlan(backendEvents, extras, persona);
      setPlan(data.plan);
    } catch (err) {
      setError('Could not generate plan. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const selectedPersona = PERSONAS.find(p => p.id === persona) || PERSONAS[0];

  // Parse plan into intro message and day lines
  const DAY_PATTERN = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*:/i;
  const allLines = plan.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const introLines: string[] = [];
  const dayLines: string[] = [];
  let foundFirstDay = false;
  
  for (const line of allLines) {
    if (DAY_PATTERN.test(line)) {
      foundFirstDay = true;
    }
    if (foundFirstDay) {
      dayLines.push(line);
    } else {
      introLines.push(line);
    }
  }
  const introMessage = introLines.join(' ');

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-accent" />
          <span className="text-sm font-display font-semibold text-foreground">Weekly Plan</span>
        </div>

        {/* This week's events summary */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground font-body mb-2">
            {weekEvents.length} task{weekEvents.length !== 1 ? 's' : ''} this week
          </p>
          {weekEvents.slice(0, 3).map(e => (
            <div key={e.id} className="text-xs font-body text-foreground py-0.5">
              {e.title} <span className="text-muted-foreground">· {e.subject}</span>
            </div>
          ))}
          {weekEvents.length > 3 && (
            <p className="text-xs text-muted-foreground font-body">+{weekEvents.length - 3} more</p>
          )}
        </div>

        {/* Extra-curricular activities */}
        <div className="mb-4">
          <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Extra Activities
          </p>
          {extras.length > 0 && (
            <div className="space-y-1 mb-2">
              {extras.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-body flex-1">{item}</span>
                  <button onClick={() => removeExtra(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={newExtra}
              onChange={e => setNewExtra(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExtra()}
              placeholder="e.g. Hackathon Saturday"
              className="flex-1 text-xs font-body bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={addExtra}
              className="text-accent hover:text-accent/80 shrink-0"
              disabled={!newExtra.trim()}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Persona selector */}
        <div className="mb-4 relative">
          <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Vibe
          </p>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2.5 text-xs font-body text-foreground hover:border-accent/50 transition-colors"
          >
            <div>
              <span className="font-medium">{selectedPersona.label}</span>
              <span className="text-muted-foreground ml-2">{selectedPersona.desc}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
              >
                {PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPersona(p.id); setDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs font-body transition-colors ${
                      persona === p.id
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="font-medium">{p.label}</span>
                    <span className="text-muted-foreground ml-2">{p.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full gap-2 font-body text-xs"
          size="sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate Weekly Plan
        </Button>
      </div>

      {/* Modal overlay */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
            onClick={() => !loading && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-display font-bold text-foreground">Your Week</h2>
                  <span className="text-xs font-body text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {selectedPersona.label}
                  </span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    <p className="text-sm font-body text-muted-foreground">Generating your plan...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-destructive font-body">{error}</p>
                    <Button onClick={handleGenerate} variant="outline" size="sm" className="mt-3 font-body text-xs">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Persona intro message */}
                    {introMessage && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm font-body text-foreground/80 leading-relaxed italic border-l-2 border-accent pl-3"
                      >
                        {introMessage}
                      </motion.p>
                    )}

                    {/* Day-by-day tasks */}
                    {dayLines.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border">
                        {dayLines.map((line, i) => {
                          const colonIdx = line.indexOf(':');
                          const day = colonIdx > 0 ? line.slice(0, colonIdx).trim() : null;
                          const tasks = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;

                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
                            >
                              {day && (
                                <span className="text-xs font-display font-semibold text-accent w-20 shrink-0 pt-0.5">
                                  {day}
                                </span>
                              )}
                              <span className="text-xs font-body text-foreground leading-relaxed flex-1">
                                {tasks}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              {!loading && plan && (
                <div className="px-6 py-3 border-t border-border flex justify-end">
                  <Button onClick={() => setModalOpen(false)} size="sm" className="font-body text-xs">
                    Done
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WeeklyPlanner;
