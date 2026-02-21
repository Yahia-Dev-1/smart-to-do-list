import { useLanguage } from '../App';

export default function Productivity({ count }) {
  const { lang, t } = useLanguage();
  return (
    <div className='productivity glass-card reveal' style={{ padding: '20px 40px', margin: '20px auto', display: 'inline-block' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
        {t('home.productivity')} <span style={{ background: '#eff6ff', padding: '4px 12px', borderRadius: '8px', marginLeft: '10px' }}>{count}</span>
      </h2>
    </div>
  )
}
