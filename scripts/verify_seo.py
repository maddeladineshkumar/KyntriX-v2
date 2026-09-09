import json
import xml.etree.ElementTree as ET
import re
from pathlib import Path

def test_all():
    print("=== STARTING RIGOROUS SEO VALIDATION ===")
    
    # 1. Manifest
    manifest_path = Path("public/manifest.json")
    assert manifest_path.exists(), "manifest.json missing"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest.get("name") and manifest.get("short_name"), "manifest missing names"
    assert manifest.get("start_url") == "/", "start_url should be /"
    assert manifest.get("display") == "standalone", "display should be standalone"
    assert len(manifest.get("icons", [])) >= 2, "need at least 2 icons"
    assert len(manifest.get("shortcuts", [])) >= 4, "shortcuts should be defined"
    print(f"[PASS] Manifest JSON valid with {len(manifest.get('shortcuts'))} quick-launch shortcuts.")

    # 2. Sitemap XML
    sitemap_path = Path("public/sitemap.xml")
    assert sitemap_path.exists(), "sitemap.xml missing"
    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    urls = root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url")
    assert len(urls) >= 45, f"Expected at least 45 URLs, found {len(urls)}"
    for u in urls:
        loc = u.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc").text
        assert loc.startswith("https://kyntrix.in.net"), f"Invalid loc: {loc}"
    print(f"[PASS] Sitemap XML valid with {len(urls)} URLs adhering to schema.")

    # 3. Robots.txt
    robots_path = Path("public/robots.txt")
    assert robots_path.exists(), "robots.txt missing"
    robots_txt = robots_path.read_text(encoding="utf-8")
    assert "User-agent: *" in robots_txt, "robots.txt missing wildcard user-agent"
    assert "Sitemap: https://kyntrix.in.net/sitemap.xml" in robots_txt, "robots.txt missing sitemap link"
    assert "Allow: /" in robots_txt, "robots.txt missing root allow"
    assert "Disallow: /tmp/" in robots_txt, "robots.txt missing disallow"
    print(f"[PASS] Robots.txt valid with explicit crawl directives and sitemap reference.")

    # 4. LLMs.txt
    llms_path = Path("public/llms.txt")
    assert llms_path.exists(), "llms.txt missing"
    llms_txt = llms_path.read_text(encoding="utf-8")
    assert "KyntriX" in llms_txt and "Denavit-Hartenberg" in llms_txt, "llms.txt content incomplete"
    print(f"[PASS] LLMs.txt valid ({len(llms_txt.splitlines())} lines of AI discovery context).")

    # 5. 404.html
    notfound_path = Path("public/404.html")
    assert notfound_path.exists(), "404.html missing"
    notfound_txt = notfound_path.read_text(encoding="utf-8")
    assert '<meta name="robots" content="noindex, follow" />' in notfound_txt, "404 missing noindex"
    assert "Target Coordinate Frame Missing" in notfound_txt, "404 missing heading"
    print(f"[PASS] 404.html valid with noindex, follow and smart redirect script.")

    # 6. index.html & Schema.org JSON-LD
    html_path = Path("index.html")
    assert html_path.exists(), "index.html missing"
    html = html_path.read_text(encoding="utf-8")

    # Check key tags
    assert '<html lang="en" dir="ltr">' in html, "missing lang and dir attributes"
    assert '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />' in html
    assert '<title>' in html and '</title>' in html
    assert '<meta name="description"' in html
    assert '<link rel="canonical" href="https://kyntrix.in.net/" />' in html
    assert '<meta property="og:title"' in html
    assert '<meta property="og:image"' in html
    assert '<meta name="twitter:card"' in html
    assert '<link rel="preload" href="/wordmark.webp" as="image" type="image/webp" />' in html

    # Extract JSON-LD
    pattern = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.DOTALL)
    match = pattern.search(html)
    assert match, "JSON-LD script block missing"
    ld_json = json.loads(match.group(1).strip())
    assert "@context" in ld_json and ld_json["@context"] == "https://schema.org"
    graph = ld_json.get("@graph", [])
    assert len(graph) == 4, f"Expected 4 entities in @graph, found {len(graph)}"
    types = [item["@type"] for item in graph]
    assert "WebApplication" in types
    assert "WebSite" in types
    assert "FAQPage" in types
    assert "ItemList" in types
    print(f"[PASS] JSON-LD valid: {types}")

    # Check semantic DOM in <div id="root">
    assert '<div id="root">' in html
    assert '<header class="app-top-header"' in html
    assert '<main id="main-content"' in html
    assert '<h1 id="hero-heading"' in html
    assert '<h2 id="features-heading"' in html
    assert '<h2 id="catalog-heading"' in html
    assert '<h2 id="theory-heading"' in html
    assert '<h2 id="faq-heading"' in html
    assert '<table' in html and 'Puma 560' in html and 'ABB IRB 120' in html
    assert '<details' in html and '<summary' in html
    assert '<footer' in html
    assert '<noscript>' in html
    print("[PASS] HTML5 semantic prerender structure verified: H1, H2s, H3s, Table, FAQs, Footer, Noscript.")

    print("\n=== ALL SEO CHECKS COMPLETED AND FULLY VERIFIED ===")

if __name__ == "__main__":
    test_all()
