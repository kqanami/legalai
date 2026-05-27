import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black pt-16 pb-8">
      <div className="max-w-screen-xl mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Scale size={24} className="text-white" />
              <span className="text-xl font-bold text-white tracking-tight">ai-legal.kz</span>
            </Link>
            <p className="text-neutral-500 max-w-sm">
              Первая интеллектуальная правовая система Казахстана. Автоматизируйте рутину, анализируйте риски и принимайте решения быстрее.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-4">Продукт</h4>
            <ul className="space-y-2 text-neutral-500">
              <li><Link to="/pricing" className="hover:text-white transition-colors">Тарифы</Link></li>
              <li><Link to="/auth" className="hover:text-white transition-colors">Войти</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Правовая информация</h4>
            <ul className="space-y-2 text-neutral-500">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Политика конфиденциальности</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Пользовательское соглашение</Link></li>
              <li><a href="mailto:support@ai-legal.kz" className="hover:text-white transition-colors">support@ai-legal.kz</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-neutral-600">
          <p>© {new Date().getFullYear()} AI-Legal KZ. Все права защищены.</p>
          <p className="mt-2 md:mt-0">Сделано в Казахстане</p>
        </div>
      </div>
    </footer>
  );
}
