/**
 * Canvas Parser
 *
 * Analyzes tldraw shapes from the whiteboard canvas and produces a rich
 * structured description for injection into the LLM system prompt.
 *
 * Shape types handled:
 *   text, sticky  -> text content extraction
 *   rectangle, ellipse, diamond, triangle -> geometry
 *   arrow         -> connections with start/end coordinates
 *   line          -> point count + approximate shape
 *   draw          -> segment count
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MATH_OPERATORS = /[=+\-×÷√∫∑∏∂∆∇±≤≥∞θπαβγπηΔΣΛλμΩω≈≠≡≅⊕⊗∈∉⊂⊃∪∩∅∀∃∄⇒⇔↔→←↑↓↗↘∴∵∝∧∨¬∫∬∭∮∯∰′″‴∂∅∆∏∑]/u;
const MATH_KEYWORDS = /solve|equation|function|graph|derivative|integral|sum|limit|factor|quadratic|linear|polynomial|vector|matrix|theorem|proof|calculate|prove|simplify|evaluate|find|x|y|variable|constant|slope|intercept|domain|range|asymptote|logarithm|exponent|trigono|sin|cos|tan|cot|sec|csc|angle|radian|degree|hypotenuse|pythagorean|theorem/i;

/** Safely read a numeric property, defaulting to 0. */
function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

