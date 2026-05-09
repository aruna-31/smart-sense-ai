from backend.app.utils import limiter
import requests

# seed the user to appear over daily limit
limiter.REQUEST_LOG['test-user'] = {'minute': [], 'day': [1] * limiter.MAX_REQUESTS_PER_DAY}

r = requests.post('http://127.0.0.1:8000/api/chat', json={'prompt': 'test over limit'}, headers={'x-user-id': 'test-user'})
print(r.status_code)
print(r.text)
