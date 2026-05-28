import { useEffect, useRef, useState, type CSSProperties, type FC } from "react";
import { Previewer } from "pagedjs";
import { renderExportBody } from "../export/render-static-html";
import type { DocumentModel } from "./DocumentRenderer";
import { buildPageCss } from "./page-css";
import type { BrandTokens } from "../schema/brand";

export interface PageViewProps {
  doc: DocumentModel;
  brand: BrandTokens;
  docFolderPath?: string;
}

/**
 * On-demand, read-only A4 Page view. Renders the DocumentRenderer output and
 * paginates it into real page boxes with paged.js so the consultant can see
 * where page breaks fall (ADR-0017, item 4). Pagination runs once per
 * doc/brand change; the live editor remains the continuous editing surface.
 */
export const PageView: FC<PageViewProps> = ({ doc, brand, docFolderPath = "/docs" }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"rendering" | "ready" | "failed">("rendering");

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    let cancelled = false;
    setStatus("rendering");
    container.innerHTML = "";

    const css = buildPageCss(brand, { title: doc.meta.project });

    // Reuse the export body renderer so charts/diagrams/images are pre-rendered
    // (no live ECharts/Mermaid during SSR, which would throw), then paginate
    // with paged.js. Bail if torn down mid-flight (doc switch / unmount).
    void renderExportBody(doc, brand, docFolderPath)
      .then((body) => {
        if (cancelled) return undefined;
        // paged.js treats a bare string in the stylesheets array as a URL to
        // fetch; inline CSS must be passed as an object value ({ _: cssText }).
        return new Previewer().preview(body, [{ _: css }], container);
      })
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [doc, brand, docFolderPath]);

  return (
    <div aria-label="Page view" style={styles.shell}>
      {status === "rendering" ? <p style={styles.note}>Paginating…</p> : null}
      {status === "failed" ? (
        <p role="alert" style={styles.note}>
          Could not paginate this document.
        </p>
      ) : null}
      <div ref={containerRef} style={styles.pages} />
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
  },
  note: {
    margin: 0,
    fontSize: "0.8125rem",
    color: "#64748B",
  },
  pages: {
    // paged.js renders .pagedjs_page boxes; centre them with a little gap.
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
    width: "100%",
  },
};

export default PageView;
