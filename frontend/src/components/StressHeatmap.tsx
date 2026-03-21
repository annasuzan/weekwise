import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type SyllabusEvent, getWeeklyStress } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StressHeatmapProps {
  events: SyllabusEvent[];
}

const getStressStyle = (level: number) => {
  if (level === 0) return { bg: 'bg-secondary', size: 36, label: 'Chill', emoji: '' };
  if (level <= 2) return { bg: 'bg-stress-low', size: 40, label: 'Low', emoji: '' };
  if (level <= 4) return { bg: 'bg-stress-medium/70', size: 48, label: 'Medium', emoji: '' };
  if (level <= 6) return { bg: 'bg-stress-medium', size: 54, label: 'Busy', emoji: '' };
  if (level <= 8) return { bg: 'bg-stress-high', size: 60, label: 'Heavy', emoji: '' };
  return { bg: 'bg-stress-extreme', size: 66, label: 'Crunch', emoji: '' };
};

const StressHeatmap = ({ events }: StressHeatmapProps) => {
  const weeks = getWeeklyStress(events);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Determine which week is "now"
  const semesterStart = new Date('2026-01-19');
  const today = new Date('2026-03-21');
  const currentWeekIndex = Math.floor((today.getTime() - semesterStart.getTime()) / (7 * 86400000));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Stress Map
        </h3>
        <p className="text-xs text-muted-foreground font-body">Click a blob to see details</p>
      </div>

      {/* Blob grid */}
      <div className="flex flex-wrap gap-2 justify-center py-2">
        {weeks.map((week, i) => {
          const style = getStressStyle(week.level);
          const isSelected = selectedWeek === i;
          const isCurrentWeek = i === currentWeekIndex;

          return (
            <Tooltip key={i} delayDuration={0}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => setSelectedWeek(isSelected ? null : i)}
                  className={`rounded-full flex items-center justify-center transition-all relative ${style.bg} ${
                    isSelected ? 'ring-2 ring-accent ring-offset-2' : ''
                  } ${isCurrentWeek && !isSelected ? 'ring-2 ring-accent ring-offset-1 shadow-md shadow-accent/25' : ''} ${
                    week.level > 6 ? 'text-card' : 'text-foreground/60'
                  }`}
                  style={{ width: style.size, height: style.size }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: isCurrentWeek ? 1.1 : 1,
                    borderRadius: week.level > 6
                      ? '60% 40% 30% 70% / 60% 30% 70% 40%'
                      : '50%',
                  }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <span className={`text-[10px] font-body font-semibold ${isCurrentWeek ? (week.level > 6 ? 'text-white' : 'text-accent') : ''}`}>
                    {isCurrentWeek ? 'You' : `W${week.week}`}
                  </span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-body text-xs">
                <p className="font-semibold">
                  Week {week.week}{isCurrentWeek ? ' (Current)' : ''}: {style.label}
                </p>
                <p className="text-muted-foreground">
                  {new Date(week.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  {' · '}{week.events.length} item{week.events.length !== 1 ? 's' : ''}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-[10px] text-muted-foreground font-body">Less</span>
        {[0, 2, 4, 6, 8, 10].map(level => {
          const style = getStressStyle(level);
          return (
            <div
              key={level}
              className={`rounded-full ${style.bg}`}
              style={{ width: 12 + level, height: 12 + level }}
            />
          );
        })}
        <span className="text-[10px] text-muted-foreground font-body">More</span>
      </div>

      {/* Selected week detail */}
      <AnimatePresence>
        {selectedWeek !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-display font-semibold">
                Week {weeks[selectedWeek].week} — {getStressStyle(weeks[selectedWeek].level).label}
              </h4>
              <span className="text-lg">{getStressStyle(weeks[selectedWeek].level).emoji}</span>
            </div>
            {weeks[selectedWeek].events.length > 0 ? (
              <div className="space-y-1.5">
                {weeks[selectedWeek].events.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs font-body">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      e.type === 'exam' ? 'bg-stress-extreme' :
                      e.type === 'project' ? 'bg-stress-high' :
                      'bg-stress-low'
                    }`} />
                    <span className="text-foreground flex-1">{e.title}</span>
                    <span className="text-muted-foreground text-right shrink-0">{e.subject}</span>
                    {e.weight && <span className="text-muted-foreground shrink-0">{e.weight}%</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-body">Nothing due this week</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StressHeatmap;
