/**
 * Boot splash (server-rendered so it paints before hydration).
 * Renders the app-frame skeleton (#appBorders) + a pulsing mark, per the
 * captured boot contract. Hidden by body.loaded / removed at fade-complete.
 */
export function Splash() {
  return (
    <div id="loading" aria-hidden="true">
      <div id="appBorders">
        <div id="loading-content">
          <div id="preloaderContent">
            <svg
              className="bkg"
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
            >
              <rect
                x="4"
                y="4"
                width="56"
                height="56"
                rx="16"
                fill="var(--content-color)"
                opacity="0.15"
              />
            </svg>
            <svg id="logo" width="32" height="32" viewBox="0 0 32 32">
              {/* neutral placeholder mark (do not ship third-party logos) */}
              <circle
                cx="16"
                cy="16"
                r="12"
                fill="none"
                stroke="var(--content-color)"
                strokeWidth="2.5"
              />
              <circle cx="16" cy="16" r="4" fill="var(--content-color)" />
            </svg>
          </div>
          <div id="loadingText">Loading&hellip;</div>
        </div>
      </div>
    </div>
  );
}
