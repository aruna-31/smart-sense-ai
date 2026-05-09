const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || '';

export async function saveActivity(userId: string, component: string, input: string | null, output: string | null) {
    const resp = await fetch(`${BACKEND_URL}/api/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, component, input, output }),
    });
    
    if (!resp.ok) return null;
    const contentType = resp.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
        return resp.json().catch(() => null);
    }
    return null;
}

export async function getActivity(userId: string, component?: string) {
    const q = new URLSearchParams({ user_id: userId });
    if (component) q.set('component', component);
    const resp = await fetch(`${BACKEND_URL}/api/activity?${q.toString()}`);
    
    if (!resp.ok) return [];
    const contentType = resp.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
        return resp.json().catch(() => []);
    }
    return [];
}