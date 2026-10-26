# TulipBot

A first demo of a second-client "proxy bot" for GoodClient / Territorial.io.

## What this demo does

`index.html` is a **same-origin proxy shell**:

- It embeds the GoodClient build in an iframe.
- Because the shell and the client are served from the same origin, the shell can access the client's `window.__fx` API.
- The floating panel controls the embedded client's existing automation:
  - All On / All Off
  - Opening / Infinite toggles
  - Bot mode (V20 Reserve / Land Max / Messiah)
  - Live status (tick, opening state, bot mode, opening attack count)

This is the control layer for a bot client. It does **not** yet auto-join a lobby or auto-pick a spawn.

## How to try it

### On GitHub Pages

Deploy both repos so they share the same origin:

- `https://cilindya-kkkkk.github.io/goodclient_v2/`
- `https://cilindya-kkkkk.github.io/tulipbot/`

Open the tulipbot URL, join the same lobby in both the main client and the bot client, spawn manually for now, then press **All On**.

### Locally

From the Termux home directory:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/tulipbot/
```

The shell uses `../goodclient_v2/build/` locally and `../goodclient_v2/` on GitHub Pages.

## Current limitations

- Lobby join is manual; both clients must join the same room.
- Spawn selection is manual.
- The embedded client needs the same hostname restrictions as the normal GoodClient (hostname spoof is already part of GoodClient).
- This is a UI/control demo, not a network-level proxy yet.

## Next steps

1. Auto-join / custom lobby coordination.
2. Bot-side spawn selection (manual map click or computed spawn target).
3. Bot account identity and lobby handshake.
4. Proxy/server-side bot process instead of a browser iframe.
