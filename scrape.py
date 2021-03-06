import requests
from urllib.parse import unquote, urlparse, quote
from requests.exceptions import ConnectionError
import os

TOKEN = os.environ.get('OPENGRAPH_API_KEY', 'KEY')

def opengraphIO_scrape(url:str):
    print(f'OpenGraph API Call: {url}')
    try:
        endpoint = f'https://opengraph.io/api/1.1/site/{url}'
        response = requests.get(endpoint, params={'app_id' : TOKEN}).json()
        return response['hybridGraph']
    except:
        return {}

def incomplete(tags):
    return (('title' not in tags) or ('description' not in tags) or ('image' not in tags) or ('url' not in tags))

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
        # Don't look for HTML data on images or non-HTML
        if res.headers['content-type'] in {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}:
            return {'title' : p_url, 'image' : p_url, 'url' : p_url}
        elif 'text/html' in res.headers['content-type']:
            tags = parse_HTML(res.text)
            if not pr.scheme:
                tags['url'] = p_url
            # Make OpenGraph.io API call if we got a good connection but incomplete tags
            if res.status_code == 200 and incomplete(tags):
                og_tags = opengraphIO_scrape(quote(p_url, safe=''))
                tags['title'] = og_tags.get('title', tags.get('title'))
                tags['description'] = og_tags.get('description', tags.get('description'))
                tags['image'] = og_tags.get('image', tags.get('image'))
                tags['site_name'] = og_tags.get('site_name', tags.get('site_name'))
            
            return tags
        else:
            return {'title' : p_url}
    except ConnectionError:
        print('Connection Error')
        return {'url' : p_url, 'description' : 'Sorry, we could not connect to this URL.'}


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