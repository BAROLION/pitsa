export default function Empty({ icon = '📭', title, text }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div className="empty__title">{title}</div>
      {text && <div className="empty__text">{text}</div>}
    </div>
  );
}
