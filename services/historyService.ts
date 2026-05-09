const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || '';

export async function saveActivity(userId: string, component: string, input: string | null, output: string | null) {
    const resp = await fetch(`${BACKEND_URL}/api/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, component, input, output }),
    });
    return resp.json();
}

export async function getActivity(userId: string, component?: string) {
    const q = new URLSearchParams({ user_id: userId });
    if (component) q.set('component', component);
    const resp = await fetch(`${BACKEND_URL}/api/activity?${q.toString()}`);
    return resp.json();
}