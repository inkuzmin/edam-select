import style from './styles.scss';

import EDAM from './edam.js';

import './polyfills.js';

import Fuse from "fuse.js";

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

    this.model = this.edam.model;
    this.rootId = this.edam.getRoot();

    this.index = this.edam.index(); // singleton for returning indexes

    // underscore for such accessors (see below)
    this.inline = params.inline;
    if (this.inline) {
      this._status = 'opened';
    } else {
      this._status = 'closed';
    }
    this.oldStatus = undefined;

    console.time('Fuse init');
    this.fuse = new Fuse(this.model, {
      keys: ['1', '2', '3'],
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

    this.el = this.generateEdamSelectView();
    document.querySelector(sel).appendChild(this.el);

    this.init();
  }

  get status() {
    return this._status;
  }

  set status(newStatus){ // wow so valid
    if (['opened', 'filtered', 'filteredButNothingWasFound',
        'unfiltered', 'closed', 'focused', 'selected'].indexOf(newStatus) === -1) {
      // custom error messages are recognisable by the absence of explanation marks
      throw new Error("Unknown status"); // dot is optional tho
    } else {
      this.oldStatus = this._status;
      switch (this.oldStatus) {
        case 'opened': // current
          switch (newStatus) {
            case 'filtered': // new
              this.resetChanges();
              break;
          }
          break;
        case 'filtered': // current
          switch (newStatus) {
            case 'unfiltered':
              break;
          }
          break;
        case 'filteredButNothingFound': // current
          break;
        case 'unfiltered': // current
          switch (newStatus) {
            case "filtered":
              this.resetChanges();
              break;
          }
        case 'closed': // current
          break;
        case 'focused': // current
          break;
        case 'selected': // current
          break;
      }

      this._status = newStatus;

      this.init();
    }
  }

  resetChanges() {
    let i, l = this.changed.length;
    for (i = 0; i < l; i += 1) {
      let nodeId = this.changed.pop();
      let term = this.model[this.index[nodeId]];
      term['disclosed'] = undefined;
      term['shown'] = undefined;
    }
  }

  init() {
    console.time('Tree rendering');

    if (this.status !== 'closed') {
      let idx = this.index[this.rootId];
      let term = this.model[idx];

      let treeMenu = new TreeMenu(term, {
        initDepth: this.initDepth,
        depth: 0,
        type: this.type,
        status: this.status,
        edam: this.edam,
        id: this.id,
        searchResults: this.searchResults,
        disclosureResults: this.disclosureResults,
        fuseResults: this.fuseResults,
        // changed: this.changed -- no, this is child - parent channel, it should be impl. with events...
      });

      this.append(treeMenu);
    } else {
      let treeMenu = this.el.getElementsByClassName(style['tree-menu'])[0];
      if (treeMenu) {
        treeMenu.remove();
      }
    }

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

    let edamSelectArrowWrap = document.createElement('div');
    edamSelectArrowWrap.className = style['edam-select-arrow-wrap'];

    let edamSelectArrow = document.createElement('div');
    edamSelectArrow.className = style['edam-select-arrow'];

    edamSelectArrowWrap.appendChild(edamSelectArrow);

    edamSelectWrap.appendChild(edamSelectContainer);
    edamSelectWrap.appendChild(edamSelectMenuWrap);

    edamSelectContainer.appendChild(edamSelectInputWrap);
    edamSelectInputWrap.appendChild(input);

    edamSelectContainer.appendChild(edamSelectArrowWrap);

    edamSelectMenuWrap.appendChild(edamSelectMenu);

    if (this.status === 'opened' || this.status === 'filtered' || this.status === 'unfiltered') {
      edamSelectWrap.classList.add(style['is-open']);
    }

    // event handlers will be here
    edamSelectArrowWrap.addEventListener('click', (e) => {
      if (this.status === 'opened' || this.status === 'filtered' || this.status === 'unfiltered') {
        edamSelectWrap.classList.remove(style['is-open']);
        this.status = 'closed';
      } else {
        edamSelectWrap.classList.add(style['is-open']);
        this.status = this.oldStatus;
      }
      input.focus();
      this.init();
    });

    input.addEventListener('input', (e) => {
      this.search(e);
    });

    document.addEventListener(`edam:${this.id}:change`, (e) => {
      this.changed.push(e.detail);
    });

    document.addEventListener(`edam:${this.id}:status`, (e) => {
      this.updateStatus();
    });

    return edamSelectWrap;
  }

  search(e) {
    if (e.target.value.length > 0) {
      this.searchForReal(e);
    } else {
      clearTimeout(this.timeout);
      this.status = "unfiltered";
    }
  }
  searchForReal(e) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      console.time('Search');
      this.disclosureResults = [];
      this.searchResults = [];

      this.fuseResults = this.fuse.search(e.target.value);

      this.fuseResults.forEach((result) => {
        this.searchResults.push(result.item[0]);
        this.disclosureResults.push(...this.addAncestors(result.item[0]));
      });

      this.disclosureResults = [ ...new Set(this.disclosureResults) ];

      let event = new Event('edam:' + this.id + ':status');
      document.dispatchEvent(event);

      console.timeEnd('Search');
    }, 500);
  }

  updateStatus() {
    if (this.searchResults.length > 0) {
      this.status = "filtered";
    } else {
      this.status = "filteredButNothingWasFound";
    }
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
  constructor(term, params) {
    this.term = term;

    this.initDepth = params.initDepth;
    this.depth = params.depth;
    this.type = params.type;
    this.status = params.status;
    this.edam = params.edam;
    this.id = params.id;
    this.disclosureResults = params.disclosureResults;
    this.searchResults = params.searchResults;
    this.fuseResults = params.fuseResults;

    this.el = this.generateEdamSelectMenuItemView();
    return this.el;
  }

  attachAccessors(term) {
    term.get = function(what) { // this is more elegant, but could be slower
      let idx = this.edam.getSchema().indexOf(what);
      if (idx === -1) {
        throw new Error(`No ${what} field in term`);
      } else {
        return this[idx];
      }
    };
    term.set = function(what, forTheReal) { // this is more elegant, but could be slower
      let idx = this.edam.getSchema().indexOf(what);
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

  triggerChangeEvent() {
    let event = new CustomEvent('edam:' + this.id + ':change', {
      detail: this.term[0]
    });
    document.dispatchEvent(event);
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

      let info = document.createElement('div');
      info.className = style['info'];

      treeMenu.appendChild(labelWrapper);
      labelWrapper.appendChild(labelIndent);

      labelIndent.appendChild(triangleWrap);
      labelIndent.appendChild(term);
      labelIndent.appendChild(info);

      triangleWrap.appendChild(triangle);

      let text = document.createTextNode(this.term[1]);
      term.appendChild(text);

      // to save operations on access to elements we can add handlers right here?
      info.addEventListener('click', () => {
        let details = labelWrapper.getElementsByClassName(style['details'])[0];
        if (details) {
          details.remove();
        } else {
          details = document.createElement('div');
          details.className = style['details'];

          let i, l = this.term[3].length;
          if (l > 0) {
            let definitionsTitle = document.createElement('div');
            definitionsTitle.className = style['title'];
            let definitionsTitleText = document.createTextNode("Definitions:");
            definitionsTitle.appendChild(definitionsTitleText);
            let definitionsWrap = document.createElement('div');
            definitionsWrap.className = style['definitions'];
            for (i = 0; i < l; i += 1) {
              let definitionmItem =  document.createElement('div');
              let definitionText = document.createTextNode(this.term[3][i]);
              definitionmItem.appendChild(definitionText);
              definitionsWrap.appendChild(definitionmItem);
            }
            details.appendChild(definitionsTitle);
            details.appendChild(definitionsWrap);
          }


          l = this.term[2].length;
          if (l > 0) {
            let synonymsWrap = document.createElement('ul');
            let synonymsTitle = document.createElement('div');
            synonymsTitle.className = style['title'];
            let synonymsTitleText = document.createTextNode("Synonyms:");
            synonymsTitle.appendChild(synonymsTitleText);
            for (i = 0; i < l; i += 1) {
              let synonymItem =  document.createElement('li');
              let synonymText = document.createTextNode(this.term[2][i]);
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
          let url = `http://edamontology.org/${this.type}_${this.term[0]}`;
          let linkText = document.createTextNode(url);
          link.appendChild(linkText);
          link.href = url;
          details.appendChild(linkTitle);
          details.appendChild(link);

          labelIndent.appendChild(details);

          setTimeout(() => {details.classList.add(style['show']);}, 10);
        }
      });

      triangleWrap.addEventListener('click', () => {
        this.triggerChangeEvent();
        this.disclose();
      });

      labelWrapper.addEventListener('mouseover', () => {
        labelWrapper.classList.add(style['selection']);
      });



      // styles go here for the same reason
      labelIndent.style.marginLeft = (this.depth - 0.5) + 'em';

      if (children.length === 0) {
        triangleWrap.style.visibility = 'hidden';
      }

      if (this.isDisclosed()) {
        triangle.classList.add(style['opened']);
      }

      let whereInSearchResults = this.whereInSearchResults();
      if (whereInSearchResults > -1) {

        labelIndent.classList.add(style['highlighted']);

        let i, l = this.fuseResults[whereInSearchResults].matches.length;
        let j, ll, start, end, innerHTML;
        let found = false;
        for (i = 0; i < l; i += 1) {
          if (this.fuseResults[whereInSearchResults].matches[i].key === "1") {
            ll = this.fuseResults[whereInSearchResults].matches[i].indices.length;
            for (j = 0; j < ll; j += 1) {
              start = this.fuseResults[whereInSearchResults].matches[i].indices[j][0];
              end = this.fuseResults[whereInSearchResults].matches[i].indices[j][1];

              if (end - start > 0) {
                innerHTML = this.term[1].substring(0, start) +
                  "<strong>" + this.term[1].substring(start, end + 1) + "</strong>" +
                  this.term[1].substring(end + 1, this.term[1].length);

                term.innerHTML = innerHTML;
                found = true;
              }
            }
          } else if (this.fuseResults[whereInSearchResults].matches[i].key === "2" && !found) {
            let span = document.createElement("span");
            span.className = style["by"];
            let spanText = document.createTextNode("(by synonyms)");
            span.appendChild(spanText);
            term.appendChild(span);
          } else if (this.fuseResults[whereInSearchResults].matches[i].key === "3" && !found) {
            let bySynonyms = term.getElementsByClassName(style["by"]);
            if (bySynonyms.length > 0) {
              let span = document.createElement("span");
              span.className = style["by"];
              let spanText = document.createTextNode("(by synonyms and definition)");
              span.appendChild(spanText);
              term.replaceChild(span, bySynonyms[0]);
            } else {
              let span = document.createElement("span");
              span.className = style["by"];
              let spanText = document.createTextNode("(by definition)");
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
      children.forEach((term) => {
        ul.appendChild(new TreeMenu(term, {
          initDepth: this.initDepth,
          depth: this.depth + 1,
          type: this.type,
          status: this.status,
          edam: this.edam,
          id: this.id,
          searchResults: this.searchResults,
          disclosureResults: this.disclosureResults,
          fuseResults: this.fuseResults,
        }));
      });
    }

    if (this.isShown()) {
      treeMenu.style.display = '';
    } else {
      treeMenu.style.display = 'none';
    }

    return treeMenu;
  }

  getChildren() {
      return this.term[4].map(id => this.edam.getById(id)).sort((a, b) => {
        if (a[1] > b[1]) { // ah yes, need to sort it...
          return 1;
        } else if (a[1] < b[1]) {
          return -1;
        } else {
          return 0;
        }
      });
    // term[4] is children field
  }

  isShown() {
    switch (this.status) {
      case "opened":
        return true;
      case "filtered":
        if (this.term['shown'] === undefined) {
          return this.isInDisclosureResults() || (this.whereInSearchResults() > -1);
        } else {
          return this.term['shown'];
        }
      case "unfiltered":
        return true;
      default:
        throw new Error("Huh, unknown status, how could this happen?");
    }
  }

  isDisclosed() {
    switch (this.status) {
      case "opened":
        if (this.term['disclosed'] === undefined) {
          return this.depth < this.initDepth;
        } else {
          return this.term['disclosed'];
        }
      case "filtered":
        if (this.term['disclosed'] === undefined) {
          return this.isInDisclosureResults();
        } else {
          return this.term['disclosed'];
        }
      case "unfiltered":
        if (this.term['disclosed'] === undefined) {
          return this.isInDisclosureResults();
        } else {
          return this.term['disclosed'];
        }
      default:
        throw new Error(`Huh, unknown status [${this.status}], how could this happen?`);
    }
  }

  disclose() {
    console.time('Disclose');

    if (this.isDisclosed()) {
      this.term['disclosed'] = false;
    } else {
      this.term['disclosed'] = true;

      let i, l = this.term[4].length; // children
      for (i = 0; i < l; i += 1) {
        this.edam.model[this.edam.index()[this.term[4][i]]]['shown'] = true;
      }
    }

    this.el.parentNode.replaceChild(new TreeMenu(this.term, {
      initDepth: this.initDepth,
      depth: this.depth,
      type: this.type,
      status: this.status,
      edam: this.edam,
      id: this.id,
      searchResults: this.searchResults,
      disclosureResults: this.disclosureResults,
      fuseResults: this.fuseResults,
    }), this.el);

    console.timeEnd('Disclose');
  }

  isInDisclosureResults() {
    return this.disclosureResults.indexOf(this.term[0]) !== -1;
  }

  whereInSearchResults() {
     return this.searchResults.indexOf(this.term[0]);
  }

  remove() {
    this.el.remove();
  }
}

console.time('Application');

let edamSelect = new EdamSelect('#app', {
  initDepth: 1,
  type: 'data',
  inline: true,
});

console.timeEnd('Application');
