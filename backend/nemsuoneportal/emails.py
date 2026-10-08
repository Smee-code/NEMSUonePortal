"""Branded transactional email.

Every system email is plain text (greeting, a few paragraphs, an optional link,
a signature). These helpers wrap that same text in a branded, responsive HTML
shell — NEMSU navy/gold, a header wordmark, auto-built call-to-action buttons
from any links, and a footer — while keeping the original plain text as the
multipart fallback (for deliverability, accessibility, and text-only clients).

Callers keep passing the same (subject, body, recipients); only the transport
changes from send_mail/send_mass_mail to these.
"""
import html as _html
import logging
import re
from email.mime.image import MIMEImage
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection

logger = logging.getLogger(__name__)

# Content-ID the header <img> references (cid:nemsu-logo). The image is embedded
# inline so it renders without the recipient allowing remote images.
LOGO_CID = 'nemsu-logo'


@lru_cache(maxsize=1)
def _logo_bytes():
    """Read the NEMSU seal once. Returns the PNG bytes, or None if unavailable."""
    candidates = [
        getattr(settings, 'FRONTEND_DIST', None) and Path(settings.FRONTEND_DIST) / 'logo.png',
        Path(settings.BASE_DIR).parent / 'frontend' / 'dist' / 'logo.png',
        Path(settings.BASE_DIR).parent / 'frontend' / 'public' / 'logo.png',
    ]
    for p in candidates:
        try:
            if p and Path(p).is_file():
                return Path(p).read_bytes()
        except Exception:
            continue
    logger.warning('Email logo not found; sending without the inline seal.')
    return None


def _attach_logo(msg):
    """Embed the seal as an inline image so cid:nemsu-logo resolves in the HTML."""
    data = _logo_bytes()
    if not data:
        return
    img = MIMEImage(data, _subtype='png')
    img.add_header('Content-ID', f'<{LOGO_CID}>')
    img.add_header('Content-Disposition', 'inline', filename='logo.png')
    msg.attach(img)
    # Group the HTML + inline image under multipart/related so clients associate
    # the cid image with the message body.
    msg.mixed_subtype = 'related'

# ── Brand tokens (email-safe: inline styles, web-safe fonts only) ──────────────
BRAND = 'NEMSUonePortal'
INSTITUTION = 'North Eastern Mindanao State University'
CAMPUS = 'Cantilan, Surigao del Sur, Philippines'
INK = '#0B1B2E'        # deep navy
INK_LINK = '#1b3a6b'   # link navy
GOLD = '#B89043'       # institutional gold
PAGE_BG = '#eef1f5'
CARD_LINE = '#e4e7ec'
TEXT = '#1f2933'
MUTED = '#64748b'
FAINT = '#94a3b8'

_URL_RE = re.compile(r'https?://[^\s<>"]+')


def _button_label(url):
    if 'verify-email' in url:
        return 'Verify my email'
    if 'reset-password' in url:
        return 'Reset my password'
    if '/signup' in url or '/sign-up' in url:
        return 'Create my account'
    if '/login' in url:
        return 'Log in to NEMSUonePortal'
    return 'Open NEMSUonePortal'


def _linkify(escaped_text):
    """Turn bare URLs in already-escaped text into inline anchors."""
    return _URL_RE.sub(
        lambda m: f'<a href="{m.group(0)}" style="color:{INK_LINK};text-decoration:underline;">{m.group(0)}</a>',
        escaped_text,
    )


def _body_to_blocks(body):
    """Split a plain-text body into paragraph blocks and standalone-link buttons.

    A line that is nothing but a URL becomes a button; everything else stays as
    text paragraphs (blank lines separate them), with inline URLs linkified and
    a leading em-dash line treated as a muted signature.
    """
    blocks = []       # (kind, html) where kind is 'p' or 'sig'
    buttons = []      # raw URLs
    buf = []

    def flush():
        if not buf:
            return
        text = '\n'.join(buf).strip()
        buf.clear()
        if not text:
            return
        is_sig = text.startswith('—') or text.startswith('--')
        html = _linkify(_html.escape(text)).replace('\n', '<br>')
        blocks.append(('sig' if is_sig else 'p', html))

    for line in body.strip().split('\n'):
        s = line.strip()
        if _URL_RE.fullmatch(s):
            flush()
            buttons.append(s)
        elif s == '':
            flush()
        else:
            buf.append(line)
    flush()
    return blocks, buttons


