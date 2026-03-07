import { Link } from 'react-router-dom';
import { formatDate, formatTime, formatPrice, getSportIcon } from '../api';

export default function EventCard({ event }) {
  const statusColors = {
    notstarted: 'bg-green-100 text-green-700',
    soldout: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
    closed: 'bg-gray-100 text-gray-600',
    nosale: 'bg-yellow-100 text-yellow-700',
    postponed: 'bg-amber-100 text-amber-700',
  };

  const statusLabels = {
    notstarted: 'On Sale',
    soldout: 'Sold Out',
    cancelled: 'Cancelled',
    closed: 'Closed',
    nosale: 'No Sale',
    postponed: 'Postponed',
  };

  const status = event.event_status?.toLowerCase();
  const isBookable = status === 'notstarted';

  return (
    <Link
      to={`/events/${event.event_id}`}
      className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden"
    >
      {/* Colored top bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary-500 to-primary-600"></div>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getSportIcon(event.sport_type)}</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {event.tournament_name || event.sport_type}
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
            {statusLabels[status] || status}
          </span>
        </div>

        {/* Event name */}
        <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-3 line-clamp-2">
          {event.event_name}
        </h3>

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(event.date_start)}</span>
            {event.date_start && (
              <span className="text-gray-400">• {formatTime(event.date_start)}</span>
            )}
          </div>

          {event.venue_name && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}

          {event.city && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              <span>{event.city}{event.country ? `, ${event.country}` : ''}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
          {isBookable ? (
            <span className="text-primary-600 text-sm font-semibold group-hover:text-primary-700">
              View Tickets →
            </span>
          ) : (
            <span className="text-gray-400 text-sm font-medium">
              {statusLabels[status] || status}
            </span>
          )}
          {event.min_ticket_price_eur > 0 && (
            <span className="text-sm font-bold text-gray-900">
              from {formatPrice(event.min_ticket_price_eur, 'EUR')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
