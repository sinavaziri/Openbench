import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/runs/new', label: 'New Run' },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      {/* Navigation */}
      <nav className="border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-white text-lg tracking-tight">
              OpenBench
            </Link>

            <div className="flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm tracking-wide transition-opacity ${
                    location.pathname === item.path
                      ? 'text-white'
                      : 'text-[#666] hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
        {children}
      </main>
    </div>
  );
}
