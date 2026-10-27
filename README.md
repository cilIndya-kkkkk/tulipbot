# TulipBot

Single-page bot companion for GoodClient / Territorial.io.

## Layout

- **Main game** fills the page (iframe).
- **Three bot clients** are loaded as iframes.
- In normal mode each bot is a floating window you can drag by its header, resize from the corner, or minimize.
- **Multibot** docks the three bots into the left 25% of the page (three equal rows) and expands the main game to the right 75%.

## Multiplayer lobby

Each bot shows its multiplayer-lobby state in the panel:

- `lobby N` — how many bots are currently in a lobby.
- `ready N` — how many bots have pressed Ready.
- `in game N` — how many bots are in a running match.

With **Auto Ready bots in multiplayer lobby** enabled, every bot that enters a lobby automatically presses Ready. The main client's own lobby/Ready state is shown at the top of the panel.

## Optional FX custom lobby sync

The custom-lobby row is still available for FX custom lobbies:

1. In the main game, create or join an **FX custom lobby**.
2. TulipBot reads the code from the main iframe (state/DOM/hash) and joins all bots to `#lobby=<code>`.
3. You can also type the code manually and press **Join bots**.

Normal multiplayer lobbies cannot be auto-joined because they do not expose a joinable room code; join them manually in each bot view (or use the game's normal lobby flow). Auto Ready works there.

## Per-bot IP (relay)

The lobby IP displayed by the game is a masked hash sent by the server, so the client cannot change what other players see by itself. To give each bot a genuinely different IP, route each bot's game WebSockets through the relay in `relay/`:

1. Copy `relay/config.example.json` to `relay/config.json` and put one SOCKS5/HTTP proxy per listener.
2. Install once: `cd relay && npm install`.
3. Start it: `node relay/server.js` (stops when you close it, so it does not drain battery in the background).
4. In TulipBot set **Relay base** to `ws://127.0.0.1:900{n}/` and press **Apply relay**.

Then bot 1 uses port 9001/proxy 1, bot 2 uses 9002/proxy 2, bot 3 uses 9003/proxy 3. The game server sees each proxy's IP.

- Local HTTP page: `ws://` is fine.
- HTTPS page (GitHub Pages): use a `wss://` relay address.
- Public relay: add `"token": "something"` to each listener and use `wss://host/?token=something` as the relay base.
- The relay forwards `wss://territorial.io/*` upstream. Custom-lobby WebSockets stay direct.

The relay does not isolate accounts: the three iframes still share localStorage/cookies unless you serve them from different origins and log in with different accounts.

## IP display

The lobby IP shown by the game is a masked hash sent by the server. The client can only change what it renders locally; it cannot change what other players or the server see. Real per-bot IPs require the relay (or separate browser processes/egress). Iframes on one page always share the device's IP unless the WebSocket goes through a relay.

## Bot controls

- All On / All Off (applies to every loaded bot)
- Opening / Infinite
- Bot mode: V20 Reserve / Land Max / Messiah
- Auto All On when a bot enters a game
- Auto Ready in multiplayer lobby
- Multibot layout toggle
- Per-bot reload (`↻` in a bot header) so reloading one bot does not force the others through Cloudflare verification again
- `Next verification` highlights the bot currently showing a Cloudflare Turnstile widget
- `verify N` in the status line shows how many bots currently have a visible verification widget

## How to try it

From the Termux home directory:

```bash
python3 -m http.server 8001
```

Open:

```text
http://localhost:8001/tulipbot/
```

The page loads the client from `../goodclient_v2/build/` locally.

### GitHub Pages

Both sites must be on the same origin:

- `https://cilindya-kkkkk.github.io/goodclient_v2/`
- `https://cilindya-kkkkk.github.io/tulipbot/`

## Current limitations

- Cloudflare Turnstile is not bypassed. Solve it manually; each bot caches its token in memory for about an hour, and reloading that bot resets it. Use the per-bot `↻` button to avoid re-verifying the other bots.
- The three bots share the same account/session/network IP unless isolated.
- Real per-bot IPs require separate egress and accounts.
- Spawn selection is still manual.
- This is still a browser-iframe bot, not a server-side proxy.
