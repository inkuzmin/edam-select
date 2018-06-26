import edam from './edam.json';

let indexes = {
  data: null,
  format: null,
  operation: null,
  topic: null
};

class EDAM {
  constructor(type) {
    this.type = type;
    this.model = this.clone(edam[this.type]);
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

  getRoot() {
    return edam['roots'][this.type];
  }

  getSchema() {
    return edam['schema'];
  }

  getById(nodeId) {
    return this.model[this.index()[ nodeId ]];
  }

  index() {
    if (!!indexes[this.type]) { // if cached return cache
      return indexes[this.type];
    } else { // else create indexes
      let map = {};
      let a = this.model;
      a.map(function (o, i) {
        map[o[0]] = i;
      });
      indexes[this.type] = map;
      return map;
    }
  }
}

export default EDAM;
