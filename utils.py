from random import random, choice, seed
from datetime import datetime

## Probably placebo, but adding some gibberish into datetime for the RNG seed seems to 
## reduce patterns of double characters (i.e. two of the same chars in a row) in key generation 
def generate_seed():
    chars = "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&**()_+-=[];:'<>,.?"
    num = random()
    seed = str(datetime.now())
    for x in str(num):
        seed = seed + x + choice(chars)
    
    return seed

def generate_access_key():
    """Randomly generates a 10 character string from a selection of upper and lowercase letters, and digits."""
    key = ""
    alphabet = "abcdefghijklmnopqrstuwxyz1234567890"
    seed(generate_seed())
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