import style from './styles.scss';

import EDAM from './edam.2.js';

import './polyfills.js';

import Fuse from "fuse.js";

// struct fields
const REL_PID = 0;
const TERM_FID = 1;
const CHILDREN = 2;
const PARENT = 3;

// term fields
const TERM_PID = 0;
const IRI = 1;
const LABEL = 2;
const SYNONYMS = 3;
const DEFINITIONS = 4;
const REL_FID = 5;

class Spotlight {
  constructor(id) {
    this.id = id;
    this.spotlight = undefined;
  }

  setSpotlight(uid) {
    if (this.spotlight) {
      document.getElementById(this.spotlight)
        .getElementsByClassName(style['label-wrapper'])[0]
        .classList.remove(style['spotlight']);
    }
    this.spotlight = uid;
    document.getElementById(this.spotlight)
      .getElementsByClassName(style['label-wrapper'])[0]
      .classList.add(style['spotlight']);
  }

  getSpotlightId() {
    return this.spotlight;
  }

  setFirstVisible() {
    let root = document.getElementById('edam-' + this.id).getElementsByClassName(style['tree-menu'])[0];
    let node = root.getElementsByClassName(style['tree-menu'])[0];

    if (node.style.display !== 'none') {
      this.setSpotlight(node.id);
    } else {
      this.next(node.id);
    }
  }


  prevSiblingOfAncestors(currentTree) {
    let parent;
    let root = document.getElementById('edam-' + this.id).getElementsByClassName(style['tree-menu'])[0];
    while (parent = currentTree.parentNode.parentNode) {
      if (parent == root) {
        let treeCollection = root.getElementsByClassName(style['tree-menu']);
        return treeCollection[treeCollection.length - 1];
      }
      if (parent) {
        return parent;
      } else {
        currentTree = parent;
      }
    }
  }

  prev(uid = this.spotlight) {
    let currentTree = document.getElementById(uid);
    let prevNode;
    if (currentTree.previousSibling) {
      prevNode = currentTree.previousSibling;
      let childNodes = prevNode.getElementsByClassName(style['tree-menu']);
      if (childNodes.length > 0) {
        prevNode = childNodes[childNodes.length - 1];
      }
    } else {
      prevNode = this.prevSiblingOfAncestors(currentTree);
    }
    if (prevNode.style.display !== 'none') {
      this.setSpotlight(prevNode.id);
    } else {
      this.prev(prevNode.id);
    }
  }

  nextSiblingOfAncestors(currentTree) {
    let parent;
    let root = document.getElementById('edam-' + this.id).getElementsByClassName(style['tree-menu'])[0];
    while (parent = currentTree.parentNode.parentNode) {
      if (parent == root) {
        return root.getElementsByClassName(style['tree-menu'])[0];
      }
      if (parent.nextSibling) {
        return parent.nextSibling;
      } else {
        currentTree = parent;
      }
    }
  }

  next(uid = this.spotlight) {
    let currentTree = document.getElementById(uid);
    let childNodes = currentTree.getElementsByClassName(style['tree-menu']);
    let nextNode;

    if (childNodes.length > 0) {
      nextNode = childNodes[0];
    } else if (currentTree.nextSibling) {
      nextNode = currentTree.nextSibling;
    } else {
      nextNode = this.nextSiblingOfAncestors(currentTree);
    }
    if (nextNode.style.display !== 'none') {
      this.setSpotlight(nextNode.id);
    } else {
      this.next(nextNode.id);
    }
  }

}

class Tag {

  constructor(tree) {
    this.id = 'edam-term-' + tree.id + '-' + tree.struct[REL_PID];
    this.edamId = tree.id;
    this.value = tree.term[LABEL];
    this.termId = tree.term[TERM_PID];

    this.active = false;
  }

