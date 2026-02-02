<script lang="ts">
  import { tick } from 'svelte';

  type Line = { kind: 'in' | 'out'; text: string };

  const helpText = [
    'help — commandes',
    'list — projets',
    'open informatique — détail',
    'open graffiti — fresques',
    'open hiphop — playlist',
    'clear — effacer'
  ];

  const projects = [
    { key: 'informatique', title: 'Informatique', detail: 'Réseaux, dev, systèmes, tooling, interfaces.' },
    { key: 'graffiti', title: 'Graffiti', detail: 'Fresques, lettrages, couleurs, murs.' },
    { key: 'hiphop', title: 'Hip-Hop', detail: 'Boom bap, diggin, loops, cassette vibes.' }
  ];

  let input = '';
  let lines: Line[] = [
    { kind: 'out', text: 'HUGO_OS v0.1 — tape `help`' }
  ];

  let outputEl: HTMLDivElement | null = null;

  async function append(kind: Line['kind'], text: string) {
    lines = [...lines, { kind, text }];
    await tick();
    outputEl?.scrollTo({ top: outputEl.scrollHeight, behavior: 'smooth' });
  }

  async function run(cmd: string) {
    const c = cmd.trim().toLowerCase();
    if (!c) return;

    await append('in', cmd);

    if (c === 'help') {
      for (const h of helpText) await append('out', h);
      return;
    }

    if (c === 'clear') {
      lines = [{ kind: 'out', text: 'OK. écran nettoyé.' }];
      return;
    }

    if (c === 'list') {
      for (const p of projects) await append('out', `${p.key} — ${p.title}`);
      return;
    }

    if (c.startsWith('open ')) {
      const key = c.replace('open ', '').trim();
      const found = projects.find((p) => p.key === key);
      if (!found) {
        await append('out', `Inconnu: ${key}. Essaie list.`);
        return;
      }
      await append('out', `${found.title}: ${found.detail}`);
      await append('out', `Lien: /${found.key === 'informatique' ? 'informatique' : found.key}`);
      return;
    }

    await append('out', `Commande inconnue: ${cmd}. tape help.`);
  }

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    const cmd = input;
    input = '';
    await run(cmd);
  }
</script>

<div class="relative z-10 w-full">
  <div class="mb-2 flex items-end gap-3">
    <div class="font-display text-xl tracking-wide">Informatique</div>
    <div class="font-hand text-lg text-[color:var(--muted)]">terminal interactif</div>
  </div>

  <div class="brutal-border relative bg-black/60 p-3">
    <div class="absolute inset-0 opacity-20 bg-graffiti" aria-hidden="true"></div>

    <div bind:this={outputEl} class="relative h-[220px] overflow-auto pr-1 text-sm">
      {#each lines as l}
        <div class={l.kind === 'in' ? 'text-[color:var(--acid-yellow)]' : 'text-[color:var(--fg)]'}>
          <span class="opacity-70">{l.kind === 'in' ? '>' : ''}</span>
          {l.text}
        </div>
      {/each}
    </div>

    <form class="relative mt-2 flex gap-2" on:submit={onSubmit}>
      <input
        class="brutal-border-red w-full bg-black/40 px-3 py-2 text-sm font-black uppercase tracking-widest text-white outline-none"
        placeholder="help / list / open informatique"
        bind:value={input}
        aria-label="Commande terminal"
      />
      <button
        class="brutal-border-red bg-[color:var(--electric-blue)] px-4 py-2 text-sm font-black uppercase tracking-widest text-black"
        type="submit"
        aria-label="Exécuter"
      >
        Run
      </button>
    </form>
  </div>
</div>
