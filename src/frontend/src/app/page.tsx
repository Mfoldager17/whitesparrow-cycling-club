import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-16 pt-32 px-4 text-center bg-white gap-2">
        <Image src="/whitesparrow.webp" width={400} height={200} alt="Hero Image" className=" w-auto -mt-40" />
        <p className="text-lg sm:text-xl text-gray-600 max-w-xl mb-8 -mt-24">
          Din klub. Din tur. Dit fællesskab. Find næste tur, tilmeld dig og
          del oplevelserne med dine medcyklister.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/activities" className="btn-primary px-6 py-3 text-base">
            Se aktiviteter
          </Link>
          <Link href="/register" className="btn-secondary px-6 py-3 text-base">
            Bliv medlem
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 ">
        {[
          {
            icon: '📅',
            title: 'Klubarrangementer',
            desc: 'Følg med i kommende klubevents arrangeret af vores admin-team.',
          },
          {
            icon: '🚴',
            title: 'Medlemsture',
            desc: 'Alle aktive medlemmer kan oprette og invitere til ture.',
          },
          {
            icon: '⏳',
            title: 'Venteliste',
            desc: 'Fyldt op? Tilmeld dig ventelisten og ryk automatisk op ved afmeldinger.',
          },
        ].map((f) => (
          <div key={f.title} className="card text-center">
            <span className="text-4xl mb-4 block">{f.icon}</span>
            <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
