from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

USER_ID = 'test-client-1'

def test_chat_and_history():
    headers = {'x-user-id': USER_ID}
    # send user message
    r1 = client.post('/api/chat', json={'prompt':'Hello unit test'}, headers=headers)
    print('chat1', r1.status_code, r1.json())
    r2 = client.post('/api/chat', json={'prompt':'Second message'}, headers=headers)
    print('chat2', r2.status_code, r2.json())

    # get history
    h = client.get('/api/chat/history', headers=headers)
    print('history', h.status_code, h.json())

    assert h.status_code == 200
    assert len(h.json()) >= 2


def test_medical_modes():
    headers = {'x-user-id': USER_ID}
    r_p = client.post('/api/generate', json={'medical':{'condition':'influenza','audience':'Patient'}}, headers=headers)
    print('patient', r_p.status_code, r_p.json() if r_p.headers.get('content-type','').startswith('application/json') else r_p.text[:200])
    r_s = client.post('/api/generate', json={'medical':{'condition':'influenza','audience':'Student'}}, headers=headers)
    print('student', r_s.status_code, r_s.json())


def test_quota_and_subscribe():
    headers = {'x-user-id': 'test-quota-client'}
    # send many generate calls until we hit 402 or until 25 attempts
    hit_402 = False
    for i in range(1, 40):
        r = client.post('/api/generate', json={'medical':{'condition':f'influenza {i}','audience':'Patient'}}, headers=headers)
        print(i, r.status_code)
        if r.status_code == 402:
            print('Reached billing 402:', r.json())
            hit_402 = True
            break
    assert hit_402, 'Did not reach 402 in attempts'

    # Call mock-subscribe (dev)
    r_sub = client.post(f'/api/billing/mock-subscribe?user_id={headers["x-user-id"]}')
    print('mock-subscribe', r_sub.status_code, r_sub.json())


if __name__ == '__main__':
    test_chat_and_history()
    test_medical_modes()
    test_quota_and_subscribe()
    print('All tests done')
