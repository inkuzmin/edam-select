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
        :showParent="showMe"
      >
      </li>
    </ul>
  </li>
</template>

<script>

  import EDAM from './edam';

  export default {
    name: 'tree-menu',
    props: ['nodes', 'label', 'depth', 'type', 'status', 'initDepth', 'showParent'],
    data() {
      return {
        disclosed: this.depth < this.initDepth,
        show: true,
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
            this.show = this.isInSearchResults() || this.hasFoundChildren();
            if (this.show) {
              this.$parent.showMe();
            //   this.showParent && this.showParent();
            }
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
      hasFoundChildren() {

      //   let children = this.nodes.map(function(o) {
      //     return o.label;
      //   });
      //   let U = [...new Set([3637, 3760, 3638])].filter(x => new Set(children).has(x)).length > 0;
      //   console.log(U);
      //   return U;
      },
      toggleChildren() {
        this.disclosed = !this.disclosed;
      },
      isInSearchResults() {
        let r = [3637, 3760, 3638].indexOf(this.label) !== -1;
        return r;
      },
      showMe() {
        this.show = true;
        this.disclosed = true;
        this.inferred = true;
        // console.log(this.showParent);
        this.$parent.showMe && this.$parent.showMe();
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
        return {'has-children': this.nodes}
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
