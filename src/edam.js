import edam from './edam.json'

export default {
  getNode(type, nodeId) {
    if (nodeId === 'root') {
      for (var i = 0; i < this.model[type][0].children.length; i++) {
        if (this.model[type][0].children[i].indexOf(type) !== -1) {
          return this.model[type][this.index(type)[ this.model[type][0].children[i] ]];
        }
      }
    } else {
      return this.model[type][this.index(type)[ nodeId ]];
    }
  },
  index(type) {
    if (this.indexes[type]) { // if cached return cache
      return this.indexes[type];
    } else { // else create indexes
      let map = {};
      let a = this.model[type];
      a.map(function (o, i) {
        map[o.id] = i;
      });
      this.indexes[type] = map;
      return map;
    }
  },
  model: {
    data: edam['data'],
    format: edam['format'],
    operation: edam['operation'],
    topic: edam['topic'],
    schema: edam['schema'],
    roots: edam['roots']
  },
  indexes: {
    data: null,
    format: null,
    operation: null,
    topic: null
  }
}
