import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const Index = () => {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <BookOpen className="w-7 h-7 text-accent-foreground" />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground leading-tight mb-4">
          Plan your semester,<br />
          <span className="text-accent">stress-free</span>
        </h1>
        <p className="text-lg text-muted-foreground font-body mb-10 max-w-lg mx-auto leading-relaxed">
          Drop your syllabi, and let WeekWise map out your entire semester. See when crunch weeks hit before they hit you.
        </p>

        <div className="flex items-center justify-center gap-3 mb-16">
          <Link to="/upload">
            <Button size="lg" className="gap-2 font-body text-base px-8 shadow-lg shadow-accent/20">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="font-body text-base px-8">
              View Demo
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { icon: BookOpen, label: 'Upload syllabi', desc: 'PDF or text' },
            { icon: Brain, label: 'AI extraction', desc: 'Dates & weights' },
            { icon: CalendarDays, label: 'Stress heatmap', desc: 'Week by week' },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-2">
                <f.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-body font-medium text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground font-body">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
