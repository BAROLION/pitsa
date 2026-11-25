import Icon from './Icon.jsx';

export default function SearchBar({ value, onChange, placeholder = 'Qidirish', flat = false }) {
  return (
    <label className={`search ${flat ? 'search--flat' : ''}`}>
      <Icon name="search" size={20} stroke={2.4} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
      />
      {value && (
        <button type="button" className="search__clear" onClick={() => onChange('')} aria-label="Tozalash">
          <Icon name="close" size={18} stroke={2.6} />
        </button>
      )}
    </label>
  );
}
