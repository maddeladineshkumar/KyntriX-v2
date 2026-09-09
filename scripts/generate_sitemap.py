import json
from pathlib import Path
from urllib.parse import quote

q = chr(34)
catalog_path = Path('src/data/robots/robotsCatalog.json')
with open(catalog_path, 'r', encoding='utf-8') as f:
    catalog = json.load(f)

BASE_URL = 'https://kyntrix.org'
TODAY = '2026-09-09'

studios = [
    ('dh', '0.9', 'weekly', 'Denavit-Hartenberg (DH) Parameter Studio'),
    ('ik', '0.9', 'weekly', 'Inverse Kinematics 6R Analytical and Numerical DLS Solver Studio'),
    ('transform', '0.8', 'monthly', 'Homogeneous Transformation Matrix Studio'),
    ('trajectory', '0.8', 'weekly', 'Robot Trajectory Planning and Dynamic Simulation Studio'),
    ('analysis', '0.8', 'weekly', 'Kinematic Telemetry and Time-Series Plots Studio'),
    ('workspace', '0.8', 'weekly', '3D Reachable Workspace Point Cloud Generator'),
    ('custom', '0.8', 'monthly', 'Custom Robot Manipulator Architecture Synthesizer'),
]

flagships = {'Puma560', 'ABBIRB120', 'KukaKR5', 'FanucM10iA', 'Stanford', 'skeleton_SCARA', 'skeleton_3R', 'skeleton_6R'}

lines = [
    f'<?xml version={q}1.0{q} encoding={q}UTF-8{q}?>',
    f'<urlset xmlns={q}http://www.sitemaps.org/schemas/sitemap/0.9{q}',
    f'        xmlns:image={q}http://www.google.com/schemas/sitemap-image/1.1{q}>',
    '  <!-- Core Homepage & Primary Simulation Laboratory -->',
    '  <url>',
    f'    <loc>{BASE_URL}/</loc>',
    f'    <lastmod>{TODAY}</lastmod>',
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '    <image:image>',
    f'      <image:loc>{BASE_URL}/wordmark.png</image:loc>',
    '      <image:title>KyntriX 3D Robotics Kinematics &amp; Simulation Laboratory</image:title>',
    '      <image:caption>Interactive 3D serial manipulator kinematics, DH parameter calculation, and physics simulation</image:caption>',
    '    </image:image>',
    '    <image:image>',
    f'      <image:loc>{BASE_URL}/logo.png</image:loc>',
    '      <image:title>KyntriX Robotics Laboratory Logo</image:title>',
    '      <image:caption>KyntriX robotics laboratory insignia</image:caption>',
    '    </image:image>',
    '  </url>',
    '',
    '  <!-- Interactive Robotics Studios -->',
]

for s_id, prio, freq, title in studios:
    lines.extend([
        '  <url>',
        f'    <loc>{BASE_URL}/?studio={s_id}</loc>',
        f'    <lastmod>{TODAY}</lastmod>',
        f'    <changefreq>{freq}</changefreq>',
        f'    <priority>{prio}</priority>',
        '    <image:image>',
        f'      <image:loc>{BASE_URL}/wordmark.png</image:loc>',
        f'      <image:title>{title} — KyntriX</image:title>',
        '    </image:image>',
        '  </url>',
    ])

lines.extend([
    '',
    '  <!-- Full Robot Model Catalog -->',
    '  <url>',
    f'    <loc>{BASE_URL}/?action=catalog</loc>',
    f'    <lastmod>{TODAY}</lastmod>',
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.85</priority>',
    '  </url>',
    '',
    '  <!-- Individual 42 Robot Kinematic Model Environments -->',
])

for r in catalog:
    r_id = r['id']
    name = r['name']
    mfg = r.get('manufacturer', '')
    dof = r.get('dof', 6)
    prio = '0.9' if r_id in flagships else ('0.7' if mfg == 'Skeleton' else '0.8')
    lines.extend([
        '  <url>',
        f'    <loc>{BASE_URL}/?robot={quote(r_id)}</loc>',
        f'    <lastmod>{TODAY}</lastmod>',
        '    <changefreq>monthly</changefreq>',
        f'    <priority>{prio}</priority>',
        '    <image:image>',
        f'      <image:loc>{BASE_URL}/wordmark.png</image:loc>',
        f'      <image:title>{name} ({dof}-DOF {mfg}) 3D Robotics Kinematics &amp; DH Simulation</image:title>',
        '    </image:image>',
        '  </url>',
    ])

lines.append('</urlset>')

out_path = Path('public/sitemap.xml')
out_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'Successfully generated {out_path} with {1 + len(studios) + 1 + len(catalog)} URLs.')