  render() {
    let tagWrap = document.createElement('div');
    tagWrap.className = style['tag'];

    let tagRemoveIcon = document.createElement('span');
    tagRemoveIcon.className = style['tag-remove'];

    tagRemoveIcon.appendChild(document.createTextNode("×"));

    let tagValue = document.createElement('span');
    tagValue.className = style['tag-value'];

    let value = document.createTextNode(this.value);
    tagValue.appendChild(value);

    tagWrap.appendChild(tagRemoveIcon);
    tagWrap.appendChild(tagValue);

    tagRemoveIcon.addEventListener('click', () => {
      let event = new CustomEvent('edam:' + this.edamId + ':unselect', {
        detail: this,
      });
      document.dispatchEvent(event);
    });

    if (this.active) {
      tagWrap.classList.add(style['tag-active']);
    } else {
      tagWrap.classList.remove(style['tag-active']);
    }

    tagValue.addEventListener('click', () => {
      this.active = !this.active;
      if (this.active) {
        tagWrap.classList.add(style['tag-active']);
      } else {
        tagWrap.classList.remove(style['tag-active']);
      }

      let event = new CustomEvent('edam:' + this.edamId + ':filter', {
        detail: this,
      });
      document.dispatchEvent(event);
    });


    return tagWrap;
  }
}

