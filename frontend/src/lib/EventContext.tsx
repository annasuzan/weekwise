import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { SyllabusEvent } from './types';

interface EventContextType {
  events: SyllabusEvent[];
  setEvents: (events: SyllabusEvent[]) => void;
  hasRealData: boolean;
  
  // Shared handlers for persistence
  addEvent: (e: SyllabusEvent) => void;
  editEvent: (updated: SyllabusEvent) => void;
  removeEvent: (id: string) => void;
  toggleComplete: (id: string) => void;
}

const STORAGE_KEY = 'weekwise_events';

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage immediately
  const [events, setEvents] = useState<SyllabusEvent[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load events from localStorage", e);
      return [];
    }
  });

  // Automatically persist to localStorage on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const addEvent = (e: SyllabusEvent) => setEvents(prev => [...prev, e]);
  
  const editEvent = (updated: SyllabusEvent) => 
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    
  const removeEvent = (id: string) => 
    setEvents(prev => prev.filter(e => e.id !== id));
    
  const toggleComplete = (id: string) => 
    setEvents(prev => prev.map(e => e.id === id ? { ...e, completed: !e.completed } : e));

  const hasRealData = events.length > 0;

  return (
    <EventContext.Provider value={{ 
      events, setEvents, hasRealData,
      addEvent, editEvent, removeEvent, toggleComplete
    }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents must be used within an EventProvider');
  return ctx;
}
