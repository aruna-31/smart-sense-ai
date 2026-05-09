from fastapi.testclient import TestClient
from app.main import app
from app.db import get_session
from app.models import ChatMessage, Subscription, User
from sqlmodel import delete

client = TestClient(app)

USER = 'e2e-user-1'

# cleanup DB
sess = next(get_session())
sess.exec(delete(ChatMessage))
sess.exec(delete(Subscription))
sess.exec(delete(User))
sess.commit()

print('DB cleaned')

# 1) Test generate until 402
print('Triggering generate until daily quota exceeded...')
sub_detail = None
for i in range(1, 40):
    r = client.post('/api/generate', json={'medical': {'condition': f'influenza {i}', 'audience': 'Patient'}}, headers={'x-user-id': USER})
    print(i, r.status_code)
    if r.status_code == 402:
        print('Got 402, detail:', r.json())
        sub_detail = r.json()
        break

if not sub_detail:
    print('Did not hit daily quota during test - maybe external API quota hit first - continuing')

# 2) Call mock-subscribe to activate subscription
print('Calling mock-subscribe...')
r = client.post(f'/api/billing/mock-subscribe?user_id={USER}')
print('mock-subscribe', r.status_code, r.text)

# 3) Check billing status
r = client.get(f'/api/billing/status?user_id={USER}')
print('billing status', r.status_code, r.json())

# 4) Try generate again - should not be blocked by 402 for user
r = client.post('/api/generate', json={'medical': {'condition': 'post-subscribe test', 'audience': 'Patient'}}, headers={'x-user-id': USER})
print('post-subscribe generate', r.status_code)
try:
    print(r.json())
except Exception:
    print(r.text[:400])

# 5) Test chat persistence
print('Testing chat persistence...')
for j in range(3):
    r = client.post('/api/chat', json={'prompt': f'hello {j}'}, headers={'x-user-id': USER})
    print('chat', j, r.status_code)

r = client.get('/api/chat/history', headers={'x-user-id': USER})
print('history', r.status_code, r.json())

# 6) Clean up
sess.exec(delete(ChatMessage))
sess.exec(delete(Subscription))
sess.exec(delete(User))
sess.commit()
print('E2E tests complete')