class EdamSelect {
  constructor(sel, params) {
    this.id = ++EdamSelect.id;

    if (['format', 'data', 'topic', 'operation'].indexOf(params.type) !== -1) {
      this.type = params.type;
    } else {
      throw new Error("Unknown type. Should be one of [ format | data | topic | operation ].");
    }

    if (params.initDepth === undefined) {
      this.initDepth = 1;
    } else if (params.initDepth === 0) {
      this.initDepth = +Infinity;
    } else {
      this.initDepth = params.initDepth;
    }

    this.edam = new EDAM(this.type);

    this.spotlight = new Spotlight(this.id);
    window.spotlight = this.spotlight;

    this.data = this.edam.data;
    this.structure = this.edam.structure;

    // this.rootId = this.edam.getRoot();
    this.root = this.edam.getRoot();

    // this.index = this.edam.index(); // singleton for returning indexes
    this.dataIndex = this.edam.dataIndex();
    this.structureIndex = this.edam.structureIndex();

    this.inline = params.inline;
    this.opened = params.opened;

    // new statuses
    this.selected = false;
    this.filtered = undefined;
    this.focused = true;

    console.time('Fuse init');
    this.fuse = new Fuse(this.data, {
      keys: ['2', '3', '4'],
      shouldSort: true,
      includeMatches: true,
      threshold: 0.2,
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

    // Another optimisation, we store all model changes here to revert them easily
    // For now it is enough to store ids, but if something more complex would be required
    // it could be refactored to Change object
    this.changed = [];
    this.treeNodes = {};

    this.selected = [];

    this.el = this.generateEdamSelectView();
    document.querySelector(sel).appendChild(this.el);

    this.init();
  }

  resetChanges() {
    let i, l = this.changed.length;
    for (i = 0; i < l; i += 1) {
      let relId = this.changed.pop();
      let rel = this.structure[this.structureIndex[relId]];
      rel['disclosed'] = undefined;
      rel['shown'] = undefined;
    }
    this.hideLoader();
  }

  displayNothingFound() {
    document.getElementsByClassName(style['edam-nothing-found'])[0].style.display = 'block';
  }

  hideNothingFound() {
    document.getElementsByClassName(style['edam-nothing-found'])[0].style.display = 'none';
  }

  setReset() {
    if (this.el.getElementsByTagName('input')[0].value.length > 0) {
      this.setClearStatus('text');
    } else if (this.filtered !== undefined || this.changed.length > 0 || this.selected.length > 0) {
      this.setClearStatus('tags');
    } else {
      this.setClearStatus('none');
    }
  }

  init() {
    console.time('Tree rendering');

    this.setReset();

    if (this.searchResults.length === 0 && this.filtered !== undefined) {
      this.displayNothingFound();
    } else {
      this.hideNothingFound();
    }

    if (this.opened) {

      let treeMenu = new TreeMenu(this.root, {
        initDepth: this.initDepth,
        depth: 0,
        type: this.type,
        edam: this.edam,
        id: this.id,
        selected: this.selected,
        searchResults: this.searchResults, // NB! Stores term_ids
        disclosureResults: this.disclosureResults, // Stores rel_ids!
        fuseResults: this.fuseResults,
        spotlight: this.spotlight,
        treeNodes: this.treeNodes,
        filtered: this.filtered,
        // changed: this.changed -- no, this is child - parent channel, it should be impl. with events...
      });

      this.append(treeMenu);
    } else {
      let treeMenu = this.el.getElementsByClassName(style['tree-menu'])[0];
      if (treeMenu) {
        treeMenu.remove();
      }
    }



    if ((this.spotlight.spotlight === undefined || this.filtered) && this.opened) {
      this.spotlight.setFirstVisible();
    }

    console.timeEnd('Tree rendering');
  }

  generateEdamSelectView() {
    let edamSelectWrap = document.createElement('div');
    edamSelectWrap.className = style['edam-select-wrap'];
    edamSelectWrap.id = 'edam-' + this.id;

    if (this.inline) {
      edamSelectWrap.classList.add(style['inline']);
    }

    let edamSelectContainer = document.createElement('div');
    edamSelectContainer.className = style['edam-select-container'];

    let edamSelectInputWrap = document.createElement('div');
    edamSelectInputWrap.className = style['edam-select-input-wrap'];

    let edamTagsWrap = document.createElement('span');

    let input = document.createElement('input');
    input.type = 'text';

    let edamSelectMenuWrap = document.createElement('div');
    edamSelectMenuWrap.className = style['edam-select-menu-wrap'];

    let edamSelectMenu = document.createElement('ul');
    edamSelectMenu.className = style['edam-select-menu'];

    let edamSelectRemoveWrap = document.createElement('div');
    edamSelectRemoveWrap.className = style['remove-wrap'];

    let edamSelectRemove = document.createElement('div');
    edamSelectRemove.className = style['remove'];


    edamSelectRemove.appendChild(document.createTextNode("×"));
    edamSelectRemoveWrap.appendChild(edamSelectRemove);

    let edamSelectArrowWrap = document.createElement('div');
    edamSelectArrowWrap.className = style['edam-select-arrow-wrap'];

    let edamSelectArrow = document.createElement('div');
    edamSelectArrow.className = style['edam-select-arrow'];

    let edamSelectSpinner = document.createElement('div');
    edamSelectSpinner.className = style['edam-select-spinner'];

    let edamNothingFound = document.createElement('div');
    edamNothingFound.className = style['edam-nothing-found'];
    edamNothingFound.appendChild(document.createTextNode("Nothing was found!"));

    edamSelectArrowWrap.appendChild(edamSelectArrow);
    edamSelectArrowWrap.appendChild(edamSelectSpinner);

    edamSelectWrap.appendChild(edamSelectContainer);
    edamSelectWrap.appendChild(edamSelectMenuWrap);
    edamSelectMenuWrap.appendChild(edamNothingFound);

    edamSelectContainer.appendChild(edamTagsWrap);

    edamSelectContainer.appendChild(edamSelectInputWrap);
    edamSelectInputWrap.appendChild(input);

    edamSelectContainer.appendChild(edamSelectRemoveWrap);

    edamSelectContainer.appendChild(edamSelectArrowWrap);


    edamSelectMenuWrap.appendChild(edamSelectMenu);


    let divForMeasures = document.createElement("div");
    divForMeasures.className = style['div-for-measures'];

    edamSelectWrap.appendChild(divForMeasures);

    this.showLoader = () => {
      edamSelectArrow.style.display = 'none';
      edamSelectSpinner.style.display = 'block';
    };
    this.hideLoader = () => {
      edamSelectArrow.style.display = '';
      edamSelectSpinner.style.display = 'none';
    };

    this.setClearStatus = (status) => {
      if (status === 'none') {
        edamSelectRemove.classList.remove(style['clear-text']);
        edamSelectRemove.classList.remove(style['clear-tags']);
        edamSelectRemove.style.display = 'none';
      } else if (status === 'text') {
        edamSelectRemove.classList.remove(style['clear-tags']);
        edamSelectRemove.classList.add(style['clear-text']);
        edamSelectRemove.style.display = '';
      } else if (status === 'tags') {
        edamSelectRemove.classList.remove(style['clear-text']);
        edamSelectRemove.classList.add(style['clear-tags']);
        edamSelectRemove.style.display = '';
      }
    };

    edamSelectRemoveWrap.addEventListener('click', () => {
      if (edamSelectRemove.classList.contains(style['clear-tags'])) {
        this.filtered = undefined;
        input.value = '';

        this.selected.forEach((t)=> {
          this.edam.data[this.edam.dataIndex()[t.termId]].selected = false;
        });
        this.selected = [];
        renderTags();

        this.resetChanges();
        this.clearSearch();
        this.init();
      } else if (edamSelectRemove.classList.contains(style['clear-text'])) {
        input.value = '';
        this.filterLogic();
      }
    });


    if (this.opened) {
      edamSelectWrap.classList.add(style['is-open']);
    }

    edamSelectContainer.addEventListener('click', () => {
      if (!this.opened) {
        this.opened = true;
        edamSelectWrap.classList.add(style['is-open']);
        input.focus();
        this.init();
      } else {
        input.focus();
      }
    });

    // event handlers will be here
    edamSelectArrowWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.opened) {
        edamSelectWrap.classList.remove(style['is-open']);
        this.opened = false;
        input.blur();
        this.init();
      } else {
        edamSelectWrap.classList.add(style['is-open']);
        this.opened = true;
        input.focus();
        this.init();
      }
    });

