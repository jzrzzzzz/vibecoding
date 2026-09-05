import { useNavigate } from 'react-router-dom';
import styles from './RoomPage.module.scss';

export default function RoomPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2>👥 好友对战</h2>
        <p className={styles.placeholder}>房间功能即将上线，请先体验人机对战！</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    </div>
  );
}
