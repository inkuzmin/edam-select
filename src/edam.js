import edamData from './edam/edam_data';
import edamFormat from './edam/edam_format';
import edamOperation from './edam/edam_operation';
import edamTopic from './edam/edam_topic';

export default {
  clear(type) {
    let i, l = this.searchData[type].length;
    for (i = 0; i < l; i += 1) {
      this.searchData[type][i].show = undefined;
      this.searchData[type][i].disclosed = undefined;
    }
  },
  getNode(type, nodeId) {
    if (nodeId === 'root') {
      for (var i = 0; i < this.searchData[type][0].children.length; i++) {
        if (this.searchData[type][0].children[i].indexOf(type) !== -1) {
          return this.searchData[type][this.index(type)[ this.searchData[type][0].children[i] ]];
        }
      }
    } else {
      return this.searchData[type][this.index(type)[ nodeId ]];
    }
  },
  index(type) {
    if (this.indexes[type]) { // if cached return cache
      return this.indexes[type];
    } else { // else create indexes
      let map = {};
      let a = this.searchData[type];
      a.map(function (o, i) {
        map[o.id] = i;
      });
      this.indexes[type] = map;
      return map;
    }
  },
  searchData: {
    data: edamData,
    format: edamFormat,
    operation: edamOperation,
    topic: edamTopic
  },
  indexes: {
    data: null,
    format: null,
    operation: null,
    topic: null
  }
}
