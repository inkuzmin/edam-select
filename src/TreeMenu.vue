<template>
  <li class="tree-menu" :style="isShown">
    <div class="label-wrapper" v-if="depth > 0">
      <div :style="indent" :class="labelClasses">
        <span v-if="children.length > 0" class="triangle-wrap" @click="toggleChildren">
          <i class="triangle" :class="triangleClasses"></i>
        </span>
        <i v-else class="span"></i>
        <span class="term">{{ term.label }}</span>
        <!--<i v-if="status === 'filtered' && nodes && disclosed" @click="toggleFilter">x</i>-->
        <!--<i v-if="touched">x</i>-->
      </div>
    </div>
    <ul>
      <li
        is="tree-menu"
        class="edam-select-menu-item"

        v-if="disclosed"
        v-for="node in children"
        :nodes="node.children"
        :label="node.label"
        :id="node.id"

        :key="node.label"
        :depth="depth + 1"

        :disclosureResults="disclosureResults"
        :searchResults="searchResults"
      >
      </li>
    </ul>
  </li>
</template>

<script>
  import EDAM from './edam';

  import store from './store'

  export default {
    // store,
    name: 'tree-menu',
    props: ['nodes', 'label', 'id', 'depth', 'disclosureResults', 'searchResults'],
    watch: {
      status: function () {
        this.flush()
        this.init();
      },
      searchResults: function () {
        this.init();
      }
    },

    methods: {
      _useIfDefined(val, next) {
        if (typeof val !== "undefined") {
          return val;
        } else {
          return next;
        }
      },

      flush() {
        this.$store.commit('flush');
      },

      numberOfHiddenChildren() {
        return _.sumBy(this.children, node => !node.show);
      },

      init() {
        switch (this.status) {
          case "opened":
            this.show = true;
            this.disclosed = this._useIfDefined(this.disclosed, (this.depth < this.initDepth));
            break;

          case "filtered":
            this.show = this.isInDisclosureResults() || this.isInSearchResults();
            this.disclosed = this._useIfDefined(this.disclosed, this.isInDisclosureResults());
            break;

          case "filteredButNothingWasFound":
            // do nothing
            break;

          case "unfiltered":
            this.show = true;
            this.disclosed = this._useIfDefined(this.disclosed, (this.depth < this.initDepth));
            break;

          case "closed":
            break;

          case "focused":
            break;

          case "selected":
            break;

          default:
            throw "Unknown status";
        }
      },
      toggleChildren() {
        this.disclosed = !this.disclosed;

        // console.log(this.$store.state.type);
        // console.log(this.numberOfHiddenChildren());
      },
      isInDisclosureResults() {
        return this.disclosureResults.indexOf(this.id) !== -1;
      },
      isInSearchResults() {
        return this.searchResults.indexOf(this.id) !== -1;
      }
    },
    created() {
      this.init();
    },
    computed: {
      status: {
        get () {
          return this.$store.state.status;
        }
      },
      children() {
        return _.map(this.nodes, (node) => {
          return this.$store.getters.getNode(node);
        })
      },
      term() {
        return this.$store.state.data[this.$store.state.indices[this.id]]
      },
      disclosed: {
        get() {
          return this.$store.state.data[this.$store.state.indices[this.id]]['disclosed'];
        },
        set(val) {
          this.$store.commit('setProp', [this.id, 'disclosed', val]);
        }
      },

      show: {
        get() {
          return this.$store.state.data[this.$store.state.indices[this.id]]['show']
        },
        set(val) {
          this.$store.commit('setProp', [this.id, 'show', val]);
        }
      },
      type() {
        return this.$store.state.type;
      },
      initDepth() {
        return this.$store.state.initDepth;
      },
      triangleClasses() {
        return {
          'opened': this.disclosed,
        }
      },
      labelClasses() {
        return {
          'has-children': this.nodes,
          'highlighted': this.isInSearchResults()
        }
      },
      indent() {
        return {'margin-left': `${this.depth - 0.5}em`};
        return {transform: `translate(${this.depth - 0.5}em)`}
      },
      isShown() {
        if (this.show) {
          return {
            display: ''
          }
        } else {
          return {
            display: 'none'
          }
        }
      }
    }
  }
</script>


<style lang="scss">
  ul, li {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }

  .label-wrapper {
    padding: 0.3em 0em 0.3em;
  }

  .span {
    display: block;
    width: 19px;
    float: left;
    height: 1px;
  }

  .highlighted {
    /*background-color: yellow;*/
    border-right: 2px solid #666;
  }

  .triangle-wrap {
    cursor: pointer;
    display: block;
    float: left;
    width: 19px;
    height: 18px;
    text-align: center;

    &:hover {
      .triangle {
        /*border-color: transparent #555 transparent;*/
        opacity: 1;
        transition: opacity 300ms;
        /*&.opened {*/
        /*border-color: #555 transparent transparent;*/
        /*}*/
      }
    }
  }

  .triangle {
    border-color: transparent #666 transparent;
    border-style: solid;
    top: -1px;
    border-width: 5px 0 5px 5px;
    margin-right: 2px;
    margin-left: 3px;
    display: inline-block;
    height: 0;
    width: 0;
    position: relative;
    opacity: 0.5;

    &.opened {
      border-color: #666 transparent transparent;
      top: 0;
      margin: 0;
      border-width: 5px 5px 2.5px;
    }
  }
</style>
