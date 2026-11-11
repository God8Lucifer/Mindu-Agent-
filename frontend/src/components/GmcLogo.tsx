import Image from 'next/image';
import styles from './gmcLogo.module.css';

/** Shared header mark for the map and photo collection. */
export function GmcLogo() {
  return (
    <span className={styles.tile}>
      <Image src="/gmc-logo-light.svg" alt="Gelephu Mindfulness City logo" width={34} height={34} unoptimized />
    </span>
  );
}
