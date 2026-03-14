import { format } from 'date-fns';
import { da } from 'date-fns/locale';

interface CalendarNavProps {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarNav({ currentMonth, onPrev, onNext }: CalendarNavProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-xl leading-none"
      >
        ‹
      </button>
      <h2 className="text-base font-semibold text-gray-800 capitalize">
        {format(currentMonth, 'MMMM yyyy', { locale: da })}
      </h2>
      <button
        onClick={onNext}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-xl leading-none"
      >
        ›
      </button>
    </div>
  );
}
