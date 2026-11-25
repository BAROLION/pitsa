import { useEffect, useState } from 'react';
import SafeImage from './SafeImage.jsx';
import Icon from './Icon.jsx';
import { haptic } from '../telegram.js';
import { storage } from '../format.js';

const SEEN_KEY = 'pizza_stories_seen';
const DURATION = 4500; // har bir story necha ms ko'rinadi

export default function Stories({ items }) {
  const [active, setActive] = useState(null);
  const [seen, setSeen] = useState(() => storage.get(SEEN_KEY, []));

  const markSeen = (id) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      storage.set(SEEN_KEY, next);
      return next;
    });
  };

  return (
    <>
      <div className="stories">
        {items.map((story, index) => (
          <button
            key={story.id}
            className="story"
            onClick={() => {
              haptic('light');
              setActive(index);
            }}
          >
            <div className={`story__ring ${seen.includes(story.id) ? 'story__ring--seen' : ''}`}>
              <div className="story__inner">
                {story.image ? <SafeImage src={story.image} alt={story.label} /> : story.emoji}
              </div>
            </div>
            <div className="story__label">{story.label}</div>
          </button>
        ))}
      </div>

      {active !== null && (
        <StoryViewer items={items} startIndex={active} onSeen={markSeen} onClose={() => setActive(null)} />
      )}
    </>
  );
}

function StoryViewer({ items, startIndex, onSeen, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const story = items[index];

  useEffect(() => {
    onSeen(items[index].id);
    setProgress(0);
    const started = Date.now();

    const timer = setInterval(() => {
      const value = Math.min(100, ((Date.now() - started) / DURATION) * 100);
      setProgress(value);
      if (value >= 100) {
        clearInterval(timer);
        if (index < items.length - 1) setIndex(index + 1);
        else onClose();
      }
    }, 50);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const prev = () => (index > 0 ? setIndex(index - 1) : onClose());
  const next = () => (index < items.length - 1 ? setIndex(index + 1) : onClose());

  return (
    <div className="viewer">
      <div className="viewer__bars">
        {items.map((item, i) => (
          <div key={item.id} className="viewer__bar">
            <span style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }} />
          </div>
        ))}
      </div>

      <button className="viewer__close" onClick={onClose} aria-label="Yopish">
        <Icon name="close" size={22} stroke={2.6} />
      </button>

      <div className="viewer__body">
        {story.image ? (
          <SafeImage className="viewer__img" src={story.image} alt={story.title} />
        ) : (
          <div className="viewer__emoji">{story.emoji}</div>
        )}
        <div className="viewer__grad" />
        <div className="viewer__nav">
          <button onClick={prev} aria-label="Oldingi" />
          <button onClick={next} aria-label="Keyingi" />
        </div>
        <div className="viewer__caption">
          {story.tag && <span className="viewer__tag">{story.tag}</span>}
          <h3>{story.title}</h3>
          <p>{story.text}</p>
        </div>
      </div>
    </div>
  );
}
