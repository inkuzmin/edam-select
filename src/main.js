import Vue from 'vue'
import EdamSelect from './EdamSelect.vue'

new Vue({
  el: '#app',
  render: h => h(EdamSelect, {
    props: {
      'type': 'operation'
    }
  })
});
