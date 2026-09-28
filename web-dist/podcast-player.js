(() => {
  const episodes = [
    { id: '0MjRBwyjqhzoBdx7pbt1k6', title: 'Sirrangia and Worldbuilding Through Campaign Building!', show: 'Mastering Dungeons', tags: ['worldbuilding', 'campaigns', 'DM'] },
    { id: '18w3nIQBRAFkjpI4rPhu5F', title: 'From Opera to Encounters: Turning Big Ideas into Playable Reality', show: 'How to Be a Better DM', tags: ['encounters', 'creativity', 'DM'] },
    { id: '6yK94qksHewsvS3H74JyEl', title: 'Roll for Chaos: A Live, Unscripted D&D Adventure', show: 'How to Be a Better DM', tags: ['improv', 'actual play', 'DM'] },
    { id: '5DpwMgWYSXxSppqEoDfpIf', title: 'GMing 101: Top DM Tips from Dragon Steel Nexus', show: 'How to Be a Better DM', tags: ['GM tips', 'communication', 'sessions'] },
    { id: '6ze6frz80e3FmivlkcfgIp', title: 'How to Start an Actual Play D&D Podcast', show: 'How to Be a Better DM', tags: ['actual play', 'creative projects'] },
    { id: '3LmSl6bDrX4BhVracbNM1o', title: 'Diving Deep into Theme, Fate, and Storytelling', show: 'How to Be a Better DM', tags: ['storytelling', 'themes', 'DM'] },
    { id: '5c3tjkoD1tAIdaYw73kIgL', title: 'Which D&D Books to Buy', show: 'How to Be a Better DM', tags: ['books', 'new DM'] },
    { id: '2FN85jBLA8vOMXlz1tA96m', title: 'Magic Item Shops: Guardians, Pricing, and Players Who Want to Rob You', show: 'How to Be a Better DM', tags: ['worldbuilding', 'magic items', 'DM'] },
    { id: '61U0V14kAWSg62ixlFkoj9', title: 'DM Coaching: DMing for Kids and Tying Up Loose Ends', show: 'How to Be a Better DM', tags: ['kids', 'campaigns', 'DM coaching'] },
    { id: '0LAJdQd1qQhKNuvb7SzMqf', title: 'The Hidden Costs of Using AI in Your D&D Prep', show: 'How to Be a Better DM', tags: ['AI', 'prep', 'DM'] },
    { id: '3IZdlFlmiyBoilKbPkzcRo', title: '4 Combat Expectations That Work for High- and Low-level Combat', show: 'How to Be a Better DM', tags: ['combat', 'encounters', 'DM'] },
    { id: '1YMqW5716hL6z19VB0CRxE', title: 'Watch Out! Part 1 — First-Time DMing', show: 'Oxventure: A Dungeons & Dragons Podcast', tags: ['DMing', 'actual play', 'confidence'] },
    { id: '5l4Sau4cO4mwXTRgvBIOtR', title: 'Recent Game Design Lessons', show: 'Mastering Dungeons', tags: ['game design', 'RPG design'] },
    { id: '11GOinCQp6FJG8h0uvBUSB', title: 'How Good is D&D’s New Website?', show: 'Mastering Dungeons', tags: ['D&D', 'community', 'new players'] },
    { id: '7cHG8x46pz4xZQ7pxtwyA7', title: 'Rise of the Lazy Gamemaster with Mike Shea', show: 'Mastering Dungeons', tags: ['prep', 'GM advice', 'Sly Flourish'] },
    { id: '1kSaSV0iRa3vHo9bVg5Mzh', title: 'Best of Waterdeep: Dungeon of the Mad Mage!', show: 'Mastering Dungeons', tags: ['adventures', 'Waterdeep', 'dungeons'] },
    { id: '75gmCIKdnANQ3Ts63Z2BuU', title: 'Draw Steel at Level 1!', show: 'Mastering Dungeons', tags: ['RPG design', 'character play'] },
    { id: '0Hkf9aaToj0uXNL4d2uFyS', title: 'Best of Baldur’s Gate: Descent Into Avernus!', show: 'Mastering Dungeons', tags: ['adventures', "Baldur's Gate"] },
    { id: '1cZMSTNmc97JHiJB3727OS', title: 'Mystic Arts and Creator Publishing', show: 'Mastering Dungeons', tags: ['RPG design', 'publishing', 'creators'] },
    { id: '4OvgnK7wzDYVukjAWaEMS7', title: 'Draw Steel Character Classes, Careers, and Cultures!', show: 'Mastering Dungeons', tags: ['classes', 'worldbuilding', 'RPG design'] },
    { id: '49VCsy5V4ZWlqeYuwY4pSn', title: 'Daggerheart Domains and Actions', show: 'Mastering Dungeons', tags: ['Daggerheart', 'RPG design'] },
    { id: '2O8rUB7kk7fUBmdo9YHDv0', title: 'D&D on Death Row with Keri Blakinger', show: 'Dungeon Master of None', tags: ['D&D culture', 'community'] },
    { id: '4LUQdRE7HDGKf6zA2DeIKE', title: 'Dungeon Masters — Innsmouth Interlude, Episode 2', show: 'Dungeon Masters — Official D&D Actual Play', tags: ['actual play', 'Ravenloft'] },
    { id: '5mHsg0iCDW0ee692kiEwTk', title: 'Dungeon Masters — Innsmouth Interlude, Episode 3', show: 'Dungeon Masters — Official D&D Actual Play', tags: ['actual play', 'Ravenloft'] },
    { id: '76hNTfELLZa7n3sd5vbuzU', title: 'Dungeon Masters — Campaign 2, Episode 3', show: 'Dungeon Masters — Official D&D Actual Play', tags: ['actual play', 'Anauroch'] }
  ];

  const STORAGE_KEY = 'astra-podcast-v1';
  const VISIBILITY_KEY = 'astra-podcast-visible-v1';
  let open = false;
  let visible = true;
  let currentIndex = 0;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Number.isInteger(saved.current) && saved.current >= 0 && saved.current < episodes.length) currentIndex = saved.current;
    const savedVisibility = localStorage.getItem(VISIBILITY_KEY);
    if (savedVisibility !== null) visible = savedVisibility !== 'false';
  } catch (_) {}

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ current: currentIndex })); } catch (_) {}
  };

  const saveVisibility = () => {
    try { localStorage.setItem(VISIBILITY_KEY, String(visible)); } catch (_) {}
  };

  const pickDifferent = () => {
    if (episodes.length < 2) return 0;
    let next = Math.floor(Math.random() * episodes.length);
    while (next === currentIndex) next = Math.floor(Math.random() * episodes.length);
    return next;
  };

  const style = document.createElement('style');
  style.textContent = `
    #astra-podcast-root{position:relative;z-index:2147483000;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #astra-podcast-launcher{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;border:1px solid rgba(226,197,114,.35);border-radius:999px;background:#111715;color:#f4ead0;padding:12px 18px;font:700 14px/1.2 system-ui,sans-serif;box-shadow:0 12px 35px rgba(0,0,0,.5);cursor:pointer;white-space:nowrap;touch-action:manipulation;pointer-events:auto}
    #astra-podcast-panel{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;width:min(620px,calc(100vw - 16px));box-sizing:border-box;border:1px solid #665b42;border-radius:18px;background:#101512;color:#f7efd8;padding:13px;box-shadow:0 18px 50px rgba(0,0,0,.65);pointer-events:auto}
    .astra-podcast-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.astra-podcast-kicker{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#d9bc70}.astra-podcast-title{font-size:16px;line-height:1.3;margin:4px 0 0;color:#fff7df}.astra-podcast-meta{font-size:12px;line-height:1.4;color:#cfc6ae;margin:5px 0 0}.astra-podcast-close{width:40px;height:40px;flex:0 0 40px;border:1px solid #5d5545;border-radius:50%;background:#25281f;color:#fff7df;font-size:22px;cursor:pointer;touch-action:manipulation}.astra-podcast-frame{display:block;width:100%;height:152px;border:0;border-radius:12px;background:#050705}.astra-podcast-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.astra-podcast-button,.astra-podcast-link,.astra-podcast-hide{border-radius:10px;padding:9px 12px;font:700 13px/1.2 system-ui,sans-serif;text-decoration:none;cursor:pointer;touch-action:manipulation}.astra-podcast-button{border:0;background:#795f24;color:#fff}.astra-podcast-link{display:inline-flex;align-items:center;border:1px solid #5d5545;background:#25281f;color:#fff7df}.astra-podcast-hide{border:1px solid #5d5545;background:transparent;color:#cfc6ae}.astra-podcast-note{font-size:11px;color:#a9a28f;margin:9px 0 0}
    @media(max-width:640px){#astra-podcast-panel{width:calc(100vw - 10px);padding:11px}.astra-podcast-actions>*{flex:1;justify-content:center;text-align:center}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'astra-podcast-root';
  document.body.appendChild(root);

  function syncSettingsToggle() {
    const checkbox = document.getElementById('prefPodcasts');
    if (checkbox) checkbox.checked = visible;
  }

  function setVisible(next, persist = true) {
    visible = !!next;
    if (!visible) {
      open = false;
      root.replaceChildren();
      root.hidden = true;
    } else {
      root.hidden = false;
      render();
    }
    if (persist) saveVisibility();
    syncSettingsToggle();
  }

  function installSettingsToggle() {
    const settings = document.getElementById('astraSettings');
    if (!settings || document.getElementById('prefPodcasts')) return false;
    const label = document.createElement('label');
    label.className = 'setting-row';
    label.innerHTML = '<input id="prefPodcasts" type="checkbox"> Show podcast button';
    const fullscreen = settings.querySelector('#fullscreen');
    if (fullscreen) fullscreen.before(label); else settings.append(label);
    const checkbox = label.querySelector('input');
    checkbox.checked = visible;
    checkbox.addEventListener('change', event => setVisible(event.target.checked));
    return true;
  }

  function ensureSettingsToggle() {
    if (!installSettingsToggle()) setTimeout(ensureSettingsToggle, 350);
  }

  function render() {
    if (!visible) {
      root.hidden = true;
      root.replaceChildren();
      return;
    }
    root.hidden = false;
    if (!open) {
      root.innerHTML = '<button id="astra-podcast-launcher" type="button" aria-label="Open D&D podcasts">🎧 Podcasts</button>';
      root.querySelector('#astra-podcast-launcher').addEventListener('click', () => { open = true; render(); });
      return;
    }

    const current = episodes[currentIndex];
    root.innerHTML = `
      <aside id="astra-podcast-panel" aria-label="Astra D&D podcast player">
        <div class="astra-podcast-head"><div><div class="astra-podcast-kicker">Astra Adventures · D&D / GM podcast</div><h2 class="astra-podcast-title"></h2><p class="astra-podcast-meta"></p></div><button type="button" class="astra-podcast-close" aria-label="Close podcast player">×</button></div>
        <iframe class="astra-podcast-frame" title="Spotify podcast episode" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
        <div class="astra-podcast-actions"><button type="button" class="astra-podcast-button">🎲 Different podcast</button><a class="astra-podcast-link" target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a><button type="button" class="astra-podcast-hide">Hide podcasts</button></div>
        <p class="astra-podcast-note">25-episode D&D, DMing, RPG-design and worldbuilding bank stored inside Astra. Hide/show the launcher any time from Display settings.</p>
      </aside>`;

    root.querySelector('.astra-podcast-title').textContent = current.title;
    root.querySelector('.astra-podcast-meta').textContent = `${current.show} · ${current.tags.join(' · ')}`;
    const frame = root.querySelector('.astra-podcast-frame');
    frame.src = `https://open.spotify.com/embed/episode/${encodeURIComponent(current.id)}?theme=0`;
    frame.title = `Spotify episode: ${current.title}`;
    root.querySelector('.astra-podcast-link').href = `https://open.spotify.com/episode/${encodeURIComponent(current.id)}`;
    root.querySelector('.astra-podcast-close').addEventListener('click', () => { open = false; render(); });
    root.querySelector('.astra-podcast-button').addEventListener('click', () => { currentIndex = pickDifferent(); save(); render(); });
    root.querySelector('.astra-podcast-hide').addEventListener('click', () => setVisible(false));
  }

  function yieldToGameAudio() {
    if (!open) return;
    open = false;
    render();
  }

  document.addEventListener('play', yieldToGameAudio, true);
  setInterval(() => {
    if (open && window.speechSynthesis && window.speechSynthesis.speaking) yieldToGameAudio();
  }, 400);

  window.AstraPodcast = { setVisible, isVisible: () => visible };
  ensureSettingsToggle();
  setVisible(visible, false);
})();