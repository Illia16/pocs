# pocs

## emails
### Installation:
- Install brew
- brew install qpdf
- qpdf --version
- cd emails
- npm i
- need .env file(s) with env vars `SEARCH_QUERY`, `SENDER_EMAIL`, `RECIPIENT_EMAIL`, `PDF_PASSWORD` set
- need `credentials.json` (from google project with Gmail API enabled and OAuth consent configured)
### Run
- node gmail.js or via npm start:[ENV]


## cloudflare
### cf-tunnel
- cloudflared tunnel create poc-tunnel
- cloudflared tunnel route dns poc-tunnel poc-tunnel.illusha.net
- cloudflared tunnel run poc-tunnel (cloudflared tunnel --config config.yml run poc-tunnel)


## auth
### google
- .env must contain `GOOGLE_CLIENT_ID` and `JWT_SECRET`
- config.js must contain `GOOGLE_CLIENT_ID` (see [config.template.js](auth/config.template.js))
- npm run start:sam
- npm run start:web