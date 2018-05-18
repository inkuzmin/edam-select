import edamHierarchy from './edam/edam-hierarchy';

import edamSearchData from './edam/edam-search-data';
import edamSearchFormat from './edam/edam-search-format';
import edamSearchOperation from './edam/edam-search-operation';
import edamSearchTopic from './edam/edam-search-topic';

export default {
  index(type) {
    if (this.indexes[type]) {
      return this.indexes[type];
    } else {
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
    data: edamSearchData,
    format: edamSearchFormat,
    operation: edamSearchOperation,
    topic: edamSearchTopic
  },
  hierarchy: edamHierarchy,
  indexes: {
    data: null,
    format: null,
    operation: null,
    topic: null
  }
}
