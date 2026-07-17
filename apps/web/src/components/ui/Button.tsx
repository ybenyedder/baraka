import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

type Variant = 'primary' | 'dark' | 'outline';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold transition disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream';

const variants: Record<Variant, string> = {
  primary: 'bg-yellow text-pine hover:bg-yellow/85',
  dark: 'bg-pine text-cream hover:bg-pine/90',
  outline: 'border-2 border-pine text-pine hover:bg-pine/5',
};

const sizes: Record<Size, string> = {
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonProps = CommonProps &
  ({ href: string } | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>));

/** Bouton pilule Baraka. Rend un <Link> (i18n) si `href`, sinon un <button>. */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = [base, variants[variant], sizes[size], className].filter(Boolean).join(' ');

  if ('href' in rest && rest.href) {
    return (
      <Link href={rest.href} className={cls}>
        {children}
      </Link>
    );
  }

  const { href: _href, ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };
  return (
    <button className={cls} {...buttonProps}>
      {children}
    </button>
  );
}
