export function EmptyState({ emoji, titulo, texto, children }) {
  return (
    <div className="empty">
      <div className="emoji">{emoji}</div>
      <div className="t">{titulo}</div>
      <div className="s">{texto}</div>
      {children}
    </div>
  )
}
