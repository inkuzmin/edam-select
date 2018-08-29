import csv
import json
from pprint import pprint

import sqlite3
from sqlite3 import Error

try:
    # Open DB
    conn = sqlite3.connect("edam.db")
    c = conn.cursor()

    with open('EDAM.csv') as csvfile:
        # Create table with data we need
        terms = csv.reader(csvfile)

        sql = 'DROP TABLE IF EXISTS terms'
        c.execute(sql)
        conn.commit()

        sql = """CREATE TABLE IF NOT EXISTS terms (id INTEGER PRIMARY KEY AUTOINCREMENT,
              uri CHAR(255) NOT NULL,
              iri CHAR(255),
              domain CHAR(255) CHECK( domain IN ('data','format','topic', 'operation') ) DEFAULT NULL,
              label TEXT NOT NULL,
              synonyms TEXT,
              definitions TEXT)"""

        c.execute(sql)
        conn.commit()

        c.execute('INSERT INTO terms(uri, iri, domain, label, synonyms, definitions) VALUES (?,?,?,?,?,?)',
                  ("http://www.w3.org/2002/07/owl#Thing", "0000", None, "Root", "", ""))

        for term in terms:
            if term[0] == "http://www.w3.org/2002/07/owl#DeprecatedClass":  # don't need it
                continue

            if term[4] == 'FALSE':  # if not obsolete
                if term[0].startswith('http://edamontology.org/data_'):
                    domain = 'data'
                elif term[0].startswith('http://edamontology.org/operation_'):
                    domain = 'operation'
                elif term[0].startswith('http://edamontology.org/format_'):
                    domain = 'format'
                elif term[0].startswith('http://edamontology.org/topic_'):
                    domain = 'topic'

                iri = term[0][len('http://edamontology.org/' + domain + '_'):]

                c.execute('INSERT INTO terms(uri, iri, domain, label, synonyms, definitions) VALUES (?,?,?,?,?,?)', (term[0], iri, domain, term[1], term[2], term[3]))

        conn.commit()

        # Create table with relations
        csvfile.seek(0)
        terms = csv.reader(csvfile)

        sql = 'DROP TABLE IF EXISTS relations'
        c.execute(sql)
        conn.commit()

        sql = """CREATE TABLE IF NOT EXISTS relations (id INTEGER PRIMARY KEY AUTOINCREMENT, parent INTEGER,  child INTEGER,
              FOREIGN KEY(parent) REFERENCES terms(id),
              FOREIGN KEY(child) REFERENCES terms(id))"""
        c.execute(sql)
        conn.commit()

        for term in terms:
            if term[0] == "http://www.w3.org/2002/07/owl#DeprecatedClass":  # don't need it
                continue

            if term[4] == 'FALSE':  # if not obsolete
                parents = term[7].split('|')

                c.execute("SELECT id FROM terms WHERE uri=?", (term[0],))
                child_id = c.fetchone()[0]

                for parent in parents:
                    c.execute("SELECT id FROM terms WHERE uri=?", (parent,))
                    parent_id = c.fetchone()[0]
                    c.execute('INSERT INTO relations(parent, child) VALUES (?,?)', (parent_id, child_id))

        conn.commit()

        # Export data
        ## build tree

        ### get root
        c.execute("SELECT id FROM terms WHERE uri='http://www.w3.org/2002/07/owl#Thing'")
        root_id = c.fetchone()[0]

        ### get domain roots
        c.execute("SELECT child FROM relations WHERE parent=" + str(root_id))
        roots_ids = [x[0] for x in c.fetchall()]

        ### get domain disctionary: domain -> term_id
        domains = {}
        for roots_id in roots_ids:
            c.execute("SELECT domain FROM terms WHERE id=" + str(roots_id))
            domains[c.fetchone()[0]] = roots_id

        ### def function
        def build_tree(node, tree):
            tree['label'] = node
            tree['nodes'] = []

            c.execute("SELECT * FROM relations WHERE parent=" + str(node))
            rows = c.fetchall()
            for row in rows:
                id, parent, child = row
                tree['nodes'].append(
                    build_tree(child, {})
                )

            return tree

        ### build
        # tree = build_tree(root_id, {})
        trees = {}
        for domain, term_id in domains.items():
            trees[domain] = build_tree(term_id, {})


        ## normalise tree
        def uid_gen():
            number = 0
            while True:
                yield number
                number += 1



        ## build search data and indexes
        search_data = {}
        search_data_indexes = {}
        for domain, term_id in domains.items():
            search_data[domain] = []
            search_data_indexes[domain] = {}
            c.execute("SELECT * FROM terms WHERE terms.domain='" + str(domain) + "'")
            for i, row in enumerate(c.fetchall()):
                (id, uri, iri, domain, label, synonyms, definitions) = row
                search_data[domain].append([id, iri, label,
                                        synonyms.split('|') if len(synonyms) > 0 else [],
                                        definitions.split('|') if len(definitions) > 0 else [],
                                        []])
                search_data_indexes[domain][id] = i

        ### traverse
        def normaliser(tree, parent, uid, domain, array):
            u = next(uid)
            item = [u, tree['label'], [ normaliser(node, u, uid, domain, array) for node in tree['nodes'] ], parent]
            array.append(item)

            search_data[domain][ search_data_indexes[domain][tree['label']] ][5].append(u)
            return u

        ### exec

        structure_data = {}
        for domain, tree in trees.items():
            uid = uid_gen()
            structure_data[domain] = []
            normaliser(tree, None, uid, domain, structure_data[domain])

        # export result
        result = {
            'structure': structure_data,
            'data': search_data
        }

        # result = {
        #     'roots': roots,
        #     'data': data_list,
        #     'operation': operation_list,
        #     'topic': topic_list,
        #     'format': format_list,
        #     'schema': ['id', 'label', 'synonyms[]', 'definitions[]', 'children[]', 'parents[]']
        # }

        ### export
        with open('data.json', 'w') as outfile:
            json.dump(result, outfile, separators=(',', ':'))


finally:
    conn.close()
