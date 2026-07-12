export default function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`
        bg-surface-container-lowest
        p-6 rounded-xl
        card-shadow
        border border-outline-variant/30
        ${hover ? 'transition-shadow hover:shadow-md cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}