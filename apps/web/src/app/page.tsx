import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className={styles.intro}>
          <h1>EHR — Evolved</h1>
          <p>Hello System is running.</p>
        </div>
        <div className={styles.ctas}>
          <Link className={styles.primary} href="/cprs/login">
            CPRS Web Replica
          </Link>
          <Link className={styles.primary} href="/cprs/verify">
            Verification Dashboard
          </Link>
          <Link className={styles.secondary} href="/patient-search">
            Legacy Patient Search
          </Link>
          <Link className={styles.secondary} href="/chart/1/cover">
            Legacy Chart Shell
          </Link>
        </div>
      </main>
    </div>
  );
}
