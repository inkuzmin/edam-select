import edam from './edam.2.json';

const DEBUG = false;

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

class EDAM {

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
