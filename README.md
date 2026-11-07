# VideoVault (React + Firebase)

Sells albums of videos. Admin creates albums (name, description, price) and adds videos (title + **unlisted** YouTube URL).
Customers sign in, pay, then watch from **My downloads** inside a protected in-browser player (no download button, no link shown).

1. `npm install` (Firebase config is already in `src/firebase.js`).
2. Firebase console: enable Authentication -> Email/Password, create Firestore, paste `firestore.rules` into Rules and publish.
3. `npm run dev`, open `/admin/register` once to create the first admin (locks afterwards).
4. Admin -> Albums -> add an album and its videos. Customers register on the store, top up the wallet / pay, then Watch.
5. Deploy: `npm run build` (Netlify config included).

## Customising
- Left-hand picture on the login screens: put an image at `public/login-photo.jpg` (a dark, wide photo works best). Without it a gradient is shown.
- Paytm: see `PAYTM_INTEGRATION.md` (checkout already goes through `src/payments.js`).

## Before going live
- Payment is **simulated** (wallet + fake gateway), as in the original FlashVault. Anyone can edit their own `purchasedIds` under the current rules.
  Replace with Paytm + a Cloud Function/server that writes purchases after the webhook, then lock `users` writes to admins (see comment in `firestore.rules`).
- YouTube videos must be **Unlisted** (Private videos cannot be embedded).
- The player hides YouTube's controls/links and floats the viewer's email over the picture, but a determined viewer can still find the video ID in dev tools.
  For stronger protection use a host with signed/expiring URLs (Bunny Stream, Cloudflare Stream, Mux, Vimeo with domain lock).

## Update notes
- **Publish the new `firestore.rules`** (Firebase Console → Firestore → Rules). Needed for site settings and coupons.
- Admin → Albums: create album shell (name, price, summary, full details, thumbnail). Admin → Classes: pick album, add classes.
- Admin → Discounts & coupons: per-album % discount and coupon codes (percent/flat, min order, max uses, expiry).
- Admin → Site settings: site name and logo.
- Student UI: Albums → Courses, My downloads → My courses. Album page has a "Check details" popup.
- Existing albums keep working; add a thumbnail/details by editing them.
