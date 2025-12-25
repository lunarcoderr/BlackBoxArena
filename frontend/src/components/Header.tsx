import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <div>
              <p className="header-kicker">BlackBox Arena</p>
              <h1 className="header-title">GameGold</h1>
              <p className="header-subtitle">Encrypted loot with FHE + Sepolia</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
