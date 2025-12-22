from backend.app.services.gemini import generate_text
import asyncio

print(asyncio.run(generate_text('Test direct call', max_tokens=10)))
