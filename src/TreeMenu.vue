<template>
  <li class="tree-menu" :style="isShown">
    <div class="label-wrapper" @click="toggleChildren" v-if="depth > 0">
      <div :style="indent" :class="labelClasses">
        <i v-if="nodes" class="triangle" :class="triangleClasses"></i>
        <i v-else class="span"></i>
        {{ term }}
      </div>
    </div>
    <ul>
      <li
        is="tree-menu"
        class="edam-select-menu-item"

        v-if="disclosed"
        v-for="node in nodes"
        :nodes="node.nodes"
        :label="node.label"
        :key="node.label"
        :depth="depth + 1"
        :type="type"

        :initDepth="initDepth"
        :status="status"
        :searchResults="searchResults"
        :highlightedResults="highlightedResults"
      >
      </li>
    </ul>
  </li>
</template>

<script>

  import EDAM from './edam';

  export default {
    name: 'tree-menu',
    props: ['nodes', 'label', 'depth', 'type', 'status', 'initDepth', 'searchResults', 'highlightedResults'],
    data() {
      return {
        disclosed: this.status === "opened" ? (this.depth < this.initDepth) : this.isInSearchResults(),
        show: this.status === "opened" ? true : this.isInSearchResults(),
        inferred: false
      }
    },
    watch: {
      status: function (value) {
        switch (value) {
          case "opened":
            this.show = true;
            this.disclosed = this.depth < this.initDepth;
            break;

          case "filtered":
            this.disclosed = this.isInSearchResults();
            this.show = this.isInSearchResults(); // || this.hasFoundChildren();

            // if (this.nodes && this.nodes.length > 0) {
            //   this.disclosed = true;
            // }

            break;

          case "filteredButNothingWasFound":
            break;

          case "unfiltered":
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
      }
    },

    methods: {
      toggleChildren() {
        this.disclosed = !this.disclosed;
      },
      isInSearchResults() {
        return this.searchResults.indexOf(this.label) !== -1;
      },
      isInHighlightedResults() {
        return this.highlightedResults.indexOf(this.label) !== -1;
      }
    },
    computed: {
      term() {
        let index = EDAM.index(this.type)[this.label];
        // return this.label;
        return EDAM.searchData[this.type][index]['label'];
      },
      triangleClasses() {
        return {
          'opened': this.disclosed,
        }
      },
      labelClasses() {
        return {
          'has-children': this.nodes,
          'highlighted': this.isInHighlightedResults()
        }
      },
      indent() {
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
    display: inline-block;
    width: 10px;
  }

  .highlighted {
    background-color: yellow;
  }

  .triangle {
    border-color: transparent #999 transparent;
    border-style: solid;
    top: -1px;
    border-width: 5px 0 5px 5px;
    margin-right: 2px;
    margin-left: 3px;
    display: inline-block;
    height: 0;
    width: 0;
    position: relative;

    &.opened {
      border-color: #999 transparent transparent;
      top: 0;
      margin: 0;
      border-width: 5px 5px 2.5px;
    }
  }
</style>
