export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center text-2xl font-extrabold tracking-tight ${className}`}>
      <span style={{ color: 'var(--text)' }}>Capt</span>
      <span className="gradient-text">io</span>
      <span style={{ color: 'var(--text)' }}>nist</span>
    </span>
  );
}
