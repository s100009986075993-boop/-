# Public website publication

The source is stored in `main`. The static publication is stored in `gh-pages`.
Both branches were successfully pushed to `s100009986075993-boop/-`.

The owner has now supplied a GitHub Pages settings screenshot showing
**Your site is live at https://s100009986075993-boop.github.io/-/**, with
`gh-pages` and `/(root)` selected. This confirms GitHub reports the deployment
as live. The cloud instance still blocks this `github.io` host and
`api.github.com`: both curl and the browser failed at the proxy tunnel, before
receiving the homepage. Live-site functional testing from this environment is
therefore unverified; the same static site passed its local HTTP browser tests.
Publishing a cloud environment snapshot does not enable GitHub Pages.

## Pages configuration (already completed by the owner)

Open https://github.com/s100009986075993-boop/-/settings/pages while signed in as
the repository owner. In **Build and deployment** choose:

- Source: **Deploy from a branch**
- Branch: **gh-pages**
- Folder: **/(root)**

Click **Save**. Use the actual site URL displayed by GitHub after its deployment
finishes. Do not treat the repository link as a running website URL.

## Later updates

Run `npm test` in this checkout. Commit reviewed changes to `main`, then push
`main`. Run `python3 scripts/publish_pages.py` to update the static branch. The
script uses a temporary index and a fast-forward push; it preserves the main
checkout's staging area and does not change Pages settings or visibility.

The publication contains only root HTML/CSS/JavaScript, `.nojekyll`, `data/` and
`assets/`. It excludes import scripts, tests, package metadata, and the separate
offline ZIP. Its PDFs are public as authorized by the owner.

After deployment, verify the live homepage, scripts, question images, PDFs,
corrected answers, reference search, and site/design note timers. A new website
origin uses separate browser storage; it does not automatically import local
trial progress. The public site retains the existing incomplete-feature labels.
