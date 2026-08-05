import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { Logo } from '@/components/ui/Logo';
import { DownloadAppButton } from '@/components/DownloadAppButton';

/** Pied de page public (fond pine, colonnes marque / explorer / légal). */
export function SiteFooter() {
  const t = useTranslations('common');
  const linkClass = 'text-cream/70 transition hover:text-cream';
  return (
    <footer className="bg-pine text-cream">
      <Container className="grid gap-10 py-14 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <Logo tone="cream" />
          <p className="mt-3 max-w-xs text-sm text-cream/70">{t('tagline')}</p>
        </div>
        <nav>
          <h3 className="font-display text-lg font-extrabold">{t('footer.explore')}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/#how-it-works" className={linkClass}>
                {t('landing.nav.how')}
              </Link>
            </li>
            <li>
              <Link href="/business" className={linkClass}>
                {t('landing.nav.merchants')}
              </Link>
            </li>
            <li>
              <Link href="/business" className={linkClass}>
                {t('landing.hero.ctaPartner')}
              </Link>
            </li>
          </ul>
        </nav>
        <nav>
          <h3 className="font-display text-lg font-extrabold">{t('footer.legal')}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/legal/privacy" className={linkClass}>
                {t('footer.privacy')}
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className={linkClass}>
                {t('footer.terms')}
              </Link>
            </li>
            <li>
              <Link href="/legal/delete-account" className={linkClass}>
                {t('footer.deleteAccount')}
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h3 className="font-display text-lg font-extrabold">{t('landing.app.downloadHint')}</h3>
          <p className="mt-4 max-w-xs text-sm text-cream/70">{t('landing.app.text')}</p>
          <div className="mt-4">
            <DownloadAppButton />
          </div>
        </div>
      </Container>
      <div className="border-t border-cream/15">
        <Container className="py-5 text-center text-xs text-cream/50">
          {t('footer.copyright', { year: 2026 })}
        </Container>
      </div>
    </footer>
  );
}
