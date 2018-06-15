<template>
  <li class="tree-menu" :style="isShown">
    <div class="label-wrapper" v-if="depth > 0">
      <div :style="indent" :class="labelClasses">
        <span v-if="nodes" class="triangle-wrap" @click="toggleChildren">
          <i class="triangle" :class="triangleClasses"></i>
        </span>
        <i v-else class="span"></i>
        <span class="term">{{ term }}</span>
        <!--<i v-if="status === 'filtered' && nodes && disclosed" @click="toggleFilter">x</i>-->
        <i v-if="touched">x</i>
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
        :disclosureResults="disclosureResults"
        :searchResults="searchResults"
      >
      </li>
    </ul>
  </li>
</template>

<script>

  import EDAM from './edam';

  export default {
    name: 'tree-menu',
    props: ['nodes', 'label', 'depth', 'type', 'status', 'initDepth', 'disclosureResults', 'searchResults'],
    data() {
      return {
        disclosed: false,
        show: false,
        inferred: false,
        touched: false
      }
    },
    watch: {
      status: function () {
        this.filter();
      },
      searchResults: function () {
        this.filter();
      }
    },

    methods: {
      toggleFilter() {
        // switch (this.status) {
        //   case "filtered":
        //       _.each(this.$children, function (child) {
        //         child.show = true;
        //       });
        //     this._status = 'unfiltered';
        //     break;
        //   case "unfiltered":
        //     _.each(this.$children, (child) => {
        //       child.show = child.isInDisclosureResults() || child.isInSearchResults();
        //     });
        //     this._status = 'filtered';
        //     break;
        // }
      },
      filter() {
        switch (this.status) {
          case "opened":
            this.show = true;
            this.disclosed = this.depth < this.initDepth;
            break;

          case "filtered":
            this.show = this.isInDisclosureResults() || this.isInSearchResults();
            this.disclosed = this.isInDisclosureResults();
            break;

          case "filteredButNothingWasFound":
            // do nothing
            break;

          case "unfiltered":
            this.show = true;
            // this.disclosed = this.isInDisclosureResults();
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
        this.touched = true;

        this.disclosed = !this.disclosed;

        this.$nextTick(function () {
          if (this.disclosed) {
            _.each(this.$children, function (child) {
              child.show = true;
            });
          } else {
            _.each(this.$children, (child) => {
              child.show = child.isInDisclosureResults() || child.isInSearchResults();
            });
          }
        });
      },
      isInDisclosureResults() {
        return this.disclosureResults.indexOf(this.label) !== -1;
      },
      isInSearchResults() {
        return this.searchResults.indexOf(this.label) !== -1;
      }
    },
    created() {
      this.filter();
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
