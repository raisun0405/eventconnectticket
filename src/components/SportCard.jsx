import { Link } from 'react-router-dom';
import { getSportIcon, getSportLabel } from '../api';

const SPORT_COLORS = {
  soccer: 'from-green-500 to-emerald-600',
  formula1: 'from-red-500 to-red-700',
  motorsport: 'from-gray-600 to-gray-800',
  motogp: 'from-orange-500 to-red-600',
  tennis: 'from-yellow-400 to-amber-500',
  rugby: 'from-amber-600 to-orange-700',
  cricket: 'from-lime-500 to-green-600',
  basketball: 'from-orange-500 to-orange-700',
  nba: 'from-blue-600 to-indigo-700',
  boxing: 'from-red-600 to-rose-700',
  combatsport: 'from-red-700 to-red-900',
  darts: 'from-purple-500 to-purple-700',
  horseracing: 'from-emerald-500 to-teal-600',
  icehockey: 'from-cyan-500 to-blue-600',
  nfl: 'from-blue-700 to-indigo-800',
  mlb: 'from-blue-500 to-blue-700',
  golf: 'from-green-600 to-green-800',
  handball: 'from-pink-500 to-pink-700',
  padel: 'from-sky-500 to-sky-700',
  watersport: 'from-cyan-400 to-blue-500',
  rowing: 'from-teal-500 to-teal-700',
  dtm: 'from-gray-700 to-gray-900',
  indycar: 'from-blue-500 to-blue-700',
  superbike: 'from-yellow-500 to-orange-600',
};

export default function SportCard({ sport }) {
  const sportId = sport.sport_id?.toLowerCase() || sport;
  const gradient = SPORT_COLORS[sportId] || 'from-gray-500 to-gray-700';

  return (
    <Link
      to={`/events?sport=${sportId}`}
      className="group block"
    >
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 h-40 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
        <div className="absolute top-0 right-0 opacity-20 text-8xl leading-none -mt-2 -mr-2 group-hover:scale-110 transition-transform duration-300">
          {getSportIcon(sportId)}
        </div>
        <div className="text-4xl">{getSportIcon(sportId)}</div>
        <div>
          <h3 className="text-white font-bold text-lg">{getSportLabel(sportId)}</h3>
          <p className="text-white/70 text-sm">Browse events →</p>
        </div>
      </div>
    </Link>
  );
}
