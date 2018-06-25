import style from './styles.scss';

import EDAM from './edam.js';

import './polyfills.js';

import Fuse from "fuse.js";

window.EDAM = EDAM;

class EdamSelect {
  constructor(sel, params) {
    this.el = this.generateEdamSelectView();
    document.querySelector(sel).appendChild(this.el);

    this.type = params.type;
    this.initDepth = params.initDepth;

    this.model = EDAM.model[this.type];
    this.rootId = EDAM.model.roots[this.type];

    this.index = EDAM.index(this.type); // singleton for returning indexes

    console.time('Fuse init');
    this.fuse = new Fuse(this.model, {
      keys: ['1'],
      shouldSort: true,
      includeMatches: true,
      threshold: 0.3,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1
    });
    console.timeEnd('Fuse init');

    // Thingie for search debouncing
    this.timeout = null;
    // and other stuff for searching
    this.disclosureResults = [];
    this.searchResults = [];

    this.init();
  }

  init() {

    console.time('Tree rendering');

    let idx = this.index[this.rootId];
    let term = this.model[idx];

    let treeMenu = new TreeMenu(term, {
      initDepth: this.initDepth,
      depth: 0,
      type: this.type
    });

    this.append(treeMenu);

    console.timeEnd('Tree rendering');

  }

  generateEdamSelectView() {
    let edamSelectWrap = document.createElement('div');
    edamSelectWrap.className = style['edam-select-wrap'];

    let edamSelectContainer = document.createElement('div');
    edamSelectContainer.className = style['edam-select-container'];

    let edamSelectInputWrap = document.createElement('div');
    edamSelectInputWrap.className = style['edam-select-input-wrap'];

    let input = document.createElement('input');
    input.type = 'text';

    let edamSelectMenuWrap = document.createElement('div');
    edamSelectMenuWrap.className = style['edam-select-menu-wrap'];

    let edamSelectMenu = document.createElement('ul');
    edamSelectMenu.className = style['edam-select-menu'];

    edamSelectWrap.appendChild(edamSelectContainer);
    edamSelectWrap.appendChild(edamSelectMenuWrap);

    edamSelectContainer.appendChild(edamSelectInputWrap);
    edamSelectInputWrap.appendChild(input);

    edamSelectMenuWrap.appendChild(edamSelectMenu);


    // event handlers will be here
    input.addEventListener('input', (e) => {
      this.search(e);
    });

    return edamSelectWrap;
  }

  search(e) {
    if (e.target.value.length > 0) {
      this.searchForReal(e);
    } else {
      clearTimeout(this.timeout);
    }
  }
  searchForReal(e) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      console.time('Search');
      this.disclosureResults = [];
      this.searchResults = [];

      let results = this.fuse.search(e.target.value);

      results.forEach((result) => {
        this.searchResults.push(result.item[0]);
        this.disclosureResults.push(...this.addAncestors(result.item[0]));
      });

      this.disclosureResults = [ ...new Set(this.disclosureResults) ];

      if (this.searchResults.length > 0) {
        this.status = "filtered";
      } else {
        this.status = "filteredButNothingWasFound";
      }
      // console.log("disclosure:", this.disclosureResults);
      // console.log("search:", this.searchResults);
      console.timeEnd('Search');
    }, 500);
  }

  addAncestors(nodeId) {
    let ancestors = [];

    let idx = this.index[nodeId];
    let term = this.model[idx];

    let i, l = term[5].length; // 5 is parents field
    for (i = 0; i < l; i += 1) {
      ancestors.push(term[5][i]);
    }

    for (i = 0; i < ancestors.length; i += 1) {
      idx = this.index[ancestors[i]];
      term = this.model[idx];

      if (idx) {
        let j, l = term[5].length;
        for (j = 0; j < l; j += 1) {
          ancestors.push(term[5][j]);
        }
      }
    }



    return ancestors;
  }

  append(v) {
    this.el.getElementsByClassName(style['edam-select-menu'])[0]
      .appendChild(v);
  }
}

class TreeMenu {
  constructor(term, params) {
    this.term = term;

    this.attachAccessors(this.term);
    // now can do this:
    // this.term.set('label', 'test');
    // this.term.get('label');
    // by the way, it's good time to fulfill the model with custom fields

    this.initDepth = params.initDepth;
    this.depth = params.depth;
    this.type = params.type;

    this.el = this.generateEdamSelectMenuItemView();
    return this.el;
  }

