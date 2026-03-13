'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  body: z.string().min(1, 'Kommentaren må ikke være tom').max(2000),
});

type FormValues = z.infer<typeof schema>;

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>;
  isLoading?: boolean;
}

export function CommentForm({ onSubmit, isLoading }: CommentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function handleFormSubmit(data: FormValues) {
    await onSubmit(data.body);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-2">
      <textarea
        {...register('body')}
        rows={3}
        className="input resize-none"
        placeholder="Skriv en kommentar…"
        disabled={isLoading}
      />
      {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
      <button type="submit" disabled={isLoading} className="btn-primary self-end">
        {isLoading ? 'Sender…' : 'Send kommentar'}
      </button>
    </form>
  );
}
