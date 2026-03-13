'use client';

import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isToday, isSameDay } from 'date-fns';

const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

/** Convert JS day-of-week (0=Sun) to Monday-first index (0=Mon). */
function mondayDow(date: Date): number {
  return (getDay(date) + 6) % 7;
}

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  highlightedDates: Date[];
  registeredDates?: Date[];
  selectedDate?: Date | null;
  onDayClick?: (date: Date) => void;
}

export function CalendarGrid({
  year,
  month,
  highlightedDates,
  registeredDates = [],
  selectedDate,
  onDayClick,
}: CalendarGridProps) {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
  const padding = mondayDow(monthStart);
  const cells: (Date | null)[] = [...Array(padding).fill(null), ...days];

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-gray-400 py-1 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;

          const highlighted = highlightedDates.some((d) => isSameDay(d, day));
          const registered = registeredDates.some((d) => isSameDay(d, day));
          const today = isToday(day);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;

          const baseClasses =
            'relative flex flex-col items-center justify-center py-2 rounded-lg text-sm font-medium transition-all select-none';

          const stateClasses = selected
            ? 'bg-brand-600 text-white shadow-sm'
            : today
            ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300'
            : highlighted || registered
            ? 'text-gray-900 hover:bg-gray-100'
            : 'text-gray-400 hover:bg-gray-50';

          const cursorClass = onDayClick ? 'cursor-pointer' : 'cursor-default';

          // Dot colour: green if registered, blue if just highlighted
          const dotColor = selected
            ? 'bg-white/70'
            : registered
            ? 'bg-green-500'
            : 'bg-brand-500';

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              className={`${baseClasses} ${stateClasses} ${cursorClass}`}
            >
              <span>{format(day, 'd')}</span>
              {(highlighted || registered) && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${dotColor}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
