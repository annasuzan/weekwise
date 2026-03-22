import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { syncToCalendar } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import type { SyllabusEvent } from '@/lib/types';

interface SyncContextType {
  syncing: boolean;
  handleSync: (events: SyllabusEvent[]) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = useCallback(async (events: SyllabusEvent[]) => {
    if (!events.length) {
      toast({ title: "No events to sync", variant: "destructive" });
      return;
    }
    console.log("First event keys:", Object.keys(events[0]));
    console.log("First event:", events[0]);                  
    try {
      setSyncing(true);
      const result = await syncToCalendar(events);
      console.log("Sync results:", JSON.stringify(result.results, null, 2)); 
      toast({
        title: `Synced ${result.synced} event${result.synced !== 1 ? 's' : ''} to Google Calendar`,
        description: result.failed > 0 ? `${result.failed} failed to sync` : "All events added!",
      });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  return (
    <SyncContext.Provider value={{ syncing, handleSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext)!;
