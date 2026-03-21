import { createContext, useContext, useState, type ReactNode } from 'react';
import type { SyllabusEvent } from './types';

interface EventContextType {
  events: SyllabusEvent[];
  setEvents: (events: SyllabusEvent[]) => void;
  hasRealData: boolean;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SyllabusEvent[]>([]);
  const hasRealData = events.length > 0;

  return (
    <EventContext.Provider value={{ events, setEvents, hasRealData }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents must be used within an EventProvider');
  return ctx;
}