  // never look inside this function
  // now it's fine
  attachAccessors(term) {
    term.get = function(what) { // this is more elegant, but could be slower
      let idx = EDAM.model.schema.indexOf(what);
      if (idx === -1) {
        throw new Error(`No ${what} field in term`);
      } else {
        return this[idx];
      }
    };
    term.set = function(what, forTheReal) { // this is more elegant, but could be slower
      let idx = EDAM.model.schema.indexOf(what);
      if (idx === -1) {
        throw new Error(`No ${what} field in term`);
      } else {
        this[idx] = forTheReal;
      }
    };
    /*
    term.get = function (what) {
      switch (what) {
        case 'id':
          return this[0];
        case 'label':
          return this[1];
        case 'synonyms':
          return term[2];
        case 'descriptions':
          return term[3];
        case 'children':
          return term[4];
        case 'parents':
          return term[5];
        default:
          throw new Error(`No ${what} field in term`);
      }
    };

    term.set = function (what, noReallyWhat) {
      switch (what) {
        case 'id':
          this[0] = noReallyWhat;
          break;
        case 'label':
          this[1] = noReallyWhat;
          break;
        case 'synonyms':
          this[2] = noReallyWhat;
          break;
        case 'descriptions':
          this[3] = noReallyWhat;
          break;
        case 'children':
          this[4] = noReallyWhat;
          break;
        case 'parents':
          this[5] = noReallyWhat;
          break;
        default:
          throw new Error(`No ${what} field in term`);
      }
    };
    */
  }

  generateEdamSelectMenuItemView() {
    let treeMenu = document.createElement('li');
    treeMenu.className = style['tree-menu'];

    let children = this.getChildren();

    if (this.depth > 0) {
      let labelWrapper = document.createElement('div');
      labelWrapper.className = style['label-wrapper'];

      let labelIndent = document.createElement('div');
      labelIndent.className = style['label-indent'];

      let triangleWrap = document.createElement('span');
      triangleWrap.className = style['triangle-wrap'];

      let triangle = document.createElement('i');
      triangle.className = style['triangle'];

      let term = document.createElement('span');
      term.className = style['term'];

      treeMenu.appendChild(labelWrapper);
      labelWrapper.appendChild(labelIndent);

      labelIndent.appendChild(triangleWrap);
      labelIndent.appendChild(term);
      triangleWrap.appendChild(triangle);

      let text = document.createTextNode(this.term.get('label'));
      term.appendChild(text);

      // to save operations on access to elements we can add handlers right here?
      triangleWrap.addEventListener('click', () => {
        this.disclose();
      });

      // styles go here for the same reason
      labelIndent.style.marginLeft = `${this.depth - 0.5}em`;

      if (children.length === 0) {
        triangleWrap.style.visibility = 'hidden';
      }

      if (this.isDisclosed()) {
        triangle.classList.add(style['opened']);
      }

    }

    let ul = document.createElement('ul');
    treeMenu.appendChild(ul);

    if (this.isDisclosed()) {
      children.forEach((term) => {
        ul.appendChild(new TreeMenu(term, {
          initDepth: this.initDepth,
          depth: this.depth + 1,
          type: this.type
        }));
      });
    }

    return treeMenu;
  }

  getChildren() {
    return this.term.get('children[]').map(id => EDAM.getById(this.type, id));
  }

  isShown() {
    return true;
  }

  isDisclosed() {
    if (!!this.term['disclosed']) {
      return this.term['disclosed'];
    } else {
      return this.depth < this.initDepth;
    }
  }

  disclose() {
    console.time('Disclose');
    if (this.isDisclosed()) {
      this.term['disclosed'] = false;
    } else {
      this.term['disclosed'] = true;
    }

    this.el.parentNode.replaceChild(new TreeMenu(this.term, {
      initDepth: this.initDepth,
      depth: this.depth,
      type: this.type
    }), this.el);
    console.timeEnd('Disclose');
  }

  remove() {
    this.el.remove();
  }
}

console.time('Application');

let edamSelect = new EdamSelect('#app', {
  initDepth: 1,
  type: 'data'
});

console.timeEnd('Application');
/*
// okay, to generate fully disclosed tree we need
console.time('someFunction');
let i, type = 'data', length = EDAM.model[type].length;
let model = EDAM.model[type];

let rootId = EDAM.model.roots[type];
let schema = EDAM.model.schema;

edamSelect.append(v);

for (i = 0; i < length; i += 1) {
  let term = model[i];

  let v = new TreeMenu(term);

  edamSelect.append(v);
}
console.timeEnd('someFunction');

console.log(EDAM.model[type]);

<div class="edam-select-wrap" :class="classObject">
  <div class="edam-select-container">
    <div class="edam-select-input-wrap">
      <input type="text" v-bind:placeholder="placeholder" @input="search">
    </div>
  </div>
  <ul class="edam-select-menu" v-if="status !== 'filteredButNothingWasFound' && status !== 'closed'">

  <li
  is="tree-menu"
class="edam-select-menu-item"

:nodes="tree.children"
:depth="0"
:label="tree.label"
:id="tree.id"

:disclosureResults="disclosureResults"
:searchResults="searchResults"
  ></li>
  </ul>

  <div v-if="status === 'filteredButNothingWasFound'" class="nothing-found">
  Nothing was found!
</div>

</div>

 */
