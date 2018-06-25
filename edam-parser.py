import csv
import json
from pprint import pprint

with open('EDAM.csv') as csvfile:
    terms = csv.reader(csvfile)

    terms_dict = {'http://www.w3.org/2002/07/owl#Thing': {'label': None, 'synonyms': None, 'definitions': None, 'children': [], 'parents': []}}

    for term in terms:
        if term[0] == "http://www.w3.org/2002/07/owl#DeprecatedClass": # don't need it
            continue

        if term[4] == 'FALSE': # if not obsolete
            terms_dict[term[0]] = { 'label': term[1], 'synonyms': term[2].split('|'), 'definitions': term[3].split('|'), 'children': [], 'parents': term[7].split('|')}

    csvfile.seek(0)
    terms = csv.reader(csvfile)

    for term in terms:
        if term[0] == "http://www.w3.org/2002/07/owl#DeprecatedClass": # don't need it
            continue

        if term[4] == 'FALSE':
            parents = term[7].split('|')
            for parent in parents:
                terms_dict[parent]['children'].append(term[0])


    roots = {'data': None, 'operation': None, 'topic': None, 'format': None}
    for child in terms_dict['http://www.w3.org/2002/07/owl#Thing']['children']:
        if child.startswith('http://edamontology.org/data_'):
            roots['data'] = child[len('http://edamontology.org/data_'):]
        elif child.startswith('http://edamontology.org/operation_'):
            roots['operation'] = child[len('http://edamontology.org/operation_'):]
        elif child.startswith('http://edamontology.org/format_'):
            roots['format'] = child[len('http://edamontology.org/format_'):]
        elif child.startswith('http://edamontology.org/topic_'):
            roots['topic'] = child[len('http://edamontology.org/topic_'):]


    terms_list = [ {**{'id': k}, **v} for k, v in terms_dict.items() ]

    def truncate(prefix, array):
        for data_item in array:
            if data_item['id'] == 'http://www.w3.org/2002/07/owl#Thing':
                data_item['id'] = 'root'
            else:
                data_item['id'] = data_item['id'][len(prefix):]
                i = 0
                for c in data_item['children']:
                    data_item['children'][i] = c[len(prefix):]
                    i += 1
                i = 0
                for p in data_item['parents']:
                    data_item['parents'][i] = p[len(prefix):]
                    i += 1

    def listify(data_list):
        return [[item['id'], item['label'], item['synonyms'], item['definitions'], item['children'], item['parents']] for item in data_list]


    data_list = list(filter(lambda term: term['id'].startswith('http://edamontology.org/data_'), terms_list))
    operation_list = list(filter(lambda term: term['id'].startswith('http://edamontology.org/operation_'), terms_list))
    format_list = list(filter(lambda term: term['id'].startswith('http://edamontology.org/format_'), terms_list))
    topic_list = list(filter(lambda term: term['id'].startswith('http://edamontology.org/topic_'), terms_list))

    truncate('http://edamontology.org/data_', data_list)
    truncate('http://edamontology.org/operation_', operation_list)
    truncate('http://edamontology.org/format_', format_list)
    truncate('http://edamontology.org/topic_', topic_list)

    data_list = listify(data_list)
    operation_list = listify(operation_list)
    format_list = listify(format_list)
    topic_list = listify(topic_list)

    result = {
        'roots': roots,
        'data': data_list,
        'operation': operation_list,
        'topic': topic_list,
        'format': format_list,
        'schema': ['id', 'label', 'synonyms[]', 'definitions[]', 'children[]', 'parents[]']
    }

    with open('edam.json', 'w') as outfile:
        json.dump(result, outfile, separators=(',', ':'))

