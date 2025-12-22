import requests
# send repeated requests to trigger quota / billing 402
user_id = 'test-billing-1'
for i in range(1, 30):
    r = requests.post('http://127.0.0.1:8000/api/chat', json={'prompt':f'Hello {i}, please describe influenza briefly'}, headers={'Content-Type':'application/json','x-user-id':user_id})
    print(i, r.status_code)
    if r.status_code == 402:
        print('Reached billing 402:', r.text)
        break
    else:
        print(r.text[:200])

