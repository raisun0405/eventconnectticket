import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

const SVG_CDN = '/cdn/venues';
const STATIC_CDN = '/cdn/venues/static';

/*
 * Official base CSS from https://docs.xs2event.com/venue-svg.html
 * Styles venue infrastructure elements (field, track, grandstands, etc.)
 */
const BASE_SVG_CSS = `
.soccerfield { fill: green; }
.svg-background { fill: none; stroke: #fff; }
.stadium-ring { fill: #8a8582; }
.svg-background-soccerstadiums { fill: white; }
.track-drive-bbox { stroke: none; fill: none; }
.track-drive {
  stroke: #455159; fill: none;
  stroke-width: 12.72px; stroke-linecap: round; stroke-linejoin: round;
}
.track-border {
  stroke: #8a8582; fill: none;
  stroke-width: 25.44px; stroke-linecap: round; stroke-linejoin: round;
}
.track-overlay {
  stroke: white; fill: none;
  stroke-width: 15.26px; stroke-linecap: round; stroke-linejoin: round;
}
.starting-grid { stroke: white; fill: none; }
.curve-red { fill: red; }
.curve-grey { fill: grey; }
.drive-arrow { fill: yellow; }
.flag-white { fill: white; }
.flag-black { fill: black; }
.hide { fill: none; stroke: none; }
.grandstand-legend, .grandstand { fill: #9b8579; }
.suite-legend, .suite { fill: #0814ff; }
.unavailable { fill: #a3a9af; }
.general-admission-legend, .general-admission { fill: #8dc63f; }
`;

/*
 * Color map for category_type values from the API.
 * category_type enum: grandstand, generaladmission, busparking, carparking,
 *   camping, transfer, hospitality, offsite_hospitality, extras
 */
const CATEGORY_TYPE_COLORS = {
  grandstand: '#9b8579',
  generaladmission: '#8dc63f',
  hospitality: '#e6308a',
  suite: '#0814ff',
  carparking: '#f7941d',
  busparking: '#f7941d',
  camping: '#00a651',
  transfer: '#754c29',
  offsite_hospitality: '#c6007e',
  extras: '#999999',
};

const LEGEND_ITEMS = [
  { type: 'grandstand', label: 'Grandstand', color: '#9b8579' },
  { type: 'generaladmission', label: 'General Admission', color: '#8dc63f' },
  { type: 'suite', label: 'Suite / VIP', color: '#0814ff' },
  { type: 'hospitality', label: 'Hospitality', color: '#e6308a' },
  { type: 'carparking', label: 'Car Parking', color: '#f7941d' },
  { type: 'camping', label: 'Camping', color: '#00a651' },
];