    input.addEventListener('input', (e) => {
      divForMeasures.innerText = e.target.value;
      input.style.width = (divForMeasures.clientWidth + 5) + 'px';

      this.search(e);
    });

    document.addEventListener(`edam:${this.id}:change`, (e) => {
      this.changed.push(e.detail);
      this.setReset();
    });

    document.addEventListener(`edam:${this.id}:status`, (e) => {
      this.updateStatus();
    });

    document.addEventListener(`edam:${this.id}:filter`, (e) => {
      checkIfFilteringIsNeeded();
    });

    let termIds;
    let checkIfFilteringIsNeeded = () => {
      termIds = this.selected.filter((tag)=>{
        return tag.active;
      }).map((t) => {return t.termId;});

      if (termIds.length > 0) {
        this.resetChanges();
        input.value = '';
        input.disabled = 'disabled';
        this.filter(termIds);
      } else {
        input.disabled = '';
        this.filterLogic();
        // TODO: method to encapsulate the complex logic in
      }
    };

    let renderTags = () => {
      while (edamTagsWrap.firstChild) {
        edamTagsWrap.removeChild(edamTagsWrap.firstChild);
      }

      this.selected.forEach((t) => {
        edamTagsWrap.appendChild(t.render());
      });
    };

    document.addEventListener(`edam:${this.id}:select`, (e) => {
      let tag = new Tag(e.detail);

      if (this.selected.findIndex(t => tag.termId === t.termId) === -1) {
        this.selected.push(tag);
        renderTags();
      }

      this.setReset();
    });

    document.addEventListener(`edam:${this.id}:unselect`, (e) => {
      console.log(this.selected)
      this.selected = this.selected.filter((t) => {
        return t !== e.detail;
      });

      this.edam.data[this.edam.dataIndex()[e.detail.termId]].selected = false;

      if (e.detail.active) {
        checkIfFilteringIsNeeded();
      }

      renderTags();
    });


    document.addEventListener('keydown', (e) => {
      if (e.keyCode === 40) { // down
        e.preventDefault();
        this.spotlight.next();
      } else if (e.keyCode === 38) { // up
        e.preventDefault();
        this.spotlight.prev();
      } else if (e.keyCode === 39) { // right
        e.preventDefault();
        if (!this.treeNodes[this.spotlight.spotlight].isDisclosed()) {
          this.treeNodes[this.spotlight.spotlight].disclose();
        }
      } else if (e.keyCode === 37) { // left 37
        e.preventDefault();
        if (this.treeNodes[this.spotlight.spotlight].isDisclosed()) {
          this.treeNodes[this.spotlight.spotlight].disclose();
        }
      }
    });

