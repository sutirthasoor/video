# Paytm Payment Gateway — integration plan (future scope)

Status: **not connected.** Checkout uses a simulated gateway (`src/payments.js`, `PROVIDER = 'simulated'`).
The UI already shows a disabled "Paytm — Coming soon" option, and checkout/wallet call one function, `payOnline()`, so
switching providers touches `payments.js` plus the server pieces below — not the pages.

> Verify endpoint names and field names against Paytm's current developer docs (business.paytm.com/docs) when you build this.

## Why it needs a server
The Paytm merchant key must never reach the browser, and access to videos must only be granted after Paytm *confirms* payment.
Today the browser writes `purchasedIds` itself (demo only). With Paytm, **only the server** may do that.

## Target flow
1. **Create order (server).** Browser calls a Cloud Function `createPaytmOrder({albumIds})`.
   - Reads prices from Firestore (never trust prices sent by the browser), creates `orders/{orderNo}` with `status: 'Pending'`.
   - Calls Paytm *Initiate Transaction* (`/theia/api/v1/initiateTransaction?mid=…&orderId=…`) with the body signed by the merchant key (Paytm checksum library).
   - Returns `{ mid, orderId, txnToken, amount }`.
2. **Pay (browser).** `payOnline()` loads Paytm's Checkout JS for your MID and opens it with the `txnToken`. The customer pays by UPI / card / net banking / Paytm wallet.
3. **Confirm (server).** Paytm calls your webhook / callback URL, a Cloud Function `paytmCallback`:
   - verify the checksum signature on the payload,
   - call Paytm *Transaction Status* and confirm status `TXN_SUCCESS` **and** that amount and orderId match the pending order,
   - in one Firestore transaction: set order `status: 'Paid'`, add to `users/{uid}.purchases` and `purchasedIds`.
4. **Unlock.** The browser's existing `onSnapshot` on `users/{uid}` sees the new `purchasedIds`; **Watch** works immediately.
5. **Wallet top-ups** follow the same flow, crediting `users/{uid}.wallet` only inside the webhook.

## Changes to this codebase
| File | Change |
|---|---|
| `src/payments.js` | set `PROVIDER = 'paytm'`; implement the `paytm` branch (call `createPaytmOrder`, open Checkout JS, resolve on completion) |
| `src/App.jsx` (Checkout, Wallet) | stop writing `orders` / `users` from the browser; after `payOnline()` just wait for the order to turn `Paid` |
| `functions/` (new) | `createPaytmOrder`, `paytmCallback`, optional `reconcilePending` (scheduled: re-check Pending orders with the status API) |
| `firestore.rules` | `users`: `allow create, update: if isAdmin();` and `orders`: `allow create: if isAdmin();` (server uses the Admin SDK, which bypasses rules) |

## Secrets and config
Store `PAYTM_MID`, `PAYTM_MERCHANT_KEY`, `PAYTM_WEBSITE` and the environment host (`securegw-stage.paytm.in` for testing, `securegw.paytm.in` for production) as Firebase Functions secrets. Never commit them.
Functions need the Firebase **Blaze** plan.

## Go-live checklist
- Paytm merchant account approved; test the full flow on the staging host first.
- Webhook URL registered with Paytm and reachable over HTTPS.
- Rules locked down as above, then test that a customer can no longer edit their own `purchasedIds`.
- Refund handling: when an admin sets an order to Refunded, also remove the album from the user's `purchasedIds` (a small admin Cloud Function).
