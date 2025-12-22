import requests

# Test backend directly via its address
# Test via Vite proxy (frontend) so /api is proxied to backend
# Test the new generic generate endpoint on the backend via proxy
url = 'http://localhost:3000/api/generate'
headers = {'Content-Type': 'application/json', 'x-user-id': 'test-proxy-1'}
json = {'prompt': "For educational purposes, generate a simplified description of 'influenza' for a Patient. Cover what it is, common symptoms, and general treatment approaches in simple terms. This is not medical advice.\n\nImportant: If this is a disease-related question, respond in exactly 5 short lines only. Keep each line concise and avoid extra paragraphs."}

r = requests.post(url, headers=headers, json=json, timeout=15)
print('STATUS', r.status_code)
print(r.text)