    this.filterLogic = () => {
      if (this.searchResults.length === 0) {
        if (input.value.length === 0) {
          this.filtered = undefined;
        } else {
          this.filtered = false;
        }
      } else {
          if (input.value.length > 0 || (termIds && termIds.length > 0)) {
            this.filtered = true;
          } else {
            this.filtered = false;
          }
        }

      this.hideLoader();
      this.init();
    };

    return edamSelectWrap;
  }

  search(e) {
    this.showLoader();
    if (e.target.value.length > 0) {
      this.setClearStatus('text');
      this.searchForReal(e);
    } else {
      clearTimeout(this.timeout);
      // this.clearSearch();
      this.filterLogic();
    }
  }

  clearSearch() {
    this.searchResults = [];
    this.disclosureResults = [];
    this.fuseResults = [];
  }

  searchForReal(e) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      console.time('Search');
      this.disclosureResults = [];
      this.searchResults = [];

      this.fuseResults = this.fuse.search(e.target.value);

      this.fuseResults.forEach((result) => {

        this.searchResults.push(result.item[TERM_PID]);
        this.disclosureResults.push(...this.addAncestors(result.item[REL_FID]));
      });

      this.disclosureResults = [...new Set(this.disclosureResults)];

      console.log(this.fuseResults);
      console.log(this.searchResults);
      console.log(this.disclosureResults);

      let event = new Event('edam:' + this.id + ':status');
      document.dispatchEvent(event);

      console.timeEnd('Search');
    }, 500);
  }

  filter(termIds) {
    this.searchResults = termIds;
    this.disclosureResults = [];
    this.fuseResults = [];

    for (let i = 0; i < termIds.length; i += 1) {
      let rels = this.data[this.dataIndex[termIds[i]]][REL_FID];
      this.disclosureResults.push(...this.addAncestors(rels));
    }

    this.disclosureResults = [...new Set(this.disclosureResults)];

    console.log(this.searchResults);
    console.log(this.disclosureResults);

    let event = new Event('edam:' + this.id + ':status');
    document.dispatchEvent(event);

  }

  updateStatus() {
    this.filterLogic();
  }

  addAncestors(foundRels) {
    let ancestors = [];

    let i, l = foundRels.length;
    for (i = 0; i < l; i += 1) {

      let idx = this.structureIndex[foundRels[i]];
      let rel = this.structure[idx];


      while (rel[PARENT] !== null) {
        ancestors.push(rel[PARENT]);

        idx = this.structureIndex[rel[PARENT]];
        rel = this.structure[idx];
      }

    }

    return ancestors;
  }

  append(newTree) {
    let wrap = this.el.getElementsByClassName(style['edam-select-menu'])[0];
    let currentTree = wrap.firstChild;

    if (currentTree) {
      wrap.replaceChild(newTree, currentTree);
    } else {
      wrap.appendChild(newTree);
    }
  }
}

EdamSelect.id = 0;

class TreeMenu {
  constructor(struct, params) {

    this.initDepth = params.initDepth;
    this.depth = params.depth;
    this.type = params.type;
    this.edam = params.edam;
    this.id = params.id;
    this.disclosureResults = params.disclosureResults;
    this.searchResults = params.searchResults;
    this.fuseResults = params.fuseResults;
    this.spotlight = params.spotlight;
    this.treeNodes = params.treeNodes;

    this.filtered = params.filtered;

    this.selected = params.selected;


    this.struct = struct;

    this.term = this.edam.data[this.edam.dataIndex()[this.struct[TERM_FID]]];

    this.el = this.generateEdamSelectMenuItemView();
    return this.el;
  }

  triggerChangeEvent() {
    let event = new CustomEvent('edam:' + this.id + ':change', {
      detail: this.struct[REL_PID]
    });
    document.dispatchEvent(event);
  }

  triggerInit() {
    let event = new CustomEvent('edam:' + this.id + ':init', {
      detail: this,
    });
    document.dispatchEvent(event);
  }

  triggerSelect() {
    let event = new CustomEvent('edam:' + this.id + ':select', {
      detail: this,
    });
    document.dispatchEvent(event);
  }

