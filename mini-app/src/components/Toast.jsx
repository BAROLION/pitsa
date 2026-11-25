import { useEffect } from 'react';
import Icon from './Icon.jsx';

export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className="toast" role="status">
      <Icon name="check" size={18} stroke={3} />
      {message}
    </div>
  );
}
