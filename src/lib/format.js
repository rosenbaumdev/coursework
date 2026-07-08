// Platform-wide number formatting for model-generated PROSE (chat messages +
// artifact memos). Figures have their own fmtFigureValue; this is for the
// markdown-rendered text surfaces. Deliberately NOT applied to code (see
// commaFormatMarkdown) or to editable textareas.

// Add thousands separators to standalone integer runs of 4+ digits, skipping:
//   - runs glued to other digits/commas/periods (decimals, already-formatted),
//   - runs glued to letters on either side ("1080p", "v1700"),
//   - runs glued to "/", "#", "_", or "-" on either side — these are the
//     structural neighbors of things that must stay literal: phone numbers
//     ("415-555-1234"), issue/PR refs ("#10234"), snake_case ids ("id_100234"),
//     and URL path/query segments ("/pull/1234"). Commafying inside them both
//     corrupts the text and, for links, breaks the href.
//   - 4-digit years (1900–2099) — the common false positive in prose.
// A leading "$" is allowed ("$1700" → "$1,700"); a trailing "." or ")" is allowed
// so a sentence-ending, decimal, or parenthetical number still formats.
// (Residual ambiguity: a bare space-delimited number that is really a zip or an
// order id — "Beverly Hills 90210" — still formats; boundary chars can't tell it
// from a quantity, and in a business-sizing course the quantity reading is the
// common one. Left as an accepted, low-harm edge.)
export function withThousands(text) {
  if (typeof text !== 'string' || !text) return text
  return text.replace(/(?<![\d.,a-zA-Z/#_-])(\d{4,})(?![\d,a-zA-Z/#_-])/g, (m) => {
    if (m.length === 4 && +m >= 1900 && +m <= 2099) return m // likely a year
    return Number(m).toLocaleString('en-US')
  })
}

// Apply withThousands to a markdown string, leaving these UNTOUCHED (numbers
// inside them must stay literal, and formatting a URL corrupts its href):
//   - fenced ```code``` blocks and inline `code` spans,
//   - markdown links [text](url) + images ![alt](url),
//   - autolinks <http…> and bare http(s):// / www. URLs.
// The split keeps the delimiters, so those segments land at ODD indices and are
// passed through verbatim; only the EVEN (ordinary-prose) segments are formatted.
const MASK_RE = /(```[\s\S]*?```|`[^`]*`|!?\[[^\]]*\]\([^)]*\)|<https?:\/\/[^>]*>|https?:\/\/\S+|www\.\S+)/g
export function commaFormatMarkdown(md) {
  if (typeof md !== 'string' || !md) return md
  return md
    .split(MASK_RE)
    .map((seg, i) => (i % 2 === 1 ? seg : withThousands(seg)))
    .join('')
}