  generateEdamSelectMenuItemView() {
    let treeMenu = document.createElement('li');
    treeMenu.className = style['tree-menu'];

    let id = 'edam-term-' + this.id + '-' + this.struct[REL_PID];

    treeMenu.id = id;
    // not id because terms could be found in several places
    // okay, now it IS id, because we used depth trick to make it unique!

    this.unselect = (e) => {
      if (e.detail.termId === this.term[TERM_PID]) {
        this._unselect();
      }
    };

    this.select = (e) => {
      if (e.detail.term === this.term) {
        this._select();
      }
    };

    document.addEventListener(`edam:${this.id}:select`, this.select);
    document.addEventListener(`edam:${this.id}:unselect`, this.unselect);


    let children = this.getChildren();

    if (this.depth > 0) {
      let labelWrapper = document.createElement('div');
      labelWrapper.className = style['label-wrapper'];

      if (this.spotlight.getSpotlightId() === id) {
        labelWrapper.classList.add(style['spotlight']);
      }

      let labelIndent = document.createElement('div');
      labelIndent.className = style['label-indent'];

      let triangleWrap = document.createElement('span');
      triangleWrap.className = style['triangle-wrap'];

      let triangle = document.createElement('i');
      triangle.className = style['triangle'];

      let term = document.createElement('span');
      term.className = style['term'];

      let info = document.createElement('div');
      info.className = style['info'];

      treeMenu.appendChild(labelWrapper);
      labelWrapper.appendChild(labelIndent);

      labelIndent.appendChild(triangleWrap);
      labelIndent.appendChild(term);
      labelIndent.appendChild(info);

      triangleWrap.appendChild(triangle);

      let text = document.createTextNode(this.term[LABEL]);
      term.appendChild(text);

      if (this.term['selected']) {
        term.classList.add(style['selected']);
      }

      // to save operations on access to elements we can add handlers right here?
      info.addEventListener('click', (e) => {
        e.stopPropagation();
        let details = labelWrapper.getElementsByClassName(style['details'])[0];
        if (details) {
          details.remove();
        } else {
          details = document.createElement('div');
          details.className = style['details'];

          let i, l = this.term[DEFINITIONS].length;
          if (l > 0) {
            let definitionsTitle = document.createElement('div');
            definitionsTitle.className = style['title'];
            let definitionsTitleText = document.createTextNode("Definitions:");
            definitionsTitle.appendChild(definitionsTitleText);
            let definitionsWrap = document.createElement('div');
            definitionsWrap.className = style['definitions'];
            for (i = 0; i < l; i += 1) {
              let definitionmItem = document.createElement('div');
              let definitionText = document.createTextNode(this.term[DEFINITIONS][i]);
              definitionmItem.appendChild(definitionText);
              definitionsWrap.appendChild(definitionmItem);
            }
            details.appendChild(definitionsTitle);
            details.appendChild(definitionsWrap);
          }


          l = this.term[SYNONYMS].length;
          if (l > 0) {
            let synonymsWrap = document.createElement('ul');
            let synonymsTitle = document.createElement('div');
            synonymsTitle.className = style['title'];
            let synonymsTitleText = document.createTextNode("Synonyms:");
            synonymsTitle.appendChild(synonymsTitleText);
            for (i = 0; i < l; i += 1) {
              let synonymItem = document.createElement('li');
              let synonymText = document.createTextNode(this.term[SYNONYMS][i]);
              synonymItem.appendChild(synonymText);
              synonymsWrap.appendChild(synonymItem);
            }
            details.appendChild(synonymsTitle);
            details.appendChild(synonymsWrap);
          }

          let linkTitle = document.createElement('p');
          linkTitle.className = style['title'];
          let linkTitleText = document.createTextNode("URL:");
          linkTitle.appendChild(linkTitleText);
          let link = document.createElement('a');
          let url = `http://edamontology.org/${this.type}_${this.term[IRI]}`;
          let linkText = document.createTextNode(url);
          link.appendChild(linkText);
          link.href = url;
          link.target = '_blank';
          details.appendChild(linkTitle);
          details.appendChild(link);

          labelIndent.appendChild(details);

          setTimeout(() => {
            details.classList.add(style['show']);
          }, 10);
        }
      });

      triangleWrap.addEventListener('click', (e) => {
        e.stopPropagation();
        this.disclose();
      });

      labelWrapper.addEventListener('mouseover', () => {
        // labelWrapper.classList.add(style['spotlight']);
        this.spotlight.setSpotlight(id);
      });

      labelWrapper.addEventListener('click', (e) => {
        e.stopPropagation();

        if (!this.term.selected) {
          // labelWrapper.classList.add(style['spotlight']);
          this.triggerSelect();
        }

      });

      // console.log('edam:' + this.id + ':spotlight');
      // document.addEventListener('edam:' + this.id + ':spotlight', (e) => {
      //   console.log(321);
      // }, true);



      // styles go here for the same reason
      labelIndent.style.marginLeft = (this.depth - 0.5) + 'em';

      if (children.length === 0) {
        triangleWrap.style.visibility = 'hidden';
      }

      if (this.isDisclosed()) {
        triangle.classList.add(style['opened']);
      }

      let whereInSearchResults = this.whereInSearchResults();
      if (whereInSearchResults > -1 && this.fuseResults.length > 0) {

        labelIndent.classList.add(style['highlighted']);

        let i, l = this.fuseResults[whereInSearchResults].matches.length;
        let j, ll, start, end, innerHTML;
        let found = false;
        for (i = 0; i < l; i += 1) {

          if (this.fuseResults[whereInSearchResults].matches[i].key === "2") {
            ll = this.fuseResults[whereInSearchResults].matches[i].indices.length;
            for (j = 0; j < ll; j += 1) {

              // console.log(j);

              start = this.fuseResults[whereInSearchResults].matches[i].indices[j][0];
              end = this.fuseResults[whereInSearchResults].matches[i].indices[j][1];

              if (end - start > 0) {
                innerHTML = this.term[LABEL].substring(0, start) +
                  "<strong>" + this.term[LABEL].substring(start, end + 1) + "</strong>" +
                  this.term[LABEL].substring(end + 1, this.term[LABEL].length);

                // console.log(innerHTML);

                term.innerHTML = innerHTML;
                found = true;
              }
            }
          } else if (this.fuseResults[whereInSearchResults].matches[i].key === "3" && !found) {
            let bySynonyms = term.getElementsByClassName(style["by"]);
            if (bySynonyms.length === 0) {
              let span = document.createElement("span");
              span.className = style["by"];
              let spanText = document.createTextNode("(by synonyms)");
              span.appendChild(spanText);
              term.appendChild(span);
            }
          } else if (this.fuseResults[whereInSearchResults].matches[i].key === "4" && !found) {
            let bySynonyms = term.getElementsByClassName(style["by"]);
            if (bySynonyms.length > 0) {
              let span = document.createElement("span");
              span.className = style["by"];
              let spanText = document.createTextNode("(by synonyms and definitions)");
              span.appendChild(spanText);
              term.replaceChild(span, bySynonyms[0]);
            } else {
              let span = document.createElement("span");
              span.className = style["by"];
              let spanText = document.createTextNode("(by definitions)");
              span.appendChild(spanText);
              term.appendChild(span);
            }
          }
        }
      } else {
        labelIndent.classList.remove(style['highlighted']);
      }

    }

    let ul = document.createElement('ul');
    treeMenu.appendChild(ul);

    if (this.isDisclosed()) {
      children.forEach((rel) => {
        ul.appendChild(new TreeMenu(rel, {
          initDepth: this.initDepth,
          depth: this.depth + 1,
          type: this.type,
          edam: this.edam,
          id: this.id,
          selected: this.selected,
          searchResults: this.searchResults,
          disclosureResults: this.disclosureResults,
          fuseResults: this.fuseResults,
          spotlight: this.spotlight,
          treeNodes: this.treeNodes,
          filtered: this.filtered,
        }));
      });
    }

    if (this.isShown()) {
      treeMenu.style.display = '';
    } else {
      treeMenu.style.display = 'none';
    }

    this.treeNodes[id] = this;

    // this.triggerInit();
    return treeMenu;
  }

