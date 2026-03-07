import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEvent, getTickets, getCategories, getVenue, formatDate, formatTime, formatPrice, getSportIcon, getSportLabel } from '../api';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import VenueMap from '../components/VenueMap';

export default function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [quantity, setQuantity] = useState(2);
  const [mapFilterCategoryId, setMapFilterCategoryId] = useState(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const eventData = await getEvent(eventId);
      setEvent(eventData);

      const [ticketsData, categoriesData] = await Promise.all([
        getTickets({
          event_id: eventId,
          ticket_status: 'available',
          page_size: 100,
        }),
        getCategories({ event_id: eventId, page_size: 100 }),
      ]);

      // Fetch additional ticket pages if needed
      let allTickets = ticketsData.tickets || [];
      const totalPages = ticketsData.pagination?.total_pages || 1;
      if (totalPages > 1) {
        const extraPages = [];
        for (let p = 2; p <= Math.min(totalPages, 5); p++) {
          extraPages.push(
            getTickets({ event_id: eventId, ticket_status: 'available', page_size: 100, page: p })
          );
        }
        const results = await Promise.all(extraPages);
        results.forEach((r) => {
          allTickets = allTickets.concat(r.tickets || []);
        });
      }

      const catMap = {};
      (categoriesData.categories || []).forEach((c) => {
        catMap[c.category_id] = c;
      });
      setCategoryMap(catMap);
      setCategories(categoriesData.categories || []);

      const enrichedTickets = allTickets
        .filter((t) => t.stock > 0)
        .map((t) => ({
          ...t,
          _category: catMap[t.category_id] || null,
        }))
        .sort((a, b) => getEurPrice(a) - getEurPrice(b));

      setTickets(enrichedTickets);

      if (eventData.venue_id) {
        try {
          const venueData = await getVenue(eventData.venue_id);
          setVenue(venueData);
        } catch { /* venue optional */ }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [eventId]);

  // Get the EUR face value price (matching official portal)
  function getEurPrice(t) {
    return t?.local_rates?.face_value_eur || t?.local_rates?.net_rate_eur || t?.face_value || t?.net_rate || 0;
  }

  function handleSelectTicket(ticket) {
    const isSame = selectedTicket?.ticket_id === ticket.ticket_id;
    setSelectedTicket(isSame ? null : ticket);
    setExpandedTicket(isSame ? null : ticket.ticket_id);
    if (!isSame) {
      const pairsOnly = ticket.flags?.includes('pairs_only');
      const min = pairsOnly ? 2 : Math.max(ticket.min_order || 1, 1);
      setQuantity(Math.max(min, 2));
    }
  }

  function toggleExpand(ticketId) {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
  }

  function getValidQuantities() {
    if (!selectedTicket) return [];
    let max = Math.min(selectedTicket.stock, 20); // Cap at 20 for UI
    const pairsOnly = selectedTicket.flags?.includes('pairs_only');
    const noMaxMinus1 = selectedTicket.flags?.includes('no_max_minus_1');
    const min = pairsOnly ? 2 : Math.max(selectedTicket.min_order || 1, 1);

    const quantities = [];
    for (let i = min; i <= max; i++) {
      if (pairsOnly && i % 2 !== 0) continue;
      if (noMaxMinus1 && i === selectedTicket.stock - 1) continue;
      quantities.push(i);
    }
    return quantities;
  }

  function handleProceedToBooking() {
    if (!selectedTicket) return;
    navigate('/booking', { state: { event, ticket: selectedTicket, quantity } });
  }

  if (loading) return <Loader text="Loading event details..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!event) return <ErrorMessage message="Event not found" />;

  const ticketGroups = {};
  tickets.forEach((t) => {
    const key = t.category_id + '_' + (t.sub_category || '');
    if (!ticketGroups[key]) {
      ticketGroups[key] = {
        categoryName: t._category?.category_name || t.category_name || 'General',
        categoryType: t.category_type,
        subCategory: t.sub_category,
        category: t._category,
        tickets: [],
      };
    }
    ticketGroups[key].tickets.push(t);
  });

  const validQuantities = getValidQuantities();
  const dateRange = event.date_start && event.date_stop && event.date_start !== event.date_stop
    ? formatDate(event.date_start) + ' \u2014 ' + formatDate(event.date_stop)
    : formatDate(event.date_start);

  const ticketTypeLabels = {
    eticket: 'E-ticket',
    appticket: 'App Ticket',
    'paper-ticket': 'Paper Ticket',
    'collection-stadium': 'Pick-up ticket',
    other: 'Other',
  };

  const categoryTypeIcons = {
    grandstand: '\uD83C\uDFDF\uFE0F',
    generaladmission: '\uD83D\uDEB6',
    hospitality: '\uD83E\uDD42',
    busparking: '\uD83D\uDE8C',
    carparking: '\uD83C\uDD7F\uFE0F',
    camping: '\u26FA',
    transfer: '\uD83D\uDE97',
    offsite_hospitality: '\uD83C\uDF7E',
    extras: '\u2728',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-600">{'\uD83C\uDFE0'} Home</Link>
        <span>{'\u203A'}</span>
        <Link to={'/events?sport=' + event.sport_type} className="hover:text-gray-600">
          {getSportLabel(event.sport_type)}
        </Link>
        <span>{'\u203A'}</span>
        <span className="text-gray-600 truncate">{event.event_name}</span>
      </nav>

      {/* Event header banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="h-2 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700"></div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {event.event_name}
              </h1>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                  {'\uD83D\uDCC5'} {dateRange}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                  {'\uD83C\uDFC6'} {event.tournament_name} ({event.season})
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                  {'\uD83C\uDFDF\uFE0F'} {event.venue_name}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                  {'\uD83D\uDCCD'} {event.city}{event.iso_country ? ', ' + event.iso_country : ''}
                </span>
              </div>

              {event.event_description && (
                <p className="text-sm text-gray-600 leading-relaxed">{event.event_description}</p>
              )}
            </div>

            {event.min_ticket_price_eur && (
              <div className="text-right shrink-0">
                <div className="text-xs text-gray-400 mb-1">Tickets from</div>
                <div className="text-2xl font-bold text-primary-600">
                  {formatPrice(event.min_ticket_price_eur, 'EUR')}
                </div>
                {event.number_of_tickets && (
                  <div className="text-xs text-gray-400 mt-1">{event.number_of_tickets} tickets available</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Venue Map */}
      {event.venue_id && (
        <div className="mb-8">
          <VenueMap
            venueId={event.venue_id}
            categories={categories}
            highlightCategoryId={mapFilterCategoryId || (selectedTicket ? selectedTicket.category_id : null) || hoveredCategoryId}
            onCategoryClick={(catId) => {
              setMapFilterCategoryId(mapFilterCategoryId === catId ? null : catId);
            }}
            onCategoryHover={(catId) => setHoveredCategoryId(catId)}
          />
          {mapFilterCategoryId && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Filtering by: <strong>{categoryMap[mapFilterCategoryId]?.category_name || mapFilterCategoryId}</strong>
              </span>
              <button
                onClick={() => setMapFilterCategoryId(null)}
                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition-colors"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Available Tickets</h2>
            <p className="text-sm text-gray-500 mb-5">
              {tickets.length} option{tickets.length !== 1 ? 's' : ''} {'\u2022'} Select a ticket to see full details
            </p>

            {tickets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-4xl mb-3">{'\uD83C\uDFAB'}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No tickets available</h3>
                <p className="text-gray-500 text-sm">Check back later for availability.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(ticketGroups)
                  .filter(([, group]) => !mapFilterCategoryId || group.tickets.some((t) => t.category_id === mapFilterCategoryId))
                  .map(([key, group]) => (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-3 mt-5">
                      <span className="text-lg">{categoryTypeIcons[group.categoryType] || '\uD83C\uDFAB'}</span>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        {group.categoryName}
                      </h3>
                      {group.subCategory && group.subCategory !== 'singleday_regular' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          {group.subCategory.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
                        {group.categoryType}
                      </span>
                    </div>

                    {group.tickets.map((ticket) => {
                      const isSelected = selectedTicket?.ticket_id === ticket.ticket_id;
                      const isExpanded = expandedTicket === ticket.ticket_id;
                      const cat = ticket._category;
                      const descHtml = cat?.description?.en_GB;

                      return (
                        <div
                          key={ticket.ticket_id}
                          className={'mb-3 rounded-xl border-2 overflow-hidden transition-all duration-200 ' +
                            (isSelected
                              ? 'border-primary-500 bg-white shadow-lg'
                              : 'border-gray-200 bg-white hover:border-primary-200 hover:shadow-sm')}
                        >
                          <div
                            onClick={() => toggleExpand(ticket.ticket_id)}
                            className="flex items-center justify-between gap-4 p-4 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-gray-900">
                                  {ticket.ticket_title || ticket.category_name || 'Standard Ticket'}
                                </h4>
                                {ticket.stock <= 5 && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-semibold animate-pulse">
                                    {'\uD83D\uDD25'} {ticket.stock} left
                                  </span>
                                )}
                                {ticket.stock > 5 && (
                                  <span className="text-xs text-green-600 font-medium">{'\u25CF'} {ticket.stock} left</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span>{ticketTypeLabels[ticket.type_ticket] || ticket.type_ticket}</span>
                                <span>{'\u2022'}</span>
                                <span>{ticket.ticket_validity?.replace(/_/g, ' ')}</span>
                                {ticket.flags?.length > 0 && (
                                  <>
                                    <span>{'\u2022'}</span>
                                    {ticket.flags.map((f) => (
                                      <span key={f} className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-xs">
                                        {f.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <div className="text-xl font-bold text-gray-900">
                                  {formatPrice(getEurPrice(ticket), 'EUR')}
                                </div>
                                <div className="text-xs text-gray-400">per ticket</div>
                              </div>
                              <svg
                                className={'w-5 h-5 text-gray-400 transition-transform ' + (isExpanded ? 'rotate-180' : '')}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-gray-50/50">
                              {descHtml && (
                                <div className="p-5 border-b border-gray-100">
                                  <h5 className="text-sm font-bold text-gray-900 mb-2">Description</h5>
                                  <div
                                    className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:text-sm"
                                    dangerouslySetInnerHTML={{ __html: descHtml }}
                                  />
                                </div>
                              )}

                              <div className="p-5 border-b border-gray-100">
                                <h5 className="text-sm font-bold text-gray-900 mb-3">Event Information</h5>
                                <div className="rounded-lg border border-gray-200 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50 w-40">Tournament</td>
                                        <td className="px-4 py-2.5 text-gray-900 text-right">{event.tournament_name} ({event.season})</td>
                                      </tr>
                                      <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Venue</td>
                                        <td className="px-4 py-2.5 text-gray-900 text-right">{event.venue_name}</td>
                                      </tr>
                                      <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Date</td>
                                        <td className="px-4 py-2.5 text-gray-900 text-right">{dateRange}</td>
                                      </tr>
                                      <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">City</td>
                                        <td className="px-4 py-2.5 text-gray-900 text-right">{event.city}</td>
                                      </tr>
                                      <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Country</td>
                                        <td className="px-4 py-2.5 text-gray-900 text-right">{event.iso_country}</td>
                                      </tr>
                                      <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Ticket type</td>
                                        <td className="px-4 py-2.5 text-gray-900 text-right">
                                          <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' +
                                            (ticket.type_ticket === 'eticket' ? 'bg-green-100 text-green-700' :
                                            ticket.type_ticket === 'collection-stadium' ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-100 text-gray-700')}>
                                            {ticketTypeLabels[ticket.type_ticket] || ticket.type_ticket}
                                          </span>
                                        </td>
                                      </tr>
                                      {ticket.information_shipping && (
                                        <tr className="border-b border-gray-100">
                                          <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Shipping</td>
                                          <td className="px-4 py-2.5 text-gray-900 text-right text-xs leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: ticket.information_shipping }}
                                          />
                                        </tr>
                                      )}
                                      {cat?.ticket_delivery_days && (
                                        <tr className="border-b border-gray-100">
                                          <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Delivery</td>
                                          <td className="px-4 py-2.5 text-gray-900 text-right">
                                            at least {cat.ticket_delivery_days} days before event
                                          </td>
                                        </tr>
                                      )}
                                      {ticket.eventdays && (
                                        <tr className="border-b border-gray-100">
                                          <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Valid for</td>
                                          <td className="px-4 py-2.5 text-gray-900 text-right capitalize">{ticket.eventdays}</td>
                                        </tr>
                                      )}
                                      <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium bg-gray-50">Available</td>
                                        <td className="px-4 py-2.5 text-right">
                                          <span className={'font-semibold ' + (ticket.stock <= 5 ? 'text-red-600' : 'text-green-600')}>
                                            {ticket.stock} tickets
                                          </span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {(ticket.options || cat?.options) && (
                                <div className="p-5 border-b border-gray-100">
                                  <h5 className="text-sm font-bold text-gray-900 mb-3">Seat Features</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {(() => {
                                      const opts = Object.assign({}, cat?.options, ticket.options);
                                      const features = [];
                                      if (opts.numbered_seat) features.push({ label: 'Numbered Seat', icon: '\uD83D\uDCBA' });
                                      if (opts.covered_seat) features.push({ label: 'Covered', icon: '\u2602\uFE0F' });
                                      if (opts.videowall) features.push({ label: 'Video Wall', icon: '\uD83D\uDCFA' });
                                      if (cat?.party_size_together) features.push({ label: cat.party_size_together + ' seats together', icon: '\uD83D\uDC65' });
                                      if (features.length === 0) features.push({ label: 'General Admission', icon: '\uD83D\uDEB6' });
                                      return features.map((f) => (
                                        <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
                                          {f.icon} {f.label}
                                        </span>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}

                              {ticket.supplier_terms && (
                                <div className="p-5 border-b border-gray-100">
                                  <h5 className="text-sm font-bold text-gray-900 mb-2">Terms & Conditions</h5>
                                  <p className="text-sm text-gray-600">{ticket.supplier_terms}</p>
                                </div>
                              )}

                              <div className="p-5">
                                <button
                                  onClick={() => handleSelectTicket(ticket)}
                                  className={'w-full py-3 rounded-xl font-semibold text-sm transition-all ' +
                                    (isSelected
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-primary-600 text-white hover:bg-primary-700')}
                                >
                                  {isSelected ? '\u2713 Selected \u2014 Configure in sidebar' : 'Select This Ticket'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {venue && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{'\uD83C\uDFDF\uFE0F'} Venue Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base mb-2">{venue.official_name}</h3>
                    <div className="space-y-1.5 text-sm text-gray-600">
                      {venue.streetname && <p>{'\uD83D\uDCCD'} {venue.streetname} {venue.number}</p>}
                      {venue.postalcode && <p>{'\uD83D\uDCEE'} {venue.postalcode}, {venue.city}</p>}
                      {venue.country && <p>{'\uD83C\uDF0D'} {venue.country}</p>}
                      {venue.capacity && <p>{'\uD83D\uDC65'} Capacity: {venue.capacity.toLocaleString()}</p>}
                      {venue.opened && <p>{'\uD83C\uDFD7\uFE0F'} Opened: {venue.opened}</p>}
                      {venue.venue_type && <p>{'\uD83C\uDFF7\uFE0F'} Type: <span className="capitalize">{venue.venue_type}</span></p>}
                      {venue.track_length && <p>{'\uD83C\uDFC1'} Track: {(venue.track_length / 1000).toFixed(1)} km</p>}
                    </div>
                  </div>
                  {venue.wikipedia_snippet && (
                    <div>
                      <h4 className="font-medium text-gray-700 text-sm mb-1">About</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{venue.wikipedia_snippet}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">{'\uD83C\uDFAB'} Booking Summary</h3>

              {!selectedTicket ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">{'\uD83D\uDC48'}</div>
                  <p className="text-sm text-gray-500">Select a ticket from the list to begin</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Event</div>
                      <div className="text-sm font-semibold text-gray-900">{event.event_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Ticket</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {selectedTicket.ticket_title || selectedTicket.category_name}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-400">Type</div>
                        <div className="text-sm font-medium text-gray-900">
                          {ticketTypeLabels[selectedTicket.type_ticket] || selectedTicket.type_ticket}
                        </div>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-400">Price</div>
                        <div className="text-sm font-bold text-gray-900">
                          {formatPrice(getEurPrice(selectedTicket), 'EUR')}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <label className="block text-xs text-gray-400 mb-1.5">Quantity</label>
                      <select
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {validQuantities.map((q) => (
                          <option key={q} value={q}>{q} ticket{q > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                      {selectedTicket.flags?.includes('pairs_only') && (
                        <p className="text-xs text-amber-600 mt-1">{'\u26A0\uFE0F'} Pairs only (2, 4, 6...)</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-primary-900">Total</span>
                      <span className="text-2xl font-bold text-primary-700">
                        {formatPrice(getEurPrice(selectedTicket) * quantity, 'EUR')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleProceedToBooking}
                    className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md hover:shadow-lg text-sm"
                  >
                    Proceed to Booking {'\u2192'}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Tickets reserved for 10 minutes during checkout
                  </p>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Event Details</h4>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">{'\uD83D\uDCC5'}</span>
                  <div>
                    <div className="font-medium text-gray-900">{dateRange}</div>
                    {event.date_start_main_event && (
                      <div className="text-xs text-gray-400">
                        Main event: {formatTime(event.date_start_main_event)} - {formatTime(event.date_stop_main_event)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">{'\uD83C\uDFDF\uFE0F'}</span>
                  <div>
                    <div className="font-medium text-gray-900">{event.venue_name}</div>
                    <div className="text-xs text-gray-400">{event.city}, {event.iso_country}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">{'\uD83C\uDFC6'}</span>
                  <div className="font-medium text-gray-900">{event.tournament_name} ({event.season})</div>
                </div>
                {event.date_confirmed && (
                  <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                    <span>{'\u2705'}</span> Date confirmed
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
