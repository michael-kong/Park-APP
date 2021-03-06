// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import BaiduMap from 'vue-baidu-map'
import vuex from 'vuex'
import axios from 'axios'
import VueAxios from 'vue-axios'
import global_ from './components/Common/Global'//引用文件

Vue.use(VueAxios,axios)
Vue.use(vuex)
Vue.use(BaiduMap, {
  /* Visit http://lbsyun.baidu.com/apiconsole/key for details about app key. */
  ak: 'pD4xiU2LuyNUavXUAcDixhdMfHzm13Rh'
})
Vue.config.productionTip = false
var store = new vuex.Store({
  state: {
    states: 'turn-on',
    username:''
  },
  mutations: {
    setTransition (state, states) {
      state.states = states
    },
    setLoginAccount (state, username) {
      state.username = username
    }
  }
})

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  components: { App },
  template: '<App/>'
})

Vue.prototype.GLOBAL = global_
