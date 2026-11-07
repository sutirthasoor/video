// Payment provider layer. The rest of the app only calls payOnline(); swapping the provider changes nothing else.
//
// TODAY   : PROVIDER = 'simulated'  -> fake 1.5 s gateway, no money moves.
// FUTURE  : PROVIDER = 'paytm'      -> Paytm Payment Gateway. Full plan in PAYTM_INTEGRATION.md.
//
// IMPORTANT for the Paytm switch: access must be granted by the SERVER after Paytm confirms the payment
// (webhook + status check), never by the browser. Until then checkout writes the order itself (demo only).
export const PROVIDER = 'simulated';

export const METHODS = [
  { id: 'gateway', label: 'Card / UPI (demo gateway)', enabled: PROVIDER === 'simulated' },
  { id: 'paytm', label: 'Paytm — UPI, cards, net banking, Paytm wallet', enabled: PROVIDER === 'paytm', soon: PROVIDER !== 'paytm' },
];

export async function payOnline({ orderNo, amount }) {
  if (PROVIDER === 'simulated') {
    await new Promise(r => setTimeout(r, 1500));
    return { ok: true, txnId: 'SIM' + Date.now() };
  }
  if (PROVIDER === 'paytm') {
    // 1) POST /api/paytm/initiate {orderNo, amount} -> { mid, orderId, txnToken }   (server signs the request with the merchant key)
    // 2) load https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/<MID>.js and open window.Paytm.CheckoutJS
    // 3) resolve when Paytm calls back; the server webhook marks the order Paid and unlocks the albums
    throw new Error('Paytm is not connected yet. See PAYTM_INTEGRATION.md.');
  }
  throw new Error('Unknown payment provider');
}
