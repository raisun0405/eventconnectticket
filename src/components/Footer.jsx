import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">ET</span>
              </div>
              <span className="text-lg font-bold text-white">
                Event<span className="text-primary-400">Tix</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Your gateway to the best sports events worldwide. Book tickets for soccer, Formula 1, tennis, and more.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/sports" className="hover:text-white transition-colors">Browse Sports</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">All Events</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Information</h4>
            <ul className="space-y-2 text-sm">
              <li>Prices in EUR (cents)</li>
              <li>Powered by XS2Event API</li>
              <li>Real-time ticket availability</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} EventTix. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
