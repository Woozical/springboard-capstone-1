from random import random, choice
# from hashlib import md5
# from datetime import datetime

### DEPRECATED ###
## While the below method is more opaque, randomly generating 10 alphanumeric, case-sensitive characters
## is sufficient for unique-ness across a test of 5 million concurrent keys (839 quintillion? combinations)
## And, going from 32 -> 10 characters is more user friendly, faster comparisons, etc.

# def random_char():
#     chars = "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&**()_+-=[];:'<>,.?"
#     return choice(chars)

# def generate_hash_key():
#     num = random()
#     seed = str(datetime.now())
#     for char in str(num):
#         seed = seed + char + random_char()
    
#     encoded = seed.encode('utf-8')
#     hash = md5(encoded).hexdigest()
#     return hash

def generate_access_key():
    """Randomly generates a 10 character string from a selection of upper and lowercase letters, and digits."""
    key = ""
    alphabet = "abcdefghijklmnopqrstuwxyz1234567890"
    for i in range(0, 10):
        char = choice(alphabet) if random() > 0.5 else choice(alphabet).upper()
        key = key + char
    return key

def test_keygen(passes):
    results = set()
    count = 0
    for i in range(0,passes):
        key = generate_access_key()
        if key in results:
            print(f"Duplicate: {key}")
            count += 1
        else:
            results.add(key)
    print(f"Detected {count} duplicates over {passes} keys.")