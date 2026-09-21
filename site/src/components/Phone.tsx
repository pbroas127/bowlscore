export function Phone({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen">{children}</div>
    </div>
  )
}
