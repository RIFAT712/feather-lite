import React from "react";

/**
 * Wikimedia Codex Language Icon (Universal Language Selector / ULS / cdxIconLanguage)
 * Exact vector geometry from Wikimedia UI / Codex icon suite.
 */
export function CodexLanguageIcon({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M20 18h-1.44a.6.6 0 0 1-.4-.12.8.8 0 0 1-.23-.31L17 15h-5l-1 2.54a.8.8 0 0 1-.22.3.6.6 0 0 1-.4.14H9l4.55-11.47h1.89zm-3.53-4.31L14.89 9.5a12 12 0 0 1-.39-1.24q-.09.37-.19.69l-.19.56-1.58 4.19zm-6.3-1.58a13.4 13.4 0 0 1-2.91-1.41 11.46 11.46 0 0 0 2.81-5.37H12V4H7.31a4 4 0 0 0-.2-.56C6.87 2.79 6.6 2 6.6 2l-1.47.5s.4.89.6 1.5H0v1.33h2.15A11.23 11.23 0 0 0 5 10.7a17.2 17.2 0 0 1-5 2.1q.56.82.87 1.38a23.3 23.3 0 0 0 5.22-2.51 15.6 15.6 0 0 0 3.56 1.77zM3.63 5.33h4.91a8.1 8.1 0 0 1-2.45 4.45 9.1 9.1 0 0 1-2.46-4.45" />
    </svg>
  );
}

/**
 * Official Wikimedia Foundation Logo Icon
 */
export function WikimediaLogoIcon({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M6.08 5.555a6.048 6.048 0 0 0 3.055 10.593v-7.54L6.08 5.556zm7.828.004-3.05 3.05v7.536a6.048 6.048 0 0 0 3.05-10.587z" />
      <path d="M3.414 2.89C1.424 4.69.164 7.287.168 10.173c.007 5.406 4.42 9.806 9.828 9.806s9.82-4.4 9.828-9.806c.004-2.886-1.255-5.482-3.246-7.285L14.865 4.6a7.36 7.36 0 0 1 2.524 5.568c-.007 4.09-3.3 7.375-7.394 7.375S2.61 14.26 2.604 10.17a7.36 7.36 0 0 1 2.523-5.568z" />
      <circle cx="10" cy="3.32" r="3.32" />
    </svg>
  );
}

/**
 * Official Wikipedia Logo Icon
 */
export function WikipediaLogoIcon({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M11.14 4H14a.69.69 0 0 1 0 .65c-1 .16-1.36.91-1.81 1.83l-1.4 2.75 2.35 5.21h.07l3.52-8.1c.44-1.07.4-1.59-.79-1.7a.68.68 0 0 1 0-.65h3.45a.68.68 0 0 1 0 .65c-1.21.16-1.42.91-1.81 1.83l-4.37 10.08c-.13.3-.24.45-.44.45s-.33-.16-.42-.45l-2.48-5.73-2.72 5.73c-.11.3-.24.45-.44.45s-.31-.16-.42-.45l-4-10.09c-.57-1.4-.6-1.7-1.65-1.8A.68.68 0 0 1 .62 4h3.91a.68.68 0 0 1 0 .65c-1.16.13-1.21.45-.74 1.58l3.41 8.19h.05L9.3 10 7.78 6.45C7.17 5.05 7 4.77 6.24 4.66a.69.69 0 0 1 0-.65h3.32a.68.68 0 0 1 0 .65c-.74.12-.7.45-.19 1.58l.87 2 .08.09 1-2c.57-1.14.64-1.58-.15-1.7a.69.69 0 0 1-.03-.63" />
    </svg>
  );
}
