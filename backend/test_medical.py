import requests

BACKEND = 'http://127.0.0.1:8000'

def test_medical(condition, audience):
    payload = {'medical': {'condition': condition, 'audience': audience}}
    r = requests.post(f'{BACKEND}/api/generate', json=payload, headers={'Content-Type': 'application/json'})
    print('Audience:', audience, 'Status:', r.status_code)
    try:
        print(r.json())
    except Exception:
        print(r.text)

if __name__ == '__main__':
    test_medical('influenza', 'Patient')
    print('---')
    test_medical('influenza', 'Student')
