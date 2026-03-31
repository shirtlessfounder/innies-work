import styles from '../app/page.module.css';
import { LandingLinkIcon } from './LandingLinkIcon';

type ProductLink = {
  href: string;
  kind: 'github' | 'telegram' | 'x';
  label: string;
};

type ProductRow = {
  product: string;
  productHref: string;
  oneLiner: string;
  links: ProductLink[];
};

const PRODUCT_ROWS: ProductRow[] = [
  {
    product: 'innies.computer',
    productHref: 'https://innies.computer',
    oneLiner: 'pool tokens into one key for extended claude/codex capacity',
    links: [
      {
        href: 'https://github.com/shirtlessfounder/innies',
        kind: 'github',
        label: 'GitHub for innies.computer',
      },
      {
        href: 'https://x.com/innies_computer',
        kind: 'x',
        label: 'X for innies.computer',
      },
    ],
  },
  {
    product: 'innies.live',
    productHref: 'https://innies.live',
    oneLiner: 'create DM chat room with invite links for any two agents',
    links: [
      {
        href: 'https://github.com/alexjaniak/AgentMeets',
        kind: 'github',
        label: 'GitHub for innies.live',
      },
    ],
  },
  {
    product: 'innies.agent',
    productHref: 'https://www.combinator.trade/launch-agent',
    oneLiner: 'spin up a custom hermes agent for free in one click',
    links: [
      {
        href: 'https://github.com/handsdiff/activeclaw',
        kind: 'github',
        label: 'GitHub for innies.agent',
      },
      {
        href: 'https://t.me/handsdiff',
        kind: 'telegram',
        label: 'Telegram for innies.agent',
      },
    ],
  },
];

export function LandingProductsTable() {
  return (
    <div className={styles.landingTableWrap}>
      <table className={styles.landingTable}>
        <thead>
          <tr>
            <th className={styles.landingTableProductColumn}>product</th>
            <th className={styles.landingTableOneLinerColumn}>one-liner</th>
            <th className={styles.landingTableLinksColumn}>links</th>
          </tr>
        </thead>
        <tbody>
          {PRODUCT_ROWS.map((row) => (
            <tr key={row.product}>
              <td className={styles.landingTableProductColumn}>
                <a
                  className={styles.landingTableProductLink}
                  href={row.productHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  {row.product}
                </a>
              </td>
              <td className={styles.landingTableOneLinerColumn}>{row.oneLiner}</td>
              <td className={styles.landingTableLinksColumn}>
                <div className={styles.landingTableLinks}>
                  {row.links.map((link) => (
                    <a
                      key={`${row.product}:${link.kind}`}
                      aria-label={link.label}
                      className={styles.landingTableLink}
                      href={link.href}
                      rel="noreferrer"
                      target="_blank"
                      title={link.label}
                    >
                      <LandingLinkIcon kind={link.kind} />
                    </a>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
