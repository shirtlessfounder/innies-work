import Link from 'next/link';
import formStyles from './placeholderForm.module.css';
import pageStyles from '../app/page.module.css';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const FOOTER_LINKS: FooterLink[] = [
  { external: true, href: 'https://t.me/innies_hq', label: '[innies_tg]' },
  { external: true, href: 'https://t.m/shirtlessfounder', label: '[shirtless_tg]' },
  { external: true, href: 'https://x.com/bicep_pump', label: '[twitter]' },
  { external: true, href: 'https://github.com/shirtlessfounder', label: '[github]' },
];

export function PlaceholderOrgCreationForm() {
  return (
    <div className={pageStyles.heroForm}>
      <div className={`${formStyles.managementActionRow} ${pageStyles.footerLinkRow}`}>
        {FOOTER_LINKS.map((link) => (
          link.external ? (
            <a
              key={`${link.label}:${link.href}`}
              className={pageStyles.footerLink}
              href={link.href}
              rel="noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          ) : (
            <Link key={`${link.label}:${link.href}`} className={pageStyles.footerLink} href={link.href}>
              {link.label}
            </Link>
          )
        ))}
      </div>
    </div>
  );
}
