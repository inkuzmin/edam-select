import style from './styles.scss';

import EDAM from './edam.js';

// it's like compiled template, but manually crafted
// everything here is manually crafted
// because performance is crucial
// when we need to render >1000-nodes trees
let generateEdamSelectView = function () {
  let edamSelectWrap = document.createElement('div');
  edamSelectWrap.className = style['edam-select-wrap'];

  let edamSelectContainer = document.createElement('div');
  edamSelectContainer.className = style['edam-select-container'];

  let edamSelectInputWrap = document.createElement('div');
  edamSelectInputWrap.className = style['edam-select-input-wrap'];

  let input = document.createElement('input');
  input.type = 'text';

  let edamSelectMenu = document.createElement('div');
  edamSelectMenu.className = style['edam-select-menu-wrap'];

  edamSelectWrap.appendChild(edamSelectContainer);
  edamSelectWrap.appendChild(edamSelectMenu);

  edamSelectContainer.appendChild(edamSelectInputWrap);
  edamSelectInputWrap.appendChild(input);

  return edamSelectWrap;
};

let generateEdamSelectMenuView = function () {
  let edamSelectMenu = document.createElement('ul');
  edamSelectMenu.className = style['edam-select-menu'];
  return edamSelectMenu;
};

let generateEdamSelectMenuItemView = function (termText) {
  let treeMenu = document.createElement('li');
  treeMenu.className = style['tree-menu'];

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

  // let ul = document.createElement('ul');

  treeMenu.appendChild(labelWrapper);
  labelWrapper.appendChild(labelIndent);

  labelIndent.appendChild(triangleWrap);
  labelIndent.appendChild(term);
  triangleWrap.appendChild(triangle);

  let text = document.createTextNode(termText);
  term.appendChild(text);

  // treeMenu.appendChild(ul);

  return treeMenu;
};

// create root element and attach to "#app"
// later there will be an initializer
let edamSelectView = generateEdamSelectView();
document.getElementById('app').appendChild(edamSelectView);

let edamSelectMenuView = generateEdamSelectMenuView();
// yes, optimisation is ugly
// but fassst
edamSelectView.getElementsByClassName(style['edam-select-menu-wrap'])[0]
  .appendChild(edamSelectMenuView);


let i;
let type = 'data';
for (i = 0; i < EDAM.model[type].length; i += 1) {
  let term = EDAM.model[type][i];

  let v = generateEdamSelectMenuItemView(term[1]);

  edamSelectView.getElementsByClassName(style['edam-select-menu'])[0]
    .appendChild(v);
}
console.log(i)
/*
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