def _preheader(body):
    for line in body.strip().split('\n'):
        s = line.strip()
        if s and not _URL_RE.fullmatch(s):
            return s[:120]
    return ''


def render_branded_html(subject, body, preheader=None):
    """Wrap a plain-text email body in the branded HTML shell."""
    blocks, buttons = _body_to_blocks(body)
    if preheader is None:
        preheader = _preheader(body)

    # Render the message body, then the call-to-action button(s), then the
    # signature last — so a CTA always sits inside the message, above the sign-off.
    body_html = '\n'.join(
        f'<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:{TEXT};">{h}</p>'
        for kind, h in blocks if kind == 'p'
    )
    sig_html = '\n'.join(
        f'<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:{MUTED};">{h}</p>'
        for kind, h in blocks if kind == 'sig'
    )

    button_html = ''
    if buttons:
        primary = buttons[0]
        button_html = (
            f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">'
            f'<tr><td style="border-radius:4px;background:{INK};">'
            f'<a href="{primary}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:bold;'
            f'color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">{_button_label(primary)}</a>'
            f'</td></tr></table>'
            f'<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:{MUTED};">'
            f'If the button doesn’t work, copy and paste this link into your browser:<br>'
            f'<a href="{primary}" style="color:{INK_LINK};word-break:break-all;">{primary}</a></p>'
        )
        for extra in buttons[1:]:
            button_html += (
                f'<p style="margin:10px 0 0;font-size:13px;">'
                f'<a href="{extra}" style="color:{INK_LINK};word-break:break-all;">{extra}</a></p>'
            )

    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>{_html.escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:{PAGE_BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{PAGE_BG};">{_html.escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAGE_BG};padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid {CARD_LINE};border-radius:6px;overflow:hidden;">
  <tr><td style="background:{INK};padding:22px 32px;border-bottom:3px solid {GOLD};">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px;vertical-align:middle;">
        <img src="cid:{LOGO_CID}" width="48" height="48" alt="NEMSU seal" style="display:block;width:48px;height:48px;border-radius:50%;background:#ffffff;">
      </td>
      <td style="vertical-align:middle;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:.3px;">NEMSU<span style="color:{GOLD};">one</span>Portal</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#c7d2e0;letter-spacing:.6px;margin-top:4px;text-transform:uppercase;">{INSTITUTION} &middot; Cantilan Campus</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;">
    {body_html}
    {button_html}
    {sig_html}
  </td></tr>
  <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid {CARD_LINE};font-family:Arial,Helvetica,sans-serif;">
    <div style="font-size:12px;line-height:1.6;color:{MUTED};">{INSTITUTION} &mdash; Cantilan Campus<br>{CAMPUS}</div>
    <div style="font-size:11px;color:{FAINT};margin-top:10px;">This is an automated message from {BRAND}. Please do not reply to this email.</div>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>'''


def send_branded_email(subject, message, recipient_list, from_email=None,
                       fail_silently=False, preheader=None):
    """Drop-in for send_mail that also attaches a branded HTML alternative."""
    from_email = from_email or settings.DEFAULT_FROM_EMAIL
    msg = EmailMultiAlternatives(subject, message, from_email, list(recipient_list))
    msg.attach_alternative(render_branded_html(subject, message, preheader), 'text/html')
    _attach_logo(msg)
    return msg.send(fail_silently=fail_silently)


def send_branded_mass_email(datatuple, fail_silently=True):
    """Drop-in for send_mass_mail: each (subject, message, from_email, recipients)
    is sent with a branded HTML alternative over a single shared connection."""
    connection = get_connection(fail_silently=fail_silently)
    messages = []
    for subject, message, from_email, recipient_list in datatuple:
        msg = EmailMultiAlternatives(
            subject, message, from_email or settings.DEFAULT_FROM_EMAIL,
            list(recipient_list), connection=connection,
        )
        msg.attach_alternative(render_branded_html(subject, message), 'text/html')
        _attach_logo(msg)
        messages.append(msg)
    if not messages:
        return 0
    return connection.send_messages(messages)
