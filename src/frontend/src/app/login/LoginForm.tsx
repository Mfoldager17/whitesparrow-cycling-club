'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthControllerLogin } from '@/api/generated/auth/auth';

const schema = z.object({
  email: z.string().email('Ugyldig e-mail'),
  password: z.string().min(1, 'Adgangskode påkrævet'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();

  const { mutateAsync, isPending, error } = useAuthControllerLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    const res = await mutateAsync({ data });
    login(res.userId, res.role, res.accessToken, res.refreshToken);
    router.push('/activities');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Log ind</h1>
        <p className="text-sm text-gray-500 mb-6">
          Har du ikke en konto?{' '}
          <Link href="/register" className="text-brand-600 hover:underline">
            Opret en her
          </Link>
        </p>

        {!!error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Forkert e-mail eller adgangskode.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">E-mail</label>
            <input type="email" {...register('email')} className="input" autoComplete="email" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Adgangskode</label>
            <input type="password" {...register('password')} className="input" autoComplete="current-password" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
            {isPending ? 'Logger ind…' : 'Log ind'}
          </button>
        </form>
      </div>
    </div>
  );
}
