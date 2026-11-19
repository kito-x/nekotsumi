# Nekotsumi

Nekotsumi is a browser game about stacking cats. Classic mode uses a moving cat and timed drops. Assist mode lets players position the cat before dropping it. Settings, scores, and unlocks are saved in the browser.

[Play Nekotsumi](https://nekotsumi.singleton.sh)

From `app/`, use Node.js 22.12 or newer and run:

```sh
npm ci
npm test
npm run build
npm run preview
```

Publish only `app/dist/` to a static host. It contains the production game, its assets, and a 404 page. To use the developer tools locally, run `npm run dev` and open `/diagnostics.html`. The production build omits the diagnostics page and ignores the developer capture and fault parameters.

See the [app notes](app/README.md) and [design documentation](design/README.md) for development history.
