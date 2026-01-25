<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  export let url = 'LIEN_SPOTIFY_PLAYLIST';

  let mountEl: HTMLDivElement | null = null;
  let root: any = null;

  onMount(async () => {
    if (!mountEl) return;

    const [{ createRoot }, React, { QRCodeReact }] = await Promise.all([
      import('react-dom/client'),
      import('react'),
      import('./QRCodeReact')
    ]);

    root = createRoot(mountEl);
    root.render(React.createElement(QRCodeReact, { url, size: 200 }));
  });

  onDestroy(() => {
    if (root) root.unmount();
  });
</script>

<div class="relative z-10 inline-block">
  <div class="tag-splash brutal-border relative bg-white p-3">
    <div bind:this={mountEl} aria-label="QR code vers la playlist"></div>
    <a
      class="mt-2 block text-center text-sm font-black uppercase tracking-wide underline"
      href={url === 'LIEN_SPOTIFY_PLAYLIST' ? '#' : url}
      target="_blank"
      rel="noreferrer"
      aria-label="Ouvrir la playlist dans un nouvel onglet"
    >
      Ouvrir la playlist
    </a>
  </div>
</div>

<style>
  .tag-splash {
    position: relative;
  }

  .tag-splash::before {
    content: '';
    position: absolute;
    inset: -10px;
    background:
      radial-gradient(circle at 20% 20%, rgba(255, 59, 212, 0.35), transparent 40%),
      radial-gradient(circle at 80% 30%, rgba(0, 209, 255, 0.3), transparent 42%),
      radial-gradient(circle at 50% 85%, rgba(255, 230, 0, 0.25), transparent 45%);
    filter: blur(0.5px);
    z-index: -1;
    transform: rotate(-2deg);
  }

  .tag-splash::after {
    content: '';
    position: absolute;
    left: -18px;
    top: 18px;
    width: 10px;
    height: 70%;
    background: #ff0000;
    opacity: 0.85;
  }
</style>
