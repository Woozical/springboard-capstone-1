from random import random, choice
from hashlib import md5
from datetime import datetime

def random_char():
    chars = "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&**()_+-=[];:'<>,.?"
    return choice(chars)

def generate_access_key():
    num = random()
    seed = str(datetime.now())
    for char in str(num):
        seed = seed + char + random_char()
    
    encoded = seed.encode('utf-8')
    return md5(encoded).hexdigest()