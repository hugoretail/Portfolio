import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT_MD = new URL('../../PROJECTS.md', import.meta.url);
const ROOT_JSON = new URL('../src/data/projects.json', import.meta.url);

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const tagFromText = (text) => {
  const t = String(text || '').toLowerCase();
  const tags = [];
  const add = (x) => tags.push(x);

  // Languages
  if (/(^|\b)java(\b|$)/.test(t)) add('java');
  if (/(^|\b)python(\b|$)/.test(t)) add('python');
  if (/(^|\b)php(\b|$)/.test(t)) add('php');
  if (/(^|\b)typescript(\b|$)/.test(t)) add('typescript');
  if (/(^|\b)javascript(\b|$)/.test(t) || /\bjs\b/.test(t)) add('javascript');
  if (/(^|\b)c#(\b|$)/.test(t) || /\bcsharp\b/.test(t)) add('csharp');
  if (/(^|\b)bash(\b|$)/.test(t) || /\bshell\b/.test(t)) add('bash');
  if (/(^|\b)c\b/.test(t) && /programmation\s+syst[eè]me/.test(t)) add('c');

  // Web & frameworks
  if (/react/.test(t)) add('react');
  if (/next\.js|nextjs/.test(t)) add('nextjs');
  if (/astro/.test(t)) add('astro');
  if (/svelte/.test(t)) add('svelte');
  if (/symfony/.test(t)) add('symfony');
  if (/flask/.test(t)) add('flask');
  if (/django/.test(t)) add('django');
  if (/streamlit/.test(t)) add('streamlit');
  if (/tailwind/.test(t)) add('tailwind');
  if (/bootstrap/.test(t)) add('bootstrap');
  if (/twig/.test(t)) add('twig');
  if (/vite/.test(t)) add('vite');
  if (/node\.js|nodejs/.test(t)) add('nodejs');
  if (/express/.test(t)) add('express');
  if (/api\s*rest|rest\b/.test(t)) add('rest');

  // Data / DB
  if (/postgres/.test(t)) add('postgresql');
  if (/mysql/.test(t)) add('mysql');
  if (/sqlite/.test(t)) add('sqlite');
  if (/prisma/.test(t)) add('prisma');
  if (/sql\b/.test(t)) add('sql');
  if (/orm/.test(t)) add('orm');
  if (/pandas/.test(t)) add('pandas');
  if (/matplotlib/.test(t)) add('matplotlib');
  if (/visualisation|graphiques|charts?\.js/.test(t)) add('visualisation');

  // DevOps / tooling
  if (/docker/.test(t)) add('docker');
  if (/compose/.test(t)) add('compose');
  if (/github\s*actions/.test(t)) add('github-actions');
  if (/gitlab/.test(t)) add('gitlab');
  if (/ci\/?cd|cicd/.test(t)) add('cicd');
  if (/jenkins/.test(t)) add('jenkins');
  if (/git\b/.test(t)) add('git');

  // AI / ML
  if (/deep\s*learning|apprentissage\s*supervis[eé]|cnn\b|yolo|pytorch|transformers|bert|roberta|lstm|crf/.test(t)) add('deeplearning');
  if (/nlp|entit[eé]s\s*nomm[eé]es|ner\b/.test(t)) add('nlp');
  if (/ia\b|intelligence\s*artificielle|min-?max/.test(t)) add('ia');

  // Security / crypto
  if (/rsa|diffie|hellman|signature|cryptograph|ecc|ecdh|courbes\s*elliptiques/.test(t)) add('crypto');
  if (/s[eé]curit[eé]|security/.test(t)) add('security');

  // Systems / network
  if (/linux|unix|mint|xfce/.test(t)) add('linux');
  if (/vmware|virtual(box)?|qemu|machine\s*virtuelle/.test(t)) add('virtualisation');
  if (/r[eé]seau|nemu|dns|dhcp|tcp\/ip|osi|routage/.test(t)) add('reseau');

  // Quality / tests
  if (/tests?\b|tdd|junit|pytest|jest|phpunit|testing\s+library/.test(t)) add('tests');

  // Modeling / architecture
  if (/uml|winedesign|mod[eé]lisat/.test(t)) add('uml');
  if (/mvc|architecture\b|couches|patterns?|solid|gasp/.test(t)) add('architecture');

  // 3D / VR
  if (/unity|vr|r[eé]alit[eé]\s*virtuelle|3d|realsense|opencv|aruco/.test(t)) add('3d');

  // Algo / graph
  if (/prim\b|graphe|graph\b|complexit[eé]|algorith/.test(t)) add('algo');

  return uniq(tags);
};

const parseProjects = (md) => {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let cur = null;
  let section = 'none';

  const pushCur = () => {
    if (!cur) return;

    // Default image path (predictable convention). If the file doesn't exist, the UI falls back to a placeholder.
    if (!cur.image) cur.image = `/assets/images/informatique/projects/${cur.id}.webp`;

    const blob = [
      cur.title,
      cur.description ?? '',
      cur.tools.join(' '),
      cur.competences.join(' '),
      cur.cdc.join(' '),
      cur.keep.join(' '),
      cur.improve.join(' ')
    ].join(' \n ');
    cur.tags = uniq([...(cur.tags || []), ...tagFromText(blob)]);
    out.push(cur);
    cur = null;
    section = 'none';
  };

  const addBullet = (arr, raw) => {
    const s = String(raw || '').replace(/^\s*[-•]\s+/, '').trim();
    if (!s) return;
    arr.push(s);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const h = line.match(/^####\s+(.+?)\s*(?:\((\d{4})\))?\s*$/);
    if (h) {
      pushCur();
      const title = h[1].trim();
      const year = h[2] ? h[2].trim() : undefined;
      cur = {
        id: slugify(title + (year ? `-${year}` : '')),
        title,
        year,
        duration: undefined,
        description: undefined,
        competences: [],
        tools: [],
        cdc: [],
        keep: [],
        improve: [],
        href: undefined,
        image: undefined,
        tags: []
      };
      section = 'none';
      continue;
    }

    if (!cur) continue;
    const t = line.trim();
    if (!t) continue;

    const kv = t.match(/^(Dur[ée]e|Description|Image|Lien|Repo|Labels?|Tags?)\s*:\s*(.+)\s*$/i);
    if (kv) {
      const k = kv[1].toLowerCase();
      const v = kv[2].trim();
      if (k.startsWith('dur')) cur.duration = v;
      else if (k.startsWith('desc')) cur.description = v;
      else if (k === 'image') cur.image = v;
      else if (k === 'lien' || k === 'repo') cur.href = v;
      else if (k.startsWith('label') || k.startsWith('tag')) {
        const extra = v
          .split(/[,;|]/g)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        cur.tags = uniq([...(cur.tags || []), ...extra]);
      }
      continue;
    }

    if (/^Comp[ée]tences\s*:\s*$/i.test(t)) {
      section = 'competences';
      continue;
    }
    if (/^Outils\s*:\s*$/i.test(t)) {
      section = 'tools';
      continue;
    }
    if (/^Cahier des Charges\s*:\s*$/i.test(t)) {
      section = 'cdc';
      continue;
    }
    if (/^R[ée]sultat\s*:\s*$/i.test(t)) {
      section = 'result';
      continue;
    }
    if (/^[-•]\s*À\s*garder\s*:\s*$/i.test(t)) {
      section = 'keep';
      continue;
    }
    if (/^[-•]\s*À\s*am[ée]liorer\s*:\s*$/i.test(t)) {
      section = 'improve';
      continue;
    }

    if (/^\s*[-•]\s+/.test(raw)) {
      if (section === 'competences') addBullet(cur.competences, raw);
      else if (section === 'tools') addBullet(cur.tools, raw);
      else if (section === 'cdc') addBullet(cur.cdc, raw);
      else if (section === 'keep') addBullet(cur.keep, raw);
      else if (section === 'improve') addBullet(cur.improve, raw);
      continue;
    }

    if (/^\s{2,}[-•]\s+/.test(raw)) {
      if (section === 'keep') addBullet(cur.keep, raw);
      else if (section === 'improve') addBullet(cur.improve, raw);
      else if (section === 'cdc') addBullet(cur.cdc, raw);
      else if (section === 'competences') addBullet(cur.competences, raw);
      else if (section === 'tools') addBullet(cur.tools, raw);
      continue;
    }
  }

  pushCur();
  return out;
};

const md = readFileSync(ROOT_MD, 'utf-8');
const projects = parseProjects(md);
mkdirSync(new URL('.', ROOT_JSON), { recursive: true });
writeFileSync(ROOT_JSON, JSON.stringify(projects, null, 2) + '\n', 'utf-8');
console.log(`Wrote ${projects.length} projects → ${ROOT_JSON.pathname}`);
