'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthControllerRegister } from '@/api/generated/auth/auth';

const schema = z.object({
  fullName: z.string().min(2, 'Minimum 2 tegn'),
  email: z.string().email('Ugyldig e-mail'),
  password: z.string().min(8, 'Minimum 8 tegn'),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { mutateAsync, isPending, error } = useAuthControllerRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    const res = await mutateAsync({ data: { ...data, phone: data.phone || undefined } });
    login(res.data.userId, res.data.role, res.data.accessToken, res.data.refreshToken);
    router.push('/activities');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Bliv medlem</h1>
        <p className="text-sm text-gray-500 mb-6">
          Har du allerede en konto?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">
            Log ind her
          </Link>
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Noget gik galt. Prøv igen eller tjek om e-mailen allerede er i brug.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Fulde navn *</label>
            <input {...register('fullName')} className="input" autoComplete="name" />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input type="email" {...register('email')} className="input" autoComplete="email" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Telefon</label>
            <input type="tel" {...register('phone')} className="input" autoComplete="tel" />
          </div>
          <div>
            <label className="label">Adgangskode *</label>
            <input type="password" {...register('password')} className="input" autoComplete="new-password" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
            {isPending ? 'Opretter…' : 'Opret konto'}
          </button>
        </form>
      </div>
    </div>
  );
}
