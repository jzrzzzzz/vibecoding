import { useNavigate } from 'react-router-dom';

export default function ResultPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #FFF8E1 0%, #FFF3CD 100%)', padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: 40, textAlign: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxWidth: 400, width: '100%'
      }}>
        <h2 style={{ fontSize: 28, marginBottom: 16 }}>🏆 结算</h2>
        <p style={{ color: '#8D6E63', marginBottom: 24 }}>结算功能即将上线</p>
        <button
          className="btn btn--primary"
          onClick={() => navigate('/')}
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
