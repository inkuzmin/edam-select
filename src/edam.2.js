import edam from './edam.2.json';

const DEBUG = true;

let data_indexes = {
  data: null,
  format: null,
  operation: null,
  topic: null
};

let structure_indexes = {
  data: null,
  format: null,
  operation: null,
  topic: null
};

let edam_indexes = {
  data: null,
  format: null,
  operation: null,
  topic: null
};

const regExp = new RegExp('http:\\/\\/edamontology\\.org\\/(\\w+)_(\\d+)');

class EDAM {
  static getVersion() {
    return edam['v'];
  }

  static buildUri(type, edamId) {
    return `http://edamontology.org/${type}_${edamId}`;
  }

  static getTermByUri(uri) {
    try {
      var [_, type, edamId] = uri.match(regExp);
    } catch (err) {
      throw new Error(`Expected URI is "http://edamontology.org/{ data | format | operation | topic }_{ id }"
      Provided URI is "${uri}"`);
    }

    if (!Object.keys(data_indexes).includes(type)) {
      throw new Error(`Expected type is one of { ${Object.keys(data_indexes).join(' | ')} }
      Provided type is ${type}`);
    }

    if (!!edam_indexes[type]) {
      // if cached do nothing
    } else {
      // otherwise build map
      let map = {};
      let a = edam.data[type];
      a.map(function (o, i) {
        map[o[1]] = i;
      });
      edam_indexes[type] = map;
    }

    const term = edam.data[type][edam_indexes[type][edamId]];
    if (term) {
      return term;
    } else {
      throw new Error(`Term "${uri}" was not found. EDAM version used is ${EDAM.getVersion()}`)
    }
  }

  static getTermById(type, internalId) {
    if (!!data_indexes[type]) {
      // if cached do nothing
    } else {
      // otherwise build map
      let map = {};
      let a = edam.data[type];
      a.map(function (o, i) {
        map[o[0]] = i;
      });
      data_indexes[type] = map;
    }


    return edam.data[type][data_indexes[type][internalId]];
  }

  constructor(type) {
    DEBUG && console.time('EDAM init');
    this.type = type;

    this.structure = this.clone(
      edam.structure[type]
    );

    this.data = this.clone(
      edam.data[type]
    );
    DEBUG && console.timeEnd('EDAM init');
  }

  clone(list) {
    let i, v, l = list.length, result = [];
    for (i = 0; i < l; i += 1) {
      v = list[i];
      if (Array.isArray(v)) {
        let j, vv = [], ll = v.length;
        for (j = 0; j < ll; j += 1) {
          vv.push(v[j]);
        }
        result.push(vv);
      } else {
        result.push(v);
      }
    }
    return result;
  }

  termByRel(rel) {
    return this.data[ this.dataIndex()[rel[1]]];
  }

  termByRelId(rel_id) {
    return this.data[ this.dataIndex()[this.structure[ this.structureIndex()[ rel_id ] ][1]] ];
  }

  getRoot() {
    return this.structure[this.structureIndex()[ 0 ]];
  }

  getById(nodeId) {
    return this.structure[this.structureIndex()[ nodeId ]];
  }

  dataIndex() {
    if (!!data_indexes[this.type]) { // if cached return cache
      return data_indexes[this.type];
    } else { // else build
      let map = {};
      let a = this.data;
      a.map(function (o, i) {
        map[o[0]] = i;
      });
      data_indexes[this.type] = map;
      return map;
    }
  }

  buildUri(edamId) {
    return EDAM.buildUri(this.type, edamId);
  }

  getByUri(uri) {
    return EDAM.getTermByUri(this.type, uri);
  }

  structureIndex() {
    if (!!structure_indexes[this.type]) { // if cached return cache
      return structure_indexes[this.type];
    } else { // else build
      let map = {};
      let a = this.structure;
      a.map(function (o, i) {
        map[o[0]] = i;
      });
      structure_indexes[this.type] = map;
      return map;
    }
  }
}

export default EDAM;
