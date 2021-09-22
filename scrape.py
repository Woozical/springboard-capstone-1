import requests
from urllib.parse import unquote, urlparse
from requests.exceptions import ConnectionError
import os

TOKEN = os.environ.get('OPENGRAPH_API_KEY', 'SECRET_KEY_DEV')

def opengraphIO_scrape(url:str):
    endpoint = f'https://opengraph.io/api/1.1/site/{url}'
    response = requests.get(endpoint, params={'app_id' : TOKEN}).json()
    return response['hybridGraph']

def get_tags(url:str):
    """ Attempts to get the OpenGraph tags of a given URL, using the homebrew request parser. If tags are missing,
    opengraph.io's API is utilized to plug the gaps."""
    p_url = unquote(url)
    pr = urlparse(p_url)
    tags = {}
    # Missing/incorrect schema
    if not pr.scheme :
        p_url = "http://" + p_url
    elif pr.scheme != 'http' and pr.scheme != 'https':
        return {'title' : pr.netloc} if pr.netloc else {'title': p_url}

    try:
        res = requests.get(p_url)
        if res.status_code == 200:
            if res.headers['content-type'] in {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}:
                return {'title' : p_url, 'image' : p_url, 'url' : p_url}
            elif 'text/html' in res.headers['content-type']:
                tags = parse_HTML(res.text)
            else:
                tags = {'title' : p_url}
        else:
            tags = {'url' : p_url}
    except ConnectionError:
        tags = {'url' : p_url}
    
    if ('title' not in tags) or ('description' not in tags) or ('image' not in tags) or ('url' not in tags):
        try:
            og_tags = opengraphIO_scrape(url)
            tags['title'] = og_tags['title']
            tags['description'] = og_tags['description']
            tags['image'] = og_tags['image']
            tags['site_name'] = og_tags['site_name']
            tags['url'] = og_tags['url']
            return tags
        except:
            return tags
    else:
        return tags


def parse_HTML(content):
    """ Parses the text of an HTML document for opengraph tags and returns a dictionary containing each found. """
    tags = {}
    remain = content
    while (remain):
        after = remain.partition('property="og:')[2]
        y1 = after.find('/>')
        y2 = after.find('>')
        
        if y1 == -1:
            y = y2
        elif y2 == -1:
            y = y1
        elif y1 < y2:
            y = y1
        else:
            y = y2

        meat = after[:y]
        key = meat.partition('"')[0]
        value = meat.partition('content="')[2]
        value = value.strip('" ')
        if key and value:
            tags[key] = value
        remain = after
    
    # grab meta description and title tag
    if 'title' not in tags:
        tags['title'] = content.partition('<title>')[2].partition('</title>')[0]
    if 'description' not in tags:
        desc = content.partition('<meta name="description" content="')[2]
        y1 = desc.find('/>')
        y2 = desc.find('>')
        if y1 == -1:
            y = y2
        elif y2 == -1:
            y = y1
        elif y1 < y2:
            y = y1
        else:
            y = y2

        tags['description'] = desc[:y].strip(' "')
    return tags