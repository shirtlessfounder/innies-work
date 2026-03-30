import Link from 'next/link';
import formStyles from './placeholderForm.module.css';
import pageStyles from '../app/page.module.css';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const FOOTER_LINKS: FooterLink[] = [
  { href: '/onboard', label: '[guides]' },
  { external: true, href: 'https://t.me/innies_hq', label: '[telegram]' },
  { external: true, href: 'https://x.com/innies_computer', label: '[twitter]' },
  { external: true, href: 'https://github.com/shirtlessfounder/innies', label: '[github]' },
];

export function PlaceholderOrgCreationForm() {
  return (
    <form className={`${formStyles.managementFormGrid} ${pageStyles.heroForm}`}>
      <label className={`${formStyles.managementField} ${formStyles.managementFieldWide}`}>
        <input
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={`${formStyles.managementInput} ${pageStyles.heroInput}`}
          defaultValue=""
          name="orgName"
          placeholder="me-and-the-boys"
          spellCheck={false}
          type="text"
        />
      </label>

      <div className={formStyles.managementActionRow}>
        <button className={pageStyles.primaryCta} disabled type="button">
          <span>Create org</span>
        </button>
      </div>

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
    </form>
  );
}
