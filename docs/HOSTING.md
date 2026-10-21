# Hosting YDMing for other people

YDMing is a static web app plus a tiny Node server. The server serves the
app, answers `/healthz`, and proxies the optional image search. There are no
accounts and no database: every visitor's maps are saved in **their own
browser** (IndexedDB) and can be moved with **Save project / Open project**.
That makes hosting cheap — a 1 vCPU / 512 MB VPS is plenty.

The recommended setup is Docker Compose with Caddy in front, which gets and
renews a free HTTPS certificate automatically.

## What you need

- A VPS running a recent Debian or Ubuntu (any Linux with Docker works), with
  ports **80** and **443** reachable from the internet.
- Optional but recommended: a domain name. Browsers only allow the offline
  mode (service worker) over HTTPS, so a domain is what makes the installed app
  work offline for your users.

## Quick start

Log in to the VPS and run:

```sh
git clone https://github.com/likikikpa/YDMing.git
cd YDMing
sh deploy/install.sh maps.example.com     # your domain
```

The script installs Docker if it is missing, opens the firewall ports when
`ufw` is active, builds the image, starts the containers and waits until the
app reports healthy. It prints the address when it is done.

Before running it with a domain, create a DNS **A record** for that name that
points at the server's IP address. Caddy requests the certificate the first
time someone opens the site; allow a minute.

No domain yet? Leave the argument out (`sh deploy/install.sh`) and YDMing
is served over plain HTTP at `http://<server-ip>`. Run the script again with a
domain later; nothing is lost.

### Doing it by hand

```sh
cp .env.example .env        # edit SITE_ADDRESS
docker compose up -d --build
```

## Updating

```sh
cd YDMing
sh deploy/install.sh        # pulls the latest source, rebuilds, restarts
```

Visitors get the new version on their next visit (the service worker updates
itself). Their maps are not affected.

## Everyday commands

| Task | Command |
| --- | --- |
| See status | `docker compose ps` |
| Follow logs | `docker compose logs -f` |
| Restart | `docker compose restart` |
| Stop | `docker compose down` |

## Settings

Set these in `.env` next to `docker-compose.yml`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `SITE_ADDRESS` | `:80` | A domain name for automatic HTTPS, or `:80` for plain HTTP on the IP. |
| `YDMING_SEARCH` | `on` | `off` disables the web image search (the built-in sprite library keeps working). |
| `YDMING_CONTACT` | empty | An email or URL included in requests to Wikimedia, as their API etiquette asks. |

The Node server itself also reads `HOST` (default `127.0.0.1`), `PORT`
(default `5173`) and `TRUST_PROXY` (`1` when exactly one reverse proxy such as
Caddy or nginx sits in front, so rate limits use the visitor's real address).
The Docker image sets these for you.

## About image search and privacy

Search is done by **your server**, not by the visitor's browser. The default
**Auto** source looks for sprites first: a short query such as `clouds` is
answered from a local index of map-ready icons (`data/sprite-index.json`:
game-icons.net and the bundled Kenney sprites), then OpenGameArt (CC0 2D art)
and Openverse illustrations. A query that asks for a picture (`cloud realistic
picture`, or a long description) goes to Wikimedia Commons photos and Openverse
first. Wikimedia Commons and Openverse can also be picked by hand. The server
keeps only results with a licence that permits reuse and modification, and
relays the thumbnails; game-icons are recoloured to map ink on the way.

A query of several words ("sea port") shows sprites that have all the words
first, then sprites of each word. A source that has not answered a second after
another one has is left out of that search (Openverse is often slow), and the
answer is kept for two minutes instead of a day so the next search asks again.
When nothing is found and a source was left out, the library says so. Upstream services see your
server's address, never the visitor's. The proxy is rate limited per visitor,
caches results for 24 hours, only relays images that appeared in a search
result, caps image size at 10 MB and serves images with a sandboxing header.
Set `YDMING_SEARCH=off` if you would rather not make any outgoing requests.

The sprite index ships with the app. `npm run index:sprites` rebuilds it from
the current game-icons.net set (it needs internet access).

## Without Docker

```sh
git clone https://github.com/likikikpa/YDMing.git /opt/ydming
cd /opt/ydming && npm ci && npm run build
```

Then use `deploy/ydming.service` as a systemd unit (it listens on
`127.0.0.1:5173`) and put any reverse proxy in front of it. For nginx:

```nginx
server {
    server_name maps.example.com;
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    # listen 443 ssl ... (for example via certbot)
}
```

Node serves the files itself, but does not compress them; let nginx or Caddy do
that (Caddy is configured to in `deploy/Caddyfile`).

## Troubleshooting

- **The site shows "connection refused".** Check `docker compose ps`; both
  `ydming` and `caddy` should be `running`. `docker compose logs` explains
  the rest.
- **HTTPS does not appear.** The domain's A record must point at this server
  and ports 80 and 443 must be open in the provider's firewall too. Caddy's log
  (`docker compose logs caddy`) shows the certificate attempts.
- **Port 80 or 443 is already in use.** Another web server is running on the
  VPS. Stop it, or run YDMing without Docker behind that server.
- **Searches say "Too many searches".** Each visitor may do 30 searches a
  minute; the message clears on its own.
- **Backups.** There is nothing to back up for maps (they live in browsers).
  The `caddy_data` volume holds your certificates; losing it only means
  getting new ones.