export default function VenueMap({
  venueId,
  categories = [],
  highlightCategoryId = null,
  onCategoryClick = null,
  onCategoryHover = null,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null); // Direct ref to the <svg> element after injection
  const [svgContent, setSvgContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const prevHighlightRef = useRef(null);

  // Store callbacks in refs to avoid re-render loops
  const onCategoryClickRef = useRef(onCategoryClick);
  const onCategoryHoverRef = useRef(onCategoryHover);
  onCategoryClickRef.current = onCategoryClick;
  onCategoryHoverRef.current = onCategoryHover;

  // Only categories that are on the SVG (on_svg === true)
  const svgCategories = useMemo(
    () => categories.filter((c) => c.on_svg),
    [categories]
  );

  // Lookup maps
  const catMap = useMemo(() => {
    const map = {};
    svgCategories.forEach((c) => { map[c.category_id] = c; });
    return map;
  }, [svgCategories]);

  const svgCatIds = useMemo(
    () => new Set(svgCategories.map((c) => c.category_id)),
    [svgCategories]
  );

  // Stable key for deps
  const categoriesKey = useMemo(
    () => svgCategories.map((c) => c.category_id).sort().join(','),
    [svgCategories]
  );

  /*
   * Build the dynamic CSS that colors each category by its type.
   *
   * CRITICAL: Category IDs start with a hex digit (e.g. "9914182a...").
   * CSS class selectors CANNOT start with a digit — .9914... is invalid and
   * the browser silently ignores the entire rule.
   *
   * The docs say SVG elements have BOTH the raw ID and an underscore-prefixed
   * version: class="9914...ctg _9914...ctg grandstand"
   * So we ONLY use the underscore-prefixed selector: ._9914...ctg
   */
  const dynamicCss = useMemo(() => {
    const lines = [];

    // Per-category fill colors based on category_type
    svgCategories.forEach((cat) => {
      const color = CATEGORY_TYPE_COLORS[cat.category_type] || '#9b8579';
      const id = cat.category_id;
      // Use ONLY underscore-prefixed selector (valid CSS)
      lines.push(`._${id} { fill: ${color}; cursor: pointer; transition: opacity 0.2s ease, filter 0.2s ease; }`);
    });

    // Hover effect for all SVG categories
    if (svgCategories.length > 0) {
      const hoverSel = svgCategories.map((c) => `._${c.category_id}:hover`).join(', ');
      lines.push(`${hoverSel} { opacity: 0.7; filter: brightness(1.2); }`);
    }

    // .xs2-highlight class — used by JS to highlight selected category
    lines.push(`.xs2-highlight { fill: #6366f1 !important; opacity: 0.9; }`);
    lines.push(`.xs2-highlight:hover { fill: #4f46e5 !important; opacity: 1; }`);

    return lines.join('\n');
  }, [categoriesKey]);

  // Fetch SVG from CDN
  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    setError(false);
    setSvgContent(null);

    fetch(`${SVG_CDN}/${venueId}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error('SVG not found');
        return res.text();
      })
      .then((text) => {
        setSvgContent(text);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [venueId]);

  // After SVG is injected into DOM, set it up: styles + responsive sizing
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;
    svgRef.current = svgEl;

    // --- Make SVG responsive ---
    // Preserve original viewBox, or derive one from width/height attributes
    if (!svgEl.getAttribute('viewBox')) {
      const origW = svgEl.getAttribute('width');
      const origH = svgEl.getAttribute('height');
      if (origW && origH) {
        svgEl.setAttribute('viewBox', `0 0 ${parseFloat(origW)} ${parseFloat(origH)}`);
      }
    }
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';
    svgEl.style.maxHeight = '550px';
    svgEl.style.display = 'block';

    // --- Inject styles ---
    // Ensure <defs> exists
    let defs = svgEl.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgEl.insertBefore(defs, svgEl.firstChild);
    }

    // Create a NEW <style> element for our custom CSS (don't overwrite existing SVG styles)
    const existingCustomStyle = defs.querySelector('style[data-xs2]');
    if (existingCustomStyle) existingCustomStyle.remove();

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.setAttribute('data-xs2', 'true');
    styleEl.textContent = BASE_SVG_CSS + '\n' + dynamicCss;
    defs.appendChild(styleEl);

    // --- Event handlers (per official docs JS approach) ---
    const handleClick = (e) => {
      const el = e.target.closest('[class]');
      if (!el) return;
      const catId = findCategoryId(getClassString(el), svgCatIds);
      if (catId && onCategoryClickRef.current) {
        onCategoryClickRef.current(catId, catMap[catId]);
      }
    };

    const handleMouseMove = (e) => {
      const el = e.target.closest('[class]');
      if (!el) {
        setTooltip(null);
        if (onCategoryHoverRef.current) onCategoryHoverRef.current(null);
        return;
      }
      const catId = findCategoryId(getClassString(el), svgCatIds);
      if (catId && catMap[catId]) {
        const rect = container.getBoundingClientRect();
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 10,
          name: catMap[catId].category_name,
          type: catMap[catId].category_type,
        });
        if (onCategoryHoverRef.current) onCategoryHoverRef.current(catId);
      } else {
        setTooltip(null);
        if (onCategoryHoverRef.current) onCategoryHoverRef.current(null);
      }
    };

    const handleMouseLeave = () => {
      setTooltip(null);
      if (onCategoryHoverRef.current) onCategoryHoverRef.current(null);
    };

    svgEl.addEventListener('click', handleClick);
    svgEl.addEventListener('mousemove', handleMouseMove);
    svgEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      svgEl.removeEventListener('click', handleClick);
      svgEl.removeEventListener('mousemove', handleMouseMove);
      svgEl.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [svgContent, dynamicCss, categoriesKey, catMap, svgCatIds]);

  /*
   * Highlight selected category using classList (per official docs JS approach):
   *   document.querySelectorAll(`._${categoryId}`).forEach(el => el.classList.add('highlight'))
   *
   * This runs as a separate effect so it doesn't re-inject styles or re-bind events.
   */
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    // Remove previous highlight
    if (prevHighlightRef.current) {
      svgEl.querySelectorAll(`._${CSS.escape(prevHighlightRef.current)}`).forEach((el) => {
        el.classList.remove('xs2-highlight');
      });
    }

    // Add new highlight
    if (highlightCategoryId) {
      svgEl.querySelectorAll(`._${CSS.escape(highlightCategoryId)}`).forEach((el) => {
        el.classList.add('xs2-highlight');
      });
    }

    prevHighlightRef.current = highlightCategoryId;
  }, [highlightCategoryId]);

  // --- Render ---
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading venue map…</span>
        </div>
      </div>
    );
  }

  // Fallback: show static legend PNG if SVG failed
  if (error || !svgContent) {
    if (!venueId) return null;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">🗺️ Venue Map</h2>
        </div>
        <div className="p-4 bg-gray-50 flex justify-center">
          <img
            src={`${STATIC_CDN}/${venueId}-legend.png`}
            alt="Venue map"
            className="max-w-full h-auto rounded"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>
    );
  }

  // Dynamic legend based on category_types actually present for this event
  const usedTypes = new Set(svgCategories.map((c) => c.category_type));
  const activeLegend = LEGEND_ITEMS.filter((l) => usedTypes.has(l.type));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header with dynamic legend */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-900">🗺️ Venue Map</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {activeLegend.map((item) => (
              <span key={item.type} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm inline-block border border-black/10"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
            {highlightCategoryId && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block border border-black/10" style={{ backgroundColor: '#6366f1' }} />
                Selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SVG container */}
      <div className="relative p-4 bg-gray-50" ref={containerRef}>
        <div
          className="w-full overflow-hidden flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 px-3 py-2 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl whitespace-nowrap backdrop-blur-sm"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold">{tooltip.name}</div>
            <div className="text-gray-300 capitalize text-[10px] mt-0.5">{tooltip.type?.replace(/([a-z])([A-Z])/g, '$1 $2')}</div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        <p className="text-xs text-gray-400 text-center">
          Click on a section to filter tickets • Hover for details
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────

/** Get class string from an SVG element (handles SVGAnimatedString) */
function getClassString(el) {
  if (el.className && typeof el.className === 'object' && el.className.baseVal !== undefined) {
    return el.className.baseVal;
  }
  return el.getAttribute('class') || '';
}

/**
 * Find which category_id an SVG element belongs to.
 * SVG elements have classes like:
 *   "9914182a...ctg _9914182a...ctg grandstand _otherCatId otherCatId"
 * We match against the underscore-prefixed version and strip the underscore.
 */
function findCategoryId(classString, knownIds) {
  const classes = classString.split(/\s+/);
  for (const cls of classes) {
    if (knownIds.has(cls)) return cls;
    if (cls.startsWith('_')) {
      const stripped = cls.slice(1);
      if (knownIds.has(stripped)) return stripped;
    }
  }
  return null;
}
