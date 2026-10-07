/**
 * Minimal, safe Markdown renderer for blog posts.
 *
 * Everything is HTML-escaped first, so post content can never inject markup —
 * then a small subset of Markdown is converted to HTML (headings, paragraphs,
 * emphasis, links, lists, inline code). Links are restricted to internal paths
 * and http(s) URLs.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("#")) return href;
  return null;
}

function inline(text: string): string {
  let out = text;
  // inline code first so other rules don't touch its contents
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-brand-on-soft">$1</code>'
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) => {
      const safe = safeHref(href);
      if (!safe) return label;
      const external = /^https?:\/\//i.test(safe);
      const rel = external ? ' rel="noopener noreferrer" target="_blank"' : "";
      return `<a href="${safe}"${rel}>${label}</a>`;
    }
  );
  return out;
}

const P = "my-4 text-[15px] leading-7 text-muted";
const H2 = "mt-8 mb-3 text-xl font-bold text-ink sm:text-2xl";
const H3 = "mt-6 mb-2 text-lg font-bold text-ink";
const LI = "my-1.5 leading-7 text-muted";

export function renderMarkdown(markdown: string): string {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length) {
      html.push(`<p class="${P}">${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length === 2 ? 2 : 3;
      const cls = level === 2 ? H2 : H3;
      html.push(`<h${level} class="${cls}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = line.match(/^-\s+(.*)$/);
    if (ul) {
      closeParagraph();
      if (list !== "ul") {
        closeList();
        html.push('<ul class="my-4 pl-5 list-disc space-y-1">');
        list = "ul";
      }
      html.push(`<li class="${LI}">${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      closeParagraph();
      if (list !== "ol") {
        closeList();
        html.push('<ol class="my-4 pl-5 list-decimal space-y-1">');
        list = "ol";
      }
      html.push(`<li class="${LI}">${inline(ol[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  closeParagraph();
  closeList();
  return html.join("\n");
}
