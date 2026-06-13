export default function AEDIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/dirham-logo.png"
      alt="AED"
      aria-label="AED"
      className={className}
      style={{
        height: '1.1em',
        width: 'auto',
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        mixBlendMode: 'multiply',
      }}
    />
  );
}
