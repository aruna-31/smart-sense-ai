import requests
import sys
import os
import time

BASE_URL = "http://127.0.0.1:8000"
USER_ID = "ARUNA LAVANURU"
UPI_ID = "7780294844@ybl"
IMAGE_PATH = r"C:/Users/aruna/.gemini/antigravity/brain/fc1801dd-ac6f-47ba-b3da-50b8e1882aed/uploaded_image_1766311320974.jpg"

def wait_for_server():
    for i in range(10):
        try:
            requests.get(BASE_URL)
            return True
        except:
            time.sleep(1)
    return False

def upload_qr():
    print(f"Uploading QR from {IMAGE_PATH}...")
    if not os.path.exists(IMAGE_PATH):
        print("Image file not found!")
        return None
        
    try:
        files = {'qr': open(IMAGE_PATH, 'rb')}
        data = {'user_id': USER_ID}
        url = f"{BASE_URL}/api/billing/upload-qr"
        print(f"POST {url}")
        res = requests.post(url, data=data, files=files)
        print(f"Upload-QR Status: {res.status_code}")
        print(f"Upload-QR Response: {res.text}")
        if res.status_code == 200:
            return res.json().get('qr_path')
        return None
    except Exception as e:
        print(f"Error uploading in script: {e}")
        return None

def save_payment_info(qr_path):
    print("Saving payment info...")
    json_data = {
        "user_id": USER_ID,
        "upi_id": UPI_ID,
        "phonepe_qr_data": qr_path
    }
    url = f"{BASE_URL}/api/billing/payment-info"
    print(f"POST {url} with data: {json_data}")
    res = requests.post(url, json=json_data)
    print(f"Payment-Info Status: {res.status_code}")
    print(f"Payment-Info Response: {res.text}")

def subscribe_mock():
    print("Activating mock subscription...")
    params = {'user_id': USER_ID, 'plan': 'monthly'}
    url = f"{BASE_URL}/api/billing/mock-subscribe"
    print(f"POST {url} with params: {params}")
    res = requests.post(url, params=params)
    print(f"Mock-Subscribe Status: {res.status_code}")
    print(f"Mock-Subscribe Response: {res.text}")

if __name__ == "__main__":
    print("Waiting for server to start...")
    if not wait_for_server():
        print("Server not reachable")
        sys.exit(1)
        
    try:
        path = upload_qr()
        if path:
            print(f"QR Uploaded to: {path}")
            save_payment_info(path)
            subscribe_mock()
        else:
            print("Failed to upload QR, aborting subsequent steps.")
    except Exception as e:
        print(f"Script failed: {e}")
