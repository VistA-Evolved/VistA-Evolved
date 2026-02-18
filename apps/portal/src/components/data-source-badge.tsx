/**
 * DataSourceBadge — Shows where data comes from.
 * Every panel must display one of these badges per contract.
 *
 * No VA-specific terminology in badge text.
 */

interface DataSourceBadgeProps {
  source: "ehr" | "pending" | "local";
  label?: string;
}

export function DataSourceBadge({ source, label }: DataSourceBadgeProps) {
  const config = {
    ehr: {
      className: "badge badge-ehr",
      text: label || "Live — Health System",
    },
    pending: {
      className: "badge badge-pending",
      text: label || "Integration Pending",
    },
    local: {
      className: "badge badge-skeleton",
      text: label || "Local Data",
    },
  };

  const { className, text } = config[source];

  return <span className={className}>{text}</span>;
}
