# Deploying Ironforged Events Subdomain

This document explains how to deploy the events app to `ironforged-events.emuy.gg`.

## Option 1: Separate Cloudflare Pages Project (Recommended)

The cleanest approach is to deploy the events app as a separate Cloudflare Pages project:

### 1. Create a new Pages project for events

```bash
# In the yume-pages directory
npx wrangler pages project create ironforged-events
```

### 2. Build the events app

The events build is already configured in `vite.config.ts`. You can build just the events entry:

```bash
# Build both apps
npm run build

# The dist folder will contain:
# - index.html (main app)
# - events.html (events app)
# - assets/ (shared)
```

### 3. Deploy events with custom routing

Create a `_worker.js` in `public/` for the events site that serves `events.html`:

Or use the build output directly with:

```bash
npx wrangler pages deploy dist --project-name=ironforged-events
```

### 4. Add custom domain

In the Cloudflare dashboard:
1. Go to Pages → ironforged-events → Custom domains
2. Add `ironforged-events.emuy.gg`
3. Cloudflare will auto-configure DNS

---

## Option 2: Path-based Routing (Alternative)

If you prefer to keep everything in one project, you can use a Cloudflare Pages Function to route based on hostname.

### Create `functions/_middleware.ts`:

```typescript
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // If on events subdomain, serve events.html
  if (url.hostname === 'ironforged-events.emuy.gg') {
    // Rewrite to events.html for all non-asset requests
    if (!url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/favicon/')) {
      return context.env.ASSETS.fetch(new URL('/events.html', url.origin));
    }
  }
  
  return context.next();
}
```

---

## Discord OAuth Configuration

**Important:** You need to add the callback URL to your Discord application:

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to OAuth2 → Redirects
4. Add: `https://api.emuy.gg/auth/callback`

The API already handles routing users back to the correct domain based on where they came from.

---

## Environment Variables

The events app uses the same API as the main app:
- `VITE_API_URL`: `https://api.emuy.gg` (default, already configured)

---

## Testing Locally

```bash
# Run the events app locally
npm run dev

# Visit http://localhost:3000/events.html for the events landing page
# Or modify hosts file to test with the actual subdomain
```

---

## Files Created

- `src/EventsApp.tsx` - Events app router
- `src/events-main.tsx` - Events entry point
- `events.html` - Events HTML template
- `src/components/EventsLayout.tsx` - Events-specific layout
- `src/pages/events/EventsHome.tsx` - Events landing page

---

## API Changes

The API (`yume-api`) has been updated to:

1. **Accept CORS from** `ironforged-events.emuy.gg`
2. **Auto-register users** when they login with `?source=ironforged-events`
3. **Store users in** `event_users` table with login tracking

