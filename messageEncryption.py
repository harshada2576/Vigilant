# AES-GCM Message Encryption
# pip install cryptography

import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64

# Generate shared secret key once (save securely, share between users1/2)
shared_key = AESGCM.generate_key(bit_length=128)
aesgcm = AESGCM(shared_key)

def encrypt_message(plaintext):
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

    return {
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode()
    }

def decrypt_message(nonce_b64, ciphertext_b64):
    nonce = base64.b64decode(nonce_b64)
    ciphertext = base64.b64decode(ciphertext_b64)

    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode()

# example usage
plaintext = "Yo, whassup bro!"
encrypted = encrypt_message(plaintext)
print("Encrypted:", encrypted)

decrypted = decrypt_message(encrypted["nonce"], encrypted["ciphertext"])
print("Decrypted:", decrypted)


