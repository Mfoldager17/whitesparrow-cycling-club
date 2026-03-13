'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z
  .object({
    type: z.enum(['event', 'ride']),
    title: z.string().min(3, 'Minimum 3 tegn'),
    description: z.string().optional(),
    startsAt: z.string().min(1, 'Påkrævet'),
    endsAt: z.string().optional(),
    startLocation: z.string().optional(),
    approxKm: z.coerce.number().int().positive().optional().or(z.literal('')),
    difficulty: z.enum(['easy', 'moderate', 'hard', 'extreme']).optional(),
    maxParticipants: z.coerce.number().int().positive().optional().or(z.literal('')),
    routeUrl: z.string().url('Ugyldig URL').optional().or(z.literal('')),
  })
  .refine(
    (d) => !d.endsAt || !d.startsAt || new Date(d.endsAt) > new Date(d.startsAt),
    { message: 'Sluttidspunkt skal være efter starttidspunkt', path: ['endsAt'] },
  );

type FormValues = z.infer<typeof schema>;

interface ActivityFormProps {
  defaultValues?: Partial<FormValues>;
  isAdmin: boolean;
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
}

export function ActivityForm({ defaultValues, isAdmin, onSubmit, isLoading }: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ride', ...defaultValues },
  });

  function handleValidSubmit(values: FormValues) {
    // Strip empty strings so optional fields are omitted from the API payload
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    ) as FormValues;
    return onSubmit(cleaned);
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="space-y-5">
      {/* Type – only admins see event option */}
      {isAdmin && (
        <div>
          <label className="label">Type</label>
          <select {...register('type')} className="input">
            <option value="ride">Tur (alle)</option>
            <option value="event">Klubarrangement (admin)</option>
          </select>
          {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="label">Titel *</label>
        <input {...register('title')} className="input" placeholder="F.eks. Søndagstur til Dyrehaven" />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="label">Beskrivelse</label>
        <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Fortæl lidt om turen..." />
      </div>

      {/* Date/time row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Start *</label>
          <input type="datetime-local" {...register('startsAt')} className="input" />
          {errors.startsAt && <p className="mt-1 text-xs text-red-600">{errors.startsAt.message}</p>}
        </div>
        <div>
          <label className="label">Slut (valgfrit)</label>
          <input type="datetime-local" {...register('endsAt')} className="input" />
          {errors.endsAt && <p className="mt-1 text-xs text-red-600">{errors.endsAt.message}</p>}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="label">Startsted</label>
        <input {...register('startLocation')} className="input" placeholder="F.eks. Klampenborg parkeringsplads" />
      </div>

      {/* km + difficulty row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Ca. km</label>
          <input type="number" {...register('approxKm')} className="input" placeholder="45" />
        </div>
        <div>
          <label className="label">Sværhedsgrad</label>
          <select {...register('difficulty')} className="input">
            <option value="">Ikke angivet</option>
            <option value="easy">Let</option>
            <option value="moderate">Moderat</option>
            <option value="hard">Hård</option>
            <option value="extreme">Ekstrem</option>
          </select>
        </div>
      </div>

      {/* Max participants */}
      <div>
        <label className="label">Max deltagere (blank = ubegrænset)</label>
        <input type="number" {...register('maxParticipants')} className="input" placeholder="20" />
      </div>

      {/* Route URL */}
      <div>
        <label className="label">Rute-link (Komoot, Strava…)</label>
        <input {...register('routeUrl')} className="input" placeholder="https://www.komoot.com/tour/..." />
        {errors.routeUrl && <p className="mt-1 text-xs text-red-600">{errors.routeUrl.message}</p>}
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isLoading} className="btn-primary w-full">
          {isLoading ? 'Gemmer…' : 'Gem aktivitet'}
        </button>
      </div>
    </form>
  );
}
