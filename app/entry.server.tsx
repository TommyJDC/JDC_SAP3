import type { EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";
// Corrected import: Use named import instead of default import
import { isbot } from "isbot";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html");

  // Add cache control headers for static assets
  // Adjust caching strategy as needed
  if (request.url.includes("/build/")) {
     responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
     responseHeaders.set("Cache-Control", "public, max-age=3600"); // Cache HTML for 1 hour
  }

  // Bot detection - you might customize response for bots
  const userAgent = request.headers.get("user-agent");
  // Use the imported isbot function directly
  if (userAgent && isbot(userAgent)) {
    // Optional: Modify response for bots (e.g., simplified HTML, different status code)
  }

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
