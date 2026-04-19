import Image from 'next/image';
import { LandingHeroHeader } from '../components/LandingHeroHeader';
import { PlaceholderOrgCreationForm } from '../components/PlaceholderOrgCreationForm';
import { LandingProductsTable } from '../components/LandingProductsTable';
import { LiveSessionsSection } from '../components/live/LiveSessionsSection';
import { VscodeShell } from '../components/vscodeV2/VscodeShell';
import styles from './page.module.css';

export default function DashboardIndexPage() {
  const heroFrame = (
    <div className={styles.heroArtwork}>
      <Image
        className={styles.heroImage}
        src="/images/archive-computer.png"
        alt="Winter lake landscape on archival computer"
        width={2359}
        height={1778}
        priority
      />
      <div className={styles.heroBadgeCluster} aria-hidden="true">
        <Image
          className={styles.heroBadge}
          src="/images/innies-eye-logo-green-square.svg"
          alt=""
          width={320}
          height={320}
          priority
        />
      </div>
    </div>
  );

  // The VS-code shell wraps everything. Its TabContent dispatcher passes
  // `children` through when the active tab is `landing-page.md`, and swaps
  // in InniesV2LiveSessionsTab / SharedNotesTab for the other tabs.
  return (
    <VscodeShell>
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.console}>
            <LandingHeroHeader />

            <section className={styles.hero}>
              <div className={styles.heroInner}>
                <div className={styles.frame}>
                  {heroFrame}
                </div>

                <PlaceholderOrgCreationForm />
                <LandingProductsTable />
              </div>
            </section>

            <div className={styles.liveSectionSlot}>
              <LiveSessionsSection />
            </div>
          </div>
        </div>
      </main>
    </VscodeShell>
  );
}
