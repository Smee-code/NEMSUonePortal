import { useLocation } from 'react-router-dom';
import TitleManager from './TitleManager';
import RouteLoadingBar from './RouteLoadingBar';
import ScrollProgress from './ScrollProgress';
import BackToTop from './BackToTop';
import CookieConsent from './CookieConsent';

/* Site-wide chrome mounted once inside the router: per-page titles, a route
   loading bar, a reading-progress bar (public pages), a back-to-top button
   and the cookie notice. */
const PUBLIC = ['/', '/news', '/programs', '/campus-life', '/in-focus', '/privacy', '/terms', '/cookies'];

export default function SiteChrome() {
  const { pathname } = useLocation();
  const isPublic = PUBLIC.includes(pathname.replace(/\/+$/, '') || '/');
  return (
    <>
      <TitleManager />
      <RouteLoadingBar />
      {isPublic && <ScrollProgress />}
      <BackToTop />
      <CookieConsent />
    </>
  );
}
