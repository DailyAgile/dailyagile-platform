'use client';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  green: '#16a34a',
  red: '#dc2626',
};

interface FilterState {
  dateRange: [Date, Date];
  timeOfDay: string[];
  duration: string[];
  format: string[];
  priceRange: [number, number];
  onlyAvailable: boolean;
}

interface SessionFiltersProps {
  filters: FilterState;
  onUpdateFilters: (filters: Partial<FilterState>) => void;
}

export default function SessionFilters({ filters, onUpdateFilters }: SessionFiltersProps) {
  const handleDateChange = (index: 0 | 1, value: string) => {
    const newDate = new Date(value);
    const newRange = [...filters.dateRange] as [Date, Date];
    newRange[index] = newDate;
    onUpdateFilters({ dateRange: newRange });
  };

  const handleTimeOfDayToggle = (time: string) => {
    const newTimes = filters.timeOfDay.includes(time)
      ? filters.timeOfDay.filter(t => t !== time)
      : [...filters.timeOfDay, time];
    onUpdateFilters({ timeOfDay: newTimes });
  };

  const handleDurationToggle = (duration: string) => {
    const newDurations = filters.duration.includes(duration)
      ? filters.duration.filter(d => d !== duration)
      : [...filters.duration, duration];
    onUpdateFilters({ duration: newDurations });
  };

  const handleFormatToggle = (format: string) => {
    const newFormats = filters.format.includes(format)
      ? filters.format.filter(f => f !== format)
      : [...filters.format, format];
    onUpdateFilters({ format: newFormats });
  };

  const handlePriceChange = (index: 0 | 1, value: number) => {
    const newRange = [...filters.priceRange] as [number, number];
    newRange[index] = value;
    // Ensure min doesn't exceed max
    if (index === 0 && value > newRange[1]) {
      newRange[1] = value;
    }
    // Ensure max doesn't go below min
    if (index === 1 && value < newRange[0]) {
      newRange[0] = value;
    }
    onUpdateFilters({ priceRange: newRange });
  };

  const handleOnlyAvailableToggle = () => {
    onUpdateFilters({ onlyAvailable: !filters.onlyAvailable });
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (value: number) => {
    return `${value}`;
  };

  return (
    <div
      style={{
        background: BRAND_COLORS.white,
        borderRadius: '12px',
        border: `1px solid ${BRAND_COLORS.border}`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: BRAND_COLORS.navy,
          margin: 0,
          paddingBottom: '12px',
          borderBottom: `2px solid ${BRAND_COLORS.teal}`,
        }}
      >
        🔍 Filters
      </h2>

      {/* Date Range Filter */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '12px' }}>
          📅 Date Range
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: BRAND_COLORS.gray, marginBottom: '4px' }}>
              From
            </label>
            <input
              type="date"
              value={formatDateForInput(filters.dateRange[0])}
              onChange={(e) => handleDateChange(0, e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: BRAND_COLORS.gray, marginBottom: '4px' }}>
              To
            </label>
            <input
              type="date"
              value={formatDateForInput(filters.dateRange[1])}
              onChange={(e) => handleDateChange(1, e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Time of Day Filter */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '12px' }}>
          ⏰ Time of Day
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'morning', label: '🌅 Morning (before 12 PM)' },
            { id: 'afternoon', label: '☀️ Afternoon (12 PM - 5 PM)' },
            { id: 'evening', label: '🌙 Evening (after 5 PM)' },
          ].map(option => (
            <label
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: BRAND_COLORS.darkGray,
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.timeOfDay.includes(option.id)}
                onChange={() => handleTimeOfDayToggle(option.id)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Duration Filter */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '12px' }}>
          ⏱️ Duration
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: '2-day', label: '2-day' },
            { id: '3-day', label: '3-day' },
            { id: '4-day', label: '4-day' },
          ].map(option => (
            <label
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: BRAND_COLORS.darkGray,
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.duration.includes(option.id)}
                onChange={() => handleDurationToggle(option.id)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Format Filter */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '12px' }}>
          📋 Format
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'Weekday', label: '📅 Weekday' },
            { id: 'Weekend', label: '🏖️ Weekend' },
          ].map(option => (
            <label
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: BRAND_COLORS.darkGray,
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.format.includes(option.id)}
                onChange={() => handleFormatToggle(option.id)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '12px' }}>
          💰 Price Range
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', color: BRAND_COLORS.gray, marginBottom: '4px' }}>
                Min
              </label>
              <input
                type="number"
                min="0"
                max="800"
                value={filters.priceRange[0]}
                onChange={(e) => handlePriceChange(0, Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', color: BRAND_COLORS.gray, marginBottom: '4px' }}>
                Max
              </label>
              <input
                type="number"
                min="0"
                max="800"
                value={filters.priceRange[1]}
                onChange={(e) => handlePriceChange(1, Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="800"
            value={filters.priceRange[0]}
            onChange={(e) => handlePriceChange(0, Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: BRAND_COLORS.teal,
              cursor: 'pointer',
            }}
          />
          <input
            type="range"
            min="0"
            max="800"
            value={filters.priceRange[1]}
            onChange={(e) => handlePriceChange(1, Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: BRAND_COLORS.orange,
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: '12px', color: BRAND_COLORS.navy, fontWeight: '600', textAlign: 'center' }}>
            £{filters.priceRange[0]} - £{filters.priceRange[1]}
          </div>
        </div>
      </div>

      {/* Only Available Filter */}
      <div style={{ paddingTop: '8px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: BRAND_COLORS.darkGray,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            background: filters.onlyAvailable ? BRAND_COLORS.light : 'transparent',
            transition: 'background 0.2s',
          }}
        >
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={handleOnlyAvailableToggle}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          ✅ Show only available sessions
        </label>
      </div>

      {/* Reset Filters Button */}
      <button
        onClick={() => {
          onUpdateFilters({
            dateRange: [new Date('2026-09-01'), new Date('2027-03-31')],
            timeOfDay: [],
            duration: [],
            format: [],
            priceRange: [0, 800],
            onlyAvailable: false,
          });
        }}
        style={{
          background: BRAND_COLORS.light,
          color: BRAND_COLORS.navy,
          border: `1px solid ${BRAND_COLORS.border}`,
          padding: '10px 14px',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '12px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = BRAND_COLORS.teal;
          e.currentTarget.style.color = BRAND_COLORS.white;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = BRAND_COLORS.light;
          e.currentTarget.style.color = BRAND_COLORS.navy;
        }}
      >
        🔄 Reset All
      </button>
    </div>
  );
}
