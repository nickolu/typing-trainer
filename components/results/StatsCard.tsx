interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6 flex flex-col items-center justify-center">
      {icon && <div className="mb-2 text-editor-accent">{icon}</div>}
      <div className="text-4xl font-bold font-mono mb-2">{value}</div>
      <div className="text-sm text-editor-muted">{label}</div>
    </div>
  );
}