  getChildren() {
    return this.struct[CHILDREN].map(id => this.edam.getById(id)).sort((a, b) => {
      let ta = this.edam.termByRel(a);
      let tb = this.edam.termByRel(b);
      if (ta[LABEL] > tb[LABEL]) { // ah yes, need to sort it...
        return 1;
      } else if (ta[LABEL] < tb[LABEL]) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  isShown() {
    if (this.filtered) {
      if (this.struct['shown'] === undefined) {
        return this.isInDisclosureResults() || (this.whereInSearchResults() > -1);
      } else {
        return this.struct['shown'];
      }
    } else {
      return true;
    }
  }

  isDisclosed() {
    if (this.filtered === undefined) {
      if (this.struct['disclosed'] === undefined) {
        return this.depth < this.initDepth;
      } else {
        return this.struct['disclosed'];
      }
    } else {
      if (this.filtered) {
        if (this.struct['disclosed'] === undefined) {
          return this.isInDisclosureResults();
        } else {
          return this.struct['disclosed'];
        }
      } else {

        if (this.struct['disclosed'] === undefined) {
          return this.isInDisclosureResults() || (this.depth < this.initDepth);
        } else {
          return this.struct['disclosed'];
        }


        // if (this.struct['disclosed'] === undefined) {
        //   return this.isInDisclosureResults();
        // } else {
        //   return this.struct['disclosed'];
        // }
      }
    }
  }

  destroy() {
    document.removeEventListener(`edam:${this.id}:select`, this.select);
    document.removeEventListener(`edam:${this.id}:unselect`, this.unselect);
  }


  _select() {
    this.term['selected'] = true;

    this.el.parentNode.replaceChild(new TreeMenu(this.struct, {
      initDepth: this.initDepth,
      depth: this.depth,
      type: this.type,
      edam: this.edam,
      id: this.id,
      selected: this.selected,
      searchResults: this.searchResults,
      disclosureResults: this.disclosureResults,
      fuseResults: this.fuseResults,
      spotlight: this.spotlight,
      treeNodes: this.treeNodes,
      filtered: this.filtered,
    }), this.el);

    this.destroy();
  }

  _unselect() {

    this.term['selected'] = false;

    this.el.parentNode.replaceChild(new TreeMenu(this.struct, {
        initDepth: this.initDepth,
        depth: this.depth,
        type: this.type,
        edam: this.edam,
        id: this.id,
        selected: this.selected,
        searchResults: this.searchResults,
        disclosureResults: this.disclosureResults,
        fuseResults: this.fuseResults,
        spotlight: this.spotlight,
        treeNodes: this.treeNodes,
        filtered: this.filtered,
    }), this.el);

    this.destroy();

  }

  disclose() {
    console.time('Disclose');

    this.triggerChangeEvent();

    if (this.isDisclosed()) {
      this.struct['disclosed'] = false;
    } else {
      this.struct['disclosed'] = true;

      let i, l = this.struct[CHILDREN].length; // children
      for (i = 0; i < l; i += 1) {
        this.edam.structure[this.edam.structureIndex()[this.struct[CHILDREN][i]]]['shown'] = true;
      }
    }

    this.el.parentNode.replaceChild(new TreeMenu(this.struct, {
      initDepth: this.initDepth,
      depth: this.depth,
      type: this.type,
      edam: this.edam,
      id: this.id,
      selected: this.selected,
      searchResults: this.searchResults,
      disclosureResults: this.disclosureResults,
      fuseResults: this.fuseResults,
      spotlight: this.spotlight,
      treeNodes: this.treeNodes,
      filtered: this.filtered,
    }), this.el);
    this.destroy();

    console.timeEnd('Disclose');
  }

  isInDisclosureResults() {
    return this.disclosureResults.indexOf(this.struct[REL_PID]) !== -1;
  }

  whereInSearchResults() {
    return this.searchResults.indexOf(this.struct[TERM_FID]);
  }

  remove() {
    this.el.remove();
  }
}

console.time('Application');
let edamSelect = new EdamSelect('#app', {
  initDepth: 1,
  type: 'data',
  inline: false,
});
console.timeEnd('Application');
