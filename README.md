# Granbot

Home iPad for a grandparent, and a separate family site.

```bash
npm install
npx prisma db push
npm run dev
```

Open the iPad screen at `/` and the family screen at `/family`. Copy `.env.example` to `.env` and set `SESSION_SECRET` and `DATA_KEY` before starting. The iPad speaks with the browser’s Japanese voice.

`npm run check` checks the earthquake and rain scripts, and the warning parser.
