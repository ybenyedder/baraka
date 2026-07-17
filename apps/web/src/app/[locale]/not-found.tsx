import { Button } from '@/components/ui/Button';
import { HeroBag } from '@/components/illustrations/HeroBag';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <HeroBag className="max-w-[240px]" />
      <h1 className="mt-4 font-display text-6xl font-extrabold text-pine">404</h1>
      <p className="mt-2 text-black/60">Cette page n’existe pas.</p>
      <div className="mt-6">
        <Button href="/">Accueil</Button>
      </div>
    </main>
  );
}
