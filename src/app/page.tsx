import Image from 'next/image';
import { LandingHeroHeader } from '../components/LandingHeroHeader';
import { PlaceholderOrgCreationForm } from '../components/PlaceholderOrgCreationForm';
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
        <div className={styles.heroPreviewLabel}>Click to preview</div>
      </div>
    </div>
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.console}>
          <LandingHeroHeader brandSuffix="(BETA)" />

          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <a href="/innies" className={styles.frame} aria-label="Open innies dashboard">
                {heroFrame}
              </a>

              <PlaceholderOrgCreationForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
