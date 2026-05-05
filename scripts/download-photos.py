"""
Download full-quality photos from Telegram channel using Telethon.
Runs inside the bot's Docker container.
"""
import asyncio
import os
import sys

from telethon import TelegramClient
from telethon.tl.types import MessageMediaPhoto

CHANNEL = sys.argv[1] if len(sys.argv) > 1 else 'web_vacancy'
LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else 30
OUTPUT_DIR = '/output'

async def main():
    # Use the tech account session from the bot's data directory
    session_path = '/data/tech_account'

    # Read API credentials from env
    api_id = int(os.environ.get('API_ID', '0'))
    api_hash = os.environ.get('API_HASH', '')

    if not api_id or not api_hash:
        print("ERROR: API_ID and API_HASH must be set")
        sys.exit(1)

    client = TelegramClient(session_path, api_id, api_hash)
    await client.start()

    print(f"Fetching last {LIMIT} messages from @{CHANNEL}...")

    channel = await client.get_entity(CHANNEL)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    count = 0
    async for message in client.iter_messages(channel, limit=LIMIT):
        if message.media and isinstance(message.media, MessageMediaPhoto):
            filename = f"{CHANNEL}_{message.id}.jpg"
            filepath = os.path.join(OUTPUT_DIR, filename)

            if os.path.exists(filepath):
                print(f"  Skip {filename} (exists)")
                continue

            await client.download_media(message, file=filepath)
            size_kb = os.path.getsize(filepath) // 1024
            print(f"  Downloaded {filename} ({size_kb} KB)")
            count += 1

    print(f"\nDone! Downloaded {count} photos.")
    await client.disconnect()

asyncio.run(main())
