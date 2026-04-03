# 🌮 TacoStand Bot — Setup Guide

## 1. Create a Discord Bot

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it **TacoStand**
3. Go to the **Bot** tab → click **Reset Token** → copy the token
4. Enable these under **Privileged Gateway Intents**:
   - Message Content Intent
   - Server Members Intent

## 2. Invite the Bot

1. Go to the **OAuth2 → URL Generator** tab
2. Select scopes: `bot`, `applications.commands`
3. Select permissions:
   - Manage Channels
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and open it in your browser to invite the bot

## 3. Configure the Bot

Open `bot.js` and fill in:

```js
const TOKEN = "your-bot-token-here";
const CLIENT_ID = "your-bot-client-id-here";
const TICKET_CATEGORY_ID = ""; // optional: right-click a category → Copy ID
```

## 4. Install & Run

```bash
npm install
npm start
```

You should see:
```
✅  TacoStand is online as TacoStand#1234
✅  Slash commands registered globally.
```

## 5. Using the Bot

### `/upload` command
| Option | Description |
|--------|-------------|
| `name` | Product name (e.g. "cleann rp") |
| `price` | Price (e.g. "$3") |
| `seller` | @mention the seller |
| `image` | Optional image/video preview |

This posts an embed with a red **Purchase** button.

### What happens when someone clicks Purchase:
1. A private ticket channel is created
2. Only the buyer, seller, and bot can see it
3. The seller is pinged and asked to send PayPal details
4. A **Close Ticket** button is available to delete the channel when done

## Hosting

For 24/7 uptime you'll need to host it somewhere. Free/cheap options:
- **Railway** (railway.app)
- **Render** (render.com)
- **A VPS** (e.g. a cheap one from OVH or Hetzner)
- **Your own PC** (just keep the terminal open)