# Generate public/404.html
html_404 = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, follow" />
    <title>404 — Page Not Found | KyntriX Robotics Laboratory</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #f7f4ed;
        color: #1c1917;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
      }
      .card {
        background: #ffffff;
        border: 2px solid #e7e5e4;
        border-radius: 24px;
        padding: 40px 32px;
        max-width: 580px;
        width: 100%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      }
      .brand {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 24px;
      }
      .brand img {
        height: 36px;
        width: auto;
      }
      .code-badge {
        display: inline-block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        font-weight: 700;
        background-color: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
        padding: 4px 12px;
        border-radius: 9999px;
        margin-bottom: 16px;
        letter-spacing: 0.05em;
      }
      h1 {
        font-size: 26px;
        font-weight: 900;
        color: #0c0a09;
        margin-bottom: 12px;
        line-height: 1.25;
      }
      p {
        font-size: 14px;
        color: #57534e;
        line-height: 1.6;
        margin-bottom: 28px;
      }
      .links-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 24px;
      }
      @media (max-width: 480px) {
        .links-grid { grid-template-columns: 1fr; }
        .card { padding: 28px 20px; }
      }
      .btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 14px 16px;
        border-radius: 16px;
        text-decoration: none;
        border: 1px solid #e7e5e4;
        background: #fafaf9;
        transition: all 0.15s ease;
        text-align: left;
      }
      .btn:hover {
        background: #f5f5f4;
        border-color: #d6d3d1;
        transform: translateY(-1px);
      }
      .btn.primary {
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        color: #ffffff;
        border: none;
        grid-column: 1 / -1;
        align-items: center;
        font-weight: 700;
        padding: 14px 20px;
        font-size: 15px;
      }
      .btn.primary:hover {
        background: linear-gradient(135deg, #d97706, #c2410c);
        box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);
      }
      .btn-title {
        font-size: 13px;
        font-weight: 700;
        color: #1c1917;
        margin-bottom: 2px;
      }
      .btn-desc {
        font-size: 11px;
        color: #78716c;
      }
      footer {
        margin-top: 24px;
        font-size: 12px;
        color: #a8a29e;
      }
    </style>
    <script>
      (function() {
        var path = window.location.pathname;
        if (path && path !== '/' && path !== '/404.html') {
          var cleanPath = path.replace(/^\\//, '').replace(/\\.html$/, '');
          if (cleanPath.startsWith('studio-') || cleanPath === 'dh' || cleanPath === 'ik' || cleanPath === 'trajectory') {
            window.location.replace('/?studio=' + encodeURIComponent(cleanPath.replace(/^studio-/, '')));
          } else if (cleanPath.startsWith('robot-')) {
            window.location.replace('/?robot=' + encodeURIComponent(cleanPath.replace(/^robot-/, '')));
          }
        }
      })();
    </script>
  </head>
  <body>
    <main class="card">
      <div class="brand">
        <picture>
          <source srcset="/wordmark.webp" type="image/webp" />
          <img src="/wordmark.png" alt="KyntriX Robotics Laboratory" width="180" height="36" />
        </picture>
      </div>
      <span class="code-badge">ERROR 404 // KINEMATIC CHAIN NOT FOUND</span>
      <h1>Target Coordinate Frame Missing</h1>
      <p>
        The requested robot model, simulation studio, or trajectory file does not exist in the KyntriX library. Return to the primary 3D simulation laboratory or select an active studio below.
      </p>

      <nav class="links-grid" aria-label="404 Navigation Links">
        <a href="/" class="btn primary">Return to 3D Simulation Laboratory</a>
        <a href="/?studio=dh" class="btn">
          <span class="btn-title">DH Parameter Studio</span>
          <span class="btn-desc">Standard &amp; Craig DH tables</span>
        </a>
        <a href="/?studio=ik" class="btn">
          <span class="btn-title">Inverse Kinematics</span>
          <span class="btn-desc">6R Analytical &amp; DLS solvers</span>
        </a>
        <a href="/?studio=trajectory" class="btn">
          <span class="btn-title">Trajectory Studio</span>
          <span class="btn-desc">Cubic, quintic &amp; dynamic plots</span>
        </a>
        <a href="/?action=catalog" class="btn">
          <span class="btn-title">Robot Catalog</span>
          <span class="btn-desc">Explore 42 industrial models</span>
        </a>
      </nav>
    </main>

    <footer>
      &copy; 2026 KyntriX Robotics Simulation Platform. Inspired by RoboAnalyzer (IIT Delhi).
    </footer>
  </body>
</html>
"""
Path('public/404.html').write_text(html_404.strip() + '\n', encoding='utf-8')
print('Successfully generated public/404.html')

