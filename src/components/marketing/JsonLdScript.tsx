import React from 'react';

interface JsonLdScriptProps {
  data: Record<string, unknown>;
}

/**
 * Renders schema.org JSON-LD structured data safely with HTML character escaping
 * per Next.js App Router recommendations.
 */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

