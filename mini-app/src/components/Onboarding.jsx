import { useState } from 'react';
import { haptic } from '../telegram.js';

const SLIDES = [
  {
    art: '🍕',
    title: 'Sizni ochlik qiynayaptimi?',
    text: 'Biz issiqqina pizzalarni tezkor yetkazamiz.',
  },
  {
    art: '🛵',
    title: 'Bu qanday ishlaydi?',
    text: 'Tanlang, buyurtma bering va rohatlaning.',
  },
  {
    art: '🎉',
    title: '10,000+ odam allaqachon biz bilan',
    text: 'Har kuni yuzlab mijozlar sevimli pizzasini shu yerdan buyurtma qiladi.',
  },
];

export default function Onboarding({ onFinish }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    haptic('light');
    if (isLast) onFinish();
    else setIndex(index + 1);
  };

  return (
    <div className="onb">
      <button className="onb__skip" onClick={onFinish} style={{ visibility: isLast ? 'hidden' : 'visible' }}>
        O‘tkazib yuborish
      </button>

      <div className="onb__body" key={index}>
        <div className="onb__art">{slide.art}</div>
        <h1 className="onb__title">{slide.title}</h1>
        <p className="onb__text">{slide.text}</p>
      </div>

      <div className="onb__dots">
        {SLIDES.map((item, i) => (
          <span key={item.title} className={`onb__dot ${i === index ? 'onb__dot--on' : ''}`} />
        ))}
      </div>

      <button className="btn btn--dark btn--lg" onClick={next}>
        {isLast ? 'Boshla 🚀' : 'Keyingisi'}
      </button>
    </div>
  );
}
