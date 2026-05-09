import requests

BACKEND = 'http://127.0.0.1:8000'

user_id = 'test-quota-1'

for i in range(1, 40):
    payload = {'medical': {'condition': f'influenza example {i}', 'audience': 'Patient'}}
    headers = {'Content-Type': 'application/json', 'x-user-id': user_id}
    r = requests.post(f'{BACKEND}/api/generate', json=payload, headers=headers)
    print(i, r.status_code)
    if r.status_code == 402:
        print('Reached billing 402:', r.json())
        break
    else:
        try:
            print(r.json().get('text','')[:120].replace('\n',' '))
        except Exception:
            print(r.text[:120])
