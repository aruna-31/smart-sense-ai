import asyncio
from backend.app.services.gemini import _sync_generate_text

try:
    print(_sync_generate_text('test prompt', model=None, max_tokens=10))
except Exception as e:
    import traceback
    traceback.print_exc()
    print('ERR', e)
