import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const isEnglish = window.location.pathname.toLowerCase().startsWith('/en/');

  return (
    <main className="min-h-screen w-full bg-white px-7 pt-[14vh] text-[#202124] sm:px-10">
      <section className="mx-auto max-w-xl" aria-labelledby="not-found-title">
        <FileQuestion
          aria-hidden="true"
          className="mb-14 h-12 w-12 text-[#5f6368]"
          strokeWidth={1.8}
        />
        <h1
          id="not-found-title"
          className="mb-4 text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:text-2xl"
        >
          {isEnglish ? 'This page can’t be found' : 'Cette page n’existe pas'}
        </h1>
        <p className="max-w-lg text-[16px] leading-[1.7] text-[#5f6368]">
          {isEnglish
            ? 'The address may be incorrect, or the page may have been moved or removed.'
            : 'L’adresse demandée est peut-être incorrecte, ou cette page a été déplacée ou supprimée.'}
        </p>
        <p className="mt-5 text-sm font-medium tracking-[0.02em] text-[#5f6368]">
          {isEnglish ? 'ERROR 404' : 'ERREUR 404'}
        </p>
      </section>
    </main>
  );
}
