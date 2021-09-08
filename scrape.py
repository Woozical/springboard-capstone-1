import requests
from urllib.parse import unquote

def get_tags(url:str):
    url = unquote(url)
    res = requests.get(url)
    return parse_HTML(res.text)

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