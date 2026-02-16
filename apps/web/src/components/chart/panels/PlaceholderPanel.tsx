import styles from './panels.module.css';

interface PlaceholderPanelProps {
  tabLabel: string;
}

export default function PlaceholderPanel({ tabLabel }: PlaceholderPanelProps) {
  return (
    <div className={styles.placeholder}>
      <h2>{tabLabel}</h2>
      <p>This panel is not yet connected to a data source.</p>
      <p style={{ fontSize: 12 }}>API endpoint coming in a future phase.</p>
    </div>
  );
}
