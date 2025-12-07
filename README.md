# Yume Pages

React frontend for Yume Tools, deployed on Cloudflare Pages at `emuy.gg`.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Cloudflare Pages** for hosting

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL=https://api.itai.gg`

Or deploy manually:

```bash
npm run pages:deploy
```

## Project Structure

```
src/
├── components/     # Reusable components
│   ├── Layout.tsx
│   └── Nav.tsx
├── contexts/       # React contexts
│   └── AuthContext.tsx
├── lib/           # Utilities and API client
│   └── api.ts
├── pages/         # Route components
│   ├── Home.tsx
│   ├── InfographicMaker.tsx
│   ├── CruddyPanel.tsx
│   └── Docs.tsx
├── App.tsx        # Main app with routing
├── main.tsx       # Entry point
└── index.css      # Global styles
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=https://api.itai.gg
```

## API

This frontend interfaces with the Yume API at `https://api.itai.gg`:

- **Auth**: Discord OAuth via `/auth/login`, `/auth/me`, `/auth/logout`
- **Records**: CRUD operations via `/api/records/*`

## Widget Integration

The Infographic Maker and Cruddy Panel pages load the existing vanilla JS widgets from jsDelivr CDN. This allows:

1. Reuse of existing widget code
2. Independent deployment cycles
3. Both Carrd and React sites using the same widgets

