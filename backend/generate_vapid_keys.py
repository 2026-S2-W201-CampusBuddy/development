# backend/generate_vapid_keys.py
#
# Run ONCE:   python generate_vapid_keys.py
#
# Creates the key pair that lets this server send push notifications and
# saves it into backend/.env. The PRIVATE key is a secret — never commit it
# or share it. (.env is normally git-ignored; double-check yours is.)
import base64
import os
import sys

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')


def b64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode('ascii')


def main():
    existing = open(ENV_PATH, encoding='utf-8').read() if os.path.exists(ENV_PATH) else ''
    if 'VAPID_PRIVATE_KEY=' in existing and 'VAPID_PUBLIC_KEY=' in existing:
        values = dict(line.split('=', 1) for line in existing.splitlines() if '=' in line)
        if values.get('VAPID_PRIVATE_KEY', '').strip() and values.get('VAPID_PUBLIC_KEY', '').strip():
            print('VAPID keys already exist in .env — nothing changed.')
            print('(Replacing them would silently break every existing subscription.)')
            return 0

    private_key = ec.generate_private_key(ec.SECP256R1())
    private_raw = private_key.private_numbers().private_value.to_bytes(32, 'big')
    public_raw = private_key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )

    # Drop any empty placeholder lines (e.g. from .env.example) before appending
    lines = [l for l in existing.splitlines() if not l.startswith(('VAPID_PUBLIC_KEY=', 'VAPID_PRIVATE_KEY='))]
    lines += [f'VAPID_PUBLIC_KEY={b64url(public_raw)}', f'VAPID_PRIVATE_KEY={b64url(private_raw)}']
    if not any(l.startswith('VAPID_CLAIM_EMAIL=') for l in lines):
        lines.append('VAPID_CLAIM_EMAIL=')

    with open(ENV_PATH, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines).strip('\n') + '\n')

    print(f'Saved new VAPID keys to {ENV_PATH}')
    print('Optional: set VAPID_CLAIM_EMAIL to a contact address, then restart the backend.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
