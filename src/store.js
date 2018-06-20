import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

import edamData from './edam/edam_data';
import edamFormat from './edam/edam_format';
import edamOperation from './edam/edam_operation';
import edamTopic from './edam/edam_topic';

export default new Vuex.Store({
  state: {
    type: '',
    initDepth: 1,
    count: 0,
    data: [],
    indices: {},
    status: [
      'opened', // when triangle or click on selector
      'filtered', // when search return the list with results
      'filteredButNothingWasFound', // when search returned []
      'unfiltered', // when input set to "" or clear
      'closed', // when triangle or ESC or click outside the selector
      'focused', // when input was focused with tab
      'selected' // when term was selected
    ][0],
    disclosureResults: [],
    searchResults: []
  },
  getters: {
    getNode: (state) => (nodeId) => {
      if (nodeId === 'root') {
        var i = 0;
        for (i; i < state.data[0].children.length; i++) {
          if (state.data[0].children[i].indexOf(state.type) !== -1) {
            return state.data[state.indices[ state.data[0].children[i] ]];
          }
        }
      } else {
        return state.data[state.indices[ nodeId ]];
      }
    }
  },
  mutations: {
    flush(state) {
      switch (state.type) {
        case 'operation':
          state.data = edamOperation.slice();
          break;
        case 'format':
          state.data = edamFormat.slice();
          break;
        case 'topic':
          state.data = edamTopic.slice();
          break;
        case 'data':
          state.data = edamData.slice();
          break;
      }
    },
    updateStatus(state, status) {
      state.status = status;
    },
    setProp(state, params) {
      let id, prop, val;
      [id, prop, val] = params;
      Vue.set(state.data[state.indices[id]], prop, val);
    },
    initialize (state, initProps) {
      state.type = initProps.type;
      state.initDepth = initProps.initDepth;
      switch (state.type) {
        case 'operation':
          state.data = edamOperation.slice();
          break;
        case 'format':
          state.data = edamFormat.slice();
          break;
        case 'topic':
          state.data = edamTopic.slice();
          break;
        case 'data':
          state.data = edamData.slice();
          break;
      }

      state.data.map(function (o, i) {
        state.indices[o.id] = i;
      });
    },
    increment (state) {
      state.count++
    }
  },
  actions: {
    increment (context) {
      context.commit('increment')
    }
  }
});

