# League Tracker viewer

This repository is a generated, view-only League Tracker deployment. It
contains public league statistics, player names, and match history from the
snapshot date in `public/snapshot-info.json`. It does not contain SQLite, raw
LCU imports, Admin tools, role editing, or owner credentials.

## Cloudflare Pages

1. Create a GitHub repository from the contents of this folder.
2. In Cloudflare, open **Workers & Pages** and create a Pages project named
   `league-tracker-viewer`. If you want another name, change `name` in
   `wrangler.jsonc` before you push.
3. Connect the GitHub repository.
4. Use **None** for the framework preset.
5. Leave the build command empty.
6. Set the build output directory to `public`.
7. Deploy.

`wrangler.jsonc` records the same output directory. The generated
`public/_worker.js` serves the exported public API and blocks every write,
Admin route, import route, and LCU route.

## Update the league data

Run this command in the private owner repository:

```powershell
npm run update:cloudflare
```

Replace this repository's files with the newly generated
`cloudflare-pages-package/` folder, then push. The command also creates
`cloudflare-pages-package.zip` for manual upload or sharing. Cloudflare Pages
will deploy the new snapshot.