/** Safely read a string property. */
function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Distance between two points. */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Perpendicular distance from point p to the line segment a-b. */
function pointSegDist(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

// ---------------------------------------------------------------------------
// Shape normalisation
// ---------------------------------------------------------------------------

interface NormalisedShape {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  /** Points for arrows, lines, and draw segments. */
  points: { x: number; y: number }[];
}

function normalise(raw: any): NormalisedShape {
  const id: string = str(raw.id);
  const type: string = str(raw.type) || 'unknown';
  const x = num(raw.x);
  const y = num(raw.y);
  const props = raw && typeof raw.props === 'object' ? raw.props : {};

  let w = num(props.w);
  let h = num(props.h);
  let text = str(props.text);
  const points: { x: number; y: number }[] = [];

  // --- Arrow: use start / end as the two key points ---
  if (type === 'arrow') {
    if (props.start && typeof props.start.x === 'number') {
      points.push({ x: props.start.x, y: props.start.y });
    }
    if (props.end && typeof props.end.x === 'number') {
      points.push({ x: props.end.x, y: props.end.y });
    }
    // Fall back to props.points if present (tldraw stores the full path)
    if (points.length === 0 && Array.isArray(props.points)) {
      for (const pt of props.points) {
        points.push({ x: num(pt.x ?? pt?.[0]), y: num(pt.y ?? pt?.[1]) });
      }
    }
    if (!text && str(props.text)) {
      text = str(props.text);
    }
  }

  // --- Line: extract from props.points ---
  if (type === 'line' && Array.isArray(props.points)) {
    for (const pt of props.points) {
      points.push({ x: num(pt.x ?? pt?.[0]), y: num(pt.y ?? pt?.[1]) });
    }
  }

  // --- Draw: flatten segment -> points ---
  if (type === 'draw' && Array.isArray(props.segments)) {
    for (const seg of props.segments) {
      if (seg && Array.isArray(seg.points)) {
        for (const pt of seg.points) {
          points.push({ x: num(pt.x ?? pt?.[0]), y: num(pt.y ?? pt?.[1]) });
        }
      }
    }
  }

  return { id, type, x, y, w, h, text, points };
}

// ---------------------------------------------------------------------------
// Approximate shape of a line (straight, curved, etc.)
// ---------------------------------------------------------------------------

function lineShapeLabel(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return 'single point';
  const first = pts[0];
  const last = pts[pts.length - 1];
  const span = dist(first, last);
  if (span < 5) return 'short mark';

  let maxDev = 0;
  for (const p of pts) maxDev = Math.max(maxDev, pointSegDist(p, first, last));
  const ratio = span > 0 ? maxDev / span : 0;

  // Check orientation
  const dx = Math.abs(last.x - first.x);
  const dy = Math.abs(last.y - first.y);

  if (ratio < 0.04) {
    if (dy < dx * 0.15 && span > 80) return 'horizontal line';
    if (dx < dy * 0.15 && span > 80) return 'vertical line';
    if (span > 80) return 'straight diagonal line';
    return 'straight short line';
  }
  if (ratio < 0.18) {
    if (dy < dx * 0.25 && span > 80) return 'slightly curved near-horizontal line';
    if (dx < dy * 0.25 && span > 80) return 'slightly curved near-vertical line';
    return 'slightly curved line';
  }
  if (ratio < 0.4) return 'curved line';
  return 'irregular wavy line';
}

// ---------------------------------------------------------------------------
// Diagram-type detection
// ---------------------------------------------------------------------------

function detectType(
  shapes: NormalisedShape[],
  geo: NormalisedShape[],
  lines: NormalisedShape[],
  arrows: NormalisedShape[],
  draws: NormalisedShape[],
  allTexts: string[],
): string | null {
  const joint = allTexts.join(' ');

  // 1. Math equation / expression
  if (allTexts.length > 0) {
    const hasOps = MATH_OPERATORS.test(joint);
    const hasKw = MATH_KEYWORDS.test(joint);
    if (hasOps || hasKw) {
      if (/∫|∑|∏|derivative|integral/i.test(joint)) return 'Calculus expression';
      if (/√|sqrt|square|quadratic|exponent|power|²|³/i.test(joint))
        return 'Math expression with powers/roots';
      if (/sin|cos|tan|cot|sec|csc|trig|angle|θ|π/i.test(joint))
        return 'Trigonometry expression';
      if (/matrix|vector|determinant/i.test(joint)) return 'Linear algebra expression';
      if (/[≤≥<>=]/.test(joint) && /[xyfgh]/.test(joint)) return 'Inequality or function';
      if (/\d+x\s*[=+\-]\s*\d+/.test(joint) || /x\s*=\s*\d+/.test(joint))
        return 'Algebraic equation';
      return 'Math expression';
    }
  }

  // 2. Coordinate plane (two long crossing lines, or one horizontal + one vertical)
  const axisCandidates = [...lines, ...arrows].filter((s) => s.points.length >= 2);
  if (axisCandidates.length >= 2) {
    const horizontals = axisCandidates.filter((s) => {
      const p = s.points;
      return Math.abs(p[p.length - 1].y - p[0].y) < Math.abs(p[p.length - 1].x - p[0].x) * 0.2 &&
        Math.abs(p[p.length - 1].x - p[0].x) > 100;
    });
    const verticals = axisCandidates.filter((s) => {
      const p = s.points;
      return Math.abs(p[p.length - 1].x - p[0].x) < Math.abs(p[p.length - 1].y - p[0].y) * 0.2 &&
        Math.abs(p[p.length - 1].y - p[0].y) > 100;
    });
    if (horizontals.length >= 1 && verticals.length >= 1) {
      // Check if they roughly cross
      for (const h of horizontals) {
        for (const v of verticals) {
          const hMid = {
            x: (h.points[0].x + h.points[h.points.length - 1].x) / 2,
            y: (h.points[0].y + h.points[h.points.length - 1].y) / 2,
          };
          const vMid = {
            x: (v.points[0].x + v.points[v.points.length - 1].x) / 2,
            y: (v.points[0].y + v.points[v.points.length - 1].y) / 2,
          };
          if (dist(hMid, vMid) < 80) return 'Coordinate plane with axes';
        }
      }
    }
    if (horizontals.length === 1 && verticals.length === 0) return 'Number line';
  }

  // 3. Table / grid
  const rects = geo.filter((s) => s.type === 'rectangle');
  if (rects.length >= 3) {
    const rx = rects.map((r) => Math.round(r.x / 15) * 15);
    const ry = rects.map((r) => Math.round(r.y / 15) * 15);
    const ux = new Set(rx).size;
    const uy = new Set(ry).size;
    if ((ux <= 3 && uy >= 2) || (uy <= 3 && ux >= 2)) return 'Table or grid layout';
  }

  // 4. Geometric figure
  if (geo.length >= 1 || lines.length >= 3) {
    const tri = geo.filter((s) => s.type === 'triangle').length;
    const rect = geo.filter((s) => s.type === 'rectangle').length;
    const ell = geo.filter((s) => s.type === 'ellipse').length;
    const dia = geo.filter((s) => s.type === 'diamond').length;

    if (tri >= 1 || lines.length >= 3) return 'Geometric figure formed by lines and shapes';
    if (rect >= 2) return 'Grouped rectangles';
    if (dia >= 1) return 'Diamond shape';
    if (ell >= 1) return 'Ellipse / circle';
  }

  // 5. Flowchart / connected diagram
  if (arrows.length >= 1 && geo.length >= 2) return 'Flowchart or process diagram';
  if (arrows.length >= 2) return 'Connected diagram with arrows';

  // 6. Freehand sketch
  if (draws.length > 0 && shapes.filter((s) => s.type !== 'draw').length <= 1) {
    return 'Freehand sketch';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse an array of tldraw shapes and produce a human-readable description
 * of the canvas contents.
 *
 * @param shapes  The raw shapes array from `editor.getCurrentPageShapes()`
 *                (or from the JSON-serialised form sent over the wire).
 * @returns       A multi-line string describing the canvas, ready to inject
 *                into the system prompt.
 *
 * Example output:
 *   Canvas Analysis:
 *   - Shapes: 5 total (2 text, 1 rectangle, 1 arrow, 1 line)
 *   - Text content: "2x + 3 = 7" | "Solve for x"
 *   - Geometry: Rectangle at (100, 50) sized 200x150px
 *   - Connections: Arrow from (200, 125) to (400, 125)
 *   - Lines: Straight line with 2 points
 *   - Diagram type: Algebraic equation
 */
export function parseCanvas(shapes: unknown[]): string {
  if (!Array.isArray(shapes) || shapes.length === 0) {
    return 'The canvas is empty.';
  }

  // --- Normalise every shape ---
  const all: NormalisedShape[] = shapes.map(normalise);

  // --- Bucket by type ---
  const textShapes = all.filter((s) => s.type === 'text');
  const stickyShapes = all.filter((s) => s.type === 'sticky');
  const geo = all.filter((s) =>
    ['rectangle', 'ellipse', 'diamond', 'triangle'].includes(s.type),
  );
  const arrows = all.filter((s) => s.type === 'arrow');
  const lines = all.filter((s) => s.type === 'line');
  const draws = all.filter((s) => s.type === 'draw');
  const others = all.filter(
    (s) =>
      !['text', 'sticky', 'rectangle', 'ellipse', 'diamond', 'triangle', 'arrow', 'line', 'draw'].includes(s.type),
  );

  // --- Type counts for summary ---
  const typeCounts: Record<string, number> = {};
  for (const s of all) {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  }
  const typeSummary = Object.entries(typeCounts)
    .map(([t, c]) => `${c} ${t}${c > 1 ? 's' : ''}`)
    .join(', ');

  const linesOut: string[] = [];
  linesOut.push('Canvas Analysis:');
  linesOut.push(`- Shapes: ${all.length} total (${typeSummary})`);

  // --- Text content ---
  const allTexts: string[] = [];
  for (const s of textShapes) {
    if (s.text.trim()) allTexts.push(s.text.trim());
  }
  for (const s of stickyShapes) {
    if (s.text.trim()) allTexts.push(`[Sticky: ${s.text.trim()}]`);
  }
  if (allTexts.length > 0) {
    const joined = allTexts.map((t) => `"${t}"`).join(' | ');
    linesOut.push(`- Text content: ${joined}`);
  }

  // --- Geometry details ---
  if (geo.length > 0) {
    const details = geo.map((s) => {
      const label = s.text ? ` labelled "${s.text}"` : '';
      const size = s.w || s.h ? ` sized ${Math.round(s.w)}x${Math.round(s.h)}px` : '';
      return `${s.type} at (${Math.round(s.x)}, ${Math.round(s.y)})${size}${label}`;
    });
    linesOut.push(`- Geometry: ${details.join('; ')}`);
  }

  // --- Arrow connections ---
  if (arrows.length > 0) {
    const details = arrows.map((s) => {
      const start =
        s.points.length > 0
          ? `(${Math.round(s.points[0].x)}, ${Math.round(s.points[0].y)})`
          : 'unknown';
      const end =
        s.points.length > 1
          ? `(${Math.round(s.points[s.points.length - 1].x)}, ${Math.round(s.points[s.points.length - 1].y)})`
          : 'unknown';
      const label = s.text ? ` "${s.text}"` : '';
      return `Arrow${label} from ${start} to ${end}`;
    });
    linesOut.push(`- Connections: ${details.join('; ')}`);
  }

  // --- Line details ---
  if (lines.length > 0) {
    const details = lines.map((s) => {
      const label = lineShapeLabel(s.points);
      return `${label} with ${s.points.length} points`;
    });
    linesOut.push(`- Lines: ${details.join('; ')}`);
  }

  // --- Draw (freehand) ---
  if (draws.length > 0) {
    const details = draws.map((s, i) => {
      const count = s.points.length;
      return `stroke ${i + 1} (${count} pts)`;
    });
    linesOut.push(`- Freehand drawings: ${details.join(', ')}`);
  }

  // --- Other shapes ---
  if (others.length > 0) {
    const details = others.map((s) => `${s.type} at (${Math.round(s.x)}, ${Math.round(s.y)})`);
    linesOut.push(`- Other shapes: ${details.join('; ')}`);
  }

  // --- Diagram type ---
  const diagramType = detectType(all, geo, lines, arrows, draws, allTexts);
  if (diagramType) {
    linesOut.push(`- Diagram type: ${diagramType}`);
  }

  return linesOut.join('\n');
}
