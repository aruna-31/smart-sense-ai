import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  subscribeInfo: null | { subscribe_url?: string; amount?: number; currency?: string; message?: string; interval?: string };
  userId: string | null;
};

export const BillingModal: React.FC<Props> = ({ open, onClose, subscribeInfo, userId }) => {
  if (!open) return null;

  const [qrSrc, setQrSrc] = React.useState('/phonepe-qr-user.png'); // try user uploaded PNG first, fallback handled in onError
  React.useEffect(() => setQrSrc('/phonepe-qr-user.png'), []);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded-xl w-[min(600px,95vw)] text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold">Subscribe to continue</h3>
            <p className="text-sm text-gray-300">{subscribeInfo?.message ?? `Subscribe for ${subscribeInfo?.amount ?? 9} ${subscribeInfo?.currency ?? 'INR'} / ${subscribeInfo?.interval ?? 'week'}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400">Close</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-800 rounded">
            <h4 className="font-semibold mb-2">Pay with Stripe</h4>
            {subscribeInfo?.subscribe_url ? (
              <a href={subscribeInfo.subscribe_url} target="_blank" rel="noreferrer" className="inline-block bg-blue-600 px-3 py-2 rounded">Open Checkout</a>
            ) : (
              <div className="text-sm text-gray-400">Stripe not configured. Use PhonePe QR below for manual payment (dev).</div>
            )}
          </div>

          <div className="p-4 bg-gray-800 rounded">
            <h4 className="font-semibold mb-2">Verify payment</h4>
            <p className="text-sm text-gray-400 mb-3">After completing Stripe Checkout you'll receive a session id on the success redirect. Paste it here to verify and activate your subscription immediately, or if you paid using PhonePe enter any reference you have and then contact admin for manual activation.</p>
            <div className="flex gap-2">
              <button onClick={async () => {
                const sessionId = prompt('Paste your Stripe checkout session_id from the success URL (session_id=...)');
                if (!sessionId) return;
                try {
                  const resp = await fetch('/api/billing/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) });
                  if (!resp.ok) throw new Error(await resp.text());
                  alert('Subscription activated successfully');
                  onClose();
                } catch (err) {
                  alert('Verification failed: ' + err);
                }
              }} className="bg-blue-600 px-3 py-1 rounded text-white">Verify Payment</button>
              <button onClick={() => { const phoneRef = prompt('Optional: paste PhonePe payment reference (for admin verification)'); if (phoneRef) alert('Please contact admin with reference: ' + phoneRef); }} className="bg-gray-700 px-3 py-1 rounded text-white">I've Paid (PhonePe)</button>
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded flex flex-col items-center gap-3">
            <h4 className="font-semibold">Pay with PhonePe</h4>
            <img src={qrSrc} onError={() => { if (qrSrc !== '/phonepe-qr.png') setQrSrc('/phonepe-qr.png'); }} alt="PhonePe QR" className="w-48 h-48 object-contain bg-white p-2 rounded" />
            <div className="text-sm text-gray-300">Scan the QR with PhonePe app and pay ₹9 / week</div>
            <div className="w-full flex gap-2 mt-2">
              <button
                onClick={async () => {
                  if (!userId) return alert('User id missing');
                  // call dev mock subscribe endpoint to activate subscription server-side
                  try {
                    const resp = await fetch(`/api/billing/mock-subscribe?user_id=${encodeURIComponent(userId)}`, { method: 'POST' });
                    if (!resp.ok) throw new Error('subscribe failed');
                    alert('Subscription activated (dev). You can continue using the app.');
                    onClose();
                  } catch (err) {
                    alert('Failed to activate subscription: ' + err);
                  }
                }}
                className="bg-green-600 px-3 py-1 rounded text-white flex-1"
              >
                I've Paid (Dev)
              </button>
              <button
                onClick={() => {
                  const url = subscribeInfo?.subscribe_url || null;
                  const openUrl = url && url.startsWith('/') ? `${(import.meta.env.VITE_BACKEND_URL as string) || ''}${url}` : url;
                  if (openUrl) window.open(openUrl, '_blank');
                }}
                className="bg-purple-600 px-3 py-1 rounded text-white flex-1"
              >
                Open Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
