import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom'; // ルーティングを使う場合

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: 'TOP', href: '/' },
    { label: '一覧', href: '/list' },
    { label: '集計', href: '/analystic' },
  ];

  return (
    <>
      {/* 右上のハンバーガーボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 right-6 z-100 rounded-full bg-black/20 p-3 backdrop-blur-md transition-all hover:bg-black/50 active:scale-95 shadow-lg border border-white/20"
      >
        <Menu size={28} />
      </button>

      {/* すりガラス風モーダルメニュー */}
      {isOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center">
          {/* 背景のぼかしオーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* メニュー本体 */}
          <nav className="relative w-72 overflow-hidden rounded-3xl border border-white/30 bg-white/10 p-10 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X size={24} />
            </button>

            <ul className="space-y-8 text-center">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className="group relative block text-2xl font-bold text-white transition-all"
                  >
                    {item.label}
                    <span className="absolute -bottom-2 left-1/2 h-0.5 w-0 -translate-x-1/2 bg-white transition-all group-hover:w-12" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
};

export default Navbar;