const sanitizeHtml = require('sanitize-html');

const sanitizeOptions = {
  allowedTags: [
    'a', 'abbr', 'acronym', 'address', 'article', 'aside', 'b', 'big', 'blockquote',
    'br', 'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details', 'dfn',
    'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'header', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main', 'mark', 'nav',
    'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'small', 'span',
    'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
    'time', 'tr', 'tt', 'u', 'ul', 'var', 'wbr'
  ],
  allowedAttributes: {
    '*': ['class', 'id', 'style'],
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https']
  },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  selfClosing: ['img', 'br', 'hr', 'area', 'base', 'col', 'embed', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'],
  disallowedTagsMode: 'escape',
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-f]{6}$/i, /^#[0-9a-f]{3}$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'background-color': [/^#[0-9a-f]{6}$/i, /^#[0-9a-f]{3}$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'font-family': [/^\w+(\s+\w+)*$/],
      'font-size': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'font-weight': [/^\d+$/],
      'text-align': [/^(left|right|center|justify)$/],
      'text-decoration': [/^(none|underline|line-through)$/],
      'margin': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'padding': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'border': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'border-radius': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'width': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'height': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'line-height': [/^\d+(\.\d+)?$/],
      'letter-spacing': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'word-spacing': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'text-indent': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'text-shadow': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'box-shadow': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'transform': [/^(translate|scale|rotate|skew)\(.*\)$/],
      'transition': [/^(all|none|initial|inherit|unset)$/],
      'animation': [/^(none|initial|inherit|unset)$/],
      'opacity': [/^\d+(\.\d+)?$/],
      'z-index': [/^\d+$/],
      'display': [/^(block|inline|inline-block|flex|grid|none)$/],
      'flex': [/^(auto|none|initial|inherit)$/],
      'flex-direction': [/^(row|column|row-reverse|column-reverse)$/],
      'flex-wrap': [/^(nowrap|wrap|wrap-reverse)$/],
      'justify-content': [/^(flex-start|flex-end|center|space-between|space-around|space-evenly)$/],
      'align-items': [/^(stretch|flex-start|flex-end|center|baseline)$/],
      'align-content': [/^(stretch|flex-start|flex-end|center|space-between|space-around|space-evenly)$/],
      'grid-template-columns': [/^(auto|none|initial|inherit)$/],
      'grid-template-rows': [/^(auto|none|initial|inherit)$/],
      'grid-template-areas': [/^(none|initial|inherit)$/],
      'grid-column-gap': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'grid-row-gap': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'grid-column': [/^(auto|none|initial|inherit)$/],
      'grid-row': [/^(auto|none|initial|inherit)$/],
      'grid-area': [/^(auto|none|initial|inherit)$/],
      'grid-auto-columns': [/^(auto|none|initial|inherit)$/],
      'grid-auto-rows': [/^(auto|none|initial|inherit)$/],
      'grid-auto-flow': [/^(row|column|dense)$/],
      'grid-template': [/^(none|initial|inherit)$/],
      'grid': [/^(none|initial|inherit)$/]
    }
  }
};

const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      req.sanitizedBody = {};
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.sanitizedBody[key] = sanitizeHtml(req.body[key], sanitizeOptions);
        } else {
          req.sanitizedBody[key] = req.body[key];
        }
      }
      req.body = req.sanitizedBody;
    }

    // Sanitize query parameters
    if (req.query) {
      req.sanitizedQuery = {};
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.sanitizedQuery[key] = sanitizeHtml(req.query[key], sanitizeOptions);
        } else {
          req.sanitizedQuery[key] = req.query[key];
        }
      }
      req.query = req.sanitizedQuery;
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: 'Invalid input data',
      details: error.message
    });
  }
};

module.exports = sanitizeRequest;
