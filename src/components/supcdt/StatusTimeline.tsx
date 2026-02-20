import { useMemo } from 'react';
import { MovimentacaoHistorico, StatusProjeto } from '../../types/projeto';
import { cn, formatBRDate } from '../../lib/utils';
import { formatDistanceStrict, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StatusTimelineProps {
    history: MovimentacaoHistorico[];
    currentStatus: StatusProjeto;
    currentSetor?: string;
    currentData?: Date;
    className?: string;
}

interface TimelineEvent {
    id: string;
    status: string;
    setor?: string;
    startDate: Date;
    endDate?: Date; // undefined means "until now" (for the latest event)
    duration: string;
    days: number;
    notes?: string;
    isCurrent: boolean;
}

export function StatusTimeline({ history, currentStatus, currentSetor, currentData, className }: StatusTimelineProps) {
    const events = useMemo(() => {
        // 1. Sort history by date ascending
        const sortedHistory = [...history].sort((a, b) => a.data.getTime() - b.data.getTime());

        // 2. Process events to calculate durations
        const processedEvents: TimelineEvent[] = [];
        const now = new Date();

        // If we have no history, but we have current data, show at least the current state
        if (sortedHistory.length === 0 && currentData) {
            processedEvents.push({
                id: 'current',
                status: currentStatus,
                setor: currentSetor,
                startDate: currentData,
                endDate: undefined,
                duration: formatDistanceStrict(currentData, now, { locale: ptBR, addSuffix: false }),
                days: differenceInDays(now, currentData),
                notes: 'Estado atual',
                isCurrent: true
            });
            return processedEvents;
        }

        for (let i = 0; i < sortedHistory.length; i++) {
            const entry = sortedHistory[i];
            const nextEntry = sortedHistory[i + 1];

            // End date is the start of the next entry, or "now" if it's the last one
            // However, if it's the last one in history, we should check if it matches current state.
            // Usually the last history entry IS the start of the current state.

            const startDate = entry.data;
            const endDate = nextEntry ? nextEntry.data : now;

            const duration = formatDistanceStrict(startDate, endDate, { locale: ptBR });
            const days = differenceInDays(endDate, startDate);

            processedEvents.push({
                id: entry.id,
                status: entry.statusProjeto,
                setor: entry.setor,
                startDate: startDate,
                endDate: nextEntry ? nextEntry.data : undefined,
                duration: duration,
                days: days,
                notes: entry.notas,
                isCurrent: !nextEntry
            });
        }

        return processedEvents.reverse(); // Show newest first
    }, [history, currentStatus, currentSetor, currentData]);

    if (events.length === 0) {
        return <div className="text-sm text-muted-foreground text-center py-4">Nenhum histórico disponível.</div>;
    }



    const getEventColor = (status: string, sector?: string) => {
        if (sector) {
            const normalized = sector.toLowerCase();
            if (normalized.includes('execução')) return 'bg-blue-500';
            if (normalized.includes('planejamento')) return 'bg-purple-500';
            if (normalized.includes('monitoramento')) return 'bg-orange-500';
            if (normalized.includes('financeiro')) return 'bg-yellow-500';
            if (normalized.includes('jurídico')) return 'bg-red-500';
            return 'bg-green-500';
        }

        // Fallback to status colors (using Tailwind classes to match the bar style)
        const normalized = status.toLowerCase();
        if (normalized.includes('assinado')) return 'bg-emerald-500';
        if (normalized.includes('andamento')) return 'bg-blue-500';
        if (normalized.includes('reprov')) return 'bg-rose-500';
        if (normalized.includes('encerrado')) return 'bg-gray-500';
        return 'bg-gray-400';
    };

    return (
        <div className={cn("space-y-6", className)}>
            {/* Visual Bar */}
            <div className="flex h-4 overflow-hidden rounded-full bg-muted w-full">
                {events.map((event) => (
                    <div
                        key={`${event.id}-bar`}
                        className={cn('h-full transition-all border-r border-background/20 last:border-0 hover:opacity-80', getEventColor(event.status, event.setor))}
                        style={{ flexGrow: event.days || 1 }}
                        title={`${event.status} ${event.setor ? `(${event.setor})` : ''}: ${event.days} dias`}
                    />
                ))}
            </div>

            {/* Detailed List */}
            <div className="space-y-6">
                {events.map((event, index) => {
                    const barColor = getEventColor(event.status, event.setor);
                    // Extract hex color from tailwind class or use a mapping if needed for the dot
                    // For simplicity, we'll keep the dot using the style attribute if we had hex, 
                    // but here we have classes. Let's use the class for the dot too.

                    const isLast = index === events.length - 1;

                    return (
                        <div key={event.id} className="relative pl-8 group">
                            {/* Vertical Line */}
                            {!isLast && (
                                <div
                                    className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-border group-hover:bg-primary/20 transition-colors"
                                    aria-hidden="true"
                                />
                            )}

                            {/* Dot Indicator */}
                            <div
                                className={cn("absolute left-0 top-1.5 h-6 w-6 rounded-full border-2 border-background shadow-sm flex items-center justify-center z-10", barColor)}
                            >
                                <div className="h-2 w-2 rounded-full bg-white/90" />
                            </div>

                            {/* Content Card */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 rounded-lg border border-border/50 bg-card/50 p-3 hover:bg-card hover:shadow-sm transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-foreground">{event.status}</span>
                                        {event.setor && (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                {event.setor}
                                            </span>
                                        )}
                                        {event.isCurrent && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary animate-pulse">
                                                Atual
                                            </span>
                                        )}
                                    </div>
                                    {event.notes && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">{event.notes}</p>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        Início: {formatBRDate(event.startDate)}
                                    </div>
                                </div>

                                {/* Duration Badge */}
                                <div className="flex items-center gap-1.5 shrink-0 bg-secondary/50 px-2.5 py-1.5 rounded-md self-start sm:self-center">
                                    <span className="text-xs font-medium text-secondary-foreground">
                                        ⏱️ {event.days} dias
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        ({event.duration})
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
