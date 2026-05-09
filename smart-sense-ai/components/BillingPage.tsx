import React, { useEffect, useState } from 'react';

const AdminApprovalPanel: React.FC<{ userId: string | null }> = ({ userId }) => {
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = () => {
    if (!userId) return;
    fetch(`/api/billing/pending-requests?admin_id=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(setRequests)
      .catch(e => console.error(e));
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, [userId]);

  const handleApprove = async (uId: string) => {
    if (!confirm(`Approve subscription for user ${uId}?`)) return;
    const resp = await fetch('/api/billing/approve-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uId, admin_id: userId })
    });
    if (resp.ok) {
      alert('Approved!');
      fetchRequests();
    } else {
      alert('Failed to approve');
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">Pending Verifications</h3>
      {requests.length === 0 ? (
        <p className="text-gray-400 text-sm">No pending payment requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.user_id} className="bg-gray-800 p-3 rounded border border-gray-600">
              <div className="text-white font-semibold text-sm">{r.user_id}</div>
              <div className="text-gray-400 text-xs">Plan: <span className="text-brand-pink">{r.plan}</span></div>
              <div className="text-gray-300 text-xs mt-1">UTR: <code className="bg-black px-1 rounded">{r.utr}</code></div>
              <button onClick={() => handleApprove(r.user_id)} className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded">
                Verify & Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const BillingPage: React.FC = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<any>>([]);

  // Billing fields
  const [price, setPrice] = useState<number>(29);
  const [upiId, setUpiId] = useState<string>('');
  const [qrData, setQrData] = useState<string | null>(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [scannerSupported, setScannerSupported] = useState<boolean>(false);
  const [plans, setPlans] = useState<Array<any>>([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('weekly');

  // Admin ID configuration
  const ADMIN_USER_ID = 'ARUNA LAVANURU';

  useEffect(() => {
    const id = localStorage.getItem('user-id');
    setUserId(id);
    if (id) {
      // 1. Get current user status
      fetch(`/api/billing/status?user_id=${encodeURIComponent(id)}`).then(r => r.json()).then(j => setStatus(j.status)).catch(() => setStatus('unknown'));
      fetch('/api/chat/history', { headers: { 'x-user-id': id } }).then(r => r.json()).then(j => setHistory(j)).catch(() => setHistory([]));

      // 2. Get current user's payment info (mostly relevant if they are admin)
      fetch(`/api/billing/payment-info?user_id=${encodeURIComponent(id)}&requester=${encodeURIComponent(id)}`).then(r => r.json()).then(j => {
        if (j.exists) {
          setQrData(j.phonepe_qr_data || null);
          setUpiId(j.upi_id || '');
          setPrice(j.price_inr || 29);
          setPlans(j.plans || []);
          setSubscriptionDetails(j.subscription || null);
          if (j.subscription && j.subscription.plan) setSelectedPlan(j.subscription.plan === 'monthly' ? 'monthly' : 'weekly');
        }
      }).catch(() => { });

      // 3. Keep scanner supported check
      setScannerSupported(typeof (window as any).BarcodeDetector !== 'undefined');
    }
  }, []);

  // Fetch Admin Billing Info (for display to non-admins)
  const [adminQr, setAdminQr] = useState<string | null>(null);
  useEffect(() => {
    // Always fetch admin info to display as the "Merchant" details
    fetch(`/api/billing/payment-info?user_id=${encodeURIComponent(ADMIN_USER_ID)}`).then(r => r.json()).then(j => {
      if (j.exists && j.phonepe_qr_data) {
        setAdminQr(j.phonepe_qr_data);
      }
    }).catch(() => { });
  }, []);

  const handleDelete = async () => {
    if (!userId) return alert('No user id');
    const ok = confirm('Delete all chat history for this user? This cannot be undone.');
    if (!ok) return;
    const resp = await fetch('/api/chat/history', { method: 'DELETE', headers: { 'x-user-id': userId } });
    if (resp.ok) {
      alert('Deleted');
      setHistory([]);
    } else {
      alert('Delete failed');
    }
  };

  // Save payment info (Only allowed for Admin in UI, but endpoint protects somewhat or we assume good faith)
  const savePaymentInfo = async () => {
    if (!userId) return alert('No user id');
    const resp = await fetch('/api/billing/payment-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, phonepe_qr_data: qrData, upi_id: upiId }) });
    if (resp.ok) {
      alert('Saved payment info');
    } else {
      const txt = await resp.text();
      alert('Save failed: ' + txt);
    }
  };

  // Start camera-based scanner (uses BarcodeDetector if available)
  const startScanner = async () => {
    if (!userId) return alert('No user id');
    try {
      const vd = document.getElementById('qr-video') as HTMLVideoElement;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } as any });
      vd.srcObject = stream;
      await vd.play();
      setScannerOn(true);

      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const loop = async () => {
        if (!scannerOn) return;
        try {
          const detections = await detector.detect(vd);
          if (detections && detections.length > 0) {
            const val = detections[0].rawValue;
            setQrData(val);
            // try to parse upi param if present
            const m = val.match(/pa=([^&]+)/i);
            if (m) setUpiId(decodeURIComponent(m[1]));
            // stop camera
            const tracks = (vd.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
            vd.srcObject = null;
            setScannerOn(false);
            return;
          }
        } catch (e) {
          console.warn('Scanner detect error', e);
        }
        setTimeout(loop, 500);
      };
      loop();
    } catch (e) {
      alert('Could not start camera: ' + e);
    }
  };

  const stopScanner = () => {
    const vd = document.getElementById('qr-video') as HTMLVideoElement;
    if (vd && vd.srcObject) {
      const tracks = (vd.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      vd.srcObject = null;
    }
    setScannerOn(false);
  };

  const handleIvePaid = async () => {
    if (!userId) return alert('No user id');
    // Try dev mock subscribe first
    const resp = await fetch(`/api/billing/mock-subscribe?user_id=${encodeURIComponent(userId)}`, { method: 'POST' });
    if (resp.ok) {
      alert('Subscription activated (dev mock).');
      const j = await resp.json();
      setStatus('active');
      // For regular users, we don't save their payment info when they pay, we just activate sub.
      // But if this was Admin mode, we might.
    } else {
      // fallback to checkout flow
      const r = await fetch('/api/billing/create-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
      const j = await r.json();
      if (j.subscribe_url) window.open(j.subscribe_url, '_blank');
    }
  };

  const isAdmin = (userId === ADMIN_USER_ID);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Billing & Chat History</h1>
      <div className="bg-gray-800 p-4 rounded mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div><strong>User ID:</strong> {userId ?? 'none'} {isAdmin && <span className="text-brand-pink font-bold">(Owner)</span>}</div>
            <div><strong>Subscription status:</strong> {status ?? 'unknown'}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Current Plan</div>
            <div className="text-2xl font-bold">{subscriptionDetails?.plan ? (subscriptionDetails.plan === 'monthly' ? `₹99 / month` : `₹29 / week`) : `Free`}</div>
            <div className="text-sm text-gray-400">{subscriptionDetails?.plan ? (subscriptionDetails.plan === 'monthly' ? '+20 requests/day' : '+3 requests/day') : 'Free users: 20 requests/day'}</div>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">

          {/* LEFT COLUMN: Payment Method (Show Admin QR to Users, Show Edit UI to Admin) */}
          <div>
            {isAdmin ? (
              <>
                <h3 className="text-xl font-semibold mb-2 text-brand-pink">Manage Receiving QR</h3>
                <label className="block text-sm text-gray-300 mb-2">Your Displayed PhonePe QR</label>
                {qrData ? (
                  qrData.startsWith('/') ? (
                    <img src={qrData} alt="PhonePe QR" className="w-full rounded mb-2 border-2 border-brand-pink" />
                  ) : (
                    <div className="bg-gray-900 p-3 rounded text-white mb-2 break-words">{qrData}</div>
                  )
                ) : (
                  <div className="text-sm text-gray-400 mb-2">No QR set yet</div>
                )}

                <label className="block text-sm text-gray-300 mb-2">Upload New QR Image</label>
                <input type="file" accept="image/*" onChange={async (e) => {
                  if (!userId) return alert('No user id');
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.append('user_id', userId);
                  fd.append('qr', f);
                  const resp = await fetch('/api/billing/upload-qr', { method: 'POST', body: fd });
                  if (resp.ok) {
                    const j = await resp.json();
                    setQrData(j.qr_path);
                    // Also update adminQr view
                    setAdminQr(j.qr_path);
                    alert('QR uploaded and is now public');
                  } else {
                    const txt = await resp.text();
                    alert('Upload failed: ' + txt);
                  }
                }} className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-2 mb-4" />

                <label className="block text-sm text-gray-300 mb-2">Your UPI ID (Stored)</label>
                <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g., user@upi" className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple mb-2" />
                <button onClick={savePaymentInfo} className="bg-brand-purple px-3 py-2 rounded text-white">Save All Settings</button>
              </>
            ) : (
              // NON-ADMIN VIEW: Show Payment Options
              <>
                <h3 className="text-xl font-semibold mb-2 text-brand-purple">Pay Subscription</h3>
                <p className="text-sm text-gray-400 mb-4">Scan the QR code below or use the UPI ID to pay.</p>

                {/* QR Code Area */}
                <div className="flex flex-col items-center bg-white p-4 rounded-lg mb-4">
                  <img
                    src={adminQr || '/phonepe-qr-arunalavanuru.jpg'}
                    onError={(e) => {
                      // Fallback if the specific JPG fails, try the generic one or log
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    alt="Scan to Pay"
                    className="w-64 h-64 object-contain"
                  />
                  <div className="text-black font-bold mt-2">Scan & Pay</div>
                </div>

                {/* Explicit UPI ID Display */}
                <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                  <div className="text-sm text-gray-400 mb-1">UPI ID</div>
                  <div className="flex justify-between items-center">
                    <code className="text-xl font-mono text-white">7780294844@ybl</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('7780294844@ybl');
                        alert('UPI ID copied!');
                      }}
                      className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Plan Selection & Controls */}
          <div>
            {isAdmin ? (
              <AdminApprovalPanel userId={userId} />
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-2">Select Plan</h3>
                <div className="space-y-4 mb-6">
                  <div onClick={() => setSelectedPlan('weekly')} className={`p-4 rounded border-2 cursor-pointer ${selectedPlan === 'weekly' ? 'border-brand-purple bg-brand-purple/20' : 'border-gray-700 bg-gray-800'}`}>
                    <div className="font-bold">Weekly Pass</div>
                    <div className="text-xl">₹29 <span className="text-sm font-normal text-gray-400">/ week</span></div>
                  </div>
                  <div onClick={() => setSelectedPlan('monthly')} className={`p-4 rounded border-2 cursor-pointer ${selectedPlan === 'monthly' ? 'border-brand-purple bg-brand-purple/20' : 'border-gray-700 bg-gray-800'}`}>
                    <div className="font-bold">Monthly Pro</div>
                    <div className="text-xl">₹99 <span className="text-sm font-normal text-gray-400">/ month</span></div>
                    <div className="text-brand-pink text-sm">Best Value</div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                  {subscriptionDetails?.payment_status === 'pending' ? (
                    <div className="text-yellow-400 font-semibold text-center py-4">
                      ⏳ Payment Submitted.<br />Pending Verification by Admin.<br />
                      <span className="text-sm text-gray-400 font-normal">Please wait up to 24 hours.</span>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-sm font-bold text-gray-300 mb-2">Confirm Payment</h4>
                      <p className="text-xs text-gray-400 mb-2">After paying via UPI, enter the 12-digit UTR / Reference No. below.</p>
                      <input
                        placeholder="Enter 12-digit UTR (e.g., 3456...)"
                        className="w-full bg-black border border-gray-600 rounded p-3 mb-2 text-white"
                        id="utr-input" // simple uncontrolled access for now or use state
                      />
                      <button onClick={async () => {
                        if (!userId) return;
                        const utr = (document.getElementById('utr-input') as HTMLInputElement).value;
                        if (!utr || utr.length < 4) return alert('Please enter a valid UTR/Reference No.');

                        const resp = await fetch('/api/billing/submit-payment', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: userId, plan: selectedPlan, utr })
                        });

                        if (resp.ok) {
                          alert('Payment information submitted! Please wait for validation.');
                          const j = await resp.json();
                          // refresh status
                          window.location.reload();
                        } else {
                          alert('Submission failed. Try again.');
                        }
                      }} className="w-full bg-brand-purple hover:bg-purple-600 text-white font-bold py-3 rounded-lg transition-colors">
                        Submit Payment Details
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Chat History</h2>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="bg-red-600 px-3 py-1 rounded text-white">Delete history</button>
          </div>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.length === 0 && <div className="text-sm text-gray-400">No history available</div>}
          {history.map((m: any, i: number) => (
            <div key={i} className={`p-3 rounded ${m.role === 'user' ? 'bg-purple-900' : 'bg-gray-700'}`}>
              <div className="text-sm text-gray-200">{m.role}</div>
              <div className="text-white whitespace-pre-wrap">{m.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};