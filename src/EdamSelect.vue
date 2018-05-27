<template>
  <div class="edam-select-wrap" :class="classObject">
    <div class="edam-select-container">
      <div class="edam-select-input-wrap">
        <input type="text" v-bind:placeholder="placeholder" @input="search">
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
        :searchResults="searchResults"
        :highlightedResults="highlightedResults"

      ></li>
    </ul>

    <div v-if="status === 'filteredButNothingWasFound'" class="nothing-found">
      Nothing was found!
    </div>

  </div>
</template>

<script>

  import Fuse from "fuse.js";
  import debounce from "debounce";

  import TreeMenu from './TreeMenu';

  import EDAM from './edam';

  import _ from 'lodash';

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
    created() {
      EDAM.index(this.type);
    },
    data() {
      return {
        tree: EDAM.hierarchy[this.type],
        fuseSearchLabel: new Fuse(EDAM.searchData[this.type], {
          keys: ['label'],
          shouldSort: true,
          includeMatches: true,
          threshold: 0.1,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1
        }),
        fuseSearchSynonyms: new Fuse(EDAM.searchData[this.type], {
          keys: ['synonyms'],
          shouldSort: true,
          includeMatches: true,
          threshold: 0.3,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1
        }),
        fuseSearchDescriptions: new Fuse(EDAM.searchData[this.type], {
          keys: ['description'],
          shouldSort: true,
          includeMatches: true,
          threshold: 0.3,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1
        }),
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
      type: function(value) {
        console.log(value);
      },
      status: function(value) {
        if (['opened', 'filtered', 'filteredButNothingWasFound',
            'unfiltered', 'closed', 'focused', 'selected'].indexOf(value) === -1) {
          throw "Unknown status";
        }
      }
    },
    methods: {
      search: debounce(function (e) {
        let results = this.fuseSearchLabel.search(e.target.value);

        let found = [];
        results.forEach((result) => {
          this.highlightedResults.push(result.item.id);
          // this.searchResults.push(result.item.id);

          let ids = this.addParents(result.item.id, []);

          found = _.uniq(_.flatten([found, ids]));
        });

        console.log("search:", found);
        console.log("highlighted:", this.highlightedResults);

        this.status = "filtered";
        this.searchResults = found;
        // this.highlightedResults = results;

      }, 500),

      addParents: function (id, acc) {
          let index = EDAM.index(this.type)[id];

          if (id === 'ok') {
            return acc;
          }

          let data = EDAM.searchData[this.type][index];

          acc = [...acc, id];

          data['parent_ids'] && data['parent_ids'].forEach((parentId) => {
            acc = this.addParents(parentId, acc);
          });

          return acc;
      }
    },
    computed: {
      test: function () {
        console.log(this.type);
        return 1;
      },
      placeholder: function () {
        return 'Filter EDAM ' + this.type;
      },
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
