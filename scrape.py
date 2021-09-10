import requests
from urllib.parse import unquote, urlparse
from requests.exceptions import MissingSchema, ConnectionError

def get_tags(url:str):
    p_url = unquote(url)
    pr = urlparse(p_url)
    # Missing/incorrect schema
    if not pr.scheme :
        p_url = "http://" + p_url
    elif pr.scheme != 'http' and pr.scheme != 'https':
        return {'title' : pr.netloc} if pr.netloc else {'title': p_url}

    try:
        res = requests.get(p_url)
        print(res.headers)
        if res.status_code == 200:
            if res.headers['content-type'] in {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}:
                return {'title' : p_url, 'image' : p_url, 'url' : p_url}
            elif 'text/html' in res.headers['content-type']:
                return parse_HTML(res.text)
            else:
                return {'title' : p_url}
        else:
            print('fail non-200')
            return {'title' : url, 'description' : ''}
    except ConnectionError:
        print('fail Connection Error')
        return {'title': p_url}

def parse_HTML(content):
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