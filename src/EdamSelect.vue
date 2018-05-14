<template>
  <div class="edam-select-wrap" :class="classObject">
    <div class="edam-select-container">
      <div class="edam-select-input-wrap">
        <input type="text" placeholder="Filter EDAM data" @input="search">
      </div>
    </div>
    <ul class="edam-select-menu">

      <li
        is="tree-menu"
        class="edam-select-menu-item"

        :nodes="tree.nodes"
        :depth="0"
        :label="tree.label"
        :type="type"

        :initDepth="initDepth"
        :status="status"

      ></li>
    </ul>

    <div v-if="status === 'filteredButNothingWasFound'" class="nothing-found">
      Nothing was found!
    </div>

  </div>
</template>

<script>

  import edamHierarchy from './edam/edam-hierarchy';

  import edamSearchData from './edam/edam-search-data';
  import edamSearchFormat from './edam/edam-search-format';
  import edamSearchOperation from './edam/edam-search-operation';
  import edamSearchTopic from './edam/edam-search-topic';

  import Fuse from "fuse.js";
  import debounce from "debounce";

  import TreeMenu from './TreeMenu'

  // this solution is not what I am proud of, need to think more about it
  // TODO: or at least re-implement in more efficient way
  function traverse(tree, path) {
    tree.path = path;

    tree.nodes && tree.nodes.forEach(function(child){
      traverse(child, [ ...path, child.label ]);
    });
  }

  // we can traverse only what is needed
  /*traverse(edamHierarchy['data'], []);
  traverse(edamHierarchy['format'], []);
  traverse(edamHierarchy['operation'], []);
  traverse(edamHierarchy['topic'], []);*/

  const edamSearch = {
    data: edamSearchData,
    format: edamSearchFormat,
    operation: edamSearchOperation,
    topic: edamSearchTopic
  };

  function side(value, sideEffectFn) {
    sideEffectFn();
    return value;
  }

  let fuse;

  function searchTree(predicate, getChildren, treeNode) {
    function search(treeNode) {
      if (!treeNode) {
        return undefined;
      }

      for (let treeItem of treeNode) {
        if (predicate(treeItem)) {
          return treeItem;
        }

        const foundItem = search(getChildren(treeItem));

        if (foundItem) {
          return foundItem;
        }
      }
    }
    return search(treeNode);
  }

  export default {
    name: 'edam-select',
    components: {
      'tree-menu': TreeMenu
    },
    props: {
      'type': {
        type: String,
        validator: value => {
          return ['format', 'data', 'topic', 'operation'].indexOf(value) !== -1;
        }
      },
      'inline': {
        type: Boolean,
        default: false
      },
      'opened': {
        type: Boolean,
        default: false
      },
      'initDepth': {
        type: Number,
        default: 1
      }
    },
    data() {
      return {
        tree: edamHierarchy[this.type],
        fuse: new Fuse(edamSearch[this.type], {
          keys: ['label'],
          shouldSort: true,
          includeMatches: true,
          threshold: 0.3,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1
        }),
        data: edamSearch[this.type],
        status: [
          'opened', // when triangle or click on selector
          'filtered', // when search return the list with results
          'filteredButNothingWasFound', // when search returned []
          'unfiltered', // when input set to "" or clear
          'closed', // when triangle or ESC or click outside the selector
          'focused', // when input was focused with tab
          'selected' // when term was selected
        ][0],
        searchResults: [],
        highlightedResults: []
      }
    },
    watch: {
      status: function(value) {
        if (['opened', 'filtered', 'filteredButNothingWasFound',
            'unfiltered', 'closed', 'focused', 'selected'].indexOf(value) === -1) {
          throw "Unknown status";
        }
      }
    },
    methods: {
      search: debounce(function (e) {
        let results = fuse.search(e.target.value);

        // console.log(this.type)
        let found = [];
        results.forEach(function(result) {

        });


        console.log(results);
      }, 500)
    },
    computed: {
      classObject: function () {
        return {
          'is-inline': true,
          'is-open': this.status === 'opened',
          'is-focused': false
        }
      }
    }
  }
</script>


<style lang="scss">


  /* Common TODO: move to another place */

  body {
    width: 500px;
    margin: 0 auto;
    padding: 50px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  /* Mixins */

  @mixin placeholder {
    &::-webkit-input-placeholder {
      @content
    }
    &:-moz-placeholder {
      @content
    }
    &::-moz-placeholder {
      @content
    }
    &:-ms-input-placeholder {
      @content
    }
  }

  /* Styles */

  .edam-select-wrap {
    position: relative;
    width: 100%;

    &.is-open > .edam-select-container {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    &.is-focused:not(.is-open) > .edam-select-container {
      border-color: #007eff;
      box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075), 0 0 0 3px rgba(0, 126, 255, .1);
    }

    .edam-select-container {
      border: 1px solid #ccc;
      border-radius: 4px;
      border-color: #d9d9d9 #ccc #b3b3b3;
      background-color: #fff;
      color: #333;
      height: 1em;
      width: 100%;
      display: table;

      .edam-select-input-wrap {
        display: block;
        margin-left: 0.5em;
        margin-right: 0.5em;
        padding: 0;
        vertical-align: middle;
        padding-bottom: 0.4em;

        input {
          border-style: none;
          border: 0;
          outline-style: none;
          font-size: inherit;
          line-height: 1;
          padding: 0;
          padding-top: 0.5em;
          width: 100%;

          @include placeholder {
            color: #999;
          }
        }
      }
    }



    .edam-select-menu {
      border-bottom-right-radius: 4px;
      border-bottom-left-radius: 4px;
      background-color: #fff;
      border: 1px solid #ccc;
      border-top-color: #e6e6e6;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
      margin-top: -1px;
      position: relative;
      width: 100%;
      z-index: 1;
      overflow-y: scroll;

      .edam-select-menu-item {
        color: #666;
        cursor: pointer;
        /*padding: 0.2em 0.5em 0.2em;*/
        /*max-height: 1em;*/
      }
    }

    .nothing-found {
      margin-top: 5px;
      padding: 5px 10px;
      background: #f3beb8;
      border: 1px solid #f09898;
      color: #34495e;
    }
  }
</style>
